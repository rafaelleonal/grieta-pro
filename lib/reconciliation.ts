import { randomUUID } from "node:crypto";
import type { Prisma } from "../generated/prisma/client";
import { getDb } from "./db";
import { ApiError } from "./errors";
import {
  finishGeneration,
  observeUsage,
  recoverAbandonedGenerations,
  withUsageTransaction,
  type ProviderUsage,
} from "./usage";

export { ABANDONED_GENERATION_MS } from "./usage";
export const RECONCILIATION_COOLDOWN_MS = 30_000;
const GENERATION_LOOKUP_GRACE_MS = 120_000;
const GLOBAL_RECONCILIATIONS_PER_MINUTE = 10;
const MAX_LOOKUPS_PER_USER = 3;
const MAX_GENERATION_BODY_BYTES = 32_000;
const GENERATION_ENDPOINT = "https://openrouter.ai/api/v1/generation";
const GENERATION_ID = /^gen-[a-zA-Z0-9_-]{1,180}$/;
const TERMINAL_FINISH_REASONS = new Set([
  "stop",
  "length",
  "content_filter",
  "tool_calls",
  "error",
]);

type ReconciliationOptions = { fetcher?: typeof fetch; now?: Date };
type ReconciliationResult = { reconciled: number; checked: number; cooldown?: number };

function validateOwnerAndTime(userId: string, now: Date) {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(userId) || !Number.isFinite(now.getTime()))
    throw new ApiError(400, "No pudimos comprobar esta consulta para tu cuenta.");
}

/** Separate input admission: rejected/malformed bodies cannot consume lookup leases. */
export async function limitReconciliationInput(userId: string, now = new Date()) {
  validateOwnerAndTime(userId, now);
  const minuteStart = BigInt(Math.floor(now.getTime() / 60_000) * 60_000);
  await withUsageTransaction(async (tx) => {
    for (const { key, maximum } of [
      { key: "elociencia-reconcile-input:global", maximum: 60 },
      { key: `elociencia-reconcile-input:user:${userId}`, maximum: 6 },
    ]) {
      await tx.rateLimit.upsert({
        where: { key },
        create: { id: randomUUID(), key, count: 0, lastRequest: minuteStart },
        update: {},
      });
      await tx.rateLimit.updateMany({
        where: { key, lastRequest: { lt: minuteStart } },
        data: { count: 0, lastRequest: minuteStart },
      });
      const accepted = await tx.rateLimit.updateMany({
        where: { key, lastRequest: minuteStart, count: { lt: maximum } },
        data: { count: { increment: 1 } },
      });
      if (accepted.count !== 1)
        throw new ApiError(429, "Espera un momento antes de volver a comprobar tus consultas.");
    }
  });
}

function ownerLeaseKey(userId: string) {
  return `elociencia-reconcile-lease:user:${userId}`;
}

/** Atomic, persistent across processes/tabs; covers the entire bounded lookup batch. */
async function claimReconciliationLease(userId: string, now: Date, hasLookups: boolean) {
  const time = BigInt(now.getTime());
  return withUsageTransaction(async (tx) => {
    const key = ownerLeaseKey(userId);
    const owner = await tx.rateLimit.upsert({
      where: { key },
      create: { id: randomUUID(), key, count: 0, lastRequest: BigInt(0) },
      update: {},
    });
    const nextOwnerCheck = owner.lastRequest + BigInt(RECONCILIATION_COOLDOWN_MS);
    if (nextOwnerCheck > time)
      return {
        allowed: false,
        cooldown: Math.ceil(Number(nextOwnerCheck - time) / 1000),
        cursor: 0,
      };
    const cursor = owner.count;
    await tx.rateLimit.update({
      where: { key },
      data: {
        lastRequest: time,
        // One fixed owner row, rather than a growing row per provider request.
        count: hasLookups ? (cursor + MAX_LOOKUPS_PER_USER) % 1_000_000 : cursor,
      },
    });
    return { allowed: true, cooldown: 0, cursor };
  });
}

