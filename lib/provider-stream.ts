import type { CoachBrief } from "./types";

/** Extract only completed fields at the first brief boundary; never expose partial strings. */
export function firstStreamBrief(text: string): unknown | undefined {
  const prefix =
    /^\s*\{\s*"decision"\s*:\s*"coach"\s*,\s*"plan"\s*:\s*\{\s*(?:"format"\s*:\s*"compact-v1"\s*,\s*)?"brief"\s*:\s*/.exec(
      text,
    );
  if (!prefix || text[prefix[0].length] !== "{") return;
  const start = prefix[0].length;
  let lastBoundary: number | undefined;
  let depth = 0,
    quoted = false,
    escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === "," && depth === 1) lastBoundary = i;
    else if (c === "{" || c === "[") depth++;
    else if (c === "}" || c === "]") {
      if (--depth === 0) return JSON.parse(text.slice(start, i + 1));
    }
  }
  if (lastBoundary !== undefined) return JSON.parse(text.slice(start, lastBoundary) + "}");
}

type Obj = Record<string, unknown>;
const object = (v: unknown): Obj =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {};

/** OpenRouter SSE -> the same completion boundary used by non-streamed responses.
 * Ignores keep-alives and reasoning; retains only public content, citations and usage.
 */
export async function readProviderStream(
  response: Response,
  signal: AbortSignal,
  onBrief: (value: unknown) => void,
  onGenerationId?: (id: string) => Promise<void>,
): Promise<Obj> {
  if (!response.body) throw new Error("Missing stream");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "",
    content = "",
    bytes = 0,
    lastPreview = "",
    doneMarker = false;
  let id: unknown, model: unknown, usage: unknown, error: unknown, finish: unknown;
  let refusal: unknown,
    tool = false;
  const annotations: unknown[] = [];
  let abortRead = () => {};
  const aborted = new Promise<never>((_, reject) => {
    abortRead = () => reject(new Error("Stream aborted"));
    signal.addEventListener("abort", abortRead, { once: true });
    if (signal.aborted) abortRead();
  });
  async function consume(event: string) {
    const data = event
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trimStart())
      .join("\n")
      .trim();
    if (!data) return;
    if (data === "[DONE]") {
      doneMarker = true;
      return;
    }
    if (doneMarker) throw new Error("Data after stream end");
    const chunk = object(JSON.parse(data));
    if (typeof chunk.id === "string" && /^gen-[a-zA-Z0-9_-]{1,180}$/.test(chunk.id)) {
      if (id && id !== chunk.id) throw new Error("Changed generation identity");
      if (!id) {
        id = chunk.id;
        await onGenerationId?.(chunk.id);
      }
    }
    if (chunk.model) model = chunk.model;
    if (chunk.usage) usage = chunk.usage;
    if (chunk.error) error = chunk.error;
    const choices = Array.isArray(chunk.choices) ? chunk.choices : [];
    if (choices.length > 1) throw new Error("Multiple choices");
    const choice = object(choices[0]);
    const delta = object(choice.delta);
    if (typeof delta.content === "string") content += delta.content;
    if (content.length > 128_000) throw new Error("Oversized completion");
    if (delta.refusal) refusal = delta.refusal;
    if (delta.tool_calls || delta.function_call) tool = true;
    if (Array.isArray(delta.annotations)) annotations.push(...delta.annotations);
    if (choice.finish_reason) finish = choice.finish_reason;
    if (!refusal && !tool && !error) {
      const brief = firstStreamBrief(content);
      const fingerprint = JSON.stringify(brief);
      if (brief !== undefined && fingerprint !== lastPreview) {
        lastPreview = fingerprint;
        onBrief(brief);
      }
    }
  }
  try {
    while (true) {
      const { value, done } = await Promise.race([reader.read(), aborted]);
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 4_000_000) throw new Error("Oversized stream");
      pending += decoder.decode(value, { stream: true }).replace(/\r/g, "");
      let end;
      while ((end = pending.indexOf("\n\n")) >= 0) {
        await consume(pending.slice(0, end));
        pending = pending.slice(end + 2);
      }
    }
    pending += decoder.decode();
    if (pending.trim()) await consume(pending);
    if (!doneMarker && !error) throw new Error("Interrupted stream");
    return {
      id,
      model,
      usage,
      ...(error ? { error } : {}),
      choices: [
        {
          finish_reason: finish,
          message: {
            content,
            annotations,
            ...(refusal ? { refusal } : {}),
            ...(tool ? { tool_calls: [{}] } : {}),
          },
        },
      ],
    };
  } catch (error) {
    void reader.cancel().catch(() => {});
    throw error;
  } finally {
    signal.removeEventListener("abort", abortRead);
    reader.releaseLock();
  }
}

export type CoachProgress = (brief: CoachBrief) => void;
