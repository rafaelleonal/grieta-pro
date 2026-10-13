import { randomUUID } from "node:crypto";

export type LaminarConfig = { apiKey: string };

/** Server-only opt-in. Never instrument fetch/SDKs automatically or serialize arguments. */
export function laminarConfig(
  env: Record<string, string | undefined> = process.env,
): LaminarConfig | undefined {
  const apiKey = env.LMNR_PROJECT_API_KEY?.trim();
  return env.LAMINAR_ENABLED === "true" && apiKey ? { apiKey } : undefined;
}

export function laminarId(): string {
  return randomUUID();
}

/** Fixed destination, no redirects/retries, bounded lifetime, no provider bodies in logs. */
export async function laminarPost(
  config: LaminarConfig,
  path: "/v1/spans" | "/v1/evals" | `/v1/evals/${string}/datapoints`,
  body: unknown,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const response = await fetcher(`https://api.lmnr.ai${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    redirect: "error",
    cache: "no-store",
    signal: AbortSignal.timeout(2_000),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error("Laminar rechazó el envío.");
  }
  return response;
}
