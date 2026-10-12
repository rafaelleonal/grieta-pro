import snapshot from "@/data/catalog-snapshot.json";
import { z } from "zod";
import type { Catalog, Champion, GameItem, GameRune, RuneStyle, SummonerSpell } from "./types";

const BASE = "https://ddragon.leagueoflegends.com";
const MAX_CATALOG_BYTES = 6 * 1024 * 1024;
const gameKey = z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,95}$/);
const itemId = z.string().regex(/^\d{1,8}$/);
const versionSchema = z.string().regex(/^\d+\.\d+\.\d+$/);
const isPlainLabel = (value: string) =>
  !/[<>]/.test(value) &&
  Array.from(value).every((character) => {
    const code = character.charCodeAt(0);
    return code > 31 && code !== 127;
  });
const plainLabel = z.string().trim().min(1).max(200).refine(isPlainLabel);
const imageFile = z.string().regex(/^[A-Za-z0-9_-]{1,128}\.png$/);
const perkPath = z
  .string()
  .max(240)
  .regex(/^perk-images\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.png$/);
const championSchema = z.object({
  id: gameKey,
  key: z.string().regex(/^\d{1,8}$/),
  name: plainLabel,
  title: z.string().trim().max(200).refine(isPlainLabel),
  image: z.object({ full: imageFile }),
});
const itemSchema = z.object({
  name: z
    .string()
    .max(1000)
    .transform((value) => stripMarkup(value))
    .pipe(plainLabel.or(z.literal(""))),
  description: z.string().max(30000),
  image: z.object({ full: imageFile }),
  maps: z.record(z.string(), z.boolean()),
  inStore: z.boolean().optional(),
  gold: z.object({ purchasable: z.boolean(), total: z.number().int().min(0).max(100000) }),
});
const runeSchema = z.object({ key: gameKey, name: plainLabel, icon: perkPath });
const runeStylesSchema = z
  .array(
    z.object({
      key: gameKey,
      name: plainLabel,
      icon: perkPath,
      slots: z.array(z.object({ runes: z.array(runeSchema).min(2).max(6) })).length(4),
    }),
  )
  .length(5);
const summonerSchema = z.object({
  id: gameKey,
  name: plainLabel,
  image: z.object({ full: imageFile }),
  modes: z
    .array(z.string().regex(/^[A-Z0-9_]{1,64}$/))
    .min(1)
    .max(100),
});

function uniqueKeys(values: string[]) {
  return new Set(values).size === values.length;
}

export const stripMarkup = (value: string) =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

