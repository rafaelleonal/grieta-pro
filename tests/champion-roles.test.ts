import assert from "node:assert/strict";
import test from "node:test";
import snapshot from "../data/catalog-snapshot.json";
import {
  CHAMPION_ROLES,
  COMMON_CHAMPIONS,
  championOptions,
  emptyChampionPreferences,
  moveChampionFavorite,
  readChampionPreferences,
  toggleChampionFavorite,
} from "../lib/champion-roles";
import type { Champion } from "../lib/types";

const champions: Champion[] = [
  { id: "Zed", key: "238", name: "Zed", title: "", image: "" },
  { id: "Ahri", key: "103", name: "Ahri", title: "", image: "" },
  { id: "Garen", key: "86", name: "Garen", title: "", image: "" },
  { id: "Jinx", key: "222", name: "Jinx", title: "", image: "" },
];

test("every editorial role shortcut resolves to a real snapshot champion", () => {
  const ids = new Set(snapshot.champions.map((champion) => champion.id));
  for (const role of CHAMPION_ROLES) {
    assert.ok(COMMON_CHAMPIONS[role].length > 0);
    assert.equal(new Set(COMMON_CHAMPIONS[role]).size, COMMON_CHAMPIONS[role].length);
    for (const id of COMMON_CHAMPIONS[role]) assert.ok(ids.has(id), `${role}: ${id}`);
  }
});

test("role shortcuts do not restrict all-champion selection or search", () => {
  assert.deepEqual(
    championOptions(champions, { role: "MID" }).map((entry) => entry.id),
    ["Ahri", "Zed"],
  );
  assert.deepEqual(
    championOptions(champions, { role: "MID", query: "  GAREN " }).map((entry) => entry.id),
    ["Garen"],
  );
  assert.equal(championOptions(champions, { role: "MID", showAll: true }).length, champions.length);
  assert.equal(championOptions(champions, {}).length, champions.length);
  assert.deepEqual(
    champions.map((entry) => entry.id),
    ["Zed", "Ahri", "Garen", "Jinx"],
    "sorting must not mutate the shared catalog",
  );
});

test("favorites keep explicit priority and allow a champion outside the usual role", () => {
  const favorites = ["Jinx", "Zed", "Ahri"];
  assert.deepEqual(
    championOptions(champions, { role: "MID", favorites }).map((entry) => entry.id),
    favorites,
  );
  assert.deepEqual(
    championOptions(champions, { role: "TOP", favorites: ["Ahri"] }).map((entry) => entry.id),
    ["Ahri", "Garen"],
  );
  assert.deepEqual(
    championOptions(champions, { role: "MID", favorites: ["Missing"] }).map((entry) => entry.id),
    ["Ahri", "Zed"],
  );
});

test("favorite additions, removals and priority controls preserve other preferences", () => {
  const favorites = ["Jinx", "Zed", "Ahri"];
  assert.deepEqual(toggleChampionFavorite(favorites, "Garen"), ["Jinx", "Zed", "Ahri", "Garen"]);
  assert.deepEqual(toggleChampionFavorite(favorites, "Zed"), ["Jinx", "Ahri"]);
  assert.deepEqual(moveChampionFavorite(favorites, "Zed", -1), ["Zed", "Jinx", "Ahri"]);
  assert.deepEqual(moveChampionFavorite(favorites, "Zed", 1), ["Jinx", "Ahri", "Zed"]);
  assert.deepEqual(moveChampionFavorite(favorites, "Jinx", -1), favorites);
  assert.deepEqual(moveChampionFavorite(favorites, "Ahri", 1), favorites);
  assert.deepEqual(moveChampionFavorite(favorites, "Missing", 1), favorites);
  assert.deepEqual(favorites, ["Jinx", "Zed", "Ahri"]);
});

test("untrusted preference responses must include every role and bounded unique champion IDs", () => {
  const preferences = emptyChampionPreferences();
  preferences.favorites.MID = ["Ahri", "Jinx"];
  preferences.versions.MID = 8;
  assert.deepEqual(readChampionPreferences(preferences), preferences);
  for (const malformed of [
    null,
    { favorites: {}, versions: preferences.versions },
    { ...preferences, favorites: { ...preferences.favorites, MID: ["Ahri", "Ahri"] } },
    { ...preferences, favorites: { ...preferences.favorites, MID: ["../Ahri"] } },
    {
      ...preferences,
      favorites: {
        ...preferences.favorites,
        MID: Array.from({ length: 13 }, (_, index) => `Champion${index}`),
      },
    },
    { ...preferences, versions: { ...preferences.versions, MID: -1 } },
    { ...preferences, versions: { ...preferences.versions, MID: 1.5 } },
  ])
    assert.throws(() => readChampionPreferences(malformed));
  const parsed = readChampionPreferences(preferences);
  parsed.favorites.MID.push("Zed");
  assert.deepEqual(
    preferences.favorites.MID,
    ["Ahri", "Jinx"],
    "responses are copied before UI state owns them",
  );
});
