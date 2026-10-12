import { ApiError } from "./errors";
import type { CoachBrief, GeneratedCoachResult } from "./types";

/** One admitted operation, one final persisted result; progress is transient. */
export function coachStreamResponse(
  requestSignal: AbortSignal,
  work: (
    onBrief: (brief: CoachBrief) => void,
    signal: AbortSignal,
  ) => Promise<GeneratedCoachResult>,
): Response {
  const cancelled = new AbortController();
  const signal = AbortSignal.any([requestSignal, cancelled.signal]);
  const encoder = new TextEncoder();
  let closed = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: unknown) => {
        if (closed || signal.aborted) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          closed = true;
          cancelled.abort();
        }
      };
      try {
        const result = await work((brief) => send({ type: "brief", brief }), signal);
        send({ type: "result", result });
      } catch (error) {
        send({
          type: "error",
          error:
            error instanceof ApiError
              ? error.message
              : "No pudimos completar el plan. Tu selección sigue guardada.",
        });
      } finally {
        if (!closed) {
          closed = true;
          controller.close();
        }
      }
    },
    cancel() {
      closed = true;
      cancelled.abort();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "private, no-store, no-transform",
      "X-Content-Type-Options": "nosniff",
      "X-Accel-Buffering": "no",
      Vary: "Accept",
    },
  });
}
