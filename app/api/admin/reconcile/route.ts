import { requireAdmin } from "@/lib/auth-session";
import { getDb } from "@/lib/db";
import { ApiError, assertSameOrigin, errorResponse, jsonResponse } from "@/lib/http";
import { finishGeneration, observeUsage } from "@/lib/usage";
export const runtime = "nodejs";
export const maxDuration = 60;

async function readGeneration(response: Response) {
  const maxBytes = 32_000;
  if (!response.ok || Number(response.headers.get("content-length")) > maxBytes || !response.body) {
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
      if (bytes > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"))?.data;
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireAdmin(request);
    const key = process.env.OPENROUTER_API_KEY?.trim();
    if (!key) throw new ApiError(503, "Configura OpenRouter antes de conciliar el consumo.");
    const rows = await getDb().aiRequest.findMany({
      where: {
        byok: false,
        status: { in: ["DISPATCHED", "UNKNOWN"] },
        providerRequestId: { not: null },
        createdAt: { lt: new Date(Date.now() - 120_000) },
      },
      take: 10,
      orderBy: { createdAt: "asc" },
    });
    let reconciled = 0;
    for (const row of rows) {
      const url = new URL("https://openrouter.ai/api/v1/generation");
      url.searchParams.set("id", row.providerRequestId!);
      try {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${key}` },
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.timeout(4000),
        });
        const data = await readGeneration(response);
        if (
          data?.id !== row.providerRequestId ||
          typeof data.total_cost !== "number" ||
          !Number.isFinite(data.total_cost) ||
          data.total_cost < 0
        )
          continue;
        await observeUsage(row.id, {
          id: row.providerRequestId!,
          cost: data.total_cost.toFixed(12),
        });
        await finishGeneration(row.id, {});
        reconciled++;
      } catch {
        /* Keep unknown reservations, never assume a refund. */
      }
    }
    const unresolved = await getDb().aiRequest.count({
      where: { status: { in: ["DISPATCHED", "UNKNOWN"] } },
    });
    return jsonResponse({ reconciled, unresolved });
  } catch (error) {
    return errorResponse(error);
  }
}
