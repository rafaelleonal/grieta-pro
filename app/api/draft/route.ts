import { getCatalog } from "@/lib/catalog";
import { assertSameOrigin, errorResponse, jsonResponse, readJsonBody } from "@/lib/http";
import { extractDraft } from "@/lib/openrouter";
import { requireVerifiedUser } from "@/lib/auth-session";
import { runGeneration } from "@/lib/generation";
import { limitGenerationInput } from "@/lib/generation-admission";
import { inputHash } from "@/lib/usage";
import { normalizeDraftImage } from "@/lib/server-image";
import { validateDraftInput } from "@/lib/validation";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOrigin(request);
    const session = await requireVerifiedUser(request);
    await limitGenerationInput(session.user.id);
    const input = validateDraftInput(await readJsonBody(request));
    const fingerprint = {
      text: input.text || "",
      imageHash: input.image ? inputHash(input.image) : null,
    };
    const catalog = await getCatalog();
    return jsonResponse(
      await runGeneration(request, {
        operation: "DRAFT",
        input,
        fingerprint,
        work: async (execution) => {
          // Reserve quotas and per-account concurrency before expensive decoding.
          // Invalid images fail before dispatch, so the reservation is voided.
          if (input.image) input.image = await normalizeDraftImage(input.image);
          return extractDraft(input, catalog, fetch, request.signal, execution);
        },
      }),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
