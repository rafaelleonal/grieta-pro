import type { Catalog, CoachPreparation } from "./types";
import {
  coachPlanSchema,
  validateCoachRunes,
  validateCoachSummoners,
  validateStartingGold,
} from "./validation";

/** Invalid choices are withheld, so later section recovery remains possible. */
export function validatedPreparation(value: unknown, catalog: Catalog): CoachPreparation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const build = value as Record<string, unknown>;
  const result: CoachPreparation = {};
  const schema = coachPlanSchema.shape.build.shape;
  const summoners = schema.summoners.safeParse(build.summoners);
  if (summoners.success) {
    try {
      validateCoachSummoners(summoners.data, catalog);
      result.summoners = summoners.data;
    } catch {
      /* Withhold invalid pair. */
    }
  }
  const starting = schema.starting.min(1).safeParse(build.starting);
  if (
    starting.success &&
    new Set(starting.data).size === starting.data.length &&
    starting.data.every((id) => catalog.items.some((item) => item.id === id))
  ) {
    try {
      validateStartingGold(starting.data, catalog);
      result.starting = starting.data;
    } catch {
      /* Withhold unaffordable basket. */
    }
  }
  const runes = schema.runes.safeParse(build.runes);
  if (runes.success) {
    try {
      validateCoachRunes(runes.data, catalog);
      result.runes = runes.data;
    } catch {
      /* Withhold illegal rune page. */
    }
  }
  return result;
}
