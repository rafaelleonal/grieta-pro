import { z } from "zod";
import type { Catalog, CoachInput, CoachPlan } from "./types";
import { ApiError } from "./http";
import { assertSafeOutputText } from "./coach-safety";
import { shardsFitRows } from "./rune-shards";

const roles = z.enum(["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"]);
const championId = z.string().regex(/^[A-Za-z][A-Za-z0-9]{0,39}$/);

/** ADR 0009: la consulta sólo contiene IDs del catálogo y un rol; no hay texto libre. */
export const coachInputSchema = z
  .object({ champion: championId, enemy: championId, role: roles })
  .strict();

const shortText = z.string().trim().min(1).max(240);
const cueText = z.string().trim().min(1).max(72);
const catalogKey = z.string().regex(/^[A-Za-z][A-Za-z0-9]{0,59}$/);
const itemId = z.string().regex(/^\d{1,7}$/);
const skill = z.enum(["Q", "W", "E", "R"]);
const championReferences = z.array(championId).max(5);
const mark = z.enum(["threat", "synergy", "target"]);
const stepFields = {
  cue: cueText,
  text: shortText,
  edge: z.enum(["tu", "par", "ojo"]),
  skill: skill.optional(),
  champions: championReferences.optional(),
};
const stepSchema = z.object(stepFields).strict();
const reactionSchema = z
  .object({
    trigger: z.string().trim().min(1).max(120),
    response: shortText,
    champions: championReferences,
  })
  .strict();
const alternatives = {
  when: z.string().trim().min(1).max(120),
  why: shortText,
  champions: championReferences.optional(),
};
const summonerPair = z.tuple([catalogKey, catalogKey]);
export const coachBriefSchema = z
  .object({
    matchup: z
      .object({
        verdict: z.enum(["favored", "you_counter", "enemy_counter", "even", "uncertain"]),
        reason: shortText,
        condition: shortText,
      })
      .strict(),
    priority: shortText,
    teamfight: z.object({ setup: shortText, job: shortText, fallback: shortText }).strict(),
    window: z.object({ trigger: z.string().trim().min(1).max(120), response: shortText }).strict(),
    avoid: shortText,
  })
  .strict();
export const coachPlanSchema = z
  .object({
    brief: coachBriefSchema.partial().optional(),
    headline: z.string().trim().min(1).max(100),
    difficulty: z.string().trim().min(1).max(60),
    winCondition: shortText,
    levels: z
      .array(z.object({ ...stepFields, level: z.enum(["1", "2", "3", "4", "5", "6"]) }).strict())
      .length(6),
    phases: z
      .object({
        mid: z.array(stepSchema).min(3).max(4),
        late: z.array(stepSchema).min(3).max(4),
      })
      .strict(),
    reactions: z
      .object({
        linea: z.array(reactionSchema).min(2).max(3),
        mid: z.array(reactionSchema).min(2).max(3),
        late: z.array(reactionSchema).min(2).max(3),
      })
      .strict(),
    avoid: z.object({ linea: shortText, mid: shortText, late: shortText }).strict(),
    enemyKeys: z
      .array(
        z
          .object({
            key: z.enum(["Q", "Q3", "W", "E", "R", "P"]),
            name: z.string().trim().min(1).max(80),
            cooldown: z.string().trim().min(1).max(40),
            note: z.string().trim().min(1).max(140),
            champions: championReferences.optional(),
          })
          .strict(),
      )
      .min(2)
      .max(4),
    composition: z
      .array(
        z
          .object({
            champion: championId,
            team: z.enum(["ally", "enemy"]),
            mark: mark.optional(),
            label: z.string().trim().min(1).max(32),
            note: z.string().trim().min(1).max(140).optional(),
          })
          .strict(),
      )
      .min(2)
      .max(10),
    compNotes: z
      .array(
        z
          .object({
            champions: championReferences.min(1),
            mark,
            title: z.string().trim().min(1).max(60),
            action: z.string().trim().min(1).max(120),
          })
          .strict(),
      )
      .max(3),
    build: z
      .object({
        label: z.string().trim().min(1).max(100),
        starting: z.array(itemId).max(3),
        core: z.array(itemId).max(3),
        situational: z
          .array(
            z
              .object({ item: itemId, reason: shortText, champions: championReferences.optional() })
              .strict(),
          )
          .max(3),
        nowByPhase: z
          .object({
            linea: z.array(itemId).max(6),
            mid: z.array(itemId).max(6),
            late: z.array(itemId).max(6),
          })
          .strict(),
        runes: z
          .object({
            primary: z
              .object({
                style: catalogKey,
                keystone: catalogKey,
                minors: z.tuple([catalogKey, catalogKey, catalogKey]),
              })
              .strict(),
            secondary: z
              .object({ style: catalogKey, minors: z.tuple([catalogKey, catalogKey]) })
              .strict(),
            shards: z.tuple([
              z.string().trim().min(1).max(40),
              z.string().trim().min(1).max(40),
              z.string().trim().min(1).max(40),
            ]),
            why: shortText,
            alternative: z
              .object({ style: catalogKey, keystone: catalogKey, ...alternatives })
              .strict()
              .optional(),
          })
          .strict(),
        summoners: z
          .object({
            pick: summonerPair,
            why: shortText,
            alternative: z
              .object({ pick: summonerPair, ...alternatives })
              .strict()
              .optional(),
          })
          .strict(),
        skillOrder: z
          .object({
            first6: z.array(skill.nullable()).length(6),
            max: z.string().trim().min(1).max(80),
          })
          .strict(),
      })
      .strict(),
    macro: z.array(shortText).min(1).max(3),
  })
  .strict();

