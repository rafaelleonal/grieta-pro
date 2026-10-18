import type { SavedCoachResult, CoachInput } from "@/lib/types";
import { resolveEntry } from "./catalog-art";
import { type Maps, ROLE_LABELS, safeUrl } from "./shared";

/** Export only the stored build choices, including when reopening a historical plan. */
export function planText(result: SavedCoachResult, maps: Maps, sample: boolean, input: CoachInput) {
  const names = (ids: string[]) =>
    ids.map((id) => resolveEntry(maps.items, id)?.name || id).join(", ");
  const { build } = result.plan;
  const spellNames = (ids: string[]) =>
    ids.map((id) => resolveEntry(maps.summoners, id)?.name || id).join(" + ");
  const runeName = (id: string) => resolveEntry(maps.runes, id)?.name || id;
  const text = [
    sample ? "DEMOSTRACIÓN LOCAL · SIN IA · SIN VERIFICAR" : "BUILD RECOMENDADA",
    `${maps.champions.get(input.champion)?.name || input.champion} vs. ${maps.champions.get(input.enemy)?.name || input.enemy} · ${ROLE_LABELS[input.role]} · ${input.rank}`,
  ];
  const summoners = build.summoners;
  if (Array.isArray(summoners)) {
    if (summoners.length) text.push(`Hechizos: ${spellNames(summoners)}`);
  } else if (summoners) text.push(`Hechizos: ${spellNames(summoners.pick)}`, summoners.why);
  if (build.starting.length) text.push(`Compra inicial: ${names(build.starting)}`);
  const runes = build.runes;
  if (Array.isArray(runes)) {
    if (runes.length) text.push(`Runas: ${runes.map(runeName).join(", ")}`);
  } else if (runes) {
    text.push(
      `Primaria: ${resolveEntry(maps.styles, runes.primary.style)?.name || runes.primary.style} · ${[runes.primary.keystone, ...runes.primary.minors].map(runeName).join(", ")}`,
      `Secundaria: ${resolveEntry(maps.styles, runes.secondary.style)?.name || runes.secondary.style} · ${runes.secondary.minors.map(runeName).join(", ")}`,
      `Fragmentos: ${runes.shards.join(", ")}`,
    );
  }
  const skillOrder = build.skillOrder;
  if (skillOrder && typeof skillOrder !== "string") {
    const attributes =
      input.champion === "Aphelios" && skillOrder.first6.every((skill) => skill === null);
    text.push(
      attributes
        ? `Habilidades 1–6: Mejora atributos · ${skillOrder.max}`
        : `Habilidades 1–6: ${skillOrder.first6.map((skill, index) => `Nivel ${index + 1}: ${skill || "sin dato"}`).join(" → ")}`,
    );
  }
  if (build.core.length)
    text.push(
      `Compras en orden: ${build.core.map((id, index) => `${index + 1}. ${names([id])}`).join(" → ")}`,
    );
  if (build.situational.length)
    text.push(
      "SITUACIONALES",
      ...build.situational.map((item) => `${names([item.item])}: ${item.reason}`),
    );
  text.push(
    `Recomendación orientativa · Catálogo ${result.meta.version}`,
    ...result.meta.warnings,
    ...result.meta.sources
      .filter((source) => safeUrl(source.url))
      .map((source) => `${source.title}: ${source.url}`),
    "Elociencia · No avalado por Riot Games",
  );
  return text.filter(Boolean).join("\n\n");
}
