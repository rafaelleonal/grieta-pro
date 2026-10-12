import { getCatalog } from "@/lib/catalog";
import { ApiError, assertSameOrigin, errorResponse, jsonResponse, readJsonBody } from "@/lib/http";
import { requireVerifiedUser } from "@/lib/auth-session";
import { limitRiotImport } from "@/lib/riot-rate-limit";
import { getRiotProfile, parseRiotInput } from "@/lib/riot";

export const runtime = "nodejs";
export const maxDuration = 30;

/** Onboarding: lee rango y maestría públicos de un Riot ID. No guarda el Riot ID. */
export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const session = await requireVerifiedUser(request);
    const input = parseRiotInput(await readJsonBody(request, 4_096));
    const key = process.env.RIOT_API_KEY?.trim();
    if (!key)
      throw new ApiError(
        503,
        "La conexión con Riot no está configurada. Puedes elegir tu perfil a mano.",
      );
    await limitRiotImport(session.user.id);
    const catalog = await getCatalog();
    const response = jsonResponse(await getRiotProfile(input, catalog.champions, key));
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
