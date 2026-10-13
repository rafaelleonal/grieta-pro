import { after } from "next/server";
import { createCoachTrace } from "@/lib/coach-trace";
import { coachStreamResponse } from "@/lib/coach-stream-response";
import type { CoachBrief } from "@/lib/types";
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
  let trace: ReturnType<typeof createCoachTrace> | undefined;
  try {
    assertSameOrigin(request);
    const session = await requireVerifiedUser(request);
    await limitGenerationInput(session.user.id);
    trace = createCoachTrace();
    const observation = trace;
    if (observation.enabled) after(() => observation.flush());
    const body = validateCoachInputStructure(await readJsonBody(request, 16_000));
    // Validate shape and authorization before any network call.
    const catalog = await getCatalog();
    const input = validateCoachInput(body, catalog);
    const [champion, enemy] = await Promise.all([
      getChampionDetails(input.champion, catalog),
      getChampionDetails(input.enemy, catalog),
    ]);
    observation.catalogReady();
    const work = async (onBrief?: (brief: CoachBrief) => void, signal = request.signal) => {
      try {
        const result = await runGeneration(request, {
          operation: "COACH",
          input,
          fingerprint: safeCoachInput(input),
          coachInput: input,
          work: (execution) => {
            observation.provider(execution.model);
            return generateCoach(input, catalog, { champion, enemy }, fetch, signal, {
              ...execution,
              onUsage: async (usage) => {
                await execution.onUsage(usage);
                observation.usage(usage);
              },
              onBrief:
                onBrief &&
                ((brief) => {
                  observation.brief();
                  onBrief(brief);
                }),
            });
          },
        });
        observation.complete(result);
        return result;
      } catch (error) {
        observation.fail(signal.aborted);
        throw error;
      }
    };
    return request.headers.get("accept")?.includes("application/x-ndjson")
      ? coachStreamResponse(request.signal, work)
      : jsonResponse(await work());
  } catch (error) {
    trace?.fail(request.signal.aborted);
    return errorResponse(error);
  }
}
