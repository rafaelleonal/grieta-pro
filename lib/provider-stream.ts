import type { CoachBrief } from "./types";

/** Reads complete JSON values only, descending into an unfinished object for progress.
 * Arrays and strings are never repaired. Duplicate keys are rejected, including nested ones.
 */
function objectPrefix(text: string, start: number, level = 0): { value: Obj; end?: number } {
  if (level > 32) throw new Error("Excessive stream nesting");
  const value: Obj = {};
  let pos = start + 1;
  while (pos < text.length) {
    const key = /^\s*(?:,\s*)?"((?:[^"\\]|\\.)*)"\s*:\s*/.exec(text.slice(pos));
    if (!key)
      return {
        value,
        ...(text.slice(pos).trimStart().startsWith("}")
          ? { end: pos + text.slice(pos).indexOf("}") + 1 }
          : {}),
      };
    const name: string = JSON.parse(`"${key[1]}"`);
    if (["__proto__", "constructor", "prototype"].includes(name))
      throw new Error("Invalid stream field");
    if (Object.hasOwn(value, name)) throw new Error("Duplicate stream field");
    pos += key[0].length;
    if (text[pos] === "{") {
      const child = objectPrefix(text, pos, level + 1);
      if (child.end || level === 0) value[name] = child.value;
      if (!child.end) return { value };
      pos = child.end;
      continue;
    }
    const from = pos;
    let depth = 0,
      quoted = false,
      escaped = false;
    for (; pos < text.length; pos++) {
      const c = text[pos];
      if (quoted) {
        if (escaped) escaped = false;
        else if (c === "\\") escaped = true;
        else if (c === '"') quoted = false;
      } else if (c === '"') quoted = true;
      else if (c === "[" || c === "{") depth++;
      else if ((c === "," || c === "}") && depth === 0) break;
      else if (c === "]" || c === "}") depth--;
    }
    if (pos === text.length) return { value };
    value[name] = JSON.parse(text.slice(from, pos));
  }
  return { value };
}

export function firstStreamPlan(text: string): Obj | undefined {
  const prefix = /^\s*\{\s*"decision"\s*:\s*"coach"\s*,\s*"plan"\s*:\s*/.exec(text);
  if (!prefix || text[prefix[0].length] !== "{") return;
  return objectPrefix(text, prefix[0].length).value;
}
export function firstStreamBrief(text: string): unknown | undefined {
  const brief = firstStreamPlan(text)?.brief;
  return brief && Object.keys(brief).length ? brief : undefined;
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
  onPreparation?: (value: unknown) => void,
): Promise<Obj> {
  if (!response.body) throw new Error("Missing stream");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "",
    content = "",
    bytes = 0,
    lastPreview = "",
    lastPreparation = "",
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
      const plan = firstStreamPlan(content);
      const build = plan?.build;
      const preparationFingerprint = JSON.stringify(build);
      if (build !== undefined && preparationFingerprint !== lastPreparation) {
        lastPreparation = preparationFingerprint;
        onPreparation?.(build);
      }
      const brief = plan?.brief && Object.keys(plan.brief).length ? plan.brief : undefined;
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
