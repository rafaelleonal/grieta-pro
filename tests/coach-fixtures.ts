import snapshot from "../data/catalog-snapshot.json";
import type { Catalog, CoachPlan } from "../lib/types";

export const fixtureCatalog: Catalog = { ...snapshot, source: "live" };
export const fixturePlan: CoachPlan = {
  headline: "Castiga el muro",
  difficulty: "Difícil",
  winCondition: "Castiga los cooldowns.",
  levels: ["1", "2", "3", "4", "5", "6"].map((level) => ({
    level,
    cue: "Conserva una salida",
    text: "Conserva espacio para retirarte.",
    edge: "par",
  })),
  phases: {
    mid: Array.from({ length: 3 }, () => ({
      cue: "Empuja antes de rotar",
      text: "Revisa visión antes de entrar al río.",
      edge: "par",
    })),
    late: Array.from({ length: 3 }, () => ({
      cue: "Conserva una salida segura",
      text: "Entra con seguimiento de tu equipo.",
      edge: "tu",
    })),
  },
  reactions: Object.fromEntries(
    ["linea", "mid", "late"].map((phase) => [
      phase,
      [
        { trigger: "Usa el muro", response: "Espera y busca otro ángulo.", champions: ["Yasuo"] },
        { trigger: "Se acerca", response: "Retrocede hacia tu torre.", champions: ["Yasuo"] },
      ],
    ]),
  ) as CoachPlan["reactions"],
  avoid: {
    linea: "No uses E contra su muro.",
    mid: "No entres sin visión.",
    late: "No inicies sin salida.",
  },
  enemyKeys: [
    {
      key: "W",
      name: "Muro de viento",
      cooldown: "Sin confirmar",
      note: "Espera a que termine para usar E.",
    },
    { key: "Q3", name: "Tornado", cooldown: "Sin confirmar", note: "Muévete lateralmente." },
  ],
  composition: [
    { champion: "Ahri", team: "ally", label: "Tú" },
    { champion: "Yasuo", team: "enemy", label: "Rival" },
  ],
  compNotes: [],
  build: {
    label: "Build sugerida",
    starting: ["1056"],
    core: ["3020"],
    situational: [],
    nowByPhase: { linea: ["1056"], mid: ["3020"], late: ["3020"] },
    runes: {
      primary: {
        style: "Domination",
        keystone: "Electrocute",
        minors: ["TasteOfBlood", "GrislyMementos", "UltimateHunter"],
      },
      secondary: { style: "Sorcery", minors: ["ManaflowBand", "Transcendence"] },
      shards: ["Fuerza adaptable", "Fuerza adaptable", "Vida"],
      why: "Busca intercambios breves.",
    },
    summoners: { pick: ["SummonerFlash", "SummonerDot"], why: "Reposición y remate." },
    skillOrder: { first6: ["Q", "W", "E", "Q", "Q", "R"], max: "Q → W → E" },
  },
  macro: ["Juega alrededor de la visión."],
};
