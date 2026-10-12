import { requireVerifiedUser } from "@/lib/auth-session";
import { getCatalog } from "@/lib/catalog";
import {
  championPreferenceInputSchema,
  getChampionPreferences,
  limitChampionPreferenceWrites,
  parseChampionPreferenceInput,
  saveChampionPreferences,
} from "@/lib/champion-preferences";
import { ApiError, assertSameOrigin, errorResponse, jsonResponse, readJsonBody } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function privateResponse(response: Response): Response {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(request: Request) {
  try {
    assertSameOrigin(request);
    const { user } = await requireVerifiedUser(request);
    return privateResponse(jsonResponse(await getChampionPreferences(user.id)));
  } catch (error) {
    return privateResponse(errorResponse(error));
  }
}

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const { user } = await requireVerifiedUser(request);
    await limitChampionPreferenceWrites(user.id);
    let body: unknown;
    try {
      body = await readJsonBody(request, 4096);
    } catch (error) {
      if (error instanceof ApiError && error.status === 413)
        throw new ApiError(413, "La selección de favoritos es demasiado grande.");
      throw error;
    }
    // Reject structural errors before fetching even the public Riot catalog.
    if (!championPreferenceInputSchema.safeParse(body).success)
      throw new ApiError(
        400,
        "Elige una posición y hasta 12 campeones distintos para tus favoritos.",
      );
    const input = parseChampionPreferenceInput(body, await getCatalog());
    return privateResponse(jsonResponse(await saveChampionPreferences(user.id, input)));
  } catch (error) {
    return privateResponse(errorResponse(error));
  }
}
