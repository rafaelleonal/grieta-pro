import { laminarConfig, laminarId, laminarPost, type LaminarConfig } from "./laminar";
import { MODEL_POLICIES, type ProviderUsage } from "./usage";
import type { GeneratedCoachResult } from "./types";

type Outcome = "complete" | "partial" | "failed" | "cancelled";
const bounded = (value: unknown, max: number): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max;

/** Only explicit metrics enter telemetry. This object never retains inputs, plans or errors. */
export function createCoachTrace(
  config: LaminarConfig | undefined = laminarConfig(),
  fetcher: typeof fetch = fetch,
  clock = () => performance.now(),
) {
  const startTime = new Date().toISOString();
  const started = clock();
  let endTime = startTime;
  let finished = false;
  let flushed = false;
  let providerStarted = false;
  let resolveDone!: () => void;
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });
  const attributes: Record<string, string | number | boolean> = {
    "elociencia.telemetry_version": 1,
    "elociencia.quality": "unreviewed",
    "elociencia.operation": "COACH",
  };
  const elapsed = () => Math.max(0, Math.round(clock() - started));
  function finish(outcome: Outcome) {
    if (finished) return;
    finished = true;
    endTime = new Date().toISOString();
    attributes["elociencia.outcome"] = outcome;
    attributes["elociencia.total_ms"] = elapsed();
    attributes["elociencia.provider_executed"] = providerStarted;
    resolveDone();
  }
  return {
    enabled: Boolean(config),
    catalogReady() {
      attributes["elociencia.catalog_ms"] = elapsed();
    },
    provider(model: string) {
      providerStarted = true;
      attributes["elociencia.provider_start_ms"] = elapsed();
      attributes["elociencia.model"] = Object.hasOwn(MODEL_POLICIES, model) ? model : "unknown";
    },
    usage(usage: ProviderUsage) {
      if (bounded(usage.promptTokens, 10_000_000))
        attributes["elociencia.input_tokens"] = usage.promptTokens;
      if (bounded(usage.completionTokens, 10_000_000))
        attributes["elociencia.output_tokens"] = usage.completionTokens;
      // Missing/uncertain cost is never converted into a free request.
      if (typeof usage.cost === "string" && /^\d+(?:\.\d+)?$/.test(usage.cost)) {
        const cost = Number(usage.cost);
        if (bounded(cost, 1_000)) attributes["elociencia.cost_usd"] = cost;
      }
    },
    brief() {
      attributes["elociencia.first_useful_ms"] ??= elapsed();
    },
    complete(result: GeneratedCoachResult) {
      // A replay has no provider execution; do not count it as fast model inference.
      attributes["elociencia.replay"] = !providerStarted;
      if (!providerStarted) {
        attributes["elociencia.model"] = Object.hasOwn(MODEL_POLICIES, result.meta.model)
          ? result.meta.model
          : "unknown";
      }
      if (result.meta.formatVersion === 3) {
        attributes["elociencia.missing_sections"] = result.meta.partial.missing.length;
        finish("partial");
      } else finish("complete");
    },
    fail(cancelled: boolean) {
      finish(cancelled ? "cancelled" : "failed");
    },
    async flush() {
      if (!config || flushed) return;
      flushed = true;
      // A disconnected stream can finish after Next's response; wait for its final accounting.
      await done;
      try {
        const response = await laminarPost(
          config,
          "/v1/spans",
          [
            {
              name: "elociencia.coach",
              spanType: "DEFAULT",
              traceId: laminarId(),
              spanId: laminarId(),
              startTime,
              endTime,
              attributes: { ...attributes },
            },
          ],
          fetcher,
        );
        await response.body?.cancel();
      } catch {
        // Telemetry cannot break generation, expose errors or cause a paid retry.
        console.warn(JSON.stringify({ event: "laminar_export_failed", operation: "COACH" }));
      }
    },
  };
}
