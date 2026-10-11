import { z } from "zod";
import type { Catalog, CoachInput, CoachPlan, DraftInput, DraftResult } from "./types";
import { ApiError } from "./http";
import { assertSafeInputText, assertSafeOutputText } from "./coach-safety";

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
const itemId = z.string().regex(/^\d{1,7}$/);
export const coachPlanSchema = z
  .object({
    headline: z.string().trim().min(1).max(100),
    difficulty: z.string().trim().min(1).max(60),
    winCondition: shortText,
    levels: z
      .array(
        z
          .object({
            level: z.enum(["1", "2", "3-5", "6"]),
            action: shortText,
          })
          .strict(),
      )
      .length(4),
    mechanics: z
      .array(z.object({ trigger: shortText, response: shortText }).strict())
      .min(2)
      .max(4),
    build: z
      .object({
        label: z.string().trim().min(1).max(100),
        starting: z.array(itemId).max(3),
        core: z.array(itemId).max(3),
        situational: z.array(z.object({ item: itemId, reason: shortText }).strict()).max(3),
        runes: z.array(z.string().trim().min(1).max(80)).min(1).max(6),
        summoners: z.array(z.string().trim().min(1).max(40)).length(2),
        skillOrder: z.string().trim().min(1).max(100),
      })
      .strict(),
    macro: z.array(shortText).min(1).max(3),
    avoid: z.array(shortText).min(1).max(3),
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
function assertSafeOutput(value: unknown): void {
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

const comparableText = (value: string) =>
  value
    .normalize("NFKC")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");

function uniqueText(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = comparableText(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** A real Riot item ID is required before displaying any model-proposed item. */
export function sanitizeCoachPlan(
  input: unknown,
  catalog: Catalog,
): { plan: CoachPlan; warnings: string[] } {
  const result = coachPlanSchema.safeParse(input);
  if (!result.success || new Set(result.data.levels.map((level) => level.level)).size !== 4) {
    throw new ApiError(
      502,
      "La IA devolvió un plan incompleto. Tu selección sigue guardada; puedes volver a consultar.",
    );
  }
  const plan = result.data;
  assertSafeOutput(plan);
  // Aphelios levels attack attributes instead of choosing Q/W/E/R ranks.
  const hasAbilityOrder =
    /\b[QWER]\b|\b(?:AD|AS|daño de ataque|velocidad de ataque|letalidad)\b/i.test(
      plan.build.skillOrder,
    );
  if (uniqueText(plan.build.summoners).length !== 2 || !hasAbilityOrder) {
    throw new ApiError(
      502,
      "La IA devolvió un plan incoherente de habilidades o hechizos. Tu selección sigue guardada; puedes volver a consultar.",
    );
  }
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
  plan.levels.sort(
    (a, b) => ["1", "2", "3-5", "6"].indexOf(a.level) - ["1", "2", "3-5", "6"].indexOf(b.level),
  );
  plan.build.starting = [...new Set(plan.build.starting)].filter(keep);
  plan.build.core = [...new Set(plan.build.core)].filter(keep);
  const situationalItems = new Set<string>();
  plan.build.situational = plan.build.situational.filter((item) => {
    if (!keep(item.item) || situationalItems.has(item.item)) return false;
    situationalItems.add(item.item);
    return true;
  });
  plan.build.runes = uniqueText(plan.build.runes);
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
