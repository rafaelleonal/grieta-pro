import { z } from "zod";
import type { Catalog, CoachInput, CoachPlan, DraftInput, DraftResult } from "./types";
import { ApiError } from "./http";
import { assertSafeInputText, assertSafeOutputText } from "./coach-safety";
import { shardsFitRows } from "./rune-shards";

export const MAX_IMAGE_BYTES = 2_500_000;
const roles = z.enum(["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"]);
const ranks = z.enum([
  "Sin clasificar",
  "Hierro",
  "Bronce",
  "Plata",
  "Oro",
  "Platino",
  "Esmeralda",
  "Diamante",
  "Master",
  "Grandmaster",
  "Challenger",
]);
const championId = z.string().regex(/^[A-Za-z][A-Za-z0-9]{0,39}$/);
const optionalCredential = z.preprocess(
  (value) => (typeof value === "string" && !value.trim() ? undefined : value),
  z.string().trim().min(1).max(300).regex(/^\S+$/).optional(),
);
const credentials = {
  apiKey: optionalCredential,
  accessToken: optionalCredential,
  model: z.preprocess(
    (value) => (typeof value === "string" && !value.trim() ? undefined : value),
    z
      .string()
      .trim()
      .min(3)
      .max(120)
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9._:/-]+$/)
      .optional(),
  ),
};

export const coachInputSchema = z
  .object({
    ...credentials,
    champion: championId,
    enemy: championId,
    role: roles,
    rank: ranks,
    allies: z.array(championId).max(5),
    enemies: z.array(championId).max(5),
    notes: z.string().trim().max(1500),
    webSearch: z.boolean(),
  })
  .strict();

export const draftInputSchema = z
  .object({
    ...credentials,
    text: z.string().trim().max(2500).optional(),
    image: z.string().max(3_340_000).optional(),
  })
  .strict()
  .refine((value) => Boolean(value.text || value.image), {
    message: "Escribe los campeones o agrega una captura.",
  });

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
    priority: shortText,
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

export const draftResultSchema = z
  .object({
    champion: championId.nullable(),
    enemy: championId.nullable(),
    role: roles.nullable(),
    allies: z.array(championId).max(5),
    enemies: z.array(championId).max(5),
    notes: z.string().max(1500),
    warnings: z.array(z.string().min(1).max(240)).max(8),
  })
  .strict();

function parseInput<T>(schema: z.ZodType<T>, input: unknown, fallback: string): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new ApiError(400, fallback);
  return result.data;
}

export function validateCoachInputStructure(input: unknown): CoachInput {
  const parsed = parseInput(
    coachInputSchema,
    input,
    "Revisa tu campeón, rival, línea y contexto. Puedes agregar hasta 5 campeones por equipo y 1500 caracteres de notas.",
  );
  assertSafeInputText(parsed.notes);
  if (!coherentTeams(parsed.champion, parsed.enemy, parsed.allies, parsed.enemies)) {
    throw new ApiError(
      400,
      "Revisa los equipos: cada campeón debe estar en un solo lado y cada equipo admite hasta 5 jugadores.",
    );
  }
  return parsed;
}

export function validateCoachInput(input: unknown, catalog: Catalog): CoachInput {
  const parsed = validateCoachInputStructure(input);
  const ids = new Set(catalog.champions.map((champion) => champion.id));
  if (
    [parsed.champion, parsed.enemy, ...parsed.allies, ...parsed.enemies].some((id) => !ids.has(id))
  ) {
    throw new ApiError(
      400,
      "Uno de los campeones no existe en el catálogo actual. Vuelve a seleccionarlo.",
    );
  }
  return {
    ...parsed,
    allies: [...new Set(parsed.allies)].filter((id) => id !== parsed.champion),
    enemies: [...new Set(parsed.enemies)].filter((id) => id !== parsed.enemy),
  };
}

export function validateImage(image: string): void {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
  if (!match || match[2].length % 4 !== 0) {
    throw new ApiError(400, "Usa una captura PNG, JPG o WebP válida.");
  }
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new ApiError(
      413,
      "La imagen optimizada es demasiado grande. Selecciona de nuevo una foto o captura de hasta 30 MB desde la app.",
    );
  }
  const mime = match[1];
  const valid =
    bytes.byteLength >= 12 &&
    ((mime === "image/png" &&
      bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
      (mime === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) ||
      (mime === "image/webp" &&
        bytes.toString("ascii", 0, 4) === "RIFF" &&
        bytes.toString("ascii", 8, 12) === "WEBP"));
  if (!valid)
    throw new ApiError(400, "El archivo no corresponde a una imagen PNG, JPG o WebP válida.");
}

export function validateDraftInput(input: unknown): DraftInput {
  const parsed = parseInput(
    draftInputSchema,
    input,
    "Escribe los campeones (hasta 2500 caracteres) o vuelve a seleccionar tu foto o captura desde la app para optimizarla.",
  );
  if (parsed.text) assertSafeInputText(parsed.text);
  if (parsed.image) validateImage(parsed.image);
  return parsed;
}

/** Validate every displayable string before discarding unknown IDs or rendering any result. */
export function assertSafeOutput(value: unknown): void {
  if (typeof value === "string") assertSafeOutputText(value);
  else if (Array.isArray(value)) value.forEach(assertSafeOutput);
  else if (value && typeof value === "object") Object.values(value).forEach(assertSafeOutput);
}

