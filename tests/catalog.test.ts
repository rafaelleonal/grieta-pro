import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import snapshot from "../data/catalog-snapshot.json";
import { getCatalog, getChampionDetails, stripMarkup } from "../lib/catalog";

const originalFetch = globalThis.fetch;
type MockItem = {
  name: string;
  description: string;
  image: { full: string };
  maps: Record<string, boolean>;
  inStore?: boolean;
  gold: { purchasable: boolean; total: number };
};
afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("bundled catalog stays usable and truthfully marked when Riot is offline", async () => {
  globalThis.fetch = async () => {
    throw new Error("offline");
  };
  const catalog = await getCatalog();
  assert.equal(catalog.source, "snapshot");
  assert.match(catalog.version, /^\d+\.\d+\.\d+$/);
  assert.ok(catalog.champions.some((c) => c.id === "Ahri"));
  assert.ok(catalog.champions.length > 150);
  assert.ok(catalog.items.length > 100);
  assert.equal(catalog.runeStyles.length, 5);
  assert.ok(catalog.runes.some((rune) => rune.key === "Electrocute" && rune.slot === 0));
  assert.ok(catalog.runes.some((rune) => rune.key === "GrislyMementos" && rune.slot === 2));
  assert.ok(catalog.summoners.some((spell) => spell.id === "SummonerFlash"));
  for (const style of catalog.runeStyles) {
    assert.equal(style.slots.length, 4);
    style.slots.forEach((slot, index) => {
      for (const key of slot) {
        assert.ok(
          catalog.runes.some(
            (rune) => rune.key === key && rune.style === style.key && rune.slot === index,
          ),
        );
      }
    });
  }
  assert.ok(catalog.updatedAt);
  assert.equal(await getChampionDetails("Ahri", catalog), null);
});

function livePayloads() {
  return {
    versions: ["99.1.2"],
    champions: {
      data: Object.fromEntries(
        Array.from({ length: 110 }, (_, i) => [
          `C${i}`,
          {
            id: `C${i}`,
            key: String(i),
            name: `Campeón ${i}`,
            title: "título",
            image: { full: `C${i}.png` },
          },
        ]),
      ),
    },
    items: {
      data: {
        ...Object.fromEntries(
          Array.from({ length: 55 }, (_, i) => [
            String(i),
            {
              name: "Objeto",
              description: "<mainText>Daño</mainText>",
              image: { full: `${i}.png` },
              maps: { "11": true },
              gold: { purchasable: true, total: 100 },
            },
          ]),
        ),
        "10001": {
          name: "Arena",
          description: "",
          image: { full: "10001.png" },
          maps: { "11": false },
          gold: { purchasable: true, total: 100 },
        },
        "10002": {
          name: "Oculto",
          description: "",
          image: { full: "10002.png" },
          maps: { "11": true },
          inStore: false,
          gold: { purchasable: true, total: 100 },
        },
      } as Record<string, MockItem>,
    },
    runes: snapshot.runeStyles.map((style) => ({
      key: style.key,
      name: style.name,
      icon: style.image.split("/cdn/img/")[1],
      slots: style.slots.map((slot) => ({
        runes: slot.map((key) => {
          const rune = snapshot.runes.find((rune) => rune.key === key)!;
          return { key: rune.key, name: rune.name, icon: rune.image.split("/cdn/img/")[1] };
        }),
      })),
    })),
    summoners: {
      data: {
        ...Object.fromEntries(
          snapshot.summoners.map((spell) => [
            spell.id,
            {
              id: spell.id,
              name: spell.name,
              image: { full: `${spell.id}.png` },
              modes: ["CLASSIC"],
            },
          ]),
        ),
        SummonerSnowball: {
          id: "SummonerSnowball",
          name: "Marca",
          image: { full: "SummonerSnowball.png" },
          modes: ["ARAM"],
        },
      },
    },
  };
}

function mockLive(payloads = livePayloads()) {
  globalThis.fetch = async (url) => {
    const path = String(url);
    if (path.endsWith("versions.json")) return Response.json(payloads.versions);
    if (path.endsWith("champion.json")) return Response.json(payloads.champions);
    if (path.endsWith("item.json")) return Response.json(payloads.items);
    if (path.endsWith("runesReforged.json")) return Response.json(payloads.runes);
    if (path.endsWith("summoner.json")) return Response.json(payloads.summoners);
    throw new Error("Unexpected Riot path");
  };
}

