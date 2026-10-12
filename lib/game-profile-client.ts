import type { Role } from "./types";

/** Rangos admitidos en el perfil; coinciden con los del formulario del coach. */
export const PROFILE_RANKS = [
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

export type ProfileRank = (typeof PROFILE_RANKS)[number];

export type GameProfile = {
  rank: ProfileRank | null;
  positions: Role[];
  onboarded: boolean;
  version: number;
};

export function emptyGameProfile(): GameProfile {
  return { rank: null, positions: [], onboarded: false, version: 0 };
}