async function claimGlobalLookupBatch(now: Date) {
  const time = BigInt(now.getTime());
  const minuteStart = BigInt(Math.floor(now.getTime() / 60_000) * 60_000);
  return withUsageTransaction(async (tx) => {
    const key = "elociencia-reconcile-lease:global";
    await tx.rateLimit.upsert({
      where: { key },
      create: { id: randomUUID(), key, count: 0, lastRequest: minuteStart },
      update: {},
    });
    await tx.rateLimit.updateMany({
      where: { key, lastRequest: { lt: minuteStart } },
      data: { count: 0, lastRequest: minuteStart },
    });
    const accepted = await tx.rateLimit.updateMany({
      where: { key, lastRequest: minuteStart, count: { lt: GLOBAL_RECONCILIATIONS_PER_MINUTE } },
      data: { count: { increment: 1 } },
    });
    return {
      allowed: accepted.count === 1,
      cooldown: Math.ceil(Number(minuteStart + BigInt(60_000) - time) / 1000),
    };
  });
}

/** Stable pagination wraps without selecting the same generation twice in a batch. */
export function reconciliationWindow(total: number, cursor: number) {
  if (!Number.isSafeInteger(total) || total < 1 || !Number.isSafeInteger(cursor) || cursor < 0)
    return { skip: 0, take: 0, wrapTake: 0 };
  const skip = cursor % total;
  const maximum = Math.min(MAX_LOOKUPS_PER_USER, total);
  const take = Math.min(maximum, total - skip);
  return { skip, take, wrapTake: maximum - take };
}

/** A missing/unfinished generation or malformed cost never becomes a zero charge. */
export function generationUsage(value: unknown, id: string): ProviderUsage | null {
  if (!GENERATION_ID.test(id) || !value || typeof value !== "object" || Array.isArray(value))
    return null;
  const data = value as Record<string, unknown>;
  if (
    data.id !== id ||
    typeof data.finish_reason !== "string" ||
    !TERMINAL_FINISH_REASONS.has(data.finish_reason)
  )
    return null;
  const rawCost = data.total_cost;
  const cost =
    typeof rawCost === "number" && Number.isFinite(rawCost) && rawCost >= 0 && rawCost < 100_000_000
      ? rawCost.toFixed(12)
      : typeof rawCost === "string" && /^\d{1,8}(?:\.\d{1,12})?$/.test(rawCost)
        ? rawCost
        : null;
  if (cost === null) return null;
  const tokens = (value: unknown) =>
    typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 10_000_000
      ? value
      : undefined;
  return {
    id,
    cost,
    promptTokens: tokens(data.tokens_prompt),
    completionTokens: tokens(data.tokens_completion),
  };
}

export async function readGenerationUsage(
  response: Response,
  id: string,
): Promise<ProviderUsage | null> {
  if (
    !response.ok ||
    Number(response.headers.get("content-length")) > MAX_GENERATION_BODY_BYTES ||
    !response.body
  ) {
    await response.body?.cancel();
    return null;
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_GENERATION_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body)) return null;
    return generationUsage((body as Record<string, unknown>).data, id);
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

export async function lookupGenerationUsage(
  id: string,
  key: string,
  fetcher: typeof fetch = fetch,
): Promise<ProviderUsage | null> {
  if (!GENERATION_ID.test(id) || !key.trim()) return null;
  const url = new URL(GENERATION_ENDPOINT);
  url.searchParams.set("id", id);
  try {
    const response = await fetcher(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(4000),
    });
    return await readGenerationUsage(response, id);
  } catch {
    return null;
  }
}

