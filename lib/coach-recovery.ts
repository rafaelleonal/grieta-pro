import type { z } from "zod";
import type { Catalog, CoachInput, CoachSection, PartialCoachPlan } from "./types";
import {
  assertSafeOutput,
  coachPlanSchema,
  CoachPlanValidationError,
  validateCoachRunes,
  validateCoachSkillOrder,
  validateCoachSummoners,
  type CoachPlanValidationCategory,
} from "./validation";

const object = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
const onlyKeys = (value: Record<string, unknown>, keys: string[]) =>
  Object.keys(value).every((key) => keys.includes(key));

/** Recover bounded, independently validated sections. Never repair prose or invent advice. */
export function recoverCoachPlan(input: unknown, catalog: Catalog, context: CoachInput) {
  // Scan the ENTIRE response, including fields that will be omitted. An unsafe section
  // is a security failure, not an opportunity to salvage the other sections.
  assertSafeOutput(input);
  const raw = object(input);
  const shape = coachPlanSchema.shape;
  if (!raw || !onlyKeys(raw, Object.keys(shape))) throw new CoachPlanValidationError("schema");
  const missing = new Set<CoachSection>();
  const categories = new Set<CoachPlanValidationCategory>();
  const mark = (section: CoachSection, category: CoachPlanValidationCategory = "schema") => {
    missing.add(section);
    categories.add(category);
  };
  const read = <T>(
    value: unknown,
    schema: z.ZodType<T>,
    section: CoachSection,
    check?: (data: T) => void,
  ): T | undefined => {
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      mark(section);
      return;
    }
    try {
      check?.(parsed.data);
      return parsed.data;
    } catch (error) {
      if (!(error instanceof CoachPlanValidationError)) throw error;
      mark(section, error.category);
    }
  };
  const known = new Set([context.champion, context.enemy, ...context.allies, ...context.enemies]);
  const references = (entry: { champions?: string[] }) => {
    if (
      entry.champions &&
      (new Set(entry.champions).size !== entry.champions.length ||
        entry.champions.some((id) => !known.has(id)))
    )
      throw new CoachPlanValidationError("champion_references");
  };
  const rows = <T extends { champions?: string[] }>(
    value: unknown,
    schema: z.ZodType<T>,
    section: CoachSection,
    max: number,
    min = 1,
  ): T[] => {
    if (!Array.isArray(value) || value.length > max) {
      mark(section);
      return [];
    }
    const valid = value.flatMap((row) => {
      const data = read(row, schema, section, references);
      return data ? [data] : [];
    });
    if (valid.length < min) mark(section);
    return valid;
  };
  const headline = read(raw.headline, shape.headline, "summary");
  const winCondition = read(raw.winCondition, shape.winCondition, "summary") || "";
  const difficulty = read(raw.difficulty, shape.difficulty, "summary") || "Sin confirmar";
  const proposedLevels = rows(raw.levels, shape.levels.element, "levels", 6, 6);
  const levels = proposedLevels
    .filter((row) => {
      if (proposedLevels.filter((other) => other.level === row.level).length === 1) return true;
      mark("levels", "levels");
      return false;
    })
    .sort((a, b) => Number(a.level) - Number(b.level));
  const phases = object(raw.phases);
  const phasesKnown = phases && onlyKeys(phases, ["mid", "late"]);
  const mid = rows(
    phasesKnown ? phases.mid : undefined,
    shape.phases.shape.mid.element,
    "mid",
    4,
    3,
  );
  const late = rows(
    phasesKnown ? phases.late : undefined,
    shape.phases.shape.late.element,
    "late",
    4,
    3,
  );
  const reactionsRaw = object(raw.reactions);
  const reactionsKnown = reactionsRaw && onlyKeys(reactionsRaw, ["linea", "mid", "late"]);
  const reactions = {
    linea: rows(
      reactionsKnown ? reactionsRaw.linea : undefined,
      shape.reactions.shape.linea.element,
      "reactions",
      3,
      2,
    ),
    mid: rows(
      reactionsKnown ? reactionsRaw.mid : undefined,
      shape.reactions.shape.mid.element,
      "reactions",
      3,
      2,
    ),
    late: rows(
      reactionsKnown ? reactionsRaw.late : undefined,
      shape.reactions.shape.late.element,
      "reactions",
      3,
      2,
    ),
  };
  const avoidRaw = object(raw.avoid);
  const avoid: PartialCoachPlan["avoid"] = {};
  for (const phase of ["linea", "mid", "late"] as const) {
    const advice = read(
      avoidRaw && onlyKeys(avoidRaw, ["linea", "mid", "late"]) ? avoidRaw[phase] : undefined,
      shape.avoid.shape[phase],
      "avoid",
    );
    if (advice) avoid[phase] = advice;
  }
  const proposedKeys = rows(raw.enemyKeys, shape.enemyKeys.element, "enemyKeys", 4, 2);
  const enemyKeys = proposedKeys.filter((row) => {
    if (proposedKeys.filter((other) => other.key === row.key).length === 1) return true;
    mark("enemyKeys", "enemy_keys");
    return false;
  });
  const expected = new Map([
    ...[context.champion, ...context.allies].map((id) => [id, "ally"] as const),
    ...[context.enemy, ...context.enemies].map((id) => [id, "enemy"] as const),
  ]);
  const composition =
    read(raw.composition, shape.composition, "composition", (entries) => {
      if (
        entries.length !== expected.size ||
        new Set(entries.map((e) => e.champion)).size !== expected.size ||
        entries.some((entry) => expected.get(entry.champion) !== entry.team)
      )
        throw new CoachPlanValidationError("composition_context");
    }) || [];
  const compNotes = rows(raw.compNotes, shape.compNotes.element, "compNotes", 3, 0);
  const b = object(raw.build);
  const build = b && onlyKeys(b, Object.keys(shape.build.shape)) ? b : {};
  const bs = shape.build.shape;
  const itemIds = new Set(catalog.items.map((item) => item.id));
  const itemList = (value: unknown, schema: z.ZodType<string[]>) => {
    const ids = read(value, schema, "items") || [];
    return [...new Set(ids)].filter((id) => {
      if (itemIds.has(id)) return true;
      mark("items");
      return false;
    });
  };
  const starting = itemList(build.starting, bs.starting);
  const core = itemList(build.core, bs.core);
  const situational = rows(build.situational, bs.situational.element, "items", 3, 0).filter(
    (entry, index, all) => {
      if (itemIds.has(entry.item) && all.findIndex((other) => other.item === entry.item) === index)
        return true;
      mark("items");
      return false;
    },
  );
  const suggested = new Set([...starting, ...core, ...situational.map((e) => e.item)]);
  const byPhase = object(build.nowByPhase);
  const nowByPhase = { linea: [] as string[], mid: [] as string[], late: [] as string[] };
  for (const phase of ["linea", "mid", "late"] as const)
    nowByPhase[phase] = itemList(
      byPhase && onlyKeys(byPhase, ["linea", "mid", "late"]) ? byPhase[phase] : undefined,
      bs.nowByPhase.shape[phase],
    ).filter((id) => {
      if (suggested.has(id)) return true;
      mark("items", "phase_items");
      return false;
    });
  const label = read(build.label, bs.label, "items") || "Compras orientativas";
  const runes = read(build.runes, bs.runes, "runes", (data) => {
    references(data.alternative || {});
    validateCoachRunes(data, catalog);
  });
  const summoners = read(build.summoners, bs.summoners, "summoners", (data) => {
    references(data.alternative || {});
    validateCoachSummoners(data, catalog);
  });
  const skillOrder = read(build.skillOrder, bs.skillOrder, "skillOrder", (data) =>
    validateCoachSkillOrder(data, context),
  );
  const macroRaw = read(raw.macro, shape.macro, "macro") || [];
  const plan: PartialCoachPlan = {
    headline:
      headline ||
      `${catalog.champions.find((c) => c.id === context.champion)?.name || context.champion} contra ${catalog.champions.find((c) => c.id === context.enemy)?.name || context.enemy}`,
    difficulty,
    winCondition,
    levels,
    phases: { mid, late },
    reactions,
    avoid,
    enemyKeys,
    composition,
    compNotes,
    build: {
      label,
      starting,
      core,
      situational,
      nowByPhase,
      ...(runes ? { runes } : {}),
      ...(summoners ? { summoners } : {}),
      ...(skillOrder ? { skillOrder } : {}),
    },
    macro: macroRaw,
  };
  const useful =
    levels.length +
    mid.length +
    late.length +
    Object.values(reactions).flat().length +
    enemyKeys.length +
    compNotes.length +
    suggested.size +
    macroRaw.length +
    (runes ? 1 : 0) +
    (summoners ? 1 : 0);
  if (!useful) throw new CoachPlanValidationError("schema");
  // Re-scan the actual result. All catalog IDs, ranges and contextual references
  // passed the same semantic checks used for a complete plan.
  assertSafeOutput(plan);
  return { plan, missing: [...missing], categories: [...categories] };
}