/** Shape, then catalog: an unknown or repeated champion never reaches the provider. */
export function validateCoachInput(input: unknown, catalog: Catalog): CoachInput {
  const parsed = coachInputSchema.safeParse(input);
  if (!parsed.success) throw new ApiError(400, "Elige tu campeón, tu rival y tu rol.");
  const ids = new Set(catalog.champions.map((champion) => champion.id));
  if (!ids.has(parsed.data.champion) || !ids.has(parsed.data.enemy))
    throw new ApiError(
      400,
      "Uno de los campeones no existe en el catálogo actual. Vuelve a seleccionarlo.",
    );
  if (parsed.data.champion === parsed.data.enemy)
    throw new ApiError(400, "Elige un rival distinto de tu campeón.");
  return parsed.data;
}

/** Validate every displayable string before discarding unknown IDs or rendering any result. */
export function assertSafeOutput(value: unknown): void {
  if (typeof value === "string") assertSafeOutputText(value);
  else if (Array.isArray(value)) value.forEach(assertSafeOutput);
  else if (value && typeof value === "object") Object.values(value).forEach(assertSafeOutput);
}

export const COACH_PLAN_VALIDATION_CATEGORIES = [
  "schema",
  "levels",
  "composition",
  "composition_context",
  "champion_references",
  "enemy_keys",
  "primary_runes",
  "secondary_runes",
  "alternative_runes",
  "summoner_spells",
  "skill_order",
  // Retained for historical diagnostics; orphan phase highlights are now omitted with a warning.
  "phase_items",
  "starting_gold",
] as const;
export type CoachPlanValidationCategory = (typeof COACH_PLAN_VALIDATION_CATEGORIES)[number];

/** A finite rule identifier for server diagnostics; never carries model values or Zod issues. */
export class CoachPlanValidationError extends ApiError {
  readonly category: CoachPlanValidationCategory;
  constructor(category: CoachPlanValidationCategory) {
    super(
      502,
      "La IA devolvió un plan incompleto o incoherente. Tu selección sigue guardada; puedes volver a consultar.",
    );
    this.name = "CoachPlanValidationError";
    this.category = COACH_PLAN_VALIDATION_CATEGORIES.includes(category) ? category : "schema";
  }
}

const invalid = (category: CoachPlanValidationCategory) => new CoachPlanValidationError(category);

