import assert from "node:assert/strict";
import test from "node:test";
import { recoverCoachPlan } from "../lib/coach-recovery";
import { fixtureCatalog, fixturePlan } from "./coach-fixtures";
import type { CoachInput } from "../lib/types";

const input: CoachInput = { champion: "Darius", enemy: "Yorick", role: "TOP" };
function matchupPlan() {
  const plan = structuredClone(fixturePlan);
  plan.composition = [
    { champion: "Darius", team: "ally", label: "Tú" },
    { champion: "Yorick", team: "enemy", label: "Rival" },
  ];
  for (const reactions of Object.values(plan.reactions))
    for (const row of reactions) row.champions = ["Yorick"];
  plan.build.situational = [];
  plan.compNotes = [];
  return plan;
}

test("partial advice never fabricates levels and rejects foreign champion references", () => {
  const plan = matchupPlan();
  plan.levels = plan.levels.slice(0, 4);
  plan.levels[1].champions = ["Ahri"];
  const recovered = recoverCoachPlan(plan, fixtureCatalog, input);
  assert.deepEqual(
    recovered.plan.levels.map((row) => row.level),
    ["1", "3", "4"],
  );
  assert.ok(recovered.missing.includes("levels"));
  assert.ok(recovered.categories.includes("champion_references"));
  assert.ok(!JSON.stringify(recovered.plan).includes("Ahri"));
  assert.deepEqual(recovered.plan.reactions, plan.reactions);
});

test("starting purchases over 500 gold are omitted without inventing replacements", () => {
  const plan = matchupPlan();
  plan.build.starting = ["1103", "2031"];
  const recovered = recoverCoachPlan(plan, fixtureCatalog, input);
  assert.deepEqual(recovered.plan.build.starting, []);
  assert.ok(recovered.invalid.includes("items"));
  assert.ok(recovered.categories.includes("starting_gold"));
  assert.deepEqual(recovered.plan.levels, plan.levels);
  plan.build.starting = ["1103", "2003"];
  assert.deepEqual(
    recoverCoachPlan(plan, fixtureCatalog, input).plan.build.starting,
    plan.build.starting,
  );
});
