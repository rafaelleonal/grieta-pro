import type { Champion, Role } from "./types";

export const CHAMPION_ROLES = ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"] as const;
export const MAX_CHAMPION_FAVORITES = 12;
export type ChampionFavorites = Record<Role, string[]>;
export type ChampionPreferences = {
  favorites: ChampionFavorites;
  versions: Record<Role, number>;
};

// Editorial shortcuts, not live pick rates or a restriction on champion selection.
export const COMMON_CHAMPIONS: Record<Role, readonly string[]> = {
  TOP: [
    "Aatrox",
    "Camille",
    "Chogath",
    "Darius",
    "DrMundo",
    "Fiora",
    "Gangplank",
    "Garen",
    "Gnar",
    "Gwen",
    "Illaoi",
    "Irelia",
    "Jax",
    "Jayce",
    "Kennen",
    "Kled",
    "KSante",
    "Malphite",
    "Mordekaiser",
    "Nasus",
    "Olaf",
    "Ornn",
    "Quinn",
    "Renekton",
    "Riven",
    "Sett",
    "Shen",
    "Singed",
    "Sion",
    "TahmKench",
    "Teemo",
    "Trundle",
    "Tryndamere",
    "Urgot",
    "Vladimir",
    "Volibear",
    "MonkeyKing",
    "Yone",
    "Yorick",
  ],
  JUNGLE: [
    "Amumu",
    "Belveth",
    "Brand",
    "Briar",
    "Diana",
    "Ekko",
    "Elise",
    "Evelynn",
    "Fiddlesticks",
    "Gragas",
    "Graves",
    "Hecarim",
    "Ivern",
    "JarvanIV",
    "Jax",
    "Karthus",
    "Kayn",
    "Khazix",
    "Kindred",
    "LeeSin",
    "Lillia",
    "MasterYi",
    "Nidalee",
    "Nocturne",
    "Nunu",
    "Olaf",
    "Poppy",
    "Rammus",
    "RekSai",
    "Rengar",
    "Sejuani",
    "Shaco",
    "Shyvana",
    "Skarner",
    "Taliyah",
    "Trundle",
    "Udyr",
    "Vi",
    "Viego",
    "Volibear",
    "Warwick",
    "MonkeyKing",
    "XinZhao",
    "Zac",
  ],
  MID: [
    "Ahri",
    "Akali",
    "Akshan",
    "Anivia",
    "Annie",
    "AurelionSol",
    "Aurora",
    "Azir",
    "Cassiopeia",
    "Corki",
    "Diana",
    "Ekko",
    "Fizz",
    "Galio",
    "Hwei",
    "Irelia",
    "Jayce",
    "Kassadin",
    "Katarina",
    "Leblanc",
    "Lissandra",
    "Lux",
    "Malzahar",
    "Naafiri",
    "Neeko",
    "Orianna",
    "Qiyana",
    "Ryze",
    "Smolder",
    "Swain",
    "Sylas",
    "Syndra",
    "Taliyah",
    "Talon",
    "Tristana",
    "TwistedFate",
    "Veigar",
    "Velkoz",
    "Vex",
    "Viktor",
    "Vladimir",
    "Xerath",
    "Yasuo",
    "Yone",
    "Zed",
    "Ziggs",
    "Zoe",
  ],
  ADC: [
    "Aphelios",
    "Ashe",
    "Caitlyn",
    "Corki",
    "Draven",
    "Ezreal",
    "Jhin",
    "Jinx",
    "Kaisa",
    "Kalista",
    "KogMaw",
    "Lucian",
    "MissFortune",
    "Nilah",
    "Samira",
    "Senna",
    "Sivir",
    "Smolder",
    "Tristana",
    "Twitch",
    "Varus",
    "Vayne",
    "Xayah",
    "Yasuo",
    "Zeri",
    "Ziggs",
  ],
  SUPPORT: [
    "Alistar",
    "Ashe",
    "Bard",
    "Blitzcrank",
    "Brand",
    "Braum",
    "Janna",
    "Karma",
    "Leona",
    "Lulu",
    "Lux",
    "Maokai",
    "Milio",
    "Morgana",
    "Nami",
    "Nautilus",
    "Neeko",
    "Pantheon",
    "Poppy",
    "Pyke",
    "Rakan",
    "Rell",
    "Renata",
    "Senna",
    "Seraphine",
    "Shaco",
    "Sona",
    "Soraka",
    "Swain",
    "TahmKench",
    "Taric",
    "Thresh",
    "Velkoz",
    "Xerath",
    "Yuumi",
    "Zilean",
    "Zyra",
  ],
};

