import type { CoachInput, CoachResult, DraftResult } from "./types";
import { ApiError } from "./http";
import { requireVerifiedUser } from "./auth-session";
import type { ProviderExecution } from "./openrouter";
import {
  dispatchGeneration,
  finishGeneration,
  generationPolicy,
  inputHash,
  maximumCost,
  observeUsage,
  replayResponse,
  requestKey,
  reserveGeneration,
  safeCoachInput,
} from "./usage";

export async function runGeneration<T extends CoachResult | DraftResult>(
  request: Request,
  args: {
    operation: "COACH" | "DRAFT";
    input: { apiKey?: string; model?: string; webSearch?: boolean; image?: string };
    fingerprint: unknown;
    coachInput?: CoachInput;
    work: (execution: ProviderExecution) => Promise<T>;
  },
): Promise<T> {
  const session = await requireVerifiedUser(request);
  const byok = Boolean(args.input.apiKey?.trim());
  const apiKey = args.input.apiKey?.trim() || process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey)
    throw new ApiError(
      503,
      "Configura OpenRouter en el servidor o agrega tu clave personal en Conexión.",
    );
  const { model, policy } = await generationPolicy(
    session.user.id,
    args.input.model,
    Boolean(args.input.webSearch),
  );
  const hash = inputHash({ operation: args.operation, model, byok, input: args.fingerprint });
  const reservation = await reserveGeneration({
    userId: session.user.id,
    key: requestKey(request),
    inputHash: hash,
    operation: args.operation,
    model,
    byok,
    webSearch: Boolean(args.input.webSearch),
    reserveUsd: maximumCost(
      model,
      args.operation,
      Boolean(args.input.image),
      Boolean(args.input.webSearch),
    ),
  });
  if (reservation.replay) return replayResponse(reservation.request) as T;
  const id = reservation.request.id;
  try {
    const result = await args.work({
      apiKey,
      model,
      policy,
      onDispatch: () => dispatchGeneration(id),
      onUsage: (usage) => observeUsage(id, usage),
    });
    await finishGeneration(id, {
      response: result,
      ...(args.coachInput ? { recordInput: safeCoachInput(args.coachInput) } : {}),
    });
    return result;
  } catch (error) {
    const safeError =
      error instanceof ApiError
        ? { status: error.status, message: error.message }
        : {
            status: 503,
            message: "No pudimos completar la consulta. Tu selección sigue guardada.",
          };
    await finishGeneration(id, { error: safeError });
    throw new ApiError(safeError.status, safeError.message);
  }
}
