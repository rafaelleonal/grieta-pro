import { getDb } from "./db";
import { ApiError } from "./http";
import { Prisma, type CoachRecord } from "../generated/prisma/client";
function publicRecord(row: CoachRecord) {
  const meta = row.meta && typeof row.meta === "object" && !Array.isArray(row.meta) ? row.meta : {};
  const current =
    row.plan && typeof row.plan === "object" && !Array.isArray(row.plan) && "phases" in row.plan;
  return {
    id: row.id,
    input: row.input,
    result: {
      plan: row.plan,
      meta: {
        ...meta,
        formatVersion:
          "formatVersion" in meta && (meta.formatVersion === 3 || meta.formatVersion === 4)
            ? meta.formatVersion
            : current
              ? 2
              : 1,
      },
    },
    createdAt: row.createdAt.toISOString(),
  };
}
export async function listHistory(userId: string, cursor?: string) {
  if (cursor && !/^[a-zA-Z0-9_-]{1,80}$/.test(cursor))
    throw new ApiError(400, "La página del historial no es válida.");
  const boundary = cursor
    ? await getDb().coachRecord.findFirst({ where: { id: cursor, userId } })
    : null;
  if (cursor && !boundary) throw new ApiError(404, "No encontramos ese registro.");
  const rows = await getDb().coachRecord.findMany({
    where: {
      userId,
      ...(boundary
        ? {
            OR: [
              { createdAt: { lt: boundary.createdAt } },
              { createdAt: boundary.createdAt, id: { lt: boundary.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 21,
  });
  return {
    records: rows.slice(0, 20).map(publicRecord),
    nextCursor: rows.length > 20 ? rows[19].id : null,
  };
}
export async function readHistory(userId: string, id: string) {
  const row = await getDb().coachRecord.findFirst({ where: { userId, id } });
  if (!row) throw new ApiError(404, "No encontramos ese registro.");
  return publicRecord(row);
}
export async function deleteHistory(userId: string, id: string) {
  // Remove the cached replay too: deleting history must not leave a second copy
  // of the notes/plan in the ledger, nor permit the same key to regenerate.
  await getDb().$transaction(async (tx) => {
    const row = await tx.coachRecord.findFirst({ where: { userId, id } });
    if (!row) throw new ApiError(404, "No encontramos ese registro.");
    await tx.aiRequest.update({
      where: { id: row.requestId },
      data: {
        response: Prisma.DbNull,
        failureStatus: 410,
        failureMessage:
          "Este análisis fue eliminado del historial. Inicia una nueva consulta si lo necesitas.",
      },
    });
    await tx.coachRecord.delete({ where: { id: row.id } });
  });
}
