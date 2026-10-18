import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_MODEL,
  GEMINI_FLASH_MODEL,
  GEMINI_PRO_MODEL,
  OPUS_MODEL,
  defaultModelForPlan,
  maximumCost,
} from "../lib/usage";

test("Opus is the default only for plans that already authorize it", () => {
  const previous = process.env.OPENROUTER_MODEL;
  delete process.env.OPENROUTER_MODEL;
  try {
    assert.equal(DEFAULT_MODEL, OPUS_MODEL);
    assert.equal(defaultModelForPlan([GEMINI_FLASH_MODEL, OPUS_MODEL]), OPUS_MODEL);
    assert.equal(defaultModelForPlan([GEMINI_PRO_MODEL, GEMINI_FLASH_MODEL]), GEMINI_FLASH_MODEL);
    assert.equal(defaultModelForPlan([GEMINI_PRO_MODEL]), GEMINI_PRO_MODEL);
    assert.equal(defaultModelForPlan(["openai/gpt-6-luna"]), "openai/gpt-6-luna");
    assert.equal(defaultModelForPlan(["unrecognized/model"]), undefined);
    assert.equal(defaultModelForPlan([]), undefined);
    process.env.OPENROUTER_MODEL = GEMINI_PRO_MODEL;
    assert.equal(defaultModelForPlan([OPUS_MODEL, GEMINI_PRO_MODEL]), GEMINI_PRO_MODEL);
    assert.equal(defaultModelForPlan([GEMINI_FLASH_MODEL]), GEMINI_FLASH_MODEL);
  } finally {
    if (previous === undefined) delete process.env.OPENROUTER_MODEL;
    else process.env.OPENROUTER_MODEL = previous;
  }
});

test("Opus build reservation covers its capped reasoning and output without changing draft prices", () => {
  assert.equal(maximumCost(OPUS_MODEL, "COACH").toString(), "0.65792");
  assert.equal(maximumCost(OPUS_MODEL, "DRAFT").toString(), "0.848");
  assert.equal(maximumCost(OPUS_MODEL, "COACH", false, true).toString(), "1.96584");
});
