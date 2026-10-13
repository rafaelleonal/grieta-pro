import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PlanDetails } from "../components/plan/plan-details";
import { CoachBriefView } from "../components/coach-brief";
import { catalogMaps } from "../components/plan/shared";
import { planText } from "../components/plan/plan-text";
import { demoInput, demoResult } from "../lib/demo";
import { fixtureCatalog } from "./coach-fixtures";
import type { LegacyCoachResult, PartialCoachResult } from "../lib/types";

const maps = catalogMaps(fixtureCatalog);
test("the detail view preserves older format advice without requiring modern build fields", () => {
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
        starting: [],
        core: [],
        situational: [],
        runes: ["Electrocutar"],
        summoners: ["Destello"],
        skillOrder: "Q > W > E",
      },
      macro: ["Rota con visión."],
      avoid: ["No entres sin E."],
    },
  };
  const html = renderToStaticMarkup(
    createElement(PlanDetails, { result: legacy, input: demoInput, maps }),
  );
  for (const advice of [
    "Usa Q desde lejos.",
    "Cambia de ángulo.",
    "Electrocutar",
    "Destello",
    "Rota con visión.",
    "No entres sin E.",
  ])
    assert.ok(html.includes(advice));
  assert.ok(
    renderToStaticMarkup(
      createElement(CoachBriefView, { result: legacy, input: demoInput }),
    ).includes("Sin valoración"),
  );
});

test("a partial plan with no build or levels renders its gaps and keeps matchup in copy export", () => {
  const partial: PartialCoachResult = {
    meta: {
      ...demoResult.meta,
      formatVersion: 3,
      partial: { missing: ["levels", "runes"], reason: "optional", categories: [] },
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
  const html = renderToStaticMarkup(
    createElement(PlanDetails, { result: partial, input: demoInput, maps }),
  );
  assert.ok(html.includes("No se incluyeron consejos válidos"));
  assert.ok(html.includes("No se incluyeron runas válidas"));
  assert.ok(html.includes("No se incluyó un orden válido"));
  const text = planText(partial, maps, false, demoInput);
  assert.ok(text.includes("El rival es tu counter directo"));
  assert.ok(text.includes("Su muro bloquea E."));
  assert.ok(text.includes("Cambia si gasta W."));
});
