import { z } from "zod";
import { getDb } from "./db";
import { ApiError } from "./errors";
import { limitUserWrites } from "./write-limit";
import type { Catalog, Role } from "./types";
import type { Prisma } from "../generated/prisma/client";

export const CHAMPION_PREFERENCE_ROLES = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"] as const;
export const MAX_FAVORITE_CHAMPIONS = 12;
const MAX_VERSION = 2_147_483_646;

export const championPreferenceInputSchema = z
  .object({
    role: z.enum(CHAMPION_PREFERENCE_ROLES),
    champions: z
      .array(z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,95}$/))
      .max(MAX_FAVORITE_CHAMPIONS)
      .refine((ids) => new Set(ids).size === ids.length),
    version: z.number().int().min(0).max(MAX_VERSION),
  })
  .strict();

export type ChampionPreferenceInput = z.infer<typeof championPreferenceInputSchema>;
export type ChampionPreferences = {
  favorites: Record<Role, string[]>;
  versions: Record<Role, number>;
};

export function parseChampionPreferenceInput(
  value: unknown,
  catalog: Pick<Catalog, "champions">,
): ChampionPreferenceInput {
  const input = championPreferenceInputSchema.safeParse(value);
  if (!input.success)
    throw new ApiError(
      400,
      "Elige una posición y hasta 12 campeones distintos para tus favoritos.",
    );
  const knownIds = new Set(catalog.champions.map((champion) => champion.id));
  if (input.data.champions.some((id) => !knownIds.has(id)))
    throw new ApiError(400, "Uno de los campeones ya no está disponible. Actualiza tu selección.");
  return input.data;
}

export function emptyChampionPreferences(): ChampionPreferences {
  return {
    favorites: { TOP: [], JUNGLE: [], MID: [], ADC: [], SUPPORT: [] },
    versions: { TOP: 0, JUNGLE: 0, MID: 0, ADC: 0, SUPPORT: 0 },
  };
}

export async function getChampionPreferences(
  userId: string,
  transaction: Pick<Prisma.TransactionClient, "championPreference"> = getDb(),
): Promise<ChampionPreferences> {
  const preferences = emptyChampionPreferences();
  const rows = await transaction.championPreference.findMany({
    where: { userId },
    select: { role: true, champions: true, version: true },
  });
  for (const row of rows) {
    preferences.favorites[row.role] = row.champions;
    preferences.versions[row.role] = row.version;
  }
  return preferences;
}

const stalePreference = () =>
  new ApiError(409, "Tus favoritos cambiaron en otra pestaña. Actualízalos antes de guardar.");

/** The owner comes only from the verified session; versions prevent silent overwrites. */
export async function saveChampionPreferences(
  userId: string,
  input: ChampionPreferenceInput,
): Promise<ChampionPreferences> {
  try {
    return await getDb().$transaction(async (transaction) => {
      if (input.version === 0) {
        await transaction.championPreference.create({
          data: { userId, role: input.role, champions: input.champions, version: 1 },
        });
      } else {
        const changed = await transaction.championPreference.updateMany({
          where: { userId, role: input.role, version: input.version },
          data: { champions: input.champions, version: { increment: 1 } },
        });
        if (changed.count !== 1) throw stalePreference();
      }
      return getChampionPreferences(userId, transaction);
    });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : null;
    if (code === "P2002") throw stalePreference();
    throw error;
  }
}

/** Separate fixed DB counters protect preference writes without spending AI quota. */
export async function limitChampionPreferenceWrites(
  userId: string,
  now = new Date(),
): Promise<void> {
  await limitUserWrites(
    {
      prefix: "elociencia-champion-preferences",
      userId,
      globalMaximum: 300,
      userMaximum: 30,
      limitedMessage: "Espera un minuto antes de volver a guardar favoritos.",
      unavailableMessage: "No pudimos guardar tus favoritos. Inténtalo en unos momentos.",
      invalidMessage: "No pudimos validar tu cuenta para guardar favoritos.",
    },
    now,
  );
}