export function emptyChampionPreferences(): ChampionPreferences {
  return {
    favorites: { TOP: [], JUNGLE: [], MID: [], ADC: [], SUPPORT: [] },
    versions: { TOP: 0, JUNGLE: 0, MID: 0, ADC: 0, SUPPORT: 0 },
  };
}

export function readChampionPreferences(value: unknown): ChampionPreferences {
  if (!value || typeof value !== "object") throw new Error("Invalid champion preferences");
  const result = value as { favorites?: unknown; versions?: unknown };
  if (
    !result.favorites ||
    typeof result.favorites !== "object" ||
    !result.versions ||
    typeof result.versions !== "object" ||
    Object.keys(result.favorites).length !== CHAMPION_ROLES.length ||
    Object.keys(result.versions).length !== CHAMPION_ROLES.length
  )
    throw new Error("Invalid champion preferences");
  const parsed = emptyChampionPreferences();
  for (const role of CHAMPION_ROLES) {
    const list = (result.favorites as Record<string, unknown>)[role];
    const version = (result.versions as Record<string, unknown>)[role];
    if (
      !Array.isArray(list) ||
      list.length > MAX_CHAMPION_FAVORITES ||
      list.some((id) => typeof id !== "string" || !/^[A-Za-z][A-Za-z0-9_]{0,79}$/.test(id)) ||
      new Set(list).size !== list.length ||
      typeof version !== "number" ||
      !Number.isSafeInteger(version) ||
      version < 0
    )
      throw new Error("Invalid champion preferences");
    parsed.favorites[role] = [...list] as string[];
    parsed.versions[role] = version;
  }
  return parsed;
}

export function championOptions(
  champions: Champion[],
  {
    role,
    favorites = [],
    query = "",
    showAll = false,
  }: {
    role?: Role;
    favorites?: readonly string[];
    query?: string;
    showAll?: boolean;
  },
): Champion[] {
  const search = query.trim().toLocaleLowerCase();
  const favoriteOrder = new Map(favorites.map((id, index) => [id, index]));
  const common = role ? new Set(COMMON_CHAMPIONS[role]) : null;
  return champions
    .filter((entry) => {
      if (search) return `${entry.name} ${entry.id}`.toLocaleLowerCase().includes(search);
      return showAll || !common || common.has(entry.id) || favoriteOrder.has(entry.id);
    })
    .sort((left, right) => {
      const leftOrder = favoriteOrder.get(left.id);
      const rightOrder = favoriteOrder.get(right.id);
      if (leftOrder !== undefined || rightOrder !== undefined) {
        if (leftOrder === undefined) return 1;
        if (rightOrder === undefined) return -1;
        return leftOrder - rightOrder;
      }
      return left.name.localeCompare(right.name, "es");
    });
}

export function toggleChampionFavorite(favorites: readonly string[], champion: string): string[] {
  return favorites.includes(champion)
    ? favorites.filter((id) => id !== champion)
    : [...favorites, champion];
}

export function moveChampionFavorite(
  favorites: readonly string[],
  champion: string,
  direction: -1 | 1,
): string[] {
  const current = favorites.indexOf(champion);
  const next = current + direction;
  const ordered = [...favorites];
  if (current < 0 || next < 0 || next >= ordered.length) return ordered;
  [ordered[current], ordered[next]] = [ordered[next], ordered[current]];
  return ordered;
}
