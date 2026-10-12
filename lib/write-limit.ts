import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { ApiError } from "./errors";

/**
 * Contadores fijos por minuto en la base de datos (uno global y uno por cuenta) para
 * escrituras de perfil que no gastan cuota de IA. Ambos se confirman juntos.
 */
export async function limitUserWrites(
  {
    prefix,
    userId,
    globalMaximum,
    userMaximum,
    limitedMessage,
    unavailableMessage,
    invalidMessage,
  }: {
    prefix: string;
    userId: string;
    globalMaximum: number;
    userMaximum: number;
    limitedMessage: string;
    unavailableMessage: string;
    invalidMessage: string;
  },
  now = new Date(),
): Promise<void> {
  if (!userId || userId.length > 128 || !Number.isFinite(now.getTime()))
    throw new ApiError(400, invalidMessage);
  const minuteStart = BigInt(Math.floor(now.getTime() / 60_000) * 60_000);
  const rows = [
    { key: `${prefix}:global`, maximum: globalMaximum },
    { key: `${prefix}:user:${userId}`, maximum: userMaximum },
  ];
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      await getDb().$transaction(
        async (transaction) => {
          for (const row of rows) {
            await transaction.rateLimit.upsert({
              where: { key: row.key },
              create: { id: randomUUID(), key: row.key, count: 0, lastRequest: minuteStart },
              update: {},
            });
            await transaction.rateLimit.updateMany({
              where: { key: row.key, lastRequest: { lt: minuteStart } },
              data: { count: 0, lastRequest: minuteStart },
            });
            const changed = await transaction.rateLimit.updateMany({
              where: { key: row.key, lastRequest: minuteStart, count: { lt: row.maximum } },
              data: { count: { increment: 1 } },
            });
            if (changed.count !== 1) throw new ApiError(429, limitedMessage);
          }
        },
        { isolationLevel: "Serializable", timeout: 5_000 },
      );
      return;
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : null;
      if (code !== "P2034" && code !== "P2002") throw error;
      if (attempt === 9) throw new ApiError(503, unavailableMessage);
      await new Promise((resolve) => setTimeout(resolve, 15 + attempt * 20 + Math.random() * 30));
    }
  }
}
