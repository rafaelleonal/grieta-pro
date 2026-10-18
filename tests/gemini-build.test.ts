import assert from "node:assert/strict";
import test from "node:test";
import { generateCoach, type ProviderExecution } from "../lib/openrouter";
import { fixtureCatalog, fixturePlan } from "./coach-fixtures";
import type { CoachInput } from "../lib/types";
import {
  completionTokenLimit,
  GEMINI_FLASH_MODEL,
  maximumCost,
  MODEL_POLICIES,
  type ProviderUsage,
} from "../lib/usage";

const input: CoachInput = {
  champion: "Ahri",
  enemy: "Yasuo",
  role: "MID",
  rank: "Oro",
  allies: [],
  enemies: [],
  notes: "",
  webSearch: false,
  model: GEMINI_FLASH_MODEL,
};
const wire = () => ({
  format: "build-v1",
  build: {
    summoners: fixturePlan.build.summoners,
    starting: fixturePlan.build.starting,
    runes: structuredClone(fixturePlan.build.runes),
    core: ["3020", "3089"],
    situational: [{ item: "3157", reason: "Si necesitas evitar daño al entrar.", champions: [] }],
  },
});
const encoder = new TextEncoder();
function streamed(content: string, finish: "stop" | "length") {
  const event = (value: unknown) => `data: ${JSON.stringify(value)}\n\n`;
  const text =
    event({ id: "gen-flash-build-fixture", choices: [{ delta: { content } }] }) +
    event({
      choices: [{ delta: {}, finish_reason: finish }],
      usage: { cost: "0.004", prompt_tokens: 200, completion_tokens: 300 },
    }) +
    "data: [DONE]\n\n";
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        const bytes = encoder.encode(text);
        for (let at = 0; at < bytes.length; at += 13) controller.enqueue(bytes.slice(at, at + 13));
        controller.close();
      },
    }),
    { headers: { "content-type": "text/event-stream" } },
  );
}
async function run(plan: unknown, finish: "stop" | "length" = "stop", raw?: string) {
  let calls = 0,
    dispatches = 0,
    preparations = 0,
    briefs = 0;
  const usage: ProviderUsage[] = [];
  const execution: ProviderExecution = {
    apiKey: "synthetic-flash-build-key",
    model: GEMINI_FLASH_MODEL,
    policy: MODEL_POLICIES[GEMINI_FLASH_MODEL],
    onDispatch: async () => {
      dispatches++;
    },
    onUsage: async (value) => {
      usage.push(value);
    },
    onPreparation: () => {
      preparations++;
    },
    onBrief: () => {
      briefs++;
    },
  };
  const result = generateCoach(
    input,
    fixtureCatalog,
    undefined,
    async (_, init) => {
      calls++;
      const request = JSON.parse(String(init?.body));
      assert.equal(request.model, GEMINI_FLASH_MODEL);
      assert.equal(request.stream, true);
      assert.equal(
        request.max_completion_tokens,
        completionTokenLimit(GEMINI_FLASH_MODEL, "COACH"),
      );
      assert.deepEqual(request.reasoning, { enabled: true, effort: "low", exclude: true });
      const shape = request.response_format.json_schema.schema.properties.plan.anyOf[0];
      assert.deepEqual(Object.keys(shape.properties), ["format", "build"]);
      assert.equal(shape.properties.format.const, "build-v1");
      assert.equal(shape.properties.build.properties.skillOrder, undefined);
      return streamed(raw ?? JSON.stringify({ decision: "coach", plan }), finish);
    },
    undefined,
    execution,
  );
  return { result, counters: () => ({ calls, dispatches, preparations, briefs }), usage };
}

test("Flash streams build-v1 under the exact reserved token and price caps", async () => {
  assert.equal(completionTokenLimit(GEMINI_FLASH_MODEL, "COACH"), 7000);
  assert.equal(completionTokenLimit(GEMINI_FLASH_MODEL, "DRAFT"), 1600);
  assert.equal(maximumCost(GEMINI_FLASH_MODEL, "COACH").toString(), "0.13425");
  const attempt = await run(wire());
  const result = await attempt.result;
  assert.equal(result.meta.formatVersion, 4);
  assert.deepEqual(result.plan.build.core, ["3020", "3089"]);
  assert.equal(result.plan.brief, undefined);
  assert.deepEqual(result.plan.levels, []);
  assert.deepEqual(result.plan.macro, []);
  assert.deepEqual(attempt.counters(), { calls: 1, dispatches: 1, preparations: 1, briefs: 0 });
  assert.deepEqual(
    attempt.usage.map((value) => value.cost),
    [undefined, "0.004"],
  );
});

test("Flash clipped JSON records its known charge and fails without another request", async () => {
  const attempt = await run(
    wire(),
    "length",
    '{"decision":"coach","plan":{"format":"build-v1","build":',
  );
  await assert.rejects(attempt.result, /formato inesperado/);
  assert.deepEqual(attempt.counters(), { calls: 1, dispatches: 1, preparations: 0, briefs: 0 });
  assert.equal(attempt.usage.at(-1)?.cost, "0.004");
});

test("Flash retains legal loadout choices when a rune page fails local validation", async () => {
  const plan = wire();
  plan.build.runes.primary.keystone = "UnknownRune";
  const attempt = await run(plan);
  const result = await attempt.result;
  assert.ok(result.meta.formatVersion === 4 && result.meta.partial);
  assert.deepEqual(result.meta.partial.invalid, ["runes"]);
  assert.equal(result.plan.build.runes, undefined);
  assert.deepEqual(result.plan.build.core, ["3020", "3089"]);
  assert.ok(result.plan.build.summoners);
  assert.equal(attempt.counters().calls, 1);
});

test("Flash complete JSON with a length finish is kept with an explicit truncation warning", async () => {
  const attempt = await run(wire(), "length");
  const result = await attempt.result;
  assert.ok(result.meta.formatVersion === 4 && result.meta.partial);
  assert.equal(result.meta.partial.reason, "truncated");
  assert.deepEqual(result.meta.partial.invalid, []);
  assert.deepEqual(result.plan.build.core, ["3020", "3089"]);
  assert.ok(result.meta.warnings.some((warning) => warning.includes("límite de salida")));
  assert.equal(attempt.counters().calls, 1);
});
