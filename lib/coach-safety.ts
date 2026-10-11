import { ApiError } from "./errors";

const INPUT_ERROR =
  "Usa este espacio solo para tu partida de League of Legends: campeón, rival, línea y dudas de juego. Quita instrucciones para cambiar el coach, código o enlaces.";
const OUTPUT_ERROR =
  "El coach devolvió una respuesta que no podemos mostrar. Vuelve a generar el consejo con el contexto de tu partida.";

/** Canonicalize for detection only; never replace the user's original game context. */
export function normalizeSafetyText(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\u00ad\u061c\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu, "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\r\n?/g, "\n");
}

// These deliberately target instruction/credential contexts, not game verbs such
// as "ignora el tanque", "ejecuta el combo", "cura" or "la clave para ganar".
const INSTRUCTION_ATTACKS: readonly RegExp[] = [
  /\b(?:ignore|disregard|override|forget|bypass|ignora(?:r)?|ignoren|omite|olvida|anula|sobrescribe|desobedece|saltate|haz\s+caso\s+omiso|no\s+(?:sigas|obedezcas))\b[^.!?]{0,100}\b(?:instructions?|instrucciones?|prompts?|system|sistema|developer|desarrollador|rules?|reglas?|restricciones?|guardrails?|politicas?)\b/i,
  /\b(?:system|developer|sistema|desarrollador)\s+(?:prompts?|messages?|mensajes?|instructions?|instrucciones?)\b|\b(?:prompts?|mensajes?|instrucciones?)\s+(?:de(?:l)?\s+)?(?:system|developer|sistema|desarrollador)\b/i,
  /\b(?:reveal|print|repeat|expose|dump|show|translate|summarize|revela|muestra|imprime|repite|expone|filtra|traduce|resume|dime|comparte)\b[^.!?\n]{0,90}\b(?:prompts?|instrucciones?\s+(?:internas|ocultas|originales)|hidden\s+instructions?|secrets?|secretos?\s+(?:del\s+sistema|internos|del\s+servidor)|(?:api|access|private)\s*(?:keys?|tokens?)|(?:claves?|tokens?|credenciales)\s+(?:de\s+(?:la\s+)?api|privad[ao]s?|del\s+servidor|de\s+acceso))\b/i,
  /\b(?:transcribe|reproduce|copia|repite|traduce|resume|muestra|copy|repeat|translate|summarize|show)\b[^.!?]{0,60}\b(?:mensaje|message|texto|text|contenido)\s+(?:inicial|original|initial|first|de\s+arriba|above|que\s+recibiste|you\s+received)\b/i,
  /\b(?:you\s+are\s+(?:now\s+)?chatgpt|eres\s+(?:ahora\s+)?chatgpt|(?:from\s+now\s+on|a\s+partir\s+de\s+ahora)\b[^.!?\n]{0,80}\b(?:you\s+are|act|eres|actua|comportate)|(?:olvida|deja|forget|stop)\b[^.!?\n]{0,35}\b(?:coach|coaching|entrenador))\b/i,
  /(?:\[\/?inst\]|\[\/?sys(?:tem)?\]|<<\/?sys>>|<\|(?:im_start|im_end|start_header_id|end_header_id|eot_id|begin_of_text|end_of_text)\|>)/i,
  /(?:^|\n)\s*(?:#{1,6}\s*)?(?:system|developer|assistant|sistema|desarrollador)\s*[:：]|["']?role["']?\s*[:=]\s*["']?(?:system|developer|assistant)\b/i,
  /\b(?:decode|decodifica|descifra|desencripta|interpreta)\b[^.!?\n]{0,80}\b(?:base\s*64|rot\s*13|hexadecimal|encoded\s+instructions?|instrucciones?\s+codificadas?)\b|\b(?:base\s*64|rot\s*13)\b[^.!?\n]{0,80}\b(?:instructions?|instrucciones?|execute|ejecuta|decode|decodifica)\b/i,
];

const UNSAFE_CONTENT: readonly RegExp[] = [
  // Reject control bytes explicitly; they are intentional security sentinels.
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u,
  // Plain advice does not need executable markup or links; citations have their
  // own validated structured field rather than being model-authored prose.
  /(?:https?|hxxps?|ftp)\s*:\s*\/{2}|\bwww\s*\.|\b(?:javascript|vbscript|file)\s*:|\bdata\s*:\s*(?:text|application)\//i,
  /<\s*\/?\s*[a-z][a-z\d:-]*(?:\s[^<>]*|\s*)\/?\s*>|\[[^\]\n]+\]\s*\(\s*[^)\s]+\s*\)/i,
  /\b(?:[a-z\d-]+\.)+(?:com|net|org|io|dev|app|xyz|example)\b(?:[/:?#]|\s|$)/i,
  /\b(?:sk-or-v1-[a-z\d_-]{8,}|sk-(?:proj-)?[a-z\d_-]{20,}|rgapi-[a-z\d-]{12,})\b|\b(?:openrouter_api_key|riot_api_key|coach_access_token)\b/i,
  /\b(?:api[_ -]?key|access[_ -]?token|secret[_ -]?key)\s*[:=]\s*["']?[^\s"']{8,}/i,
  /\bauthorization\s*:\s*bearer\s+\S+/i,
  /\b(?:process\.env|os\.environ|document\.cookie|localstorage\s*\.\s*getitem)\b|\bimport\s+os\b|```\s*(?:javascript|typescript|python|bash|sh|html|sql|js|ts)\b/i,
  /\b(?:codigo\s+(?:python|javascript|typescript|sql)|(?:python|javascript|typescript|sql)\s+code|(?:consulta|query)\s+sql|sql\s+(?:consulta|query))\b/i,
  /\b(?:select\s+(?:\*|[a-z_][\w, ]*)\s+from|insert\s+into|update\s+[a-z_]\w*\s+set|delete\s+from)\b/i,
];

// Explicit tasks from other domains are rejected. General words shared with LoL
// (oro, inversión en objetos, curación, economía, scripts del rival) remain valid.
const OUT_OF_SCOPE: readonly RegExp[] = [
  /\b(?:write|create|generate|build|implement|escribe|escribeme|crea|genera|programa|implementa|hazme|dame)\b[^.!?\n]{0,75}\b(?:codigo\s+(?:en|para)|(?:python|javascript|typescript|sql)\s+(?:code|script)|(?:code|script)\s+(?:in|for)|(?:un\s+)?(?:scraper|api\s+rest|sitio\s+web|pagina\s+web|aplicacion\s+web)|programa\s+en\s+(?:python|javascript|typescript))\b/i,
  /\b(?:write|draft|compose|escribe|escribeme|redacta|hazme|crea)\b[^.!?\n]{0,50}\b(?:email|e-mail|correo\s+electronico|carta\s+(?:para|a))\b|(?:^|\n)\s*(?:subject|asunto)\s*:/i,
  /\b(?:cuentame|cuenta|narra|inventate|inventa|escribe)\s+(?:me\s+)?(?:una?|la|el)\s+(?:historia|cuento|poema|novela)\b|\b(?:tell|write|invent|narrate)\s+(?:me\s+)?(?:a|the)\s+(?:story|poem|novel)\b|^\s*(?:habia\s+una\s+vez|once\s+upon\s+a\s+time)\b/i,
  /\b(?:receta\s+(?:de\s+)?(?:cocina|pizza|pasta|pastel|tarta|pan|pollo|sopa|comida)|(?:cooking|pancake|cake|pizza|pasta)\s+recipe|recipe\s+for\s+(?:pancakes?|cake|pizza|pasta)|diagnostico\s+medico|medical\s+diagnosis|consejo\s+(?:medico|financiero|legal)|(?:medical|financial|legal)\s+advice|declaracion\s+de\s+impuestos|tax\s+return)\b/i,
  /\b(?:prescribe|receta|recomienda|toma|take)\b[^.!?\n]{0,50}\b(?:medicamentos?|medication|antibioticos?|antibiotics?|ibuprofeno|ibuprofen|paracetamol)\b|\b(?:compra|invierte|invertir|buy|invest)\b[^.!?\n]{0,50}\b(?:bitcoin|criptomonedas?|crypto|stock\s+market|acciones\s+(?:de\s+(?:apple|tesla|amazon)|bursatiles))\b/i,
  /\b(?:actua|actuar|comportate|act|pretend)\b[^.!?\n]{0,40}\b(?:como|as)\s+(?:un\s+|a\s+)?(?:medico|doctor|abogado|lawyer|asesor\s+financiero|financial\s+advisor|chef|programador|programmer|desarrollador|developer)\b/i,
  /\b(?:crea|creame|dame|escribe|implementa|instala|usa|utiliza|configura|create|build|write|give|install|use|configure)\b[^.!?\n]{0,65}\b(?:aimbots?|map\s*hacks?|wall\s*hacks?|scripts?\s+(?:para|que|to)\s+(?:automatizar|esquivar|hacer\s+combos|jugar|automate|dodge)|bots?\s+(?:para|de|to)\s+(?:jugar|farmear|play|farm))\b/i,
  /\b(?:automatiza|automatizar|automate)\b[^.!?\n]{0,45}\b(?:combos?|esquivas?|partidas?|gameplay|dodg(?:e|ing)|farm(?:ear|ing)?|habilidades|abilities)\b|\b(?:hackea|hackear|hacking)\b[^.!?\n]{0,45}\b(?:juego|cuenta|cliente|game|account|client)\b/i,
];

function containsUnsafeText(text: string): boolean {
  const normalized = normalizeSafetyText(text);
  return [...INSTRUCTION_ATTACKS, ...UNSAFE_CONTENT, ...OUT_OF_SCOPE].some((pattern) =>
    pattern.test(normalized),
  );
}

/** Only inspect a bounded number of plausible tokens; do not execute decoded text. */
function containsEncodedAttack(text: string): boolean {
  const candidates =
    text
      .normalize("NFKC")
      .replace(/[\u00ad\u061c\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/gu, "")
      .match(/[A-Za-z\d+/_-]{24,}={0,2}/g)
      ?.slice(0, 32) ?? [];
  for (const candidate of candidates) {
    if (candidate.length > 4_096) continue;
    try {
      const base64 = candidate.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
      const binary = atob(padded);
      const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (containsUnsafeText(decoded)) return true;
    } catch {
      // Ordinary game labels and non-UTF-8 bytes are not encoded instructions.
    }
  }
  return false;
}

/** A conservative early filter, not a guarantee against all prompt injection. */
export function assertSafeInputText(text: string): void {
  if (containsUnsafeText(text) || containsEncodedAttack(text)) {
    throw new ApiError(400, INPUT_ERROR);
  }
}

/** Keep editable rejected text in memory, but never persist it as a saved draft. */
export function safeNotesForStorage(text: string): string {
  try {
    assertSafeInputText(text);
    return text;
  } catch {
    return "";
  }
}

/** Used after schema/context validation; never return the offending model text. */
export function assertSafeOutputText(text: string): void {
  if (containsUnsafeText(text) || containsEncodedAttack(text)) {
    throw new ApiError(502, OUTPUT_ERROR);
  }
}