/** Checks existing charges only. This module has no generation POST or retry path. */
export async function reconcileUserUsage(
  userId: string,
  options: ReconciliationOptions = {},
): Promise<ReconciliationResult> {
  const now = options.now || new Date();
  validateOwnerAndTime(userId, now);
  const recovered = await recoverAbandonedGenerations(userId, now);
  const key = process.env.OPENROUTER_API_KEY?.trim();
  const db = getDb();
  const lookupWhere: Prisma.AiRequestWhereInput = {
    userId,
    status: "UNKNOWN",
    byok: false,
    actualCostUsd: null,
    providerRequestId: { not: null },
    dispatchedAt: { lte: new Date(now.getTime() - GENERATION_LOOKUP_GRACE_MS) },
  };
  const [knownRows, lookupCount] = await Promise.all([
    db.aiRequest.findMany({
      where: {
        userId,
        status: "UNKNOWN",
        OR: [{ actualCostUsd: { not: null } }, { byok: true }],
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: MAX_LOOKUPS_PER_USER,
      select: { id: true },
    }),
    key ? db.aiRequest.count({ where: lookupWhere }) : Promise.resolve(0),
  ]);
  if (!knownRows.length && !lookupCount) return { reconciled: recovered.voided, checked: 0 };
  const lease = await claimReconciliationLease(userId, now, lookupCount > 0);
  if (!lease.allowed) return { reconciled: recovered.voided, checked: 0, cooldown: lease.cooldown };
  let reconciled = recovered.voided;
  for (const row of knownRows) {
    const result = await finishGeneration(row.id, {});
    if (result.status === "SETTLED") reconciled++;
  }
  // Known charges are finalized first, even if shared lookup capacity is full.
  if (!key || !lookupCount) return { reconciled, checked: 0 };
  const window = reconciliationWindow(lookupCount, lease.cursor);
  const orderBy: Prisma.AiRequestOrderByWithRelationInput[] = [{ createdAt: "asc" }, { id: "asc" }];
  const select = { id: true, providerRequestId: true } as const;
  const rows = await db.aiRequest.findMany({
    where: lookupWhere,
    orderBy,
    skip: window.skip,
    take: window.take,
    select,
  });
  if (window.wrapTake)
    rows.push(
      ...(await db.aiRequest.findMany({
        where: lookupWhere,
        orderBy,
        take: window.wrapTake,
        select,
      })),
    );
  const seen = new Set<string>();
  const lookups = rows.filter((row) => {
    if (!row.providerRequestId || !GENERATION_ID.test(row.providerRequestId) || seen.has(row.id))
      return false;
    seen.add(row.id);
    return true;
  });
  if (!lookups.length) return { reconciled, checked: 0 };
  const globalLease = await claimGlobalLookupBatch(now);
  if (!globalLease.allowed) return { reconciled, checked: 0, cooldown: globalLease.cooldown };
  let checked = 0;
  for (const row of lookups) {
    checked++;
    const usage = await lookupGenerationUsage(row.providerRequestId!, key, options.fetcher);
    if (!usage) continue;
    await observeUsage(row.id, usage);
    const result = await finishGeneration(row.id, {});
    if (result.status === "SETTLED") reconciled++;
  }
  return { reconciled, checked };
}

export async function getReconciliationAttempt(userId: string, idempotencyKey: string) {
  const row = await getDb().aiRequest.findUnique({
    where: { userId_idempotencyKey: { userId, idempotencyKey } },
    select: { status: true, response: true },
  });
  return row ? { state: row.status, hasResponse: Boolean(row.response) } : null;
}

/** Portable scheduled entry point; summaries contain no users, keys, prompts or provider IDs. */
export async function reconcileOutstandingUsage(
  options: ReconciliationOptions & { maxUsers?: number } = {},
) {
  const maxUsers = options.maxUsers ?? 10;
  if (!Number.isSafeInteger(maxUsers) || maxUsers < 1 || maxUsers > 100)
    throw new ApiError(400, "El límite de cuentas debe estar entre 1 y 100.");
  const db = getDb();
  const candidates = await db.aiRequest.groupBy({
    by: ["userId"],
    where: {
      OR: [
        { status: { in: ["RESERVED", "DISPATCHED"] } },
        {
          status: "UNKNOWN",
          OR: [
            { actualCostUsd: { not: null } },
            { byok: true },
            { providerRequestId: { not: null } },
          ],
        },
      ],
    },
    orderBy: { _min: { createdAt: "asc" } },
    take: 500,
  });
  const leases = await db.rateLimit.findMany({
    where: { key: { in: candidates.map((row) => ownerLeaseKey(row.userId)) } },
    select: { key: true, lastRequest: true },
  });
  const lastChecks = new Map(leases.map((lease) => [lease.key, lease.lastRequest]));
  // Rotate less recently checked owners so one unresolvable generation cannot
  // permanently occupy a scheduled batch ahead of other accounts.
  candidates.sort((left, right) => {
    const a = lastChecks.get(ownerLeaseKey(left.userId)) || BigInt(0);
    const b = lastChecks.get(ownerLeaseKey(right.userId)) || BigInt(0);
    return a < b ? -1 : a > b ? 1 : 0;
  });
  let reconciled = 0;
  let checked = 0;
  for (const row of candidates.slice(0, maxUsers)) {
    const result = await reconcileUserUsage(row.userId, options);
    reconciled += result.reconciled;
    checked += result.checked;
  }
  const unresolved = await db.aiRequest.count({
    where: { status: { in: ["RESERVED", "DISPATCHED", "UNKNOWN"] } },
  });
  return { reconciled, checked, unresolved };
}
