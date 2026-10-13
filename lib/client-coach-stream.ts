import type { CoachBrief, CoachPreparation, GeneratedCoachResult } from "./types";

/** No automatic retries: a disconnected request may already be billable. */
export async function postCoachStream(
  body: unknown,
  signal: AbortSignal,
  key: string,
  onBrief: (brief: CoachBrief) => void,
  onPreparation?: (preparation: CoachPreparation) => void,
): Promise<GeneratedCoachResult> {
  const response = await fetch("/api/coach", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/x-ndjson",
      "Idempotency-Key": key,
    },
    body: JSON.stringify(body),
    signal,
    redirect: "error",
  });
  if (!response.headers.get("content-type")?.includes("application/x-ndjson")) {
    const data = await response.json().catch(() => null);
    if (!response.ok || !data)
      throw new Error(
        typeof data?.error === "string" ? data.error : "No pudimos completar la solicitud.",
      );
    return data as GeneratedCoachResult;
  }
  if (!response.ok || !response.body) throw new Error("No pudimos abrir el plan.");
  return readCoachStream(response.body, signal, onBrief, onPreparation);
}

export async function readCoachStream(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  onBrief: (brief: CoachBrief) => void,
  onPreparation?: (preparation: CoachPreparation) => void,
): Promise<GeneratedCoachResult> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const cancelRead = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", cancelRead, { once: true });
  if (signal.aborted) cancelRead();
  let pending = "",
    bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (signal.aborted) throw new Error("Espera cancelada.");
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 512_000) throw new Error("El plan supera el tamaño permitido.");
      pending += decoder.decode(value, { stream: true });
      let end;
      while ((end = pending.indexOf("\n")) >= 0) {
        const line = pending.slice(0, end);
        pending = pending.slice(end + 1);
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.type === "brief" && event.brief && typeof event.brief === "object")
          onBrief(event.brief);
        else if (
          event.type === "preparation" &&
          event.preparation &&
          typeof event.preparation === "object"
        )
          onPreparation?.(event.preparation);
        else if (event.type === "result" && event.result?.plan && event.result?.meta)
          return event.result;
        else if (event.type === "error")
          throw new Error(
            typeof event.error === "string" ? event.error : "No llegó el plan completo.",
          );
        else throw new Error("El servidor devolvió un formato inesperado.");
      }
    }
    throw new Error(
      "La conexión terminó antes de completar el plan. Puedes buscarlo en tus sesiones.",
    );
  } finally {
    signal.removeEventListener("abort", cancelRead);
    void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
