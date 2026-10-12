import { z } from "zod";
import { getDb } from "./db";
import { ApiError } from "./errors";
import { CHAMPION_PREFERENCE_ROLES } from "./champion-preferences";
import { limitUserWrites } from "./write-limit";
import { emptyGameProfile, PROFILE_RANKS, type GameProfile } from "./game-profile-client";
import type { Role } from "./types";

export { emptyGameProfile, PROFILE_RANKS, type GameProfile };

const MAX_VERSION = 2_147_483_646;

export const gameProfileInputSchema = z
  .object({
    rank: z.enum(PROFILE_RANKS).nullable(),
    positions: z
      .array(z.enum(CHAMPION_PREFERENCE_ROLES))
      .max(2)
      .refine((roles) => new Set(roles).size === roles.length),
    /** Marca el onboarding como terminado u omitido; nunca vuelve a mostrarse. */
    onboarded: z.boolean(),
    version: z.number().int().min(0).max(MAX_VERSION),
  })
  .strict();

export function parseGameProfileInput(value: unknown) {
  const input = gameProfileInputSchema.safeParse(value);
  if (!input.success)
    throw new ApiError(400, "Elige un rango válido y hasta 2 posiciones distintas.");
  return input.data;
}

function publicProfile(row: {
  rank: string | null;
  positions: Role[];
  onboardedAt: Date | null;
  version: number;
}): GameProfile {
  const rank = (PROFILE_RANKS as readonly string[]).includes(row.rank || "")
    ? (row.rank as GameProfile["rank"])
    : null;
  return {
    rank,
    positions: row.positions,
    onboarded: Boolean(row.onboardedAt),
    version: row.version,
  };
}

export async function getGameProfile(userId: string): Promise<GameProfile> {
  const row = await getDb().gameProfile.findUnique({ where: { userId } });
  return row ? publicProfile(row) : emptyGameProfile();
}

/** Guarda con control optimista de versión: una pestaña antigua no pisa un cambio nuevo. */
export async function saveGameProfile(
  userId: string,
  input: z.infer<typeof gameProfileInputSchema>,
): Promise<GameProfile> {
  const data = {
    rank: input.rank,
    positions: input.positions,
    onboardedAt: input.onboarded ? new Date() : null,
  };
  const db = getDb();
  if (input.version === 0) {
    try {
      return publicProfile(await db.gameProfile.create({ data: { userId, ...data } }));
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : null;
      if (code === "P2002")
        throw new ApiError(409, "Tu perfil cambió en otra pestaña. Revisa los datos actuales.");
      throw error;
    }
  }
  const existing = await db.gameProfile.findUnique({ where: { userId } });
  const changed = await db.gameProfile.updateMany({
    where: { userId, version: input.version },
    data: {
      ...data,
      // Once onboarding is done it stays done, even if the profile is edited later.
      onboardedAt: input.onboarded ? existing?.onboardedAt || new Date() : existing?.onboardedAt,
      version: { increment: 1 },
    },
  });
  if (changed.count !== 1)
    throw new ApiError(409, "Tu perfil cambió en otra pestaña. Revisa los datos actuales.");
  return getGameProfile(userId);
}

export async function limitGameProfileWrites(userId: string, now = new Date()) {
  await limitUserWrites(
    {
      prefix: "elociencia-game-profile",
      userId,
      globalMaximum: 300,
      userMaximum: 20,
      limitedMessage: "Espera un minuto antes de volver a guardar tu perfil.",
      unavailableMessage: "No pudimos guardar tu perfil. Inténtalo en unos momentos.",
      invalidMessage: "No pudimos validar tu cuenta para guardar tu perfil.",
    },
    now,
  );
}
