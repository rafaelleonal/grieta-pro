/**
 * Stat shards are not part of Data Dragon's runesReforged.json, so the options and
 * their public icons are listed here. Plans store the Spanish label (≤ 40 chars),
 * which keeps older free-text shards readable: an unknown label just has no icon.
 */
const ICONS = "https://ddragon.leagueoflegends.com/cdn/img/perk-images/StatMods";

export const RUNE_SHARDS = {
  "Fuerza adaptable": `${ICONS}/StatModsAdaptiveForceIcon.png`,
  "Velocidad de ataque": `${ICONS}/StatModsAttackSpeedIcon.png`,
  "Aceleración de habilidades": `${ICONS}/StatModsCDRScalingIcon.png`,
  "Velocidad de movimiento": `${ICONS}/StatModsMovementSpeedIcon.png`,
  "Vida escalable": `${ICONS}/StatModsHealthScalingIcon.png`,
  Vida: `${ICONS}/StatModsHealthPlusIcon.png`,
  "Tenacidad y resist. a ralentización": `${ICONS}/StatModsTenacityIcon.png`,
} as const;
export type RuneShard = keyof typeof RUNE_SHARDS;
export const RUNE_SHARD_LABELS = Object.keys(RUNE_SHARDS) as [RuneShard, ...RuneShard[]];

/** Allowed options per row: offense, flex and defense. */
export const RUNE_SHARD_ROWS: readonly (readonly RuneShard[])[] = [
  ["Fuerza adaptable", "Velocidad de ataque", "Aceleración de habilidades"],
  ["Fuerza adaptable", "Velocidad de movimiento", "Vida escalable"],
  ["Vida", "Tenacidad y resist. a ralentización", "Vida escalable"],
];

export function runeShardIcon(label: string): string | undefined {
  return Object.hasOwn(RUNE_SHARDS, label) ? RUNE_SHARDS[label as RuneShard] : undefined;
}

/** A known label must sit in a row that offers it; legacy free text is left as is. */
export function shardsFitRows(shards: readonly string[]): boolean {
  return shards.every(
    (label, row) =>
      !Object.hasOwn(RUNE_SHARDS, label) || RUNE_SHARD_ROWS[row]?.includes(label as RuneShard),
  );
}
