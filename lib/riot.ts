import { z } from "zod";
import { ApiError } from "./http";
import type { Champion, RiotResult } from "./types";

export const RIOT_PLATFORMS = [
  "LA1",
  "LA2",
  "NA1",
  "EUW1",
  "EUN1",
  "BR1",
  "KR",
  "JP1",
  "OC1",
] as const;
type Platform = (typeof RIOT_PLATFORMS)[number];

// Account-V1 supports these three global account clusters. Spectator uses the
// platform host, including oc1; account data is identical across clusters.
const ACCOUNT_CLUSTER: Record<Platform, "americas" | "europe" | "asia"> = {
  LA1: "americas",
  LA2: "americas",
  NA1: "americas",
  BR1: "americas",
  EUW1: "europe",
  EUN1: "europe",
  KR: "asia",
  JP1: "asia",
  OC1: "asia",
};

const inputSchema = z
  .object({
    riotId: z.string().trim().min(3).max(100),
    platform: z.enum(RIOT_PLATFORMS),
    accessToken: z.string().max(512).optional(),
  })
  .strict();

export type RiotInput = z.infer<typeof inputSchema>;

export function parseRiotInput(value: unknown): RiotInput {
  const result = inputSchema.safeParse(value);
  if (!result.success)
    throw new ApiError(400, "Escribe tu Riot ID como nombre#TAG y elige un servidor válido.");
  const parts = result.data.riotId.split("#");
  // Control bytes and path separators cannot be part of a Riot ID request.
  // eslint-disable-next-line no-control-regex
  const forbiddenCharacters = /[/\\\u0000-\u001f\u007f]/u;
  if (
    parts.length !== 2 ||
    parts.some((part) => !part.trim() || part.trim().length > 64 || forbiddenCharacters.test(part))
  ) {
    throw new ApiError(400, "Escribe tu Riot ID completo: nombre#TAG.");
  }
  return { ...result.data, riotId: parts.map((part) => part.trim()).join("#") };
}

const accountSchema = z.object({
  puuid: z.string().min(1).max(150),
  gameName: z.string().max(64).optional(),
  tagLine: z.string().max(64).optional(),
});
const gameSchema = z.object({
  gameMode: z.string().min(1).max(64),
  participants: z
    .array(
      z.object({
        puuid: z.string().min(1).max(150),
        championId: z.number().int().positive(),
        teamId: z.number().int().positive(),
        riotId: z.string().max(100).nullish(),
      }),
    )
    .min(1)
    .max(20),
});

async function riotFetch(
  url: string,
  key: string,
  stage: "account" | "game",
  fetcher: typeof fetch,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetcher(url, {
      headers: { "X-Riot-Token": key, Accept: "application/json" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    });
  } catch (error) {
    const timedOut = error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name);
    throw new ApiError(
      timedOut ? 504 : 502,
      timedOut
        ? "Riot tardó demasiado en responder. Reintenta en unos momentos."
        : "No pudimos conectar con Riot. Puedes ingresar los campeones manualmente.",
    );
  }
  if (response.status === 404)
    throw new ApiError(
      404,
      stage === "account"
        ? "No encontramos ese Riot ID. Revisa el nombre y el TAG."
        : "No tienes una partida activa en ese servidor. En selección de campeones, usa una captura o ingrésalos manualmente.",
    );
  if ([401, 403].includes(response.status)) {
    throw new ApiError(
      403,
      "Riot rechazó la clave del servidor. Puede haber expirado o no tener acceso; renueva RIOT_API_KEY.",
    );
  }
  if (response.status === 429) {
    const retry = response.headers.get("retry-after");
    const delay =
      retry && /^\d{1,6}$/.test(retry) ? ` Espera ${retry} segundos.` : " Espera unos momentos.";
    throw new ApiError(429, `Se alcanzó el límite de consultas de Riot.${delay}`);
  }
  if (!response.ok)
    throw new ApiError(502, "Riot no pudo responder la consulta. Reintenta en unos momentos.");
  try {
    return await response.json();
  } catch {
    throw new ApiError(
      502,
      "Riot devolvió una respuesta incompleta. Reintenta o ingresa los campeones manualmente.",
    );
  }
}

/** Reads the visible active-game roster only. Roles and lane opponents are chosen by the user. */
export async function getRiotActiveGame(
  value: unknown,
  champions: Champion[],
  apiKey: string,
  fetcher: typeof fetch = fetch,
): Promise<RiotResult> {
  const input = parseRiotInput(value);
  if (!apiKey.trim())
    throw new ApiError(
      503,
      "La conexión con Riot no está configurada. Puedes usar texto o una captura.",
    );
  const [gameName, tagLine] = input.riotId.split("#");
  const cluster = ACCOUNT_CLUSTER[input.platform];
  const accountResult = accountSchema.safeParse(
    await riotFetch(
      `https://${cluster}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
      apiKey,
      "account",
      fetcher,
    ),
  );
  if (!accountResult.success)
    throw new ApiError(502, "Riot devolvió una cuenta incompleta. Reintenta en unos momentos.");
  const account = accountResult.data;
  const gameResult = gameSchema.safeParse(
    await riotFetch(
      `https://${input.platform.toLowerCase()}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${encodeURIComponent(account.puuid)}`,
      apiKey,
      "game",
      fetcher,
    ),
  );
  if (!gameResult.success)
    throw new ApiError(
      502,
      "No pudimos leer la composición de Riot. Ingresa los campeones manualmente.",
    );
  const game = gameResult.data;
  const self = game.participants.find((participant) => participant.puuid === account.puuid);
  if (!self)
    throw new ApiError(
      502,
      "Riot no incluyó tu cuenta en la partida. Ingresa los campeones manualmente.",
    );
  const byKey = new Map(champions.map((champion) => [champion.key, champion.id]));
  const participants: RiotResult["participants"] = game.participants.map((participant, index) => {
    const champion = byKey.get(String(participant.championId));
    if (!champion)
      throw new ApiError(
        502,
        "Hay un campeón que el catálogo aún no reconoce. Ingresa la composición manualmente.",
      );
    const isSelf = participant.puuid === account.puuid;
    const team = participant.teamId === self.teamId ? "ally" : "enemy";
    const name = isSelf
      ? account.gameName && account.tagLine
        ? `${account.gameName}#${account.tagLine}`
        : input.riotId
      : participant.riotId?.trim() || `${team === "ally" ? "Aliado" : "Enemigo"} ${index + 1}`;
    return { champion, name, team, isSelf };
  });
  return {
    participants,
    self: participants.find((participant) => participant.isSelf)!.champion,
    gameMode: game.gameMode,
  };
}
