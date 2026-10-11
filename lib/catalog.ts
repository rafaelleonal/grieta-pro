import snapshot from "@/data/catalog-snapshot.json";
import type { Catalog, Champion, GameItem } from "./types";

const BASE = "https://ddragon.leagueoflegends.com";
type RawChampion = {
  id: string;
  key: string;
  name: string;
  title: string;
  image: { full: string };
};
type RawItem = {
  name: string;
  description: string;
  image: { full: string };
  maps: Record<string, boolean>;
  inStore?: boolean;
  gold: { purchasable: boolean; total: number };
};

export const stripMarkup = (value: string) =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

async function riotJson<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) throw new Error("Riot catalog unavailable");
  return response.json() as Promise<T>;
}

export async function getCatalog(): Promise<Catalog> {
  try {
    const versions = await riotJson<string[]>("/api/versions.json");
    const version = versions[0];
    if (!version || !/^\d+\.\d+\.\d+$/.test(version)) throw new Error("Invalid Riot version");
    const [champions, items] = await Promise.all([
      riotJson<{ data: Record<string, RawChampion> }>(`/cdn/${version}/data/es_MX/champion.json`),
      riotJson<{ data: Record<string, RawItem> }>(`/cdn/${version}/data/es_MX/item.json`),
    ]);
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
      .filter(([, i]) => i.maps["11"] && i.gold.purchasable && i.inStore !== false)
      .map(([id, i]) => ({
        id,
        name: i.name,
        description: stripMarkup(i.description),
        gold: i.gold.total,
        image: `${BASE}/cdn/${version}/img/item/${i.image.full}`,
      }));
    if (championList.length < 100 || itemList.length < 50)
      throw new Error("Incomplete Riot catalog");
    return {
      version,
      source: "live",
      updatedAt: new Date().toISOString(),
      champions: championList,
      items: itemList,
    };
  } catch {
    // Preserve the bundled date and version so the UI can identify stale data.
    return { ...snapshot, source: "snapshot" };
  }
}

export interface ChampionDetails {
  name: string;
  passive: { name: string; description: string };
  spells: { key: string; name: string; description: string; cooldown: number[] }[];
}

export async function getChampionDetails(
  id: string,
  catalog: Catalog,
): Promise<ChampionDetails | null> {
  if (!catalog.champions.some((c) => c.id === id) || catalog.source !== "live") return null;
  try {
    const result = await riotJson<{
      data: Record<
        string,
        {
          name: string;
          passive: { name: string; description: string };
          spells: { name: string; description: string; cooldown: number[] }[];
        }
      >;
    }>(`/cdn/${catalog.version}/data/es_MX/champion/${id}.json`);
    const champion = result.data[id];
    return {
      name: champion.name,
      passive: {
        name: champion.passive.name,
        description: stripMarkup(champion.passive.description),
      },
      spells: champion.spells.map((spell, i) => ({
        key: ["Q", "W", "E", "R"][i],
        name: spell.name,
        description: stripMarkup(spell.description),
        cooldown: spell.cooldown,
      })),
    };
  } catch {
    return null;
  }
}
