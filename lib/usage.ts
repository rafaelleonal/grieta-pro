import { createHash } from "node:crypto";
import {
  Prisma,
  type AiOperation,
  type AiRequest,
  type Plan,
  type UsageScope,
} from "../generated/prisma/client";
import { getDb } from "./db";
import { ApiError } from "./http";
import { safeNotesForStorage } from "./coach-safety";
import type { CoachInput, GeneratedCoachResult, DraftResult } from "./types";

export const GEMINI_PRO_MODEL = "google/gemini-3.1-pro-preview";
export const DEFAULT_MODEL = GEMINI_PRO_MODEL;
export const OPUS_MODEL = "anthropic/claude-opus-5.5";
export type ModelPolicy = {
  prompt: number;
  completion: number;
  reasoning: boolean;
  reasoningEffort?: "low" | "medium" | "high";
  coachCompletionTokens?: number;
  draftCompletionTokens?: number;
  maxInputTokens?: number;
  image?: number;
};
export const MODEL_POLICIES = {
  // GPT 5.6 Luna's higher-context tier starts at 272,000 input tokens. Even
  // text + one image + web allowances stay below it; max_price keeps base caps.
  "openai/gpt-5.6-luna": { prompt: 0.2, completion: 1.2, reasoning: false },
  "anthropic/claude-haiku-5.5": { prompt: 0.5, completion: 2.5, reasoning: false },
  "openai/gpt-6-luna": { prompt: 0.2, completion: 0.75, reasoning: false },
  // A complete coach plan is ~3-5k output tokens; the caps leave room for adaptive
  // thinking at medium effort without truncating the JSON.
  "anthropic/claude-sonnet-5.5": {
    prompt: 2,
    completion: 10,
    reasoning: true,
    reasoningEffort: "medium",
    coachCompletionTokens: 12_000,
    draftCompletionTokens: 4_000,
  },
  // Opus 5.5 cannot disable thinking; effort is the only depth control.
  [OPUS_MODEL]: {
    prompt: 4,
    completion: 20,
    reasoning: true,
    reasoningEffort: "medium",
    coachCompletionTokens: 12_000,
    draftCompletionTokens: 4_000,
  },
  [GEMINI_PRO_MODEL]: {
    prompt: 2,
    completion: 12,
    reasoning: true,
    reasoningEffort: "medium",
    coachCompletionTokens: 14_000,
    draftCompletionTokens: 4_000,
    // Requests stay below the 200k-token higher tariff. Input images are also
    // bounded as tokens; this separate cap covers the per-image routing field.
    maxInputTokens: 199_999,
    image: 0.000002,
  },
} as const satisfies Record<string, ModelPolicy>;
export const MAX_PROMPT_BYTES = 96_000;
// Coach prompts send compact catalog rows and bounded ability text. The worst
// measured case (Data Dragon 16.20.1, longest abilities, 5v5, full notes) was
// 57 KB; the margin absorbs catalog growth. Larger prompts are rejected unsent.
export const MAX_COACH_PROMPT_BYTES = 72_000;
export const MAX_COACH_COMPLETION_TOKENS = 7000;
export const MAX_DRAFT_COMPLETION_TOKENS = 1600;
// One normalized image <=1024x1024. Conservative allowance, separate from text.
const MAX_IMAGE_TOKENS = 65_536;
export function completionTokenLimit(model: string, operation: AiOperation): number {
  const policy: ModelPolicy | undefined = MODEL_POLICIES[model as keyof typeof MODEL_POLICIES];
  return operation === "COACH"
    ? (policy?.coachCompletionTokens ?? MAX_COACH_COMPLETION_TOKENS)
    : (policy?.draftCompletionTokens ?? MAX_DRAFT_COMPLETION_TOKENS);
}

export function promptByteLimit(operation: AiOperation): number {
  return operation === "COACH" ? MAX_COACH_PROMPT_BYTES : MAX_PROMPT_BYTES;
}

