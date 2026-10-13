import assert from "node:assert/strict";
import test from "node:test";
import snapshot from "../data/catalog-snapshot.json";
import { coachMechanics, contextualizeCoachBrief, MECHANICS_VERSION } from "../lib/coach-mechanics";
import { cleanAbilityTooltip } from "../lib/catalog";
import type { Catalog, CoachInput } from "../lib/types";

const input: CoachInput = {
  champion: "Ahri",
  enemy: "Yasuo",
  role: "MID",
  rank: "Oro",
  allies: ["Jinx"],
  enemies: ["Vi"],
  notes: "",
  webSearch: false,
};
const live = { ...snapshot, source: "live", version: MECHANICS_VERSION } as Catalog;

test("mechanics include known team threats without inventing a bot partner", () => {
  const context = coachMechanics(input, live);
  assert.deepEqual(
    context.champions.map((c) => c.id),
    ["Ahri", "Yasuo", "Jinx", "Vi"],
  );
  assert.ok(context.champions.find((c) => c.id === "Vi")?.limits.includes("imparable"));
  assert.equal(
    context.champions.some((c) => c.id === "Nautilus"),
    false,
  );
  assert.deepEqual(
    coachMechanics({ ...input, allyDuo: "Jinx" }, live).champions,
    context.champions,
  );
});

test("editorial mechanics expire on unreviewed patches and fallback catalogs", () => {
  for (const catalog of [
    { ...live, version: "16.21.1" },
    { ...live, source: "snapshot" as const },
  ]) {
    const context = coachMechanics(input, catalog);
    assert.equal(context.reviewedVersion, null);
    assert.deepEqual(context.champions, []);
    assert.ok(context.unknown.includes("Sin dato explícito"));
  }
});

test("bot certainty requires both explicit lane partners, independently of model instructions", () => {
  const brief = {
    matchup: {
      verdict: "favored" as const,
      reason: "Presión a distancia.",
      condition: "Si aciertas el control.",
    },
    priority: "Cuida la oleada.",
  };
  for (const role of ["ADC", "SUPPORT"] as const) {
    for (const duo of [{}, { allyDuo: "Jinx" }, { enemyDuo: "Nautilus" }]) {
      const result = contextualizeCoachBrief(brief, { ...input, role, ...duo });
      assert.equal(result.matchup?.verdict, "uncertain");
      assert.match(result.matchup!.condition, /Falta confirmar/);
      assert.equal(result.priority, brief.priority);
    }
    assert.equal(
      contextualizeCoachBrief(brief, { ...input, role, allyDuo: "Jinx", enemyDuo: "Nautilus" }),
      brief,
    );
  }
  assert.equal(contextualizeCoachBrief(brief, input), brief);
  assert.equal(brief.matchup.verdict, "favored", "does not mutate the model's raw response");
});

test("unresolved Riot formula values stay unknown without deleting mechanical conditions", () => {
  const tooltip = cleanAbilityTooltip(
    "<b>Q</b> otorga <keywordStealth>True Sight</keywordStealth> al impactar durante {{ duration }} segundos.{{ spellmodifierdescriptionappend }}",
  );
  assert.equal(tooltip, "Q otorga True Sight al impactar durante [dato no disponible] segundos.");
  assert.equal(
    cleanAbilityTooltip("Desplazamiento <status>imparable</status>."),
    "Desplazamiento imparable.",
  );
});
