import type { CoachResult } from "./types";

export const demoResult: CoachResult = {
  plan: {
    headline: "Haz que Yasuo se acerque en tus términos.",
    difficulty: "Ejemplo de matchup · Ahri vs. Yasuo",
    winCondition:
      "Juega fuera de tu oleada, conserva E y castiga después de su muro. Tu ventaja viene de intercambios cortos y una entrada segura a nivel 6.",
    levels: [
      {
        level: "1",
        action:
          "Empieza Q. Golpea la oleada y a Yasuo en la misma línea; no le regales vida por disputar un súbdito.",
      },
      {
        level: "2",
        action:
          "Con W, activa velocidad para salir del alcance de su Q. Busca auto + W y retrocede; evita alargar el intercambio.",
      },
      {
        level: "3",
        action:
          "Aprende E y resérvala. Tus súbditos son rutas para su E: sepárate de la oleada para reducir sus ángulos.",
      },
      {
        level: "4",
        action:
          "No tires E de frente al muro. Amaga una amenaza, espera el bloqueo y busca el intercambio cuando termine.",
      },
      {
        level: "5",
        action:
          "Controla la oleada cerca de tu torre sin dejar que entre. Guarda vida y maná para tu ventana de nivel 6.",
      },
      {
        level: "6",
        action:
          "Usa R para cambiar el ángulo de E o esquivar el tornado. Mantén una carga para salir si su jungla aparece.",
      },
    ],
    mechanics: [
      {
        trigger: "Yasuo prepara tornado (Q3)",
        response:
          "Muévete de lado, evita alinearte con tus súbditos y guarda una carga de R si ya la tienes.",
      },
      {
        trigger: "Yasuo usa Muro de viento",
        response:
          "No gastes E contra el muro. Cambia de ángulo o espera a que termine antes de comprometer R.",
      },
      {
        trigger: "Yasuo entra con E por la oleada",
        response:
          "Aléjate de sus siguientes objetivos de E; apunta E cuando su trayectoria sea más clara.",
      },
    ],
    build: {
      label: "Build ilustrativa, sin verificar para el parche actual",
      starting: ["1056", "2003"],
      core: ["3020", "6655", "3089"],
      situational: [
        { item: "3157", reason: "Si necesitas sobrevivir a la entrada física del equipo rival." },
        { item: "3135", reason: "Cuando los objetivos prioritarios acumulen resistencia mágica." },
      ],
      runes: ["Ejemplo: Electrocute", "Ajusta las runas a la versión y a la composición"],
      summoners: ["Flash", "Teleport o Ignite según tu plan"],
      skillOrder: "Ejemplo: Q → W → E. Prioriza R cuando esté disponible.",
    },
    macro: [
      "Antes de salir de línea, empuja una oleada segura y revisa dónde está el jungla rival.",
      "Busca picks junto a tu jungla: E y R ofrecen más valor con seguimiento que entrando sola.",
      "En objetivos, amenaza desde un ángulo lateral y conserva una ruta de salida.",
    ],
    avoid: [
      "Gastar E sin motivo cuando Yasuo puede entrar.",
      "Usar las tres cargas de R para iniciar sin visión del resto del equipo.",
    ],
  },
  meta: {
    version: "Ejemplo",
    catalogSource: "snapshot",
    model: "Demostración local",
    webSearchRequested: false,
    sources: [],
    generatedAt: "",
    warnings: [
      "Esta es una demostración escrita de Ahri vs. Yasuo. No fue generada por IA ni verificada para el parche actual.",
    ],
  },
};
