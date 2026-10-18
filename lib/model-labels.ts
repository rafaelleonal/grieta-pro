const MODEL_LABELS: ReadonlyMap<string, string> = new Map([
  ["openai/gpt-5.6-luna", "Luna 5.6"],
  ["openai/gpt-6-luna", "Luna 6"],
  ["anthropic/claude-haiku-5.5", "Haiku 5.5"],
  ["anthropic/claude-sonnet-5.5", "Sonnet 5.5"],
  ["anthropic/claude-opus-5.5", "Opus 5.5"],
  ["google/gemini-3.8-flash", "Gemini 3.8 Flash"],
  ["google/gemini-3.1-pro-preview", "Gemini 3.1 Pro"],
]);

export function modelLabel(modelId: string): string {
  return MODEL_LABELS.get(modelId) ?? modelId;
}
