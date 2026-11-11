import { Prisma } from "../generated/prisma/client";
import { getDb } from "./db";
import { ApiError } from "./errors";

/**
 * Límites simples (ADR 0009): builds nuevas por cuenta y día, y un tope diario de gasto
 * de la app con el coste que informa OpenRouter. El límite de crédito de la clave en
 * OpenRouter es el tope duro. Las builds en caché no cuentan.
 */
const DEFAULT_USER_DAILY_BUILDS = 30;
const DEFAULT_DAILY_BUDGET_USD = "5";
/** Charged to the app budget when the provider does not report a cost (Opus: ~USD 0.08). */
export const ESTIMATED_BUILD_COST_USD = "0.10";

export function buildLimits() {
  const builds = Number(process.env.AI_USER_DAILY_BUILDS?.trim() || DEFAULT_USER_DAILY_BUILDS);
  const budget = process.env.AI_DAILY_BUDGET_USD?.trim() || DEFAULT_DAILY_BUDGET_USD;
  if (
    !Number.isSafeInteger(builds) ||
    builds < 0 ||
    builds > 10_000 ||
    !/^\d{1,5}(?:\.\d{1,8})?$/.test(budget)
  )
    throw new ApiError(503, "Revisa los límites diarios de IA del servidor.");
  return { userDailyBuilds: builds, dailyBudgetUsd: new Prisma.Decimal(budget) };
}

export const usageDay = (now: Date) => now.toISOString().slice(0, 10);
const userScope = (userId: string) => `user:${userId}`;

async function ensureRows(scopes: string[], day: string) {
  for (let attempt = 0; ; attempt++) {
    try {
      await getDb().buildUsage.createMany({
        data: scopes.map((scope) => ({ scope, day })),
        skipDuplicates: true,
      });
      return;
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : null;
      if (code !== "P2002" || attempt >= 2) throw error;
    }
  }
}

/** Claim one new AI build. The conditional increment is atomic under concurrency. */
export async function claimDailyBuild(userId: string, now = new Date()): Promise<string> {
  const limits = buildLimits();
  const day = usageDay(now);
  const scope = userScope(userId);
  await ensureRows(["global", scope], day);
  const db = getDb();
  const global = await db.buildUsage.findUniqueOrThrow({
    where: { scope_day: { scope: "global", day } },
  });
  if (global.costUsd.gte(limits.dailyBudgetUsd))
    throw new ApiError(
      429,
      "La app alcanzó su presupuesto de IA de hoy. Los matchups ya generados siguen disponibles; las builds nuevas vuelven mañana (00:00 UTC).",
    );
  const claimed = await db.buildUsage.updateMany({
    where: { scope, day, builds: { lt: limits.userDailyBuilds } },
    data: { builds: { increment: 1 } },
  });
  if (claimed.count !== 1)
    throw new ApiError(
      429,
      `Ya generaste tus ${limits.userDailyBuilds} builds nuevas de hoy. Los matchups ya generados siguen disponibles; se renueva a las 00:00 UTC.`,
    );
  await db.buildUsage.update({
    where: { scope_day: { scope: "global", day } },
    data: { builds: { increment: 1 } },
  });
  return day;
}

/** Add the reported (or estimated) cost of one sent request to the account and the app. */
export async function recordBuildCost(userId: string, day: string, cost: string | null) {
  await getDb().buildUsage.updateMany({
    where: { scope: { in: ["global", userScope(userId)] }, day },
    data: { costUsd: { increment: new Prisma.Decimal(cost ?? ESTIMATED_BUILD_COST_USD) } },
  });
}

export async function getBuildUsage(userId: string, now = new Date()) {
  const limits = buildLimits();
  const day = usageDay(now);
  const rows = await getDb().buildUsage.findMany({
    where: { day, scope: { in: ["global", userScope(userId)] } },
  });
  const user = rows.find((row) => row.scope !== "global");
  const global = rows.find((row) => row.scope === "global");
  return {
    buildsToday: user?.builds ?? 0,
    dailyLimit: limits.userDailyBuilds,
    appBudgetReached: Boolean(global?.costUsd.gte(limits.dailyBudgetUsd)),
    resetsAt: new Date(Date.parse(`${day}T00:00:00.000Z`) + 86_400_000).toISOString(),
  };
}
