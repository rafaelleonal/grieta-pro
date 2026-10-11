import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../lib/http";
import { getRiotActiveGame, parseRiotInput } from "../lib/riot";
import type { Champion } from "../lib/types";

const champions: Champion[] = [
  { id: "Ahri", key: "103", name: "Ahri", title: "", image: "" },
  { id: "Zed", key: "238", name: "Zed", title: "", image: "" },
];
const account = { puuid: "self-puuid", gameName: "Cholo Coach", tagLine: "LAN" };
const game = {
  gameMode: "CLASSIC",
  participants: [
    { puuid: "enemy", championId: 238, teamId: 100, riotId: "Rival#TAG" },
    { puuid: "self-puuid", championId: 103, teamId: 200 },
    { puuid: "ally", championId: 238, teamId: 200 },
  ],
};
function mockFetch(
  responses: Response[],
  calls: { url: string; options?: RequestInit }[] = [],
): typeof fetch {
  return (async (url, options) => {
    calls.push({ url: String(url), options });
    const response = responses.shift();
    assert.ok(response, "unexpected extra network request");
    return response;
  }) as typeof fetch;
}
function hasError(status: number, text: RegExp) {
  return (error: unknown) =>
    error instanceof ApiError && error.status === status && text.test(error.message);
}

test("Riot ID and platform validation cannot choose an arbitrary host or path", () => {
  assert.equal(
    parseRiotInput({ riotId: "  Cholo Coach # LAN  ", platform: "LA1" }).riotId,
    "Cholo Coach#LAN",
  );
  for (const input of [
    { riotId: "Cholo", platform: "LA1" },
    { riotId: "Cholo##LAN", platform: "LA1" },
    { riotId: "https://host#LAN", platform: "LA1" },
    { riotId: "Cholo#LAN", platform: "localhost:8080" },
    { riotId: "Cholo#LAN", platform: "LA1", apiKey: "client-key" },
  ])
    assert.throws(() => parseRiotInput(input), hasError(400, /Riot ID/));
});

test("account regional routing and spectator platform routing stay separate", async () => {
  for (const [platform, cluster] of [
    ["LA1", "americas"],
    ["LA2", "americas"],
    ["BR1", "americas"],
    ["NA1", "americas"],
    ["EUW1", "europe"],
    ["EUN1", "europe"],
    ["KR", "asia"],
    ["JP1", "asia"],
    ["OC1", "asia"],
  ]) {
    const calls: { url: string; options?: RequestInit }[] = [];
    await getRiotActiveGame(
      { riotId: "Cholo Coach#LAN", platform },
      champions,
      "server-secret",
      mockFetch([Response.json(account), Response.json(game)], calls),
    );
    assert.equal(
      calls[0].url,
      `https://${cluster}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/Cholo%20Coach/LAN`,
    );
    assert.equal(
      calls[1].url,
      `https://${platform.toLowerCase()}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/self-puuid`,
    );
    assert.equal(
      (calls[0].options?.headers as Record<string, string>)["X-Riot-Token"],
      "server-secret",
    );
    assert.equal(calls[0].options?.redirect, "error");
    assert.equal(calls[0].url.includes("server-secret"), false);
  }
});

test("returns catalog champion IDs and teams relative to self without inventing roles", async () => {
  const result = await getRiotActiveGame(
    { riotId: "Cholo Coach#LAN", platform: "LA1" },
    champions,
    "key",
    mockFetch([Response.json(account), Response.json(game)]),
  );
  assert.equal(result.self, "Ahri");
  assert.equal(result.gameMode, "CLASSIC");
  assert.deepEqual(
    result.participants.map(({ champion, team, isSelf }) => ({ champion, team, isSelf })),
    [
      { champion: "Zed", team: "enemy", isSelf: false },
      { champion: "Ahri", team: "ally", isSelf: true },
      { champion: "Zed", team: "ally", isSelf: false },
    ],
  );
  assert.equal(result.participants[1].name, "Cholo Coach#LAN");
  assert.equal(result.participants[0].name, "Rival#TAG");
  assert.equal("role" in result.participants[0], false);
});

test("missing account and inactive game produce distinct actionable errors", async () => {
  await assert.rejects(
    getRiotActiveGame(
      { riotId: "Cholo#LAN", platform: "LA1" },
      champions,
      "key",
      mockFetch([new Response(null, { status: 404 })]),
    ),
    hasError(404, /nombre y el TAG/),
  );
  await assert.rejects(
    getRiotActiveGame(
      { riotId: "Cholo#LAN", platform: "LA1" },
      champions,
      "key",
      mockFetch([Response.json(account), new Response(null, { status: 404 })]),
    ),
    hasError(404, /partida activa/),
  );
});

test("expired key, rate limit and timeout stay actionable and never expose credentials", async () => {
  for (const status of [401, 403]) {
    await assert.rejects(
      getRiotActiveGame(
        { riotId: "Cholo#LAN", platform: "LA1" },
        champions,
        "sensitive-key",
        mockFetch([new Response("sensitive-key", { status })]),
      ),
      hasError(403, /renueva RIOT_API_KEY/),
    );
  }
  await assert.rejects(
    getRiotActiveGame(
      { riotId: "Cholo#LAN", platform: "LA1" },
      champions,
      "key",
      mockFetch([new Response(null, { status: 429, headers: { "Retry-After": "12" } })]),
    ),
    hasError(429, /12 segundos/),
  );
  const timeoutFetch = (async () => {
    throw new DOMException("timeout", "TimeoutError");
  }) as typeof fetch;
  await assert.rejects(
    getRiotActiveGame({ riotId: "Cholo#LAN", platform: "LA1" }, champions, "key", timeoutFetch),
    hasError(504, /tardó demasiado/),
  );
});

test("incomplete responses and unknown champions fail before inventing a roster", async () => {
  for (const response of [
    { ...game, participants: [{ puuid: "self-puuid", championId: 999999, teamId: 100 }] },
    { ...game, participants: [{ puuid: "another-player", championId: 103, teamId: 100 }] },
    { gameMode: "CLASSIC", participants: [] },
  ]) {
    await assert.rejects(
      getRiotActiveGame(
        { riotId: "Cholo#LAN", platform: "LA1" },
        champions,
        "key",
        mockFetch([Response.json(account), Response.json(response)]),
      ),
      hasError(502, /manualmente/),
    );
  }
});