/** Starting purchases must fit the standard Summoner's Rift opening budget. */
export function validateStartingGold(ids: string[], catalog: Catalog) {
  const prices = new Map(catalog.items.map((item) => [item.id, item.gold]));
  if (ids.reduce((total, id) => total + (prices.get(id) ?? 0), 0) > 500)
    throw invalid("starting_gold");
}

export function validateCoachRunes(
  runesValue: CoachPlan["build"]["runes"],
  catalog: Catalog,
): void {
  const styles = new Map(catalog.runeStyles.map((style) => [style.key, style]));
  const runes = new Map(catalog.runes.map((rune) => [rune.key, rune]));
  const inSlot = (key: string, style: string, slot: number) =>
    runes.get(key)?.style === style &&
    runes.get(key)?.slot === slot &&
    Boolean(styles.get(style)?.slots[slot]?.includes(key));
  const { primary, secondary, alternative } = runesValue;
  if (
    !styles.has(primary.style) ||
    !styles.has(secondary.style) ||
    primary.style === secondary.style ||
    !inSlot(primary.keystone, primary.style, 0) ||
    primary.minors.some((key, index) => !inSlot(key, primary.style, index + 1))
  )
    throw invalid(
      styles.has(primary.style) &&
        (!styles.has(secondary.style) || primary.style === secondary.style)
        ? "secondary_runes"
        : "primary_runes",
    );
  const secondarySlots = secondary.minors.map((key) => runes.get(key)?.slot);
  if (
    new Set(secondarySlots).size !== 2 ||
    secondary.minors.some((key, index) => {
      const slot = secondarySlots[index];
      return (
        typeof slot !== "number" || slot < 1 || slot > 3 || !inSlot(key, secondary.style, slot)
      );
    })
  )
    throw invalid("secondary_runes");
  if (!shardsFitRows(runesValue.shards)) throw invalid("primary_runes");
  if (alternative && !inSlot(alternative.keystone, alternative.style, 0))
    throw invalid("alternative_runes");
}

export function validateCoachSummoners(
  summonersValue: CoachPlan["build"]["summoners"],
  catalog: Catalog,
): void {
  const spells = new Set(catalog.summoners.map((spell) => spell.id));
  for (const pick of [summonersValue.pick, summonersValue.alternative?.pick]) {
    if (pick && (new Set(pick).size !== 2 || pick.some((id) => !spells.has(id))))
      throw invalid("summoner_spells");
  }
}

export function validateCoachSkillOrder(
  skillOrderValue: CoachPlan["build"]["skillOrder"],
  context?: Pick<CoachInput, "champion">,
): void {
  const { first6, max } = skillOrderValue;
  if (context?.champion === "Aphelios") {
    const attributes = max.split(/\s*(?:→|>)\s*/);
    if (
      !first6.every((rank) => rank === null) ||
      attributes.length !== 3 ||
      new Set(attributes).size !== 3 ||
      attributes.some((attribute) => !["AD", "AS", "Letalidad"].includes(attribute))
    )
      throw invalid("skill_order");
  } else {
    const priority = max.split(/\s*(?:→|>)\s*/);
    const basicSkills = context?.champion === "Udyr" ? ["Q", "W", "E", "R"] : ["Q", "W", "E"];
    if (
      first6.some((rank) => rank === null) ||
      priority.length !== 3 ||
      new Set(priority).size !== 3 ||
      priority.some((rank) => !basicSkills.includes(rank))
    )
      throw invalid("skill_order");
    const ranks = { Q: 0, W: 0, E: 0, R: 0 };
    first6.forEach((rank, index) => {
      if (!rank) throw invalid("skill_order");
      ranks[rank]++;
      const level = index + 1;
      if (rank === "R" && context?.champion !== "Udyr") {
        // Jayce transforms automatically; Nidalee and Elise can upgrade R at level 6.
        if (context?.champion === "Jayce" || level < 6 || ranks.R > 1) throw invalid("skill_order");
      } else if (ranks[rank] > Math.ceil(level / 2)) throw invalid("skill_order");
    });
  }
}
