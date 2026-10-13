import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../lib/errors";
import { generateCoach } from "../lib/openrouter";
import { safeCoachInput } from "../lib/usage";
import { validateCoachInput } from "../lib/validation";
import type { CoachInput } from "../lib/types";
import { fixtureCatalog } from "./coach-fixtures";

const bot: CoachInput = {
  champion: "Jinx",
  enemy: "Kaisa",
  role: "ADC",
  rank: "Oro",
  allies: ["Thresh", "LeeSin"],
  enemies: ["Lux"],
  allyDuo: "Thresh",
  enemyDuo: "Nautilus",
  notes: "",
  webSearch: false,
  apiKey: "synthetic-bot-key",
};
const isStatus = (status: number) => (error: unknown) =>
  error instanceof ApiError && error.status === status;

test("bot lane partners are validated and kept out of the rest of the team", () => {
  const valid = validateCoachInput(bot, fixtureCatalog);
  assert.equal(valid.allyDuo, "Thresh");
  assert.equal(valid.enemyDuo, "Nautilus");
  assert.deepEqual(valid.allies, ["LeeSin"]);
  assert.throws(() => validateCoachInput({ ...bot, role: "MID" }, fixtureCatalog), isStatus(400));
  assert.throws(
    () => validateCoachInput({ ...bot, enemyDuo: "Thresh" }, fixtureCatalog),
    isStatus(400),
  );
  assert.throws(
    () => validateCoachInput({ ...bot, allyDuo: "Jinx" }, fixtureCatalog),
    isStatus(400),
  );
  assert.throws(
    () => validateCoachInput({ ...bot, allyDuo: "NotAChampion" }, fixtureCatalog),
    isStatus(400),
  );
  // Partners stay optional.
  const solo = validateCoachInput(
    { ...bot, allyDuo: undefined, enemyDuo: undefined },
    fixtureCatalog,
  );
  assert.equal(solo.allyDuo, undefined);
});

test("stored inputs and fingerprints only gain partner fields when they exist", () => {
  const solo: CoachInput = { ...bot, allyDuo: undefined, enemyDuo: undefined };
  delete solo.allyDuo;
  delete solo.enemyDuo;
  assert.deepEqual(Object.keys(safeCoachInput(solo)), [
    "champion",
    "enemy",
    "role",
    "rank",
    "allies",
    "enemies",
    "notes",
    "webSearch",
  ]);
  const stored = safeCoachInput(bot);
  assert.equal(stored.allyDuo, "Thresh");
  assert.equal(stored.enemyDuo, "Nautilus");
});

test("the prompt describes the 2v2 lane and allows both partners as references", async () => {
  let body: ReturnType<typeof JSON.parse> | undefined;
  await generateCoach(
    { ...bot, model: "google/gemini-3.1-pro-preview" },
    fixtureCatalog,
    undefined,
    async (_url, init) => {
      body = JSON.parse(String(init?.body));
      throw new Error("stop");
    },
  ).catch(() => undefined);
  assert.ok(body, "the provider request was built");
  const context = JSON.parse(body.messages[1].content);
  assert.equal(context.botLane.yourPartner.id, "Thresh");
  assert.equal(context.botLane.enemyPartner.id, "Nautilus");
  assert.match(body.messages[0].content, /botLane/);
  const enumIds =
    body.response_format.json_schema.schema.properties.plan.anyOf[0].properties.levels.items
      .properties.champions.items.enum;
  for (const id of ["Jinx", "Kaisa", "Thresh", "Nautilus", "LeeSin", "Lux"])
    assert.ok(enumIds.includes(id), id);
});
