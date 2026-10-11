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
export interface Catalog {
  version: string;
  source: "live" | "snapshot";
  updatedAt: string;
  champions: Champion[];
  items: GameItem[];
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
  notes: string;
  webSearch: boolean;
}
export interface CoachPlan {
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
  };
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