/** Conservative token bound shared by admission and the final provider request. */
export function maximumInputTokens(
  operation: AiOperation,
  hasImage = false,
  webSearch = false,
): number {
  return promptByteLimit(operation) + (hasImage ? MAX_IMAGE_TOKENS : 0) + (webSearch ? 40_000 : 0);
}
type BucketRef = { scope: UsageScope; scopeId: string; period: string };
type Tx = Prisma.TransactionClient;
export type ProviderUsage = {
  id?: string;
  cost?: string;
  promptTokens?: number;
  completionTokens?: number;
};

export function safeCoachInput(input: CoachInput) {
  return {
    champion: input.champion,
    enemy: input.enemy,
    role: input.role,
    rank: input.rank,
    allies: input.allies,
    enemies: input.enemies,
    notes: safeNotesForStorage(input.notes),
    webSearch: input.webSearch,
  };
}
export function inputHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
export function requestKey(request: Request): string {
  const key = request.headers.get("idempotency-key") || "";
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(key))
    throw new ApiError(400, "Vuelve a iniciar la consulta desde la aplicación.");
  return key;
}
function budget(name: string, fallback: string): Prisma.Decimal {
  const value = process.env[name] || fallback;
  if (!/^\d{1,5}(?:\.\d{1,8})?$/.test(value))
    throw new ApiError(503, "Revisa la configuración de los límites de gasto del servidor.");
  return new Prisma.Decimal(value);
}
function periods(now: Date) {
  return {
    month: `month:${now.toISOString().slice(0, 7)}`,
    day: `day:${now.toISOString().slice(0, 10)}`,
    minute: `minute:${now.toISOString().slice(0, 16)}`,
  };
}
export const ABANDONED_GENERATION_MS = 5 * 60_000;

