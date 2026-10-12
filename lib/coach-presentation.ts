import { isCurrentCoachResult, isPartialCoachResult } from "./types";
import type { CoachBrief, SavedCoachResult, CoachSection } from "./types";

/** Project validated advice; never paraphrase, fill gaps or borrow advice from another record. */
export function coachBrief(result: SavedCoachResult): CoachBrief {
  const modern = isCurrentCoachResult(result) || isPartialCoachResult(result);
  const provided = modern ? result.plan.brief : undefined;
  const window = modern ? result.plan.reactions.linea[0] : result.plan.mechanics[0];
  const opportunity = modern ? result.plan.levels.find((step) => step.edge === "tu") : undefined;
  const avoid = modern ? result.plan.avoid.linea : result.plan.avoid[0];
  return {
    ...(provided?.matchup ? { matchup: provided.matchup } : {}),
    ...(provided?.teamfight ? { teamfight: provided.teamfight } : {}),
    priority:
      provided?.priority ||
      result.plan.winCondition ||
      (modern ? result.plan.levels[0]?.text : result.plan.levels[0]?.action),
    window:
      provided?.window ||
      (window
        ? { trigger: window.trigger, response: window.response }
        : opportunity
          ? { trigger: opportunity.cue, response: opportunity.text }
          : undefined),
    avoid: provided?.avoid || avoid,
  };
}
export function unavailableDetail(result: SavedCoachResult, section: CoachSection): string {
  if (!isPartialCoachResult(result)) return "";
  const invalid = result.meta.partial.invalid || result.meta.partial.missing;
  return invalid.includes(section)
    ? "No pudimos confirmar estos datos de la respuesta."
    : "Este detalle no se incluyó en la respuesta.";
}

export const MATCHUP_LABELS = {
  favored: "Tienes ventaja",
  you_counter: "Eres su counter directo",
  enemy_counter: "El rival es tu counter directo",
  even: "Matchup equilibrado",
  uncertain: "Sin determinar",
} as const;
