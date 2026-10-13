import assert from "node:assert/strict";
import test from "node:test";
import { validatedPreparation } from "../lib/coach-preparation";
import { firstStreamPlan } from "../lib/provider-stream";
import { fixtureCatalog, fixturePlan } from "./coach-fixtures";

test("early choices require legal spell pairs, rune slots, catalog items and starting gold", () => {
  const build = fixturePlan.build;
  assert.deepEqual(validatedPreparation(build, fixtureCatalog), {
    summoners: build.summoners,
    starting: build.starting,
    runes: build.runes,
  });
  for (const pick of [
    ["SummonerFlash", "unknown"],
    ["SummonerFlash", "SummonerFlash"],
  ])
    assert.equal(
      validatedPreparation({ summoners: { ...build.summoners, pick } }, fixtureCatalog).summoners,
      undefined,
    );
  for (const starting of [["unknown"], ["3089"], ["1056", "1056"], []])
    assert.equal(validatedPreparation({ starting }, fixtureCatalog).starting, undefined);
  assert.equal(
    validatedPreparation(
      {
        runes: {
          ...build.runes,
          secondary: { ...build.runes.secondary, style: build.runes.primary.style },
        },
      },
      fixtureCatalog,
    ).runes,
    undefined,
  );
  assert.equal(
    validatedPreparation(
      { runes: { ...build.runes, shards: ["inventado", "Vida", "Vida"] } },
      fixtureCatalog,
    ).runes,
    undefined,
  );
});

test("partial choices never contain half-written spell explanations or arrays", () => {
  const prefix = '{"decision":"coach","plan":{"build":';
  const text =
    prefix +
    JSON.stringify({
      summoners: fixturePlan.build.summoners,
      starting: ["1056"],
      runes: fixturePlan.build.runes,
    });
  for (let n = 0; n <= text.length; n++) {
    const choices = validatedPreparation(firstStreamPlan(text.slice(0, n))?.build, fixtureCatalog);
    if (choices.summoners) assert.deepEqual(choices.summoners, fixturePlan.build.summoners);
    if (choices.starting) assert.deepEqual(choices.starting, ["1056"]);
    if (choices.runes) assert.deepEqual(choices.runes, fixturePlan.build.runes);
  }
  assert.throws(
    () => firstStreamPlan(prefix + '{"starting":["1056"],"starting":["3089"]}}'),
    /Duplicate/,
  );
  assert.equal(firstStreamPlan('{"decision":"refuse","plan":null}'), undefined);
});
