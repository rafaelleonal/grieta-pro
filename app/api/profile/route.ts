import { requireVerifiedUser } from "@/lib/auth-session";
import {
  getGameProfile,
  limitGameProfileWrites,
  parseGameProfileInput,
  saveGameProfile,
} from "@/lib/game-profile";
import { assertSameOrigin, errorResponse, jsonResponse, readJsonBody } from "@/lib/http";

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
    return privateResponse(jsonResponse(await getGameProfile(user.id)));
  } catch (error) {
    return privateResponse(errorResponse(error));
  }
}

export async function PUT(request: Request) {
  try {
    assertSameOrigin(request);
    const { user } = await requireVerifiedUser(request);
    await limitGameProfileWrites(user.id);
    const input = parseGameProfileInput(await readJsonBody(request, 1024));
    return privateResponse(jsonResponse(await saveGameProfile(user.id, input)));
  } catch (error) {
    return privateResponse(errorResponse(error));
  }
}
