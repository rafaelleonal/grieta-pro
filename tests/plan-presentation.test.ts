import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CoachingResult } from "../components/coaching-result";
import { GeneratingScreen } from "../components/coach/generating-screen";
import { catalogMaps } from "../components/plan/shared";
import { planText } from "../components/plan/plan-text";
import { demoInput, demoResult } from "../lib/demo";
import { fixtureCatalog } from "./coach-fixtures";
import type {
  BuildCoachResult,
  CoachInput,
  LegacyCoachResult,
  PartialCoachResult,
  SavedCoachResult,
} from "../lib/types";

const maps = catalogMaps(fixtureCatalog);
const legacy: LegacyCoachResult = {
  meta: { ...demoResult.meta, formatVersion: 1 },
  plan: {
    headline: "Plan anterior",
    difficulty: "Orientativo",
    winCondition: "Conserva E.",
    levels: [{ level: "1", action: "Usa Q desde lejos." }],
    mechanics: [{ trigger: "Gasta W", response: "Cambia de ángulo." }],
    build: {
      label: "Anterior",
      starting: ["1056"],
      core: ["3020"],
      situational: [{ item: "3157", reason: "Si te buscan" }],
      runes: ["Electrocutar"],
      summoners: ["Destello"],
      skillOrder: "Q > W > E",
    },
    macro: ["Rota con visión."],
    avoid: ["No entres sin E."],
  },
};
function render(result: SavedCoachResult, input: CoachInput = demoInput) {
  return renderToStaticMarkup(
    createElement(CoachingResult, {
      result,
      input,
      catalog: fixtureCatalog,
      sample: false,
    }),
  );
}

test("historical output and copied text show stored build choices without strategy", () => {
  const html = render(legacy);
  const text = planText(legacy, maps, false, demoInput);
  for (const output of [html, text]) {
    for (const choice of ["Electrocutar", "Destello", "Si te buscan"])
      assert.ok(output.includes(choice), choice);
    for (const advice of [
      "Conserva E.",
      "Usa Q desde lejos.",
      "Cambia de ángulo.",
      "Rota con visión.",
      "No entres sin E.",
      "Q > W > E",
    ])
      assert.ok(!output.includes(advice), advice);
  }
  assert.ok(html.includes("Build recomendada"));
  assert.ok(html.includes("Copiar build"));
  assert.ok(!html.includes("Preguntar"));
  assert.ok(!html.includes("Habilidades 1–6"));
  assert.ok(!text.includes("Habilidades 1–6"));
});

test("modern historical plans retain all loadout choices and omit tactical sections", () => {
  const html = render(demoResult);
  const text = planText(demoResult, maps, false, demoInput);
  for (const output of [html, text]) {
    assert.ok(output.includes("Electrocutar"));
    assert.ok(output.includes("Destello"));
    assert.ok(output.includes("Fragmentos"));
    for (const section of [
      "Niveles 1–6",
      "Orden de habilidades",
      "Mapa y peleas",
      "LECTURA DEL MATCHUP",
      "TU PRIORIDAD",
      "Compras por fase",
    ])
      assert.ok(!output.includes(section), section);
    assert.ok(!output.includes(demoResult.plan.levels[0].text));
    assert.ok(!output.includes(demoResult.plan.macro[0]));
  }
});

test("a partial historical result exposes only missing build choices", () => {
  const partial: PartialCoachResult = {
    meta: {
      ...demoResult.meta,
      formatVersion: 3,
      partial: {
        missing: ["levels", "runes"],
        invalid: ["levels"],
        reason: "optional",
        categories: [],
      },
    },
    plan: {
      ...demoResult.plan,
      levels: [],
      brief: {
        priority: "Conserva E.",
        matchup: {
          verdict: "enemy_counter",
          reason: "Su muro bloquea E.",
          condition: "Cambia si gasta W.",
        },
      },
      build: {
        label: "",
        starting: [],
        core: [],
        situational: [],
        nowByPhase: { linea: [], mid: [], late: [] },
      },
    },
  };
  const html = render(partial);
  assert.ok(html.includes("No se incluyeron runas."));
  assert.ok(html.includes("No se incluyeron hechizos."));
  assert.ok(!html.includes("no superaron la validación"));
  const text = planText(partial, maps, false, demoInput);
  assert.ok(!text.includes("Su muro bloquea E."));
  assert.ok(!text.includes("Conserva E."));
});

