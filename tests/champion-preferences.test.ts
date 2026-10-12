import assert from "node:assert/strict";
import test from "node:test";
import snapshot from "../data/catalog-snapshot.json";
import {
  championPreferenceInputSchema,
  emptyChampionPreferences,
  parseChampionPreferenceInput,
} from "../lib/champion-preferences";
import { ApiError } from "../lib/errors";

test("favorite preferences preserve custom priority and allow any champion in any role", () => {
  const input = { role: "SUPPORT", champions: ["Yasuo", "Ahri"], version: 0 };
  assert.deepEqual(parseChampionPreferenceInput(input, snapshot), input);
  assert.deepEqual(
    parseChampionPreferenceInput({ ...input, champions: [] }, snapshot).champions,
    [],
  );
});

test("favorite preferences reject forged ownership, invalid roles, IDs and duplicates", () => {
  const valid = { role: "MID", champions: ["Ahri"], version: 1 };
  for (const input of [
    { ...valid, userId: "someone-else" },
    { ...valid, role: "UNKNOWN" },
    { ...valid, champions: ["Ahri", "Ahri"] },
    { ...valid, champions: ["NotAChampion"] },
    { ...valid, champions: ["<script>"] },
    { ...valid, champions: snapshot.champions.slice(0, 13).map((champion) => champion.id) },
    { ...valid, version: -1 },
    { ...valid, version: 0.5 },
    { ...valid, version: 2_147_483_647 },
  ]) {
    assert.throws(
      () => parseChampionPreferenceInput(input, snapshot),
      (error) => error instanceof ApiError && error.status === 400,
    );
  }
  assert.equal(championPreferenceInputSchema.safeParse(valid).success, true);
});

test("new preference state has independent arrays and an unset version for each role", () => {
  const first = emptyChampionPreferences();
  const second = emptyChampionPreferences();
  first.favorites.MID.push("Ahri");
  assert.deepEqual(first.favorites.TOP, []);
  assert.deepEqual(second.favorites.MID, []);
  assert.deepEqual(second.versions, { TOP: 0, JUNGLE: 0, MID: 0, ADC: 0, SUPPORT: 0 });
});