test("fresh catalog uses returned version and only purchasable Rift items and Classic summoners", async () => {
  const payloads = livePayloads();
  payloads.versions.push("lolpatch_7.20");
  payloads.items.data["0"].name = "<b>Objeto</b>";
  payloads.items.data["10001"].name = "";
  mockLive(payloads);
  const catalog = await getCatalog();
  assert.equal(catalog.source, "live");
  assert.equal(catalog.version, "99.1.2");
  assert.equal(catalog.items.length, 55);
  assert.equal(catalog.items[0].description, "Daño");
  assert.equal(catalog.items[0].name, "Objeto");
  assert.ok(catalog.champions[0].image.includes("99.1.2"));
  assert.ok(catalog.summoners.every((spell) => spell.image.includes("99.1.2")));
  assert.ok(!catalog.summoners.some((spell) => spell.id === "SummonerSnowball"));
  assert.equal(
    catalog.runeStyles.find((style) => style.key === "Domination")?.slots[0][0],
    "Electrocute",
  );
  assert.equal(
    catalog.runes.find((rune) => rune.key === "Electrocute")?.image,
    "https://ddragon.leagueoflegends.com/cdn/img/perk-images/Styles/Domination/Electrocute/Electrocute.png",
  );
});

test("invalid or remote assets and ambiguous rune keys fall back to the bundled catalog", async () => {
  const mutations = [
    (payloads: ReturnType<typeof livePayloads>) => {
      payloads.champions.data.C0.image.full = "../../private.png";
    },
    (payloads: ReturnType<typeof livePayloads>) => {
      payloads.runes[0].icon = "https://evil.example/rune.png";
    },
    (payloads: ReturnType<typeof livePayloads>) => {
      payloads.runes[0].slots[0].runes[0].icon = "perk-images/../secret.png";
    },
    (payloads: ReturnType<typeof livePayloads>) => {
      payloads.runes[0].slots[1].runes[0].key = payloads.runes[0].slots[0].runes[0].key;
    },
    (payloads: ReturnType<typeof livePayloads>) => {
      payloads.summoners.data.SummonerSnowball.modes = ["CLASSIC"];
      payloads.summoners.data.SummonerSnowball.image.full = "//evil.example/spell.png";
    },
  ];
  for (const mutate of mutations) {
    const payloads = livePayloads();
    mutate(payloads);
    mockLive(payloads);
    const catalog = await getCatalog();
    assert.equal(catalog.source, "snapshot");
    assert.ok(catalog.runes.some((rune) => rune.key === "Electrocute"));
  }
});

test("catalog rejects an oversized Riot response before parsing it", async () => {
  globalThis.fetch = async () => new Response(" ".repeat(6 * 1024 * 1024 + 1));
  assert.equal((await getCatalog()).source, "snapshot");
});

test("champion detail requests cannot create arbitrary Riot paths", async () => {
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    throw new Error("unreachable");
  };
  const catalog = await getCatalog();
  called = false;
  assert.equal(await getChampionDetails("../../other", { ...catalog, source: "live" }), null);
  assert.equal(called, false);
  assert.equal(
    await getChampionDetails("Ahri", { ...catalog, source: "live", version: "../../private" }),
    null,
  );
  assert.equal(called, false);
});

test("champion ability context requires four finite, bounded cooldown lists", async () => {
  const catalog = { ...snapshot, source: "live" as const };
  const ability = {
    name: "Habilidad",
    description: "<b>Daño</b> mágico",
    cooldown: [8, 7, 6, 5, 4],
  };
  globalThis.fetch = async () =>
    Response.json({
      data: {
        Ahri: {
          name: "Ahri",
          passive: { name: "Pasiva", description: "<b>Curación</b>" },
          spells: Array.from({ length: 4 }, () => ability),
        },
      },
    });
  const details = await getChampionDetails("Ahri", catalog);
  assert.equal(details?.spells[0].key, "Q");
  assert.equal(details?.spells[0].description, "Daño mágico");
  globalThis.fetch = async () =>
    Response.json({
      data: {
        Ahri: {
          name: "Ahri",
          passive: { name: "Pasiva", description: "" },
          spells: [{ ...ability, cooldown: [-1] }],
        },
      },
    });
  assert.equal(await getChampionDetails("Ahri", catalog), null);
});

test("tooltips lose tags before being sent as context", () => {
  assert.equal(stripMarkup("<b>Daño</b>   <br> mágico"), "Daño mágico");
});