test("build format renders the same choices while generation has no strategy placeholders", () => {
  const build: BuildCoachResult = {
    meta: {
      ...demoResult.meta,
      formatVersion: 4,
      partial: { missing: ["items"], invalid: ["items"], reason: "validation", categories: [] },
    },
    plan: { ...demoResult.plan, brief: undefined, levels: [], macro: [] },
  };
  const html = render(build);
  assert.ok(html.includes("Build recomendada"));
  assert.ok(html.includes("Electrocutar"));
  assert.ok(html.includes("Algunas elecciones no superaron la validación"));
  const loading = renderToStaticMarkup(
    createElement(GeneratingScreen, {
      input: demoInput,
      catalog: fixtureCatalog,
      onCancel: () => undefined,
      preparation: { summoners: demoResult.plan.build.summoners },
    }),
  );
  assert.ok(loading.includes("Destello"));
  assert.ok(loading.includes("Preparando runas"));
  assert.ok(loading.includes("Cancelar puede consumir cuota"));
  for (const section of ["matchup", "nivel", "mapa", "prioridad"])
    assert.ok(!loading.includes(section), section);
});

test("saved skill choices expose six clear levels in the build and copied text", () => {
  const html = render(demoResult);
  const copied = planText(demoResult, maps, false, demoInput);
  assert.ok(html.includes("Habilidades 1–6"));
  demoResult.plan.build.skillOrder.first6.forEach((skill, index) => {
    assert.ok(html.includes(`aria-label="Nivel ${index + 1}: ${skill}"`));
    assert.ok(copied.includes(`Nivel ${index + 1}: ${skill}`));
  });
  assert.ok(html.indexOf("Habilidades 1–6") < html.indexOf("Build recomendada</h2>"));
  assert.ok(!html.includes(demoResult.plan.levels[0].text));
  assert.ok(!copied.includes(demoResult.plan.levels[0].text));
});

test("saved builds without skill choices omit the level block instead of inventing choices", () => {
  const result: BuildCoachResult = {
    meta: { ...demoResult.meta, formatVersion: 4 },
    plan: { ...demoResult.plan, build: { ...demoResult.plan.build, skillOrder: undefined } },
  };
  assert.ok(!render(result).includes("Habilidades 1–6"));
  assert.ok(!planText(result, maps, false, demoInput).includes("Habilidades 1–6"));
});

test("Aphelios displays stored attribute priority without pretending to rank QWER", () => {
  const input: CoachInput = { ...demoInput, champion: "Aphelios", role: "ADC" };
  const result: BuildCoachResult = {
    meta: { ...demoResult.meta, formatVersion: 4 },
    plan: {
      ...demoResult.plan,
      build: {
        ...demoResult.plan.build,
        skillOrder: { first6: [null, null, null, null, null, null], max: "AD → AS → Letalidad" },
      },
    },
  };
  const html = render(result, input);
  const copied = planText(result, maps, false, input);
  for (const output of [html, copied]) {
    assert.ok(output.includes("Mejora atributos"));
    assert.ok(output.includes("AD → AS → Letalidad"));
    assert.ok(!output.includes("Nivel 1: Q"));
    assert.ok(!output.includes("Nivel 1: sin dato"));
  }
  assert.ok(!html.includes('aria-label="Nivel 1:'));
});

test("invalid skill choices keep the build and expose validation notice without fabricated levels", () => {
  const result: BuildCoachResult = {
    meta: {
      ...demoResult.meta,
      formatVersion: 4,
      partial: {
        missing: ["skillOrder"],
        invalid: ["skillOrder"],
        reason: "validation",
        categories: ["skill_order"],
      },
    },
    plan: { ...demoResult.plan, build: { ...demoResult.plan.build, skillOrder: undefined } },
  };
  const html = render(result);
  assert.ok(html.includes("Algunas elecciones no superaron la validación"));
  assert.ok(html.includes("Electrocutar"));
  assert.ok(html.includes("Build recomendada"));
  assert.ok(!html.includes("Habilidades 1–6"));
});
