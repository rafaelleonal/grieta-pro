import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../lib/http";
import { extractDraft, generateCoach, type ProviderExecution } from "../lib/openrouter";
import {
  DEFAULT_MODEL,
  GEMINI_PRO_MODEL,
  MODEL_POLICIES,
  completionTokenLimit,
  maximumCost,
  type ProviderUsage,
} from "../lib/usage";
import { fixtureCatalog, fixturePlan } from "./coach-fixtures";
import type { CoachInput } from "../lib/types";

const input: CoachInput = {
  champion: "Ahri",
  enemy: "Yasuo",
  role: "MID",
  rank: "Oro",
  allies: [],
  enemies: [],
  notes: "",
  webSearch: false,
  model: GEMINI_PRO_MODEL,
};
function execution(
  onUsage: (usage: ProviderUsage) => Promise<void> = async () => {},
): ProviderExecution {
  return {
    apiKey: "synthetic-gemini-key",
    model: GEMINI_PRO_MODEL,
    policy: MODEL_POLICIES[GEMINI_PRO_MODEL],
    onDispatch: async () => {},
    onUsage,
  };
}
function response(content: unknown, draft = false) {
  return Response.json({
    choices: [
      {
        finish_reason: "stop",
        message: {
          content: JSON.stringify(
            draft ? { decision: "draft", draft: content } : { decision: "coach", plan: content },
          ),
          reasoning: "synthetic-private-reasoning",
          reasoning_details: [{ type: "reasoning.text", text: "synthetic-private-reasoning" }],
        },
      },
    ],
  });
}
const isRejected = (error: unknown) => error instanceof ApiError && error.status === 502;

test("Gemini reserves all capped reasoning and output tokens plus bounded image costs", () => {
  assert.equal(DEFAULT_MODEL, GEMINI_PRO_MODEL);
  assert.equal(MODEL_POLICIES[GEMINI_PRO_MODEL].reasoning, true);
  assert.equal(completionTokenLimit(GEMINI_PRO_MODEL, "COACH"), 14_000);
  assert.equal(completionTokenLimit(GEMINI_PRO_MODEL, "DRAFT"), 4_000);
  assert.equal(maximumCost(GEMINI_PRO_MODEL, "COACH").toString(), "0.456");
  assert.equal(maximumCost(GEMINI_PRO_MODEL, "DRAFT", true).toString(), "0.694146");
  assert.equal(maximumCost(GEMINI_PRO_MODEL, "COACH", false, true).toString(), "1.242");
  assert.throws(
    () => maximumCost(GEMINI_PRO_MODEL, "DRAFT", true, true),
    (error) => error instanceof ApiError && error.status === 413,
  );
  // Existing requests and explicit economy selections retain their old policies.
  assert.equal(completionTokenLimit("openai/gpt-5.6-luna", "COACH"), 7_000);
  assert.equal(maximumCost("openai/gpt-5.6-luna", "COACH").toString(), "0.0372");
});

test("Gemini capture uses reasoning and the same model-specific cap that is reserved", async () => {
  const image =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  const draft = {
    champion: "Ahri",
    enemy: "Yasuo",
    role: "MID",
    allies: [],
    enemies: [],
    notes: "",
    warnings: [],
  };
  let sends = 0;
  const actual = await extractDraft(
    { model: GEMINI_PRO_MODEL, image },
    fixtureCatalog,
    async (_url, init) => {
      sends++;
      const body = JSON.parse(String(init?.body));
      assert.deepEqual(body.reasoning, { enabled: true, effort: "medium", exclude: true });
      assert.equal(body.max_completion_tokens, completionTokenLimit(GEMINI_PRO_MODEL, "DRAFT"));
      assert.deepEqual(body.provider.max_price, {
        prompt: 2,
        completion: 12,
        request: 0,
        image: 0.000002,
      });
      assert.equal(body.provider.allow_fallbacks, false);
      assert.equal(init?.redirect, "error");
      assert.ok(
        body.messages[1].content.some((part: { type: string }) => part.type === "image_url"),
      );
      return response(draft, true);
    },
    undefined,
    execution(),
  );
  assert.equal(sends, 1);
  assert.equal(actual.champion, "Ahri");
  assert.ok(!JSON.stringify(actual).includes("synthetic-private-reasoning"));
});

test("reasoning exhaustion records known cost and never retries or exposes thinking", async () => {
  let sends = 0;
  const observed: ProviderUsage[] = [];
  await assert.rejects(
    generateCoach(
      input,
      fixtureCatalog,
      undefined,
      async () => {
        sends++;
        return Response.json({
          id: "gen-synthetic-gemini-length",
          choices: [
            {
              finish_reason: "length",
              message: { content: "", reasoning: "synthetic-private-reasoning" },
            },
          ],
          usage: { cost: "0.04", completion_tokens: 14_000 },
        });
      },
      undefined,
      execution(async (usage) => {
        observed.push(usage);
      }),
    ),
    isRejected,
  );
  assert.equal(sends, 1);
  assert.deepEqual(observed, [
    {
      id: "gen-synthetic-gemini-length",
      cost: "0.04",
      promptTokens: undefined,
      completionTokens: 14_000,
    },
  ]);
  assert.ok(!JSON.stringify(observed).includes("synthetic-private-reasoning"));
});

test("Gemini transport hints never weaken strict application validation or expose reasoning", async () => {
  const actual = await generateCoach(
    input,
    fixtureCatalog,
    undefined,
    async () => response(fixturePlan),
    undefined,
    execution(),
  );
  assert.ok(!JSON.stringify(actual).includes("synthetic-private-reasoning"));
  const invalidChampion = structuredClone(fixturePlan);
  invalidChampion.composition[0].champion = "Ahri-invalid";
  for (const invalid of [invalidChampion, { ...fixturePlan, headline: "a".repeat(101) }]) {
    let sends = 0;
    const recovered = await generateCoach(
      input,
      fixtureCatalog,
      undefined,
      async () => {
        sends++;
        return response(invalid);
      },
      undefined,
      execution(),
    );
    assert.equal(recovered.meta.formatVersion, 3);
    assert.equal(recovered.plan.levels.length, 6);
    assert.ok(!JSON.stringify(recovered).includes("Ahri-invalid"));
    assert.ok(!JSON.stringify(recovered).includes("synthetic-private-reasoning"));
    assert.ok(recovered.plan.headline.length <= 100);
    assert.equal(sends, 1);
  }
  await assert.rejects(
    generateCoach(
      input,
      fixtureCatalog,
      undefined,
      async () => response({ ...fixturePlan, modelInstructions: null }),
      undefined,
      execution(),
    ),
    isRejected,
  );
});
