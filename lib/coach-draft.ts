import { safeNotesForStorage } from "./coach-safety";
import type { CoachInput, Role } from "./types";

/** Borrador local por cuenta; nunca guarda claves ni notas inseguras. */
export const DRAFT_STORAGE_KEY = "cholo-coach:draft:v1";

export const ROLES: readonly { id: Role; name: string }[] = [
  { id: "TOP", name: "Top" },
  { id: "JUNGLE", name: "Jungla" },
  { id: "MID", name: "Mid" },
  { id: "ADC", name: "ADC" },
  { id: "SUPPORT", name: "Support" },
];

export const RANKS = [
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
] as const;

/** Una preparación nueva empieza vacía: el jugador elige campeón y rival. */
export const EMPTY_INPUT: CoachInput = {
  champion: "",
  enemy: "",
  role: "MID",
  rank: "Oro",
  allies: [],
  enemies: [],
  notes: "",
  webSearch: false,
};

export function roleName(role: Role): string {
  return ROLES.find((entry) => entry.id === role)?.name || role;
}

/** Bot se juega 2 contra 2: ADC y Support preparan también a su pareja y a la rival. */
export function isBotLane(role: Role): boolean {
  return role === "ADC" || role === "SUPPORT";
}

const optionalId = (value: unknown) => (typeof value === "string" && value ? value : undefined);

export function loadDraft(value: string | null): CoachInput | null {
  if (!value) return null;
  try {
    const stored = JSON.parse(value);
    const input = stored.input;
    if (
      stored.version !== 1 ||
      !input ||
      typeof input.champion !== "string" ||
      typeof input.enemy !== "string" ||
      !ROLES.some((role) => role.id === input.role)
    )
      return null;
    return {
      ...EMPTY_INPUT,
      champion: input.champion,
      enemy: input.enemy,
      role: input.role,
      rank: (RANKS as readonly string[]).includes(input.rank) ? input.rank : "Oro",
      allies: Array.isArray(input.allies)
        ? input.allies.filter((id: unknown) => typeof id === "string").slice(0, 4)
        : [],
      enemies: Array.isArray(input.enemies)
        ? input.enemies.filter((id: unknown) => typeof id === "string").slice(0, 4)
        : [],
      ...(optionalId(input.allyDuo) ? { allyDuo: optionalId(input.allyDuo) } : {}),
      ...(optionalId(input.enemyDuo) ? { enemyDuo: optionalId(input.enemyDuo) } : {}),
      notes: typeof input.notes === "string" ? input.notes.slice(0, 1500) : "",
      webSearch: typeof input.webSearch === "boolean" ? input.webSearch : true,
    };
  } catch {
    return null;
  }
}

/** Serializa sólo los campos de juego permitidos para el almacenamiento local. */
export function serializeDraft(input: CoachInput): string {
  return JSON.stringify({
    version: 1,
    input: {
      champion: input.champion,
      enemy: input.enemy,
      role: input.role,
      rank: input.rank,
      allies: input.allies,
      enemies: input.enemies,
      ...(input.allyDuo ? { allyDuo: input.allyDuo } : {}),
      ...(input.enemyDuo ? { enemyDuo: input.enemyDuo } : {}),
      notes: safeNotesForStorage(input.notes),
      webSearch: input.webSearch,
    },
  });
}
