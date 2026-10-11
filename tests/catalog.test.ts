import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { getCatalog, getChampionDetails, stripMarkup } from "../lib/catalog";

const originalFetch = globalThis.fetch;
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
  assert.ok(catalog.updatedAt);
  assert.equal(await getChampionDetails("Ahri", catalog), null);
});

test("fresh catalog uses returned version and only purchasable Rift items", async () => {
  globalThis.fetch = async (url) => {
    const path = String(url);
    if (path.endsWith("versions.json")) return Response.json(["99.1.2"]);
    if (path.endsWith("champion.json"))
      return Response.json({
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
      });
    return Response.json({
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
      },
    });
  };
  const catalog = await getCatalog();
  assert.equal(catalog.source, "live");
  assert.equal(catalog.version, "99.1.2");
  assert.equal(catalog.items.length, 55);
  assert.equal(catalog.items[0].description, "Daño");
  assert.ok(catalog.champions[0].image.includes("99.1.2"));
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
});

test("tooltips lose tags before being sent as context", () => {
  assert.equal(stripMarkup("<b>Daño</b>   <br> mágico"), "Daño mágico");
});