async function riotJson(path: string): Promise<unknown> {
  const response = await fetch(`${BASE}${path}`, {
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(7000),
    redirect: "error",
  });
  if (!response.ok || !response.body) throw new Error("Riot catalog unavailable");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_CATALOG_BYTES) {
        await reader.cancel();
        throw new Error("Riot catalog too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const joined = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(joined)) as unknown;
}

export async function getCatalog(): Promise<Catalog> {
  try {
    const versions = z
      .array(z.string().max(80))
      .min(1)
      .max(1000)
      .parse(await riotJson("/api/versions.json"));
    const version = versionSchema.parse(versions[0]);
    const [championData, itemData, runeData, summonerData] = await Promise.all([
      riotJson(`/cdn/${version}/data/es_MX/champion.json`),
      riotJson(`/cdn/${version}/data/es_MX/item.json`),
      riotJson(`/cdn/${version}/data/es_MX/runesReforged.json`),
      riotJson(`/cdn/${version}/data/es_MX/summoner.json`),
    ]);
    const champions = z.object({ data: z.record(gameKey, championSchema) }).parse(championData);
    const items = z.object({ data: z.record(itemId, itemSchema) }).parse(itemData);
    const runeTrees = runeStylesSchema.parse(runeData);
    const summonerSpells = z
      .object({ data: z.record(gameKey, summonerSchema) })
      .parse(summonerData);
    const championList: Champion[] = Object.values(champions.data)
      .map((c) => ({
        id: c.id,
        key: c.key,
        name: c.name,
        title: c.title,
        image: `${BASE}/cdn/${version}/img/champion/${c.image.full}`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
    const itemList: GameItem[] = Object.entries(items.data)
      .filter(([, i]) => i.name && i.maps["11"] && i.gold.purchasable && i.inStore !== false)
      .map(([id, i]) => ({
        id,
        name: i.name,
        description: stripMarkup(i.description),
        gold: i.gold.total,
        image: `${BASE}/cdn/${version}/img/item/${i.image.full}`,
      }));
    const runeStyles: RuneStyle[] = runeTrees.map((style) => ({
      key: style.key,
      name: style.name,
      image: `${BASE}/cdn/img/${style.icon}`,
      slots: style.slots.map((slot) => slot.runes.map((rune) => rune.key)),
    }));
    const runes: GameRune[] = runeTrees.flatMap((style) =>
      style.slots.flatMap((row, slot) =>
        row.runes.map((rune) => ({
          key: rune.key,
          name: rune.name,
          image: `${BASE}/cdn/img/${rune.icon}`,
          style: style.key,
          slot,
        })),
      ),
    );
    const summoners: SummonerSpell[] = Object.entries(summonerSpells.data)
      .filter(([, spell]) => spell.modes.includes("CLASSIC"))
      .map(([id, spell]) => {
        if (id !== spell.id) throw new Error("Invalid Riot summoner ID");
        return {
          id,
          name: spell.name,
          image: `${BASE}/cdn/${version}/img/spell/${spell.image.full}`,
        };
      });
    if (
      championList.length < 100 ||
      championList.length > 500 ||
      itemList.length < 50 ||
      itemList.length > 1500 ||
      summoners.length < 5 ||
      summoners.length > 20 ||
      !uniqueKeys(championList.map((champion) => champion.id)) ||
      !uniqueKeys(runeStyles.map((style) => style.key)) ||
      !uniqueKeys(runes.map((rune) => rune.key))
    )
      throw new Error("Incomplete Riot catalog");
    return {
      version,
      source: "live",
      updatedAt: new Date().toISOString(),
      champions: championList,
      items: itemList,
      runeStyles,
      runes,
      summoners,
    };
  } catch {
    // Preserve the bundled date and version so the UI can identify stale data.
    return { ...snapshot, source: "snapshot" };
  }
}

export interface ChampionDetails {
  name: string;
  /** Icon URLs are optional: an unexpected file name never drops the ability data. */
  passive: { name: string; description: string; image?: string };
  spells: { key: string; name: string; description: string; cooldown: number[]; image?: string }[];
}

/** Data Dragon icon URL for a validated file name, or nothing. */
function abilityImage(version: string, group: "spell" | "passive", image: unknown) {
  const full =
    image && typeof image === "object" && "full" in image ? (image as { full: unknown }).full : "";
  return imageFile.safeParse(full).success
    ? `${BASE}/cdn/${version}/img/${group}/${full as string}`
    : undefined;
}

export async function getChampionDetails(
  id: string,
  catalog: Catalog,
): Promise<ChampionDetails | null> {
  if (
    !gameKey.safeParse(id).success ||
    !versionSchema.safeParse(catalog.version).success ||
    !catalog.champions.some((c) => c.id === id) ||
    catalog.source !== "live"
  )
    return null;
  try {
    const abilitySchema = z.object({
      name: plainLabel,
      description: z.string().max(30000),
      image: z.unknown().optional(),
    });
    const result = z
      .object({
        data: z.record(
          gameKey,
          z.object({
            name: plainLabel,
            passive: abilitySchema,
            spells: z
              .array(
                abilitySchema.extend({
                  cooldown: z.array(z.number().finite().min(0).max(3600)).min(1).max(18),
                }),
              )
              .length(4),
          }),
        ),
      })
      .parse(await riotJson(`/cdn/${catalog.version}/data/es_MX/champion/${id}.json`));
    const champion = result.data[id];
    return {
      name: champion.name,
      passive: {
        name: champion.passive.name,
        description: stripMarkup(champion.passive.description),
        image: abilityImage(catalog.version, "passive", champion.passive.image),
      },
      spells: champion.spells.map((spell, i) => ({
        key: ["Q", "W", "E", "R"][i],
        name: spell.name,
        description: stripMarkup(spell.description),
        cooldown: spell.cooldown,
        image: abilityImage(catalog.version, "spell", spell.image),
      })),
    };
  } catch {
    return null;
  }
}
