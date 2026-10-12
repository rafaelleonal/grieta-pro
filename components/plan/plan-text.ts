import { isCurrentCoachResult, isPartialCoachResult } from "@/lib/types";
import type { SavedCoachResult, CoachInput } from "@/lib/types";
import { coachBrief, MATCHUP_LABELS } from "@/lib/coach-presentation";
import { ROLE_FOCUS } from "@/lib/role-focus";
import { type Maps, PHASES, ROLE_LABELS, safeUrl } from "./shared";
export function planText(result: SavedCoachResult, maps: Maps, sample: boolean, input: CoachInput) {
  const names = (ids: string[]) => ids.map((id) => maps.items.get(id)?.name || id).join(", ");
  const plan = result.plan;
  const text = [
    sample ? "EJEMPLO LOCAL · SIN IA · SIN VERIFICAR" : "CONSEJOS DE PARTIDA",
    `${maps.champions.get(input.champion)?.name || input.champion} vs. ${maps.champions.get(input.enemy)?.name || input.enemy} · ${ROLE_LABELS[input.role]} · ${input.rank}`,
  ];
  const brief = coachBrief(result);
  const phases = PHASES.map((phase) => ({
    ...phase,
    label: phase.id === "linea" ? ROLE_FOCUS[input.role].early : phase.label,
  }));
  if (brief.priority) text.push(`TU PRIORIDAD · ${ROLE_LABELS[input.role]}: ${brief.priority}`);
  if (brief.teamfight)
    text.push(
      "TU PAPEL EN LAS PELEAS",
      `Antes: ${brief.teamfight.setup}`,
      `Tu trabajo: ${brief.teamfight.job}`,
      `Si no conviene pelear: ${brief.teamfight.fallback}`,
    );
  if (brief.matchup)
    text.push(
      `LECTURA DEL MATCHUP: ${MATCHUP_LABELS[brief.matchup.verdict]}. ${brief.matchup.reason} ${brief.matchup.condition} · Orientación táctica, no estadística.`,
    );
  if (brief.window) text.push(`TU VENTANA: ${brief.window.trigger} → ${brief.window.response}`);
  if (brief.avoid) text.push(`QUÉ EVITAR: ${brief.avoid}`);
  if (plan.build.starting.length || plan.build.core.length || plan.build.situational.length)
    text.push(
      "BUILD ORIENTATIVA",
      plan.build.label,
      `Inicio: ${names(plan.build.starting)}`,
      `Orden: ${names(plan.build.core)}`,
      ...plan.build.situational.map((item) => `${names([item.item])}: ${item.reason}`),
    );
  if (isPartialCoachResult(result)) {
    const partial = result.plan;

    text.push(...partial.levels.map((s) => `Nivel ${s.level} · ${s.cue}: ${s.text}`));
    for (const phase of phases)
      text.push(
        phase.label,
        ...(phase.id === "linea" ? [] : partial.phases[phase.id].map((s) => `${s.cue}: ${s.text}`)),
        ...partial.reactions[phase.id].map((r) => `${r.trigger}: ${r.response}`),
        ...(partial.avoid[phase.id] ? [`Evita: ${partial.avoid[phase.id]}`] : []),
      );
    text.push(
      ...partial.enemyKeys.map((k) => `${k.key} · ${k.name} · ${k.cooldown}: ${k.note}`),
      ...partial.compNotes.map((n) => `${n.title}: ${n.action}`),
    );
    if (partial.build.runes)
      text.push(
        `Runas: ${[partial.build.runes.primary.keystone, ...partial.build.runes.primary.minors, ...partial.build.runes.secondary.minors].map((id) => maps.runes.get(id)?.name || id).join(", ")}`,
        partial.build.runes.why,
      );
    if (partial.build.summoners)
      text.push(
        `Hechizos: ${partial.build.summoners.pick.map((id) => maps.summoners.get(id)?.name || id).join(" + ")}`,
        partial.build.summoners.why,
      );
    if (partial.build.skillOrder)
      text.push(
        `Habilidades: ${partial.build.skillOrder.first6.map((s) => s || "—").join(" → ")} · ${partial.build.skillOrder.max}`,
      );
  } else if (isCurrentCoachResult(result)) {
    const current = result.plan;
    const runeName = (id: string) => maps.runes.get(id)?.name || id;
    const spellNames = (ids: string[]) =>
      ids.map((id) => maps.summoners.get(id)?.name || id).join(" + ");
    const runes = current.build.runes;
    text.push(
      "SELECCIÓN DE CAMPEONES",
      `Primaria: ${maps.styles.get(runes.primary.style)?.name || runes.primary.style} · ${[runes.primary.keystone, ...runes.primary.minors].map(runeName).join(", ")}`,
      `Secundaria: ${maps.styles.get(runes.secondary.style)?.name || runes.secondary.style} · ${runes.secondary.minors.map(runeName).join(", ")}`,
      `Fragmentos: ${runes.shards.join(", ")}`,
      runes.why,
      `Hechizos: ${spellNames(current.build.summoners.pick)} · ${current.build.summoners.why}`,
      `Habilidades 1–6: ${current.build.skillOrder.first6.map((skill) => skill || "—").join(" → ")} · Máximo: ${current.build.skillOrder.max}`,
    );
    if (runes.alternative)
      text.push(
        `Runa alternativa: ${runeName(runes.alternative.keystone)} · ${runes.alternative.when} · ${runes.alternative.why}`,
      );
    if (current.build.summoners.alternative) {
      const alternative = current.build.summoners.alternative;
      text.push(
        `Hechizos alternativos: ${spellNames(alternative.pick)} · ${alternative.when} · ${alternative.why}`,
      );
    }
    text.push(
      "COMPOSICIÓN",
      ...current.composition.map(
        (member) =>
          `${member.team === "ally" ? "Aliado" : "Rival"}: ${maps.champions.get(member.champion)?.name || member.champion} · ${member.label}${member.note ? ` · ${member.note}` : ""}`,
      ),
      ...current.compNotes.map((note) => `${note.title}: ${note.action}`),
    );
    for (const phase of phases) {
      const steps = phase.id === "linea" ? current.levels : current.phases[phase.id];
      text.push(
        phase.label.toUpperCase(),
        ...steps.map(
          (step, index) =>
            `${"level" in step ? step.level : index + 1} · ${step.cue}: ${step.text}`,
        ),
        ...current.reactions[phase.id].map(
          (reaction) => `${reaction.trigger}: ${reaction.response}`,
        ),
        ...(current.build.nowByPhase[phase.id].length
          ? [`Compra en esta fase: ${names(current.build.nowByPhase[phase.id])}`]
          : []),
        `Evita: ${current.avoid[phase.id]}`,
      );
    }
    text.push(
      "CLAVES DEL RIVAL",
      ...current.enemyKeys.map(
        (ability) => `${ability.key} · ${ability.name} · ${ability.cooldown}: ${ability.note}`,
      ),
    );
  } else
    text.push(
      "PLAN GUARDADO EN FORMATO ANTERIOR",
      ...result.plan.levels.map((level) => `${level.level}: ${level.action}`),
      ...result.plan.mechanics.map((reaction) => `${reaction.trigger}: ${reaction.response}`),
      `Runas: ${result.plan.build.runes.join(", ")}`,
      `Hechizos: ${result.plan.build.summoners.join(", ")}`,
      `Habilidades: ${result.plan.build.skillOrder}`,
      ...result.plan.avoid.map((avoid) => `Evita: ${avoid}`),
    );
  text.push(
    "MAPA",
    ...plan.macro,
    ...result.meta.warnings,
    ...result.meta.sources
      .filter((source) => safeUrl(source.url))
      .map((source) => `${source.title}: ${source.url}`),
  );
  return text.join("\n\n");
}
