import { getCatalog, getChampionDetails } from "@/lib/catalog";
import { assertSameOrigin, errorResponse, jsonResponse, readJsonBody } from "@/lib/http";
import { generateCoach } from "@/lib/openrouter";
import { requireVerifiedUser } from "@/lib/auth-session";
import { runGeneration } from "@/lib/generation";
import { limitGenerationInput } from "@/lib/generation-admission";
import { safeCoachInput } from "@/lib/usage";
import { validateCoachInput, validateCoachInputStructure } from "@/lib/validation";

export const runtime = "nodejs";
// Haiku max may spend longer reasoning; leave time for catalog, accounting and history.
export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const session = await requireVerifiedUser(request);
    await limitGenerationInput(session.user.id);
    const body = validateCoachInputStructure(await readJsonBody(request, 16_000));
    // Validate shape and authorization before any network call.
    const catalog = await getCatalog();
    const input = validateCoachInput(body, catalog);
    const [champion, enemy] = await Promise.all([
      getChampionDetails(input.champion, catalog),
      getChampionDetails(input.enemy, catalog),
    ]);
    return jsonResponse(
      await runGeneration(request, {
        operation: "COACH",
        input,
        fingerprint: safeCoachInput(input),
        coachInput: input,
        work: (execution) =>
          generateCoach(input, catalog, { champion, enemy }, fetch, request.signal, execution),
      }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
