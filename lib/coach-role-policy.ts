import type { Role } from "./types";

/** Server-side generation guidance; no gameplay outcome is assumed from the role alone. */
const ROLE_POLICY: Record<Role, string> = {
  TOP: "TOP: conecta oleada e intercambios con presión lateral y cuándo agruparte. En peleas elige flanco, iniciación o protección según tu kit; no mandes a todos los tops a iniciar. No recomiendes Teleport si no está en tus hechizos.",
  JUNGLE:
    "JUNGLE: el rival es el jungla contrario, no un oponente permanente en línea. Los niveles 1–6 tratan limpieza, ruta inicial condicional, gank frente a seguir farmeando, invasión/contragank y objetivos con prioridad de líneas. No inventes lado del mapa, campamento inicial, ubicación, ruta rival ni tiempos de aparición. Si no hay visión o prioridad, ofrece intercambio de mapa o retirada. En peleas distingue iniciar, flanquear o proteger según el kit y conservar recursos para asegurar el objetivo.",
  MID: "MID: conecta oleada y presión de línea con acceso al río, rotaciones y objetivos sin regalar recursos. En peleas distingue control de zona, daño, captura o flanco según tu campeón; no todos los mids son asesinos ni deben iniciar.",
  ADC: "ADC: trata bot como dúo y prioriza recursos, ventanas coordinadas y compras. En peleas explica posición, amenaza que obliga a esperar y daño al objetivo alcanzable sin exponerte. No ordenes perseguir siempre al carry rival ni dependas de protección aliada no confirmada.",
  SUPPORT:
    "SUPPORT: trata bot como dúo; la presión, experiencia compartida y seguridad de tu pareja deciden cuándo salir. Los niveles 1–6 cubren intercambios coordinados, visión y rotación tras oleada o regreso seguro, no farm de un solo laner. Explica cuándo NO abandonar a tu ADC. En peleas decide iniciar, proteger o contrainiciar según el kit y las amenazas; no todos los soportes son tanques. No mandes poner visión a ciegas sin compañía.",
};

export function coachRolePolicy(role: Role) {
  return ROLE_POLICY[role];
}
