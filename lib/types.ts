export type Role = "TOP" | "JUNGLE" | "MID" | "ADC" | "SUPPORT";

export interface Champion {
  id: string;
  key: string;
  name: string;
  title: string;
  image: string;
}
export interface GameItem {
  id: string;
  name: string;
  image: string;
  description: string;
  gold: number;
}
export interface RuneStyle {
  key: string;
  name: string;
  image: string;
  slots: string[][];
}
export interface GameRune {
  key: string;
  name: string;
  image: string;
  style: string;
  slot: number;
}
export interface SummonerSpell {
  id: string;
  name: string;
  image: string;
}
export interface Catalog {
  version: string;
  source: "live" | "snapshot";
  updatedAt: string;
  champions: Champion[];
  items: GameItem[];
  runeStyles: RuneStyle[];
  runes: GameRune[];
  summoners: SummonerSpell[];
}
export interface Credentials {
  apiKey?: string;
  accessToken?: string;
  model?: string;
}
export interface CoachInput extends Credentials {
  champion: string;
  enemy: string;
  role: Role;
  rank: string;
  allies: string[];
  enemies: string[];
  /** Bot 2v2 (ADC o Support): tu pareja de línea y la pareja de tu rival, opcionales. */
  allyDuo?: string;
  enemyDuo?: string;
  notes: string;
  webSearch: boolean;
}
/** Stored plans generated before the two-screen design remain readable. */
export interface LegacyCoachPlan {
  headline: string;
  difficulty: string;
  winCondition: string;
  levels: { level: string; action: string }[];
  mechanics: { trigger: string; response: string }[];
  build: {
    label: string;
    starting: string[];
    core: string[];
    situational: { item: string; reason: string }[];
    runes: string[];
    summoners: string[];
    skillOrder: string;
  };
  macro: string[];
  avoid: string[];
}
export type Edge = "tu" | "par" | "ojo";
export type Mark = "threat" | "synergy" | "target";
export type Skill = "Q" | "W" | "E" | "R";
export type GamePhase = "linea" | "mid" | "late";
export interface Step {
  cue: string;
  text: string;
  edge: Edge;
  skill?: Skill;
  champions?: string[];
}
export interface Reaction {
  trigger: string;
  response: string;
  champions: string[];
}
export interface CoachBrief {
  priority?: string;
  window?: { trigger: string; response: string };
  avoid?: string;
}
export interface CoachPlan {
  brief?: CoachBrief;
  headline: string;
  difficulty: string;
  winCondition: string;
  levels: (Step & { level: string })[];
  phases: { mid: Step[]; late: Step[] };
  reactions: Record<GamePhase, Reaction[]>;
  avoid: Record<GamePhase, string>;
  enemyKeys: { key: string; name: string; cooldown: string; note: string; champions?: string[] }[];
  composition: {
    champion: string;
    team: "ally" | "enemy";
    mark?: Mark;
    label: string;
    note?: string;
  }[];
  compNotes: { champions: string[]; mark: Mark; title: string; action: string }[];
  build: {
    label: string;
    starting: string[];
    core: string[];
    situational: { item: string; reason: string; champions?: string[] }[];
    nowByPhase: Record<GamePhase, string[]>;
    runes: {
      primary: { style: string; keystone: string; minors: [string, string, string] };
      secondary: { style: string; minors: [string, string] };
      shards: [string, string, string];
      why: string;
      alternative?: {
        style: string;
        keystone: string;
        when: string;
        why: string;
        champions?: string[];
      };
    };
    summoners: {
      pick: [string, string];
      why: string;
      alternative?: { pick: [string, string]; when: string; why: string; champions?: string[] };
    };
    skillOrder: { first6: (Skill | null)[]; max: string };
  };
  macro: string[];
}
export interface Source {
  title: string;
  url: string;
}
export interface CoachResult {
  plan: CoachPlan;
  meta: {
    version: string;
    catalogSource: Catalog["source"];
    model: string;
    webSearchRequested: boolean;
    sources: Source[];
    generatedAt: string;
    warnings: string[];
    formatVersion?: 2;
  };
}
export interface LegacyCoachResult extends Omit<CoachResult, "plan" | "meta"> {
  plan: LegacyCoachPlan;
  meta: Omit<CoachResult["meta"], "formatVersion"> & { formatVersion: 1 };
}
export type CoachSection =
  | "summary"
  | "levels"
  | "mid"
  | "late"
  | "reactions"
  | "avoid"
  | "enemyKeys"
  | "composition"
  | "compNotes"
  | "items"
  | "runes"
  | "summoners"
  | "skillOrder"
  | "macro";
/** Only validated advice is present. Missing fields never stand in for generated advice. */
export interface PartialCoachPlan extends Omit<CoachPlan, "build" | "avoid"> {
  avoid: Partial<Record<GamePhase, string>>;
  build: Omit<CoachPlan["build"], "runes" | "summoners" | "skillOrder"> &
    Partial<Pick<CoachPlan["build"], "runes" | "summoners" | "skillOrder">>;
}
export interface PartialCoachResult extends Omit<CoachResult, "plan" | "meta"> {
  plan: PartialCoachPlan;
  meta: Omit<CoachResult["meta"], "formatVersion"> & {
    formatVersion: 3;
    partial: {
      missing: CoachSection[];
      invalid?: CoachSection[];
      reason: "validation" | "truncated" | "optional";
      categories: string[];
    };
  };
}
export type GeneratedCoachResult = CoachResult | PartialCoachResult;
export type SavedCoachResult = GeneratedCoachResult | LegacyCoachResult;
export function isPartialCoachResult(result: SavedCoachResult): result is PartialCoachResult {
  return result.meta.formatVersion === 3;
}
export function isCurrentCoachResult(result: SavedCoachResult): result is CoachResult {
  return result.meta.formatVersion !== 3 && "phases" in result.plan;
}
export interface DraftInput extends Credentials {
  text?: string;
  image?: string;
}
export interface DraftResult {
  champion: string | null;
  enemy: string | null;
  role: Role | null;
  allies: string[];
  enemies: string[];
  notes: string;
  warnings: string[];
}
export interface AppStatus {
  configured: boolean;
  accessRequired: boolean;
  riotConfigured: boolean;
  defaultModel: string;
}
export interface RiotResult {
  participants: { champion: string; name: string; team: "ally" | "enemy"; isSelf: boolean }[];
  self: string;
  gameMode: string;
}
