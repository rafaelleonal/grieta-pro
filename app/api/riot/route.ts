import { getCatalog } from "@/lib/catalog";
import { ApiError, assertSameOrigin, errorResponse, jsonResponse, readJsonBody } from "@/lib/http";
import { requireVerifiedUser } from "@/lib/auth-session";
import { limitRiotImport } from "@/lib/riot-rate-limit";
import { getRiotActiveGame, parseRiotInput } from "@/lib/riot";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const session = await requireVerifiedUser(request);
    const input = parseRiotInput(await readJsonBody(request, 4_096));
    const key = process.env.RIOT_API_KEY?.trim();
    if (!key)
      throw new ApiError(
        503,
        "La conexión con Riot no está configurada. Puedes usar texto o una captura.",
      );
    await limitRiotImport(session.user.id);
    const catalog = await getCatalog();
    return jsonResponse(await getRiotActiveGame(input, catalog.champions, key));
  } catch (error) {
    return errorResponse(error);
  }
}
