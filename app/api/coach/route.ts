import { requireVerifiedUser } from "@/lib/auth-session";
import { buildModel, generateBuild } from "@/lib/build-ai";
import { buildCacheKey, readCachedBuild, storeCachedBuild } from "@/lib/build-cache";
import { claimDailyBuild, recordBuildCost } from "@/lib/build-quota";
import { getCatalog, getChampionDetails } from "@/lib/catalog";
import { limitGenerationInput } from "@/lib/generation-admission";
import { saveHistory } from "@/lib/history";
import { ApiError, assertSameOrigin, errorResponse, jsonResponse, readJsonBody } from "@/lib/http";
import { validateCoachInput } from "@/lib/validation";

export const runtime = "nodejs";
// One Flash call is usually a few seconds; the provider call itself times out at 45 s.
export const maxDuration = 60;

/** Pass a failed side effect to the logs without failing a build the player already has. */
function logFailure(step: string) {
  return (error: unknown) =>
    console.error(`[coach] ${step} failed`, error instanceof Error ? error.name : "unknown");
}

/**
 * ADR 0009: tu campeón, tu rival y tu rol → caché del matchup o una sola llamada a la IA.
 * No hay reservas pendientes: si una consulta falla, se puede volver a pedir.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const { user } = await requireVerifiedUser(request);
    await limitGenerationInput(user.id);
    const body = await readJsonBody(request, 1_024);
    const catalog = await getCatalog();
    const input = validateCoachInput(body, catalog);
    const model = buildModel();
    const key = buildCacheKey(input, catalog.version, model);

    const cached = await readCachedBuild(key);
    if (cached) {
      await saveHistory(user.id, input, cached).catch(logFailure("history"));
      return jsonResponse(cached);
    }

    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey)
      throw new ApiError(503, "La IA no está configurada en el servidor. Inténtalo más tarde.");
    const [champion, enemy] = await Promise.all([
      getChampionDetails(input.champion, catalog),
      getChampionDetails(input.enemy, catalog),
    ]);
    const day = await claimDailyBuild(user.id);
    let cost: Promise<void> = Promise.resolve();
    try {
      // Deliberately not tied to request.signal: if the player leaves, the paid answer
      // still lands in the cache and their history, so asking again is instant.
      const generated = await generateBuild(
        input,
        catalog,
        { champion, enemy },
        {
          apiKey,
          model,
          onCost: (value) => {
            cost = recordBuildCost(user.id, day, value).catch(logFailure("cost"));
          },
        },
      );
      await Promise.all([
        generated.complete
          ? storeCachedBuild(key, generated.result).catch(logFailure("cache"))
          : undefined,
        saveHistory(user.id, input, generated.result).catch(logFailure("history")),
      ]);
      return jsonResponse(generated.result);
    } finally {
      await cost;
    }
  } catch (error) {
    return errorResponse(error);
  }
}
