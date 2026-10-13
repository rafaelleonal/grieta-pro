import assert from "node:assert/strict";
import test from "node:test";
import { createCoachTrace } from "../lib/coach-trace";
import { laminarConfig } from "../lib/laminar";
import { fixturePlan } from "./coach-fixtures";
import type { GeneratedCoachResult } from "../lib/types";

const result = (): GeneratedCoachResult => ({
  plan: { ...fixturePlan, brief: { ...fixturePlan.brief!, priority: "PRIVATE PLAN AND NOTE" } },
  meta: {
    model: "google/gemini-3.8-flash",
    version: "16.20.1",
    catalogSource: "live",
    webSearchRequested: false,
    sources: [],
    generatedAt: "2026-10-12",
    warnings: ["PRIVATE WARNING"],
  },
});

test("Laminar requires both explicit opt-in and a server key", async () => {
  assert.equal(laminarConfig({ LMNR_PROJECT_API_KEY: "secret" }), undefined);
  assert.equal(laminarConfig({ LAMINAR_ENABLED: "true" }), undefined);
  assert.equal(
    laminarConfig({ LAMINAR_ENABLED: "false", LMNR_PROJECT_API_KEY: "secret" }),
    undefined,
  );
  assert.deepEqual(laminarConfig({ LAMINAR_ENABLED: "true", LMNR_PROJECT_API_KEY: "secret" }), {
    apiKey: "secret",
  });
  const previous = process.env.LAMINAR_ENABLED;
  process.env.LAMINAR_ENABLED = "false";
  try {
    const trace = createCoachTrace(undefined, async () => {
      assert.fail("disabled telemetry made a network call");
    });
    assert.equal(trace.enabled, false);
    await trace.flush(); // Also returns without waiting for unfinished generation.
  } finally {
    if (previous === undefined) delete process.env.LAMINAR_ENABLED;
    else process.env.LAMINAR_ENABLED = previous;
  }
});

test("trace waits for settlement, keeps first progress time and exports only allowlisted metrics once", async () => {
  let now = 0;
  let calls = 0;
  let exported = "";
  const trace = createCoachTrace(
    { apiKey: "telemetry-secret" },
    async (url, init) => {
      calls++;
      assert.equal(url, "https://api.lmnr.ai/v1/spans");
      assert.equal(init?.redirect, "error");
      assert.equal(init?.cache, "no-store");
      assert.ok(init?.signal);
      exported = String(init?.body);
      return new Response("[]");
    },
    () => now,
  );
  now = 100;
  trace.catalogReady();
  trace.provider("google/gemini-3.8-flash");
  trace.usage({ id: "PRIVATE PROVIDER ID", promptTokens: 100, completionTokens: 40, cost: "0.01" });
  now = 3300;
  trace.brief();
  now = 4200;
  trace.brief();
  const flushed = trace.flush();
  await Promise.resolve();
  assert.equal(calls, 0);
  now = 13000;
  trace.complete(result());
  await flushed;
  await trace.flush();
  assert.equal(calls, 1);
  assert.doesNotMatch(exported, /PRIVATE|telemetry-secret|input":|output":/);
  const [span] = JSON.parse(exported);
  assert.equal(span.attributes["elociencia.first_useful_ms"], 3300);
  assert.equal(span.attributes["elociencia.total_ms"], 13000);
  assert.equal(span.attributes["elociencia.cost_usd"], 0.01);
  assert.equal(span.attributes["elociencia.quality"], "unreviewed");
  assert.equal(span.attributes["elociencia.replay"], false);
});

test("unknown models and malformed costs cannot leak free text; failed exports never reject or retry", async () => {
  const warnings: unknown[] = [];
  const original = console.warn;
  console.warn = (value) => {
    warnings.push(value);
  };
  let calls = 0;
  try {
    const trace = createCoachTrace({ apiKey: "key" }, async (_url, init) => {
      calls++;
      const body = String(init?.body);
      assert.doesNotMatch(body, /PRIVATE|NaN|cost_usd|input_tokens|output_tokens/);
      assert.equal(JSON.parse(body)[0].attributes["elociencia.outcome"], "cancelled");
      throw new Error("PRIVATE NETWORK BODY");
    });
    trace.provider("PRIVATE MODEL");
    trace.usage({ cost: "PRIVATE COST", promptTokens: NaN, completionTokens: -1 });
    trace.fail(true);
    await trace.flush();
    await trace.flush();
    assert.equal(calls, 1);
    assert.deepEqual(warnings, ['{"event":"laminar_export_failed","operation":"COACH"}']);
  } finally {
    console.warn = original;
  }
});

test("history replays and partial output are distinct from complete model generations", async () => {
  const trace = createCoachTrace({ apiKey: "key" }, async (_url, init) => {
    const attributes = JSON.parse(String(init?.body))[0].attributes;
    assert.equal(attributes["elociencia.replay"], true);
    assert.equal(attributes["elociencia.outcome"], "partial");
    assert.equal(attributes["elociencia.missing_sections"], 1);
    assert.equal(attributes["elociencia.first_useful_ms"], undefined);
    assert.equal(attributes["elociencia.cost_usd"], undefined);
    return new Response("[]");
  });
  trace.complete({
    ...result(),
    meta: {
      ...result().meta,
      formatVersion: 3,
      partial: { missing: ["runes"], reason: "validation", categories: ["PRIVATE VALIDATION"] },
    },
  });
  await trace.flush();
});
