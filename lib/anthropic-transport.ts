/** Native Messages preserves max effort while task_budget gives Claude a finish target.
 * https://openrouter.ai/openapi.json — MessagesOutputConfig
 */
type Value = Record<string, unknown>;
const object = (value: unknown): Value =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Value) : {};

export function anthropicCoachRequest(request: Value, taskBudget: number): Value {
  const messages = request.messages as { role: string; content: string }[];
  return {
    model: request.model,
    system: messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n"),
    messages: messages.filter((m) => m.role !== "system"),
    max_tokens: request.max_completion_tokens,
    stream: false,
    thinking: { type: "adaptive", display: "omitted" },
    output_config: { effort: "max", task_budget: { type: "tokens", total: taskBudget } },
    provider: request.provider,
    ...(request.tools
      ? {
          tools: request.tools,
          stop_server_tools_when: [{ type: "step_count_is", step_count: 1 }],
        }
      : {}),
  };
}

/** Normalize public text/usage only. Thinking is never returned, logged or stored. */
export function anthropicCoachResponse(
  data: Value,
  generationId: string | null,
  webSearch: boolean,
): Value {
  const usage = object(data.usage);
  const blocks = Array.isArray(data.content) ? data.content.map(object) : [];
  const text = blocks.filter((b) => b.type === "text");
  const unexpected = blocks.some(
    (b) =>
      ![
        "text",
        "thinking",
        "redacted_thinking",
        ...(webSearch ? ["server_tool_use", "web_search_tool_result"] : []),
      ].includes(String(b.type)),
  );
  const annotations = text.flatMap((b) =>
    Array.isArray(b.citations)
      ? b.citations.map(object).map((c) => ({
          type: "url_citation",
          url_citation: { url: c.url, title: c.title },
        }))
      : [],
  );
  return {
    ...("error" in data ? { error: data.error } : {}),
    id: generationId || data.id,
    model: data.model,
    usage: {
      cost: usage.cost,
      prompt_tokens:
        typeof usage.input_tokens === "number"
          ? usage.input_tokens +
            (typeof usage.cache_creation_input_tokens === "number"
              ? usage.cache_creation_input_tokens
              : 0) +
            (typeof usage.cache_read_input_tokens === "number" ? usage.cache_read_input_tokens : 0)
          : undefined,
      completion_tokens: usage.output_tokens,
    },
    choices: [
      {
        finish_reason:
          data.stop_reason === "end_turn"
            ? "stop"
            : data.stop_reason === "max_tokens"
              ? "length"
              : data.stop_reason === "refusal"
                ? "content_filter"
                : data.stop_reason,
        message: {
          content: text.length
            ? text.map((b) => (typeof b.text === "string" ? b.text : "")).join("")
            : null,
          annotations,
          ...(unexpected || data.stop_reason === "tool_use"
            ? { tool_calls: [{ type: "unexpected" }] }
            : {}),
        },
      },
    ],
  };
}
