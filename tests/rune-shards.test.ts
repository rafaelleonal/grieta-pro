import assert from "node:assert/strict";
import test from "node:test";
import { RUNE_SHARD_ROWS, runeShardIcon, shardsFitRows } from "../lib/rune-shards";
import { validateCoachRunes, CoachPlanValidationError } from "../lib/validation";
import { fixtureCatalog, fixturePlan } from "./coach-fixtures";

test("stat shards map to Data Dragon icons and keep legacy text readable", () => {
  for (const row of RUNE_SHARD_ROWS)
    for (const label of row) {
      assert.ok(label.length <= 40, "stored shard labels fit the plan schema");
      assert.match(
        runeShardIcon(label)!,
        /^https:\/\/ddragon\.leagueoflegends\.com\/cdn\/img\/perk-images\/StatMods\/\w+\.png$/,
      );
    }
  assert.equal(runeShardIcon("Armadura antigua"), undefined);
  assert.equal(runeShardIcon("toString"), undefined);
  assert.ok(shardsFitRows(["Fuerza adaptable", "Vida escalable", "Vida"]));
  assert.ok(shardsFitRows(["Texto libre", "Otro", "Antiguo"]));
  assert.ok(!shardsFitRows(["Vida", "Fuerza adaptable", "Vida"]));
});

test("a known shard in the wrong row invalidates only the rune page", () => {
  const runes = structuredClone(fixturePlan.build.runes);
  runes.shards = ["Fuerza adaptable", "Velocidad de movimiento", "Vida"];
  validateCoachRunes(runes, fixtureCatalog);
  runes.shards = ["Velocidad de movimiento", "Fuerza adaptable", "Vida"];
  assert.throws(
    () => validateCoachRunes(runes, fixtureCatalog),
    (error) => error instanceof CoachPlanValidationError && error.category === "primary_runes",
  );
});
