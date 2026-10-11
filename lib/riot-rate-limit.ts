import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { ApiError } from "./errors";

const USER_IMPORTS_PER_MINUTE = 3;
const GLOBAL_IMPORTS_PER_MINUTE = 20;
const MAX_ATTEMPTS = 5;

/**
 * Limits whole active-game imports before Riot is contacted. Both counters are
 * committed together: a rejected user cannot consume the shared import budget.
 * Fixed keys keep at most one global row and one row per account. lastRequest
 * stores the UTC minute start; the next minute resets those rows atomically.
 * Prefixes keep them separate from Better Auth's per-path counters.
 */
export async function limitRiotImport(userId: string, now = new Date()): Promise<void> {
  if (!userId || userId.length > 128 || !Number.isFinite(now.getTime())) {
    throw new ApiError(400, "No pudimos validar tu cuenta para esta consulta.");
  }
  const minuteStart = BigInt(Math.floor(now.getTime() / 60_000) * 60_000);
  const rows = [
    { key: "cholo-riot:global", maximum: GLOBAL_IMPORTS_PER_MINUTE, global: true },
    { key: `cholo-riot:user:${userId}`, maximum: USER_IMPORTS_PER_MINUTE, global: false },
  ];
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      await getDb().$transaction(
        async (transaction) => {
          for (const row of rows) {
            await transaction.rateLimit.upsert({
              where: { key: row.key },
              create: { id: randomUUID(), key: row.key, count: 0, lastRequest: minuteStart },
              update: {},
            });
            // A delayed request from the previous minute must never roll a newer
            // bucket backwards or erase requests that already used that window.
            await transaction.rateLimit.updateMany({
              where: { key: row.key, lastRequest: { lt: minuteStart } },
              data: { count: 0, lastRequest: minuteStart },
            });
            const changed = await transaction.rateLimit.updateMany({
              where: { key: row.key, lastRequest: minuteStart, count: { lt: row.maximum } },
              data: { count: { increment: 1 } },
            });
            if (changed.count !== 1)
              throw new ApiError(
                429,
                row.global
                  ? "La conexión con Riot está ocupada. Espera un minuto antes de intentar otra vez."
                  : "Ya consultaste Riot tres veces este minuto. Espera un minuto antes de intentar otra vez.",
              );
          }
        },
        { isolationLevel: "Serializable", timeout: 5_000 },
      );
      return;
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : null;
      if (code !== "P2034" && code !== "P2002") throw error;
      if (attempt === MAX_ATTEMPTS - 1)
        throw new ApiError(
          503,
          "La conexión con Riot está ocupada. Inténtalo nuevamente en unos momentos.",
        );
      await new Promise((resolve) => setTimeout(resolve, 10 + attempt * 15 + Math.random() * 20));
    }
  }
}
