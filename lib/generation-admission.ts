import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { ApiError } from "./errors";

const USER_INPUTS_PER_MINUTE = 6;
const GLOBAL_INPUTS_PER_MINUTE = 30;
const MAX_ATTEMPTS = 10;

/**
 * Admit authenticated coach/draft requests before reading or processing input.
 * This is separate from billable quotas: invalid inputs and idempotent retries
 * still consume admission capacity, but never an AI generation or money quota.
 * Fixed keys bound storage to one global row plus one row per account. Both
 * counters commit together, so a rejected user cannot consume shared capacity.
 */
export async function limitGenerationInput(userId: string, now = new Date()): Promise<void> {
  if (!userId || userId.length > 128 || !Number.isFinite(now.getTime())) {
    throw new ApiError(400, "No pudimos validar tu cuenta para esta consulta.");
  }
  const minuteStart = BigInt(Math.floor(now.getTime() / 60_000) * 60_000);
  const rows = [
    { key: "cholo-generation-input:global", maximum: GLOBAL_INPUTS_PER_MINUTE, shared: true },
    {
      key: `cholo-generation-input:user:${userId}`,
      maximum: USER_INPUTS_PER_MINUTE,
      shared: false,
    },
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
            // Delayed requests must never erase a newer minute's accepted inputs.
            await transaction.rateLimit.updateMany({
              where: { key: row.key, lastRequest: { lt: minuteStart } },
              data: { count: 0, lastRequest: minuteStart },
            });
            const changed = await transaction.rateLimit.updateMany({
              where: { key: row.key, lastRequest: minuteStart, count: { lt: row.maximum } },
              data: { count: { increment: 1 } },
            });
            if (changed.count !== 1) {
              throw new ApiError(
                429,
                row.shared
                  ? "El coach está ocupado. Espera un minuto antes de intentar otra vez."
                  : "Estás enviando consultas muy rápido. Espera un minuto antes de intentar otra vez.",
              );
            }
          }
        },
        { isolationLevel: "Serializable", timeout: 5_000 },
      );
      return;
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : null;
      if (code !== "P2034" && code !== "P2002") throw error;
      if (attempt === MAX_ATTEMPTS - 1) {
        throw new ApiError(503, "El coach está ocupado. Inténtalo nuevamente en unos momentos.");
      }
      await new Promise((resolve) => setTimeout(resolve, 15 + attempt * 20 + Math.random() * 30));
    }
  }
}
