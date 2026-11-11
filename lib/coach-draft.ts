import type { CoachInput, Role } from "./types";

/** Borrador local por cuenta: sólo campeón, rival y rol (IDs del catálogo). */
export const DRAFT_STORAGE_KEY = "cholo-coach:draft:v1";

export const ROLES: readonly { id: Role; name: string }[] = [
  { id: "TOP", name: "Top" },
  { id: "JUNGLE", name: "Jungla" },
  { id: "MID", name: "Mid" },
  { id: "ADC", name: "ADC" },
  { id: "SUPPORT", name: "Support" },
];

/** Una preparación nueva empieza vacía: el jugador elige campeón y rival. */
export const EMPTY_INPUT: CoachInput = { champion: "", enemy: "", role: "MID" };

export function roleName(role: Role): string {
  return ROLES.find((entry) => entry.id === role)?.name || role;
}

const championId = (value: unknown) =>
  typeof value === "string" && /^[A-Za-z][A-Za-z0-9]{0,39}$/.test(value) ? value : "";

export function loadDraft(value: string | null): CoachInput | null {
  if (!value) return null;
  try {
    const stored = JSON.parse(value);
    const input = stored?.input;
    if (stored?.version !== 1 || !input || !ROLES.some((role) => role.id === input.role))
      return null;
    return {
      champion: championId(input.champion),
      enemy: championId(input.enemy),
      role: input.role,
    };
  } catch {
    return null;
  }
}

export function serializeDraft(input: CoachInput): string {
  return JSON.stringify({
    version: 1,
    input: { champion: input.champion, enemy: input.enemy, role: input.role },
  });
}