/** Database-only retries: callers must never send provider requests inside work. */
export async function withUsageTransaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await getDb().$transaction(work, { isolationLevel: "Serializable", timeout: 10_000 });
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : null;
      if (code !== "P2034" || attempt >= 9) throw error;
      await new Promise((resolve) => setTimeout(resolve, 15 + attempt * 20 + Math.random() * 30));
    }
  }
}
async function effectivePlan(
  db: Tx | ReturnType<typeof getDb>,
  userId: string,
  now = new Date(),
): Promise<Plan> {
  const grants = await db.accessGrant.findMany({
    where: {
      userId,
      revokedAt: null,
      startsAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
  const pro = grants.find((grant) => grant.plan.code === "PRO");
  const plan = pro?.plan || (await db.plan.findUnique({ where: { code: "FREE" } }));
  if (!plan)
    throw new ApiError(
      503,
      "La base de datos necesita sus planes iniciales. Ejecuta la preparación de la base de datos.",
    );
  return plan;
}
export async function generationPolicy(userId: string, requestedModel?: string, webSearch = false) {
  const plan = await effectivePlan(getDb(), userId);
  const model = requestedModel || process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL;
  if (!(model in MODEL_POLICIES) || !plan.allowedModels.includes(model))
    throw new ApiError(
      403,
      "Ese modelo no está incluido en tu plan. Elige uno de los modelos disponibles.",
    );
  if (webSearch && !plan.webSearchAllowed)
    throw new ApiError(
      403,
      "La búsqueda web está incluida en Pro. Puedes generar una build orientativa sin búsqueda.",
    );
  return { plan, model, policy: MODEL_POLICIES[model as keyof typeof MODEL_POLICIES] };
}
export function maximumCost(
  model: string,
  operation: AiOperation,
  hasImage = false,
  webSearch = false,
): Prisma.Decimal {
  const policy: ModelPolicy | undefined = MODEL_POLICIES[model as keyof typeof MODEL_POLICIES];
  if (!policy) throw new ApiError(403, "Este modelo no está disponible.");
  // UTF-8 bytes bound text tokens conservatively; allow the longest cache-write
  // premium and high-context tariff. Reasoning shares the completion cap.
  const inputTokens = maximumInputTokens(operation, hasImage, webSearch);
  if (policy.maxInputTokens && inputTokens > policy.maxInputTokens)
    throw new ApiError(413, "Esta combinación supera el contexto permitido para el modelo.");
  const turns = webSearch ? 2 : 1;
  return new Prisma.Decimal(inputTokens)
    .mul(policy.prompt)
    .mul(2)
    .mul(turns)
    .add(
      new Prisma.Decimal(completionTokenLimit(model, operation)).mul(policy.completion).mul(turns),
    )
    .div(1_000_000)
    .add(hasImage ? (policy.image ?? 0) : 0)
    .add(webSearch ? "0.01" : 0);
}
function refsFor(userId: string, plan: Plan, now: Date): BucketRef[] {
  const p = periods(now);
  return [
    { scope: "GLOBAL", scopeId: "app", period: p.month },
    { scope: "GLOBAL", scopeId: "app", period: p.day },
    { scope: "PLAN", scopeId: plan.code, period: p.month },
    { scope: "USER", scopeId: userId, period: p.month },
    { scope: "USER", scopeId: userId, period: p.day },
    { scope: "USER", scopeId: userId, period: p.minute },
  ];
}
async function getBucket(tx: Tx, ref: BucketRef) {
  return tx.usageBucket.upsert({ where: { scope_scopeId_period: ref }, create: ref, update: {} });
}
function storedRefs(row: AiRequest): BucketRef[] {
  const pricing = row.pricing as { buckets?: BucketRef[] };
  if (!Array.isArray(pricing.buckets) || pricing.buckets.length !== 6)
    throw new Error("Invalid ledger bucket references");
  return pricing.buckets;
}
function assertReplay(row: AiRequest, hash: string) {
  if (row.inputHash !== hash)
    throw new ApiError(
      409,
      "Esta consulta ya se inició con otros datos. Inicia una nueva consulta.",
    );
}
export async function reserveGeneration(args: {
  userId: string;
  key: string;
  inputHash: string;
  operation: AiOperation;
  model: string;
  byok: boolean;
  webSearch: boolean;
  reserveUsd: Prisma.Decimal;
}) {
  try {
    return await withUsageTransaction(async (tx) => {
      const existing = await tx.aiRequest.findUnique({
        where: { userId_idempotencyKey: { userId: args.userId, idempotencyKey: args.key } },
      });
      if (existing) {
        assertReplay(existing, args.inputHash);
        return { request: existing, replay: true };
      }
      // A lost client key or another tab must not resend the same unresolved
      // intention. Its original key and all reservations remain unchanged.
      const unresolved = await tx.aiRequest.findFirst({
        where: {
          userId: args.userId,
          inputHash: args.inputHash,
          status: { in: ["RESERVED", "DISPATCHED", "UNKNOWN"] },
        },
        orderBy: { createdAt: "asc" },
      });
      if (unresolved) return { request: unresolved, replay: true };
      const now = new Date();
      const plan = await effectivePlan(tx, args.userId, now);
      if (
        !plan.allowedModels.includes(args.model) ||
        !(args.model in MODEL_POLICIES) ||
        (args.webSearch && !plan.webSearchAllowed)
      )
        throw new ApiError(403, "La configuración solicitada no está incluida en tu plan.");
      const active = await tx.aiRequest.count({
        where: { userId: args.userId, status: { in: ["RESERVED", "DISPATCHED"] } },
      });
      if (active >= plan.concurrentLimit)
        throw new ApiError(
          429,
          "Ya tienes una consulta en curso. Espera a que termine; no se ha enviado otra llamada de IA.",
        );
      const refs = refsFor(args.userId, plan, now);
      const reserve = args.byok ? new Prisma.Decimal(0) : args.reserveUsd;
      if (reserve.isNegative() || !reserve.isFinite()) throw new Error("Invalid cost reservation");
      for (const ref of refs) {
        const bucket = await getBucket(tx, ref);
        const used = bucket.costUsedUsd.add(bucket.costReservedUsd).add(reserve);
        const monthly = ref.period.startsWith("month:");
        const daily = ref.period.startsWith("day:");
        let limit: Prisma.Decimal | null = null;
        if (ref.scope === "GLOBAL")
          limit = budget(
            monthly ? "AI_MONTHLY_BUDGET_USD" : "AI_DAILY_BUDGET_USD",
            monthly ? "25" : "5",
          );
        if (ref.scope === "PLAN")
          limit = budget(
            plan.code === "FREE" ? "AI_FREE_POOL_USD" : "AI_PRO_POOL_USD",
            plan.code === "FREE" ? "5" : "20",
          );
        if (ref.scope === "USER" && monthly) limit = plan.monthlyBudgetUsd;
        if (ref.scope === "USER" && daily) limit = plan.dailyBudgetUsd;
        if (!args.byok && (bucket.blocked || (limit && used.gt(limit))))
          throw new ApiError(
            429,
            ref.scope === "USER"
              ? "Alcanzaste tu límite de gasto de IA. Puedes consultar tu historial y volver cuando se renueve."
              : "Se alcanzó el presupuesto disponible de IA. Tu selección sigue guardada; inténtalo después.",
          );
        if (ref.scope === "USER" && monthly) {
          const calls =
            args.operation === "COACH"
              ? bucket.coachUsed + bucket.coachReserved
              : bucket.draftUsed + bucket.draftReserved;
          const cap = args.operation === "COACH" ? plan.monthlyCoachLimit : plan.monthlyDraftLimit;
          if (calls >= cap)
            throw new ApiError(
              429,
              args.operation === "COACH"
                ? "Usaste los análisis de este mes. Tu historial sigue disponible."
                : "Usaste las lecturas de capturas de este mes. Puedes ingresar los campeones manualmente.",
            );
          if (
            args.webSearch &&
            bucket.searchUsed + bucket.searchReserved >= plan.monthlySearchLimit
          )
            throw new ApiError(
              429,
              "Usaste las búsquedas de este mes. Desactiva la búsqueda web para continuar.",
            );
        }
        if (
          ref.scope === "USER" &&
          ref.period.startsWith("minute:") &&
          bucket.coachUsed + bucket.draftUsed + bucket.coachReserved + bucket.draftReserved >=
            plan.minuteRequestLimit
        ) {
          throw new ApiError(
            429,
            "Estás consultando muy rápido. Espera un minuto antes de intentar otra vez.",
          );
        }
      }
      const row = await tx.aiRequest.create({
        data: {
          userId: args.userId,
          idempotencyKey: args.key,
          inputHash: args.inputHash,
          operation: args.operation,
          model: args.model,
          byok: args.byok,
          webSearch: args.webSearch,
          reservedCostUsd: reserve,
          pricing: {
            ...MODEL_POLICIES[args.model as keyof typeof MODEL_POLICIES],
            buckets: refs,
            planVersion: plan.version,
          },
        },
      });
      for (const ref of refs)
        await tx.usageBucket.update({
          where: { scope_scopeId_period: ref },
          data: {
            ...(args.operation === "COACH"
              ? { coachReserved: { increment: 1 } }
              : { draftReserved: { increment: 1 } }),
            costReservedUsd: { increment: reserve },
            activeRequests: { increment: 1 },
            ...(args.webSearch ? { searchReserved: { increment: 1 } } : {}),
          },
        });
      return { request: row, replay: false };
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      const existing = await getDb().aiRequest.findUnique({
        where: { userId_idempotencyKey: { userId: args.userId, idempotencyKey: args.key } },
      });
      if (existing) {
        assertReplay(existing, args.inputHash);
        return { request: existing, replay: true };
      }
    }
    throw error;
  }
}
export async function dispatchGeneration(id: string) {
  const changed = await getDb().aiRequest.updateMany({
    where: { id, status: "RESERVED" },
    data: { status: "DISPATCHED", dispatchedAt: new Date() },
  });
  if (changed.count !== 1) throw new ApiError(409, "La consulta ya está en curso.");
}
export async function observeUsage(id: string, usage: ProviderUsage) {
  let cost: Prisma.Decimal | undefined;
  if (usage.cost !== undefined && /^(?:\d{1,8})(?:\.\d{1,12})?$/.test(usage.cost))
    cost = new Prisma.Decimal(usage.cost);
  await getDb().aiRequest.updateMany({
    where: { id, status: { in: ["DISPATCHED", "UNKNOWN"] } },
    data: {
      ...(usage.id ? { providerRequestId: usage.id } : {}),
      ...(cost !== undefined ? { actualCostUsd: cost } : {}),
      ...(usage.promptTokens !== undefined ? { promptTokens: usage.promptTokens } : {}),
      ...(usage.completionTokens !== undefined ? { completionTokens: usage.completionTokens } : {}),
    },
  });
}
type GenerationOutcome = {
  response?: GeneratedCoachResult | DraftResult;
  error?: { status: number; message: string };
  recordInput?: ReturnType<typeof safeCoachInput>;
};

async function saveCoachRecord(tx: Tx, row: AiRequest, outcome: GenerationOutcome) {
  if (outcome.recordInput && outcome.response && "plan" in outcome.response) {
    const result = outcome.response as GeneratedCoachResult;
    await tx.coachRecord.upsert({
      where: { requestId: row.id },
      update: {},
      create: {
        requestId: row.id,
        userId: row.userId,
        input: outcome.recordInput,
        plan: result.plan as unknown as Prisma.InputJsonValue,
        meta: result.meta as unknown as Prisma.InputJsonValue,
        formatVersion: result.meta.formatVersion || 2,
      },
    });
  }
}

async function finishGenerationInTransaction(
  tx: Tx,
  id: string,
  requestedOutcome: GenerationOutcome,
) {
  const row = await tx.aiRequest.findUniqueOrThrow({ where: { id } });
  // Deletion is a tombstone in every ledger state, including a saved plan whose
  // billing is still UNKNOWN. Later settlement cannot restore private content.
  const outcome: GenerationOutcome = row.failureStatus === 410 ? {} : requestedOutcome;
  if (row.status === "VOID") return row;
  if (row.status === "SETTLED") {
    // A reconciler may settle billing before a validated result is stored.
    // Save that late result once, without charging any bucket a second time.
    // A user's explicit history deletion must never be undone.
    if (!outcome.response || row.response || row.failureStatus === 410) return row;
    await saveCoachRecord(tx, row, outcome);
    return tx.aiRequest.update({
      where: { id },
      data: {
        response: outcome.response as unknown as Prisma.InputJsonValue,
        failureStatus: null,
        failureMessage: null,
      },
    });
  }
  const neverSent = row.status === "RESERVED";
  const knownCost = row.actualCostUsd !== null || row.byok;
  const status = neverSent ? "VOID" : knownCost ? "SETTLED" : "UNKNOWN";
  if (neverSent || knownCost) {
    const charged = neverSent || row.byok ? new Prisma.Decimal(0) : row.actualCostUsd!;
    for (const ref of storedRefs(row))
      await tx.usageBucket.update({
        where: { scope_scopeId_period: ref },
        data: {
          ...(row.operation === "COACH"
            ? {
                coachReserved: { decrement: 1 },
                ...(!neverSent ? { coachUsed: { increment: 1 } } : {}),
              }
            : {
                draftReserved: { decrement: 1 },
                ...(!neverSent ? { draftUsed: { increment: 1 } } : {}),
              }),
          costReservedUsd: { decrement: row.reservedCostUsd },
          costUsedUsd: { increment: charged },
          activeRequests: { decrement: 1 },
          ...(row.webSearch
            ? {
                searchReserved: { decrement: 1 },
                ...(!neverSent ? { searchUsed: { increment: 1 } } : {}),
              }
            : {}),
          ...(charged.gt(row.reservedCostUsd) ? { blocked: true } : {}),
        },
      });
  }
  const data: Prisma.AiRequestUpdateInput = {
    status,
    settledAt: status === "UNKNOWN" ? null : new Date(),
    ...(outcome.response ? { response: outcome.response as unknown as Prisma.InputJsonValue } : {}),
    ...(outcome.error
      ? { failureStatus: outcome.error.status, failureMessage: outcome.error.message }
      : {}),
  };
  await saveCoachRecord(tx, row, outcome);
  return tx.aiRequest.update({ where: { id }, data });
}

export async function finishGeneration(id: string, outcome: GenerationOutcome) {
  return withUsageTransaction((tx) => finishGenerationInTransaction(tx, id, outcome));
}

/** Recover only abandoned application work; elapsed time never proves a refund. */
export async function recoverAbandonedGenerations(userId: string, now = new Date()) {
  const cutoff = new Date(now.getTime() - ABANDONED_GENERATION_MS);
  return withUsageTransaction(async (tx) => {
    const rows = await tx.aiRequest.findMany({
      where: {
        userId,
        OR: [
          { status: "RESERVED", createdAt: { lte: cutoff } },
          { status: "DISPATCHED", dispatchedAt: { lte: cutoff } },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 10,
    });
    let voided = 0;
    let uncertain = 0;
    for (const row of rows) {
      if (row.status === "RESERVED") {
        // Serialization and dispatch's RESERVED compare-and-swap guarantee
        // that the original process cannot send after this unsent refund.
        const result = await finishGenerationInTransaction(tx, row.id, {
          error: {
            status: 503,
            message: "La consulta no llegó a enviarse. Puedes iniciar un nuevo análisis.",
          },
        });
        if (result.status === "VOID") voided++;
      } else {
        const changed = await tx.aiRequest.updateMany({
          where: { id: row.id, userId, status: "DISPATCHED", dispatchedAt: { lte: cutoff } },
          data: {
            status: "UNKNOWN",
            failureStatus: 503,
            failureMessage:
              "No pudimos confirmar esta consulta. Conservamos su cuota y presupuesto mientras comprobamos el coste.",
          },
        });
        uncertain += changed.count;
      }
    }
    return { voided, uncertain };
  });
}
export function replayResponse(row: AiRequest): GeneratedCoachResult | DraftResult {
  if (row.response) return row.response as unknown as GeneratedCoachResult | DraftResult;
  if (row.failureStatus && row.failureMessage)
    throw new ApiError(row.failureStatus, row.failureMessage);
  throw new ApiError(
    409,
    "Esta consulta sigue en curso o pendiente de confirmar. No se ha iniciado otra llamada de IA.",
  );
}
export async function getAccountUsage(userId: string) {
  const db = getDb();
  const now = new Date();
  const plan = await effectivePlan(db, userId, now);
  const bucket = await db.usageBucket.findUnique({
    where: { scope_scopeId_period: { scope: "USER", scopeId: userId, period: periods(now).month } },
  });
  const [pending, uncertain] = await Promise.all([
    db.aiRequest.count({ where: { userId, status: { in: ["RESERVED", "DISPATCHED"] } } }),
    db.aiRequest.count({ where: { userId, status: "UNKNOWN" } }),
  ]);
  return {
    plan: plan.code,
    coachRemaining: Math.max(
      0,
      plan.monthlyCoachLimit - (bucket?.coachUsed || 0) - (bucket?.coachReserved || 0),
    ),
    draftRemaining: Math.max(
      0,
      plan.monthlyDraftLimit - (bucket?.draftUsed || 0) - (bucket?.draftReserved || 0),
    ),
    webRemaining: plan.webSearchAllowed
      ? Math.max(
          0,
          plan.monthlySearchLimit - (bucket?.searchUsed || 0) - (bucket?.searchReserved || 0),
        )
      : 0,
    resetsAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString(),
    pending,
    uncertain,
    allowedModels: plan.allowedModels.filter((model) => model in MODEL_POLICIES),
    webAllowed: plan.webSearchAllowed,
  };
}