function coherentTeams(
  champion: string | null,
  enemy: string | null,
  allies: string[],
  enemies: string[],
): boolean {
  const alliedTeam = new Set(champion ? [champion, ...allies] : allies);
  const enemyTeam = new Set(enemy ? [enemy, ...enemies] : enemies);
  return (
    alliedTeam.size <= 5 && enemyTeam.size <= 5 && ![...alliedTeam].some((id) => enemyTeam.has(id))
  );
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

/** Validate every referenced resource before displaying any model-proposed plan. */
export function sanitizeCoachPlan(
  input: unknown,
  catalog: Catalog,
  context?: Pick<CoachInput, "champion" | "enemy" | "allies" | "enemies">,
): { plan: CoachPlan; warnings: string[] } {
  const result = coachPlanSchema.safeParse(input);
  const invalid = (category: CoachPlanValidationCategory) => new CoachPlanValidationError(category);
  if (!result.success) throw invalid("schema");
  if (new Set(result.data.levels.map((level) => level.level)).size !== 6) throw invalid("levels");
  const plan = result.data;
  assertSafeOutput(plan);
  const championIds = new Set(catalog.champions.map((champion) => champion.id));
  const composition = new Map(plan.composition.map((entry) => [entry.champion, entry.team]));
  if (
    composition.size !== plan.composition.length ||
    plan.composition.some((entry) => !championIds.has(entry.champion)) ||
    plan.composition.filter((entry) => entry.team === "ally").length > 5 ||
    plan.composition.filter((entry) => entry.team === "enemy").length > 5
  )
    throw invalid("composition");
  if (context) {
    const expected = new Map<string, "ally" | "enemy">([
      ...[context.champion, ...context.allies].map((id) => [id, "ally"] as const),
      ...[context.enemy, ...context.enemies].map((id) => [id, "enemy"] as const),
    ]);
    if (
      composition.size !== expected.size ||
      [...expected].some(([id, team]) => composition.get(id) !== team)
    )
      throw invalid("composition_context");
  }
  const checkReferences = (ids: string[] | undefined) => {
    if (ids && (new Set(ids).size !== ids.length || ids.some((id) => !composition.has(id))))
      throw invalid("champion_references");
  };
  [
    ...plan.levels,
    ...plan.phases.mid,
    ...plan.phases.late,
    ...Object.values(plan.reactions).flat(),
    ...plan.enemyKeys,
    ...plan.compNotes,
    ...plan.build.situational,
    plan.build.runes.alternative,
    plan.build.summoners.alternative,
  ].forEach((entry) => {
    if (entry) checkReferences(entry.champions);
  });
  if (new Set(plan.enemyKeys.map((entry) => entry.key)).size !== plan.enemyKeys.length)
    throw invalid("enemy_keys");
  validateCoachRunes(plan.build.runes, catalog);
  validateCoachSummoners(plan.build.summoners, catalog);
  validateCoachSkillOrder(plan.build.skillOrder, context);
  const itemIds = new Set(catalog.items.map((item) => item.id));
  const warnings: string[] = [];
  const keep = (id: string) => {
    if (itemIds.has(id)) return true;
    if (!warnings.length)
      warnings.push(
        "Se omitieron objetos que no existen o no se pueden comprar en la Grieta en este catálogo.",
      );
    return false;
  };
  plan.levels.sort((a, b) => Number(a.level) - Number(b.level));
  plan.build.starting = [...new Set(plan.build.starting)].filter(keep);
  plan.build.core = [...new Set(plan.build.core)].filter(keep);
  const situationalItems = new Set<string>();
  plan.build.situational = plan.build.situational.filter((item) => {
    if (!keep(item.item) || situationalItems.has(item.item)) return false;
    situationalItems.add(item.item);
    return true;
  });
  const suggestedItems = new Set([
    ...plan.build.starting,
    ...plan.build.core,
    ...plan.build.situational.map((entry) => entry.item),
  ]);
  let omittedPhaseItems = false;
  for (const phase of ["linea", "mid", "late"] as const) {
    plan.build.nowByPhase[phase] = [...new Set(plan.build.nowByPhase[phase])].filter((id) => {
      if (!keep(id)) return false;
      if (!suggestedItems.has(id)) {
        omittedPhaseItems = true;
        return false;
      }
      return true;
    });
  }
  if (omittedPhaseItems)
    warnings.push("Se omitieron compras por fase que no coincidían con la build sugerida.");
  return { plan, warnings };
}

export function sanitizeDraftResult(input: unknown, catalog: Catalog): DraftResult {
  const result = draftResultSchema.safeParse(input);
  if (!result.success)
    throw new ApiError(
      502,
      "No pudimos leer el draft con claridad. Prueba con los nombres por texto.",
    );
  const draft = result.data;
  assertSafeOutput(draft);
  const ids = new Set(catalog.champions.map((champion) => champion.id));
  let omitted = false;
  const keep = (id: string) => {
    if (ids.has(id)) return true;
    omitted = true;
    return false;
  };
  if (draft.champion && !keep(draft.champion)) draft.champion = null;
  if (draft.enemy && !keep(draft.enemy)) draft.enemy = null;
  draft.allies = [...new Set(draft.allies)].filter(keep);
  draft.enemies = [...new Set(draft.enemies)].filter(keep);
  if (!coherentTeams(draft.champion, draft.enemy, draft.allies, draft.enemies)) {
    throw new ApiError(
      502,
      "La IA devolvió equipos contradictorios. Revisa los nombres por texto o selecciona los campeones manualmente.",
    );
  }
  if (omitted)
    draft.warnings.push(
      "Se omitieron campeones que no pudimos confirmar en el catálogo. Selecciónalos manualmente.",
    );
  if (!draft.champion)
    draft.warnings.push("Confirma cuál es tu campeón antes de aplicar el draft.");
  if (!draft.enemy) draft.warnings.push("Confirma tu rival de línea antes de aplicar el draft.");
  if (!draft.role) draft.warnings.push("La línea no está confirmada; selecciónala manualmente.");
  draft.warnings = [...new Set(draft.warnings)].slice(0, 10);
  return draft;
}
