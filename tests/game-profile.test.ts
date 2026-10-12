import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "../lib/http";
import { parseGameProfileInput } from "../lib/game-profile";
import { getRiotProfile, inferPositions } from "../lib/riot";
import { fixtureCatalog } from "./coach-fixtures";

const key = (id: string) => Number(fixtureCatalog.champions.find((entry) => entry.id === id)!.key);
const account = { puuid: "self-puuid", gameName: "Cholo Coach", tagLine: "LAN" };
function riot(responses: unknown[], calls: string[] = []): typeof fetch {
  return (async (url: string | URL | Request) => {
    calls.push(String(url));
    const next = responses.shift();
    assert.ok(next !== undefined, "unexpected extra Riot request");
    return Response.json(next);
  }) as typeof fetch;
}

test("onboarding reads solo queue rank and top mastery without match history", async () => {
  const calls: string[] = [];
  const profile = await getRiotProfile(
    { riotId: "Cholo Coach#LAN", platform: "LA1" },
    fixtureCatalog.champions,
    "synthetic-riot-key",
    riot(
      [
        account,
        [
          { queueType: "RANKED_FLEX_SR", tier: "PLATINUM", rank: "IV", leaguePoints: 10 },
          { queueType: "RANKED_SOLO_5x5", tier: "GOLD", rank: "II", leaguePoints: 43 },
        ],
        [
          { championId: key("Darius"), championPoints: 300_000 },
          { championId: key("Garen"), championPoints: 120_000 },
          { championId: key("LeeSin"), championPoints: 90_000 },
          { championId: 999_999, championPoints: 50_000 },
        ],
      ],
      calls,
    ),
  );
  assert.equal(profile.rank, "Oro");
  assert.equal(profile.division, "II");
  assert.equal(profile.queue, "SOLO");
  assert.equal(profile.riotId, "Cholo Coach#LAN");
  assert.deepEqual(profile.positions, ["TOP", "JUNGLE"]);
  assert.deepEqual(
    profile.champions.map((entry) => entry.id),
    ["Darius", "Garen", "LeeSin"],
  );
  assert.ok(calls[1].startsWith("https://la1.api.riotgames.com/lol/league/v4/entries/by-puuid/"));
  assert.match(calls[2], /champion-masteries\/by-puuid\/self-puuid\/top\?count=10$/);
  assert.ok(!calls.some((url) => url.includes("/match/")), "Match-V5 is never called");
});

test("an unranked account keeps its mastery and asks for nothing invented", async () => {
  const profile = await getRiotProfile(
    { riotId: "Nuevo#LAN", platform: "LA1" },
    fixtureCatalog.champions,
    "synthetic-riot-key",
    riot([account, [], []]),
  );
  assert.equal(profile.rank, "Sin clasificar");
  assert.equal(profile.division, null);
  assert.deepEqual(profile.positions, []);
  assert.deepEqual(profile.champions, []);
});

test("positions weigh mastery points and split shared champions", () => {
  const { positions, roleOf } = inferPositions([
    { id: "Thresh", points: 500_000 },
    { id: "Jinx", points: 200_000 },
  ]);
  assert.deepEqual(positions, ["SUPPORT", "ADC"]);
  assert.equal(roleOf.get("Thresh"), "SUPPORT");
});

test("the stored profile only accepts known ranks and up to two distinct positions", () => {
  assert.deepEqual(
    parseGameProfileInput({
      rank: "Oro",
      positions: ["TOP", "JUNGLE"],
      onboarded: true,
      version: 0,
    }),
    { rank: "Oro", positions: ["TOP", "JUNGLE"], onboarded: true, version: 0 },
  );
  for (const invalid of [
    { rank: "Bronze", positions: [], onboarded: true, version: 0 },
    { rank: null, positions: ["TOP", "TOP"], onboarded: false, version: 0 },
    { rank: null, positions: ["TOP", "MID", "ADC"], onboarded: false, version: 0 },
    { rank: null, positions: [], onboarded: false, version: 0, riotId: "Nombre#TAG" },
  ])
    assert.throws(
      () => parseGameProfileInput(invalid),
      (error) => error instanceof ApiError && error.status === 400,
    );
});
