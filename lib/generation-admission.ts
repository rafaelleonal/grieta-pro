import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { ApiError } from "./errors";

const USER_REQUESTS_PER_MINUTE = 10;
const GLOBAL_REQUESTS_PER_MINUTE = 120;

/**
 * Per-minute admission before reading the body, for cached and new builds alike.
 * Each statement is atomic in PostgreSQL: the conditional increment re-checks the
 * count after waiting for a concurrent update, so no serializable retries are needed.
 */
export async function limitGenerationInput(userId: string, now = new Date()): Promise<void> {
  if (!userId || userId.length > 128 || !Number.isFinite(now.getTime()))
    throw new ApiError(400, "No pudimos validar tu cuenta para esta consulta.");
  const minute = BigInt(Math.floor(now.getTime() / 60_000) * 60_000);
  const db = getDb();
  for (const row of [
    { key: `elociencia-build:user:${userId}`, maximum: USER_REQUESTS_PER_MINUTE, shared: false },
    { key: "elociencia-build:global", maximum: GLOBAL_REQUESTS_PER_MINUTE, shared: true },
  ]) {
    await db.rateLimit.createMany({
      data: [{ id: randomUUID(), key: row.key, count: 0, lastRequest: minute }],
      skipDuplicates: true,
    });
    // An older minute starts over; a delayed request never resets a newer minute.
    await db.rateLimit.updateMany({
      where: { key: row.key, lastRequest: { lt: minute } },
      data: { count: 0, lastRequest: minute },
    });
    const accepted = await db.rateLimit.updateMany({
      where: { key: row.key, lastRequest: minute, count: { lt: row.maximum } },
      data: { count: { increment: 1 } },
    });
    if (accepted.count !== 1)
      throw new ApiError(
        429,
        row.shared
          ? "Elociencia está recibiendo muchas consultas. Espera un minuto."
          : "Estás pidiendo builds muy rápido. Espera un minuto.",
      );
  }
}
