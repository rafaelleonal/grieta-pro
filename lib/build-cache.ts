import type { Prisma } from "../generated/prisma/client";
import { BUILD_CONTRACT } from "./build-contract";
import { getDb } from "./db";
import type { BuildCoachResult, CoachInput } from "./types";

/**
 * Caché compartida por versión de Data Dragon, matchup, rol, modelo y contrato
 * (ADR 0009). Sólo guarda builds completas y validadas con catálogo vivo; no contiene
 * datos de cuentas. Una versión nueva del catálogo deja de usar las anteriores.
 */
export type BuildCacheKey = {
  version: string;
  champion: string;
  enemy: string;
  role: string;
  model: string;
  contract: string;
};

export function buildCacheKey(input: CoachInput, version: string, model: string): BuildCacheKey {
  return {
    version,
    champion: input.champion,
    enemy: input.enemy,
    role: input.role,
    model,
    contract: BUILD_CONTRACT,
  };
}

export async function readCachedBuild(key: BuildCacheKey): Promise<BuildCoachResult | null> {
  const row = await getDb().buildCache.findUnique({
    where: { version_champion_enemy_role_model_contract: key },
  });
  if (!row) return null;
  const result = row.result as unknown as BuildCoachResult;
  return { ...result, meta: { ...result.meta, cached: true } };
}

export async function storeCachedBuild(key: BuildCacheKey, result: BuildCoachResult) {
  const db = getDb();
  // The first validated build wins; a concurrent duplicate keeps the stored one.
  await db.buildCache.upsert({
    where: { version_champion_enemy_role_model_contract: key },
    create: { ...key, result: result as unknown as Prisma.InputJsonValue },
    update: {},
  });
  // Rows from previous catalog versions are no longer read; prune them after a grace
  // period so two instances seeing different Data Dragon versions never fight.
  await db.buildCache.deleteMany({
    where: {
      version: { not: key.version },
      createdAt: { lt: new Date(Date.now() - CACHE_RETENTION_MS) },
    },
  });
}

const CACHE_RETENTION_MS = 30 * 86_400_000;
