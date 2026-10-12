import type { CoachInput, CoachResult } from "./types";

/** The demo's full composition is explicit; it never fills a real player's missing picks. */
export const demoInput: Omit<CoachInput, "apiKey" | "accessToken" | "model"> = {
  champion: "Ahri",
  enemy: "Yasuo",
  role: "MID",
  rank: "Oro",
  allies: ["Ornn", "Vi", "Jinx", "Lulu"],
  enemies: ["Malphite", "LeeSin", "Kaisa", "Rakan"],
  notes: "",
  webSearch: false,
};

export const demoResult: CoachResult = {
  plan: {
    headline: "Haz que Yasuo se acerque en tus términos.",
    difficulty: "Ejemplo · Ahri vs. Yasuo",
    winCondition:
      "Juega fuera de tu oleada, conserva E y castiga después de su muro. Busca intercambios cortos y una entrada segura a nivel 6.",
    levels: [
      {
        level: "1",
        cue: "Q sobre la oleada",
        text: "Golpea la oleada y a Yasuo en la misma línea; no regales vida por disputar un súbdito.",
        edge: "par",
        skill: "Q",
      },
      {
        level: "2",
        cue: "Auto, W y retrocede",
        text: "Activa W para salir de su Q después del intercambio; evita alargarlo.",
        edge: "tu",
        skill: "W",
      },
      {
        level: "3",
        cue: "Guarda E y sepárate",
        text: "Tus súbditos abren rutas a Yasuo. Sepárate de la oleada y vigila la llegada de Lee Sin.",
        edge: "ojo",
        skill: "E",
        champions: ["LeeSin"],
      },
      {
        level: "4",
        cue: "Espera a su muro",
        text: "No tires E de frente al muro. Amaga, espera el bloqueo y busca otro ángulo.",
        edge: "par",
        skill: "Q",
      },
      {
        level: "5",
        cue: "Oleada cerca de torre",
        text: "Controla la oleada sin dejar que entre. Guarda vida y maná para nivel 6.",
        edge: "par",
        skill: "Q",
      },
      {
        level: "6",
        cue: "R cambia tu ángulo",
        text: "Usa R para esquivar el tornado o ajustar E. Con Vi, espera seguimiento y conserva una salida.",
        edge: "tu",
        skill: "R",
        champions: ["Vi"],
      },
    ],
    phases: {
      mid: [
        {
          cue: "Empuja antes de rotar",
          text: "Empuja una oleada segura y revisa dónde está Lee Sin antes de entrar al río.",
          edge: "par",
          champions: ["LeeSin"],
        },
        {
          cue: "Coordina picks con Vi",
          text: "Busca una E con seguimiento de Vi; entrar sola reduce tu margen de salida.",
          edge: "tu",
          champions: ["Vi"],
        },
        {
          cue: "Amenaza desde un lateral",
          text: "En objetivos, cambia el ángulo y conserva una ruta de retirada.",
          edge: "par",
        },
        {
          cue: "No persigas su split",
          text: "Si Yasuo va a una lateral, empuja mid y avisa a tu equipo antes de responder.",
          edge: "ojo",
          champions: ["Yasuo"],
        },
      ],
      late: [
        {
          cue: "Espera el inicio rival",
          text: "Vigila a Malphite y Rakan. Evita quedar junto a aliados que puedan lanzar por el aire.",
          edge: "ojo",
          champions: ["Malphite", "Rakan"],
        },
        {
          cue: "Conserva una salida segura",
          text: "No gastes todas las cargas de R para entrar sin visión del resto del equipo.",
          edge: "ojo",
          skill: "R",
        },
        {
          cue: "Busca E sobre Kai’Sa",
          text: "Cuando el inicio rival esté comprometido, amenaza a Kai’Sa desde un flanco con seguimiento.",
          edge: "tu",
          skill: "E",
          champions: ["Kaisa"],
        },
        {
          cue: "Llega con mid empujado",
          text: "Empuja mid antes del objetivo para que tu equipo pueda preparar visión y posiciones.",
          edge: "par",
        },
      ],
    },
    reactions: {
      linea: [
        {
          champions: ["Yasuo"],
          trigger: "Yasuo prepara tornado (Q3)",
          response:
            "Muévete de lado, evita alinearte con tus súbditos y guarda una carga de R si la tienes.",
        },
        {
          champions: ["Yasuo"],
          trigger: "Yasuo usa Muro de viento",
          response: "No gastes E contra el muro; espera a que termine o cambia de ángulo.",
        },
        {
          champions: ["LeeSin"],
          trigger: "Lee Sin desaparece del mapa",
          response:
            "Retrocede hasta recuperar visión. Sin E ni Destello, evita buscar el intercambio.",
        },
      ],
      mid: [
        {
          champions: ["Malphite", "Rakan"],
          trigger: "Lanzan a tus aliados por el aire",
          response: "Yasuo puede seguir con R: sepárate del grupo y conserva E para la salida.",
        },
        {
          champions: ["LeeSin", "Vi"],
          trigger: "Lee Sin aparece al otro lado",
          response: "Revisa prioridad y visión con Vi antes de invadir o tomar un objetivo.",
        },
        {
          champions: ["Yasuo"],
          trigger: "Yasuo se va a una lateral",
          response: "Presiona mid con tu equipo; no lo persigas sola a través de zonas sin visión.",
        },
      ],
      late: [
        {
          champions: ["Malphite", "Kaisa"],
          trigger: "Malphite entra con R",
          response: "Evita su seguimiento con Yasuo; después busca un ángulo seguro hacia Kai’Sa.",
        },
        {
          champions: ["Kaisa"],
          trigger: "Kai’Sa salta sobre ti",
          response:
            "Valora Zhonya para sobrevivir al daño inicial y conserva E para cuando sea visible.",
        },
        {
          champions: ["Rakan", "Jinx"],
          trigger: "Rakan prepara su W",
          response: "Retrocede en diagonal y sepárate de Jinx para evitar una entrada sobre ambas.",
        },
      ],
    },
    avoid: {
      linea: "Gastar E sin motivo cuando Yasuo puede entrar.",
      mid: "Cruzar el río sin visión cuando no sabes dónde está Lee Sin.",
      late: "Gastar todas las cargas de R para iniciar sin una ruta de salida.",
    },
    enemyKeys: [
      {
        key: "W",
        name: "Muro de viento",
        cooldown: "Sin confirmar",
        note: "Si lo gasta, busca un ángulo para E cuando termine.",
      },
      {
        key: "Q3",
        name: "Tornado",
        cooldown: "Sin confirmar",
        note: "Vigila su preparación y muévete lateralmente.",
      },
      {
        key: "P",
        name: "Escudo",
        cooldown: "Condicional · verifica",
        note: "Rompe el escudo antes de comprometer el intercambio.",
      },
      {
        key: "R",
        name: "Último aliento",
        cooldown: "Sin confirmar",
        note: "Necesita un objetivo en el aire; vigila el inicio rival.",
        champions: ["Malphite", "Rakan", "LeeSin"],
      },
    ],
    composition: [
      { champion: "Ornn", team: "ally", label: "Top" },
      {
        champion: "Vi",
        team: "ally",
        mark: "synergy",
        label: "Picks",
        note: "Su R y tu E aportan seguimiento para un pick.",
      },
      { champion: "Ahri", team: "ally", label: "Tú" },
      { champion: "Jinx", team: "ally", label: "ADC" },
      { champion: "Lulu", team: "ally", label: "Support" },
      {
        champion: "Malphite",
        team: "enemy",
        mark: "threat",
        label: "Activa R",
        note: "Su entrada puede habilitar la R de Yasuo.",
      },
      {
        champion: "LeeSin",
        team: "enemy",
        mark: "threat",
        label: "Gank temprano",
        note: "Vigila su ruta antes de forzar la línea.",
      },
      { champion: "Yasuo", team: "enemy", label: "Rival" },
      {
        champion: "Kaisa",
        team: "enemy",
        mark: "target",
        label: "Objetivo",
        note: "Busca un ángulo seguro para E con seguimiento.",
      },
      {
        champion: "Rakan",
        team: "enemy",
        mark: "threat",
        label: "Activa R",
        note: "Su W puede preparar el seguimiento de Yasuo.",
      },
    ],
    compNotes: [
      {
        champions: ["LeeSin"],
        mark: "threat",
        title: "Presión del jungla",
        action: "Valora Fase súbita o Teleportación",
      },
      {
        champions: ["Malphite", "Rakan"],
        mark: "threat",
        title: "Preparan la R de Yasuo",
        action: "Valora Zhonya si te buscan",
      },
      {
        champions: ["Vi"],
        mark: "synergy",
        title: "Seguimiento para picks",
        action: "Ignición si buscas rematar",
      },
    ],
    build: {
      label: "Build ilustrativa, sin verificar para el parche actual",
      starting: ["1056", "2003"],
      core: ["3020", "6655", "3089"],
      situational: [
        { item: "3157", reason: "Si te buscan", champions: ["Yasuo", "LeeSin", "Kaisa"] },
        { item: "3135", reason: "Si compran RM", champions: ["Malphite", "Rakan"] },
      ],
      nowByPhase: {
        linea: ["1056", "2003", "3020", "6655"],
        mid: ["6655", "3089"],
        late: ["3089", "3157", "3135"],
      },
      runes: {
        primary: {
          style: "Domination",
          keystone: "Electrocute",
          minors: ["TasteOfBlood", "GrislyMementos", "UltimateHunter"],
        },
        secondary: { style: "Sorcery", minors: ["ManaflowBand", "Transcendence"] },
        shards: ["Fuerza adaptable", "Fuerza adaptable", "Vida"],
        why: "Intercambios cortos con auto, W y Q; retrocede después de activar la runa.",
        alternative: {
          style: "Sorcery",
          keystone: "PhaseRush",
          when: "Si Lee Sin presiona mid",
          why: "Más velocidad para salir de su entrada y del tornado.",
          champions: ["LeeSin"],
        },
      },
      summoners: {
        pick: ["SummonerFlash", "SummonerDot"],
        why: "Destello para reposicionarte; Ignición si coordinas un pick con Vi.",
        alternative: {
          pick: ["SummonerFlash", "SummonerTeleport"],
          when: "Si priorizas regresar a línea",
          why: "Valora Teleportación si la presión rival te impide sostener la oleada.",
          champions: ["LeeSin"],
        },
      },
      skillOrder: { first6: ["Q", "W", "E", "Q", "Q", "R"], max: "Q → W → E" },
    },
    macro: [
      "Empuja una oleada segura antes de rotar y revisa al jungla rival.",
      "Busca picks con Vi y conserva seguimiento para E.",
      "En objetivos, amenaza desde un lateral con una ruta de salida.",
    ],
  },
  meta: {
    formatVersion: 2,
    version: "Ejemplo",
    catalogSource: "snapshot",
    model: "Demostración local",
    webSearchRequested: false,
    sources: [],
    generatedAt: "",
    warnings: [
      "Demostración escrita de Ahri vs. Yasuo con composición ficticia. No fue generada por IA ni verificada para el parche actual. Los enfriamientos deben confirmarse en el juego.",
    ],
  },
};
