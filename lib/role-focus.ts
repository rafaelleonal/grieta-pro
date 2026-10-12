import type { Role } from "./types";

/** Presentation labels only. Advice comes from the validated plan, never these labels. */
export const ROLE_FOCUS: Record<
  Role,
  { name: string; preparation: string; early: string; levels: string; matchup: string }
> = {
  TOP: {
    name: "Top",
    preparation: "Línea, presión lateral y llegada a las peleas.",
    early: "Línea y primeras rotaciones",
    levels: "Oleada, intercambios y primera salida",
    matchup: "Matchup de top",
  },
  JUNGLE: {
    name: "Jungla",
    preparation: "Rutas, presencia y objetivos. El duelo es sólo una parte.",
    early: "Primeras rutas y presencia",
    levels: "Limpieza, ganks y primeras decisiones",
    matchup: "Cruce de junglas",
  },
  MID: {
    name: "Mid",
    preparation: "Oleada, rotaciones y tu papel en las peleas.",
    early: "Línea y primeras rotaciones",
    levels: "Oleada, intercambios y acceso al río",
    matchup: "Matchup de mid",
  },
  ADC: {
    name: "ADC",
    preparation: "Dúo, recursos y daño seguro en las peleas.",
    early: "Dúo y primeros recursos",
    levels: "Coordinación con tu soporte y recursos",
    matchup: "Matchup de bot",
  },
  SUPPORT: {
    name: "Soporte",
    preparation: "Dúo, visión y cuándo moverte o proteger.",
    early: "Dúo, visión y primeras salidas",
    levels: "Presión compartida, visión y rotaciones",
    matchup: "Matchup de soportes",
  },
};
