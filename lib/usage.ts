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
import type { CoachInput, CoachResult, DraftResult } from "./types";

export const MODEL_POLICIES = {
  "anthropic/claude-haiku-5.5": { prompt: 0.5, completion: 2.5, reasoning: false },
  "openai/gpt-6-luna": { prompt: 0.2, completion: 0.75, reasoning: false },
  "anthropic/claude-sonnet-5.5": { prompt: 2, completion: 10, reasoning: true },
} as const;
export const MAX_PROMPT_BYTES = 96_000;
// One normalized image <=1024x1024. Conservative allowance, separate from text.
const MAX_IMAGE_TOKENS = 65_536;
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
async function serial<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
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
  const model = requestedModel || process.env.OPENROUTER_MODEL || "anthropic/claude-haiku-5.5";
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
  const policy = MODEL_POLICIES[model as keyof typeof MODEL_POLICIES];
  if (!policy) throw new ApiError(403, "Este modelo no está disponible.");
  // UTF-8 bytes bound text tokens conservatively; allow the longest cache-write
  // premium and high-context tariff. Reasoning shares the completion cap.
  const inputTokens =
    MAX_PROMPT_BYTES + (hasImage ? MAX_IMAGE_TOKENS : 0) + (webSearch ? 40_000 : 0);
  const turns = webSearch ? 2 : 1;
  return new Prisma.Decimal(inputTokens)
    .mul(policy.prompt)
    .mul(2)
    .mul(turns)
    .add(new Prisma.Decimal(operation === "COACH" ? 4200 : 1600).mul(policy.completion).mul(turns))
    .div(1_000_000)
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
    return await serial(async (tx) => {
      const existing = await tx.aiRequest.findUnique({
        where: { userId_idempotencyKey: { userId: args.userId, idempotencyKey: args.key } },
      });
      if (existing) {
        assertReplay(existing, args.inputHash);
        return { request: existing, replay: true };
      }
      const now = new Date();
      const plan = await effectivePlan(tx, args.userId, now);
      if (
        !plan.allowedModels.includes(args.model) ||
        !(args.model in MODEL_POLICIES) ||
        (args.webSearch && !plan.webSearchAllowed)
      )
        throw new ApiError(403, "La configuración solicitada no está incluida en tu plan.");
      const active = await tx.aiRequest.count({
        where: { userId: args.userId, status: { in: ["RESERVED", "DISPATCHED", "UNKNOWN"] } },
      });
      if (active >= plan.concurrentLimit)
        throw new ApiError(
          429,
          "Ya tienes una consulta en curso o pendiente de confirmar. Espera a que termine.",
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
export async function finishGeneration(
  id: string,
  outcome: {
    response?: CoachResult | DraftResult;
    error?: { status: number; message: string };
    recordInput?: ReturnType<typeof safeCoachInput>;
  },
) {
  return serial(async (tx) => {
    const row = await tx.aiRequest.findUniqueOrThrow({ where: { id } });
    if (["SETTLED", "VOID"].includes(row.status)) return row;
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
      ...(outcome.response
        ? { response: outcome.response as unknown as Prisma.InputJsonValue }
        : {}),
      ...(outcome.error
        ? { failureStatus: outcome.error.status, failureMessage: outcome.error.message }
        : {}),
    };
    if (outcome.recordInput && outcome.response && "plan" in outcome.response) {
      const result = outcome.response as CoachResult;
      await tx.coachRecord.upsert({
        where: { requestId: id },
        update: {},
        create: {
          requestId: id,
          userId: row.userId,
          input: outcome.recordInput,
          plan: result.plan as unknown as Prisma.InputJsonValue,
          meta: result.meta as unknown as Prisma.InputJsonValue,
        },
      });
    }
    return tx.aiRequest.update({ where: { id }, data });
  });
}
export function replayResponse(row: AiRequest): CoachResult | DraftResult {
  if (row.response) return row.response as unknown as CoachResult | DraftResult;
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
  const pending = await db.aiRequest.count({
    where: { userId, status: { in: ["RESERVED", "DISPATCHED", "UNKNOWN"] } },
  });
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
    allowedModels: plan.allowedModels.filter((model) => model in MODEL_POLICIES),
    webAllowed: plan.webSearchAllowed,
  };
}
