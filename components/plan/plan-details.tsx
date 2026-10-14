import { TeamfightView } from "./teamfight-view";
import { coachBrief } from "@/lib/coach-presentation";
import { Layers, Crosshair, Gem, Map, Users } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { ROLE_FOCUS } from "@/lib/role-focus";
import type { CoachInput, SavedCoachResult } from "@/lib/types";
import { isCurrentCoachResult, isPartialCoachResult } from "@/lib/types";
import { LoadoutDetails } from "./loadout-details";
import { Advice, PHASES, PlanSection, Portrait, type Maps } from "./shared";

export function PlanDetails({
  result,
  input,
  maps,
}: {
  result: SavedCoachResult;
  input: CoachInput;
  maps: Maps;
}) {
  const modern = isCurrentCoachResult(result) || isPartialCoachResult(result) ? result.plan : null;
  const focus = ROLE_FOCUS[input.role];
  const phases = PHASES.map((phase) => ({
    ...phase,
    label: phase.id === "linea" ? focus.early : phase.label,
  }));
  const levels = result.plan.levels.map((step) =>
    "action" in step ? { level: step.level, cue: "", text: step.action, edge: "par" } : step,
  );
  const reactions = modern
    ? phases.map((p) => ({ ...p, entries: modern.reactions[p.id] }))
    : [
        {
          id: "linea",
          label: focus.early,
          entries: "mechanics" in result.plan ? result.plan.mechanics : [],
        },
      ];
  const teams = [
    {
      label: "Tu equipo",
      ids: [...new Set([input.champion, input.allyDuo, ...input.allies])].filter(
        (id): id is string => Boolean(id),
      ),
    },
    {
      label: "Rivales",
      ids: [...new Set([input.enemy, input.enemyDuo, ...input.enemies])].filter(
        (id): id is string => Boolean(id),
      ),
    },
  ];
  return (
    <div className="space-y-4">
      <PlanSection
        id="plan-levels"
        icon={Layers}
        title={
          input.role === "JUNGLE"
            ? "Primeras rutas · niveles 1–6"
            : input.role === "SUPPORT"
              ? "Dúo y salidas · niveles 1–6"
              : "Niveles 1–6"
        }
        hint={levels.length ? focus.levels : "Sin consejos de niveles en esta respuesta"}
      >
        <ol className="grid gap-4 xl:grid-cols-2">
          {levels.map((step) => (
            <li
              key={step.level}
              className="flex items-start gap-4 rounded-md border border-divider bg-bg p-5"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-md border border-divider font-medium text-accent-200">
                {step.level}
              </span>
              <div className="min-w-0">
                <h4 className="text-h3 font-semibold">{step.cue || `Nivel ${step.level}`}</h4>
                {"skill" in step && step.skill ? (
                  <p className="my-3 inline-flex rounded-sm bg-accent-900 px-2 py-1 text-small font-semibold text-accent-200">
                    Aprende o mejora {step.skill}
                  </p>
                ) : null}
                {"champions" in step && step.champions?.length ? (
                  <p className="mt-1 text-xs text-neutral-400">
                    {step.champions.map((id) => maps.champions.get(id)?.name || id).join(" · ")}
                  </p>
                ) : null}
                <p className="mt-3 text-body leading-relaxed text-neutral-200">{step.text}</p>
                <span
                  className={cn(
                    "mt-4 inline-flex rounded-sm border px-2 py-1 text-xs font-medium",
                    step.edge === "tu"
                      ? "border-success-border bg-success-bg text-success-text"
                      : step.edge === "ojo"
                        ? "border-warning-border bg-warning-bg text-warning-text"
                        : "border-divider text-neutral-400",
                  )}
                >
                  {step.edge === "tu"
                    ? "Ventana a tu favor"
                    : step.edge === "ojo"
                      ? "Juega con cuidado"
                      : "Según el contexto"}
                </span>
              </div>
            </li>
          ))}
        </ol>
        {!levels.length ? (
          <p className="text-neutral-400">No se incluyeron consejos válidos para estos niveles.</p>
        ) : null}
      </PlanSection>
      <PlanSection id="plan-reactions" icon={Crosshair} title="Cómo reaccionar" hint={focus.early}>
        {reactions.map((phase) =>
          phase.entries.length ? (
            <div key={phase.id} className="space-y-4">
              <h4 className="text-small text-accent-300">{phase.label}</h4>
              {phase.entries.map((r, i) => (
                <Advice key={`${phase.id}-${i}`} title={r.trigger}>
                  {r.response}
                </Advice>
              ))}
            </div>
          ) : null,
        )}
        {!reactions.some((p) => p.entries.length) ? (
          <p className="text-neutral-400">No se incluyeron reacciones válidas.</p>
        ) : null}
        {modern?.enemyKeys.length ? (
          <div className="space-y-3 border-t border-divider pt-4">
            <h4 className="font-medium">Habilidades del rival</h4>
            {modern.enemyKeys.map((k) => (
              <Advice key={k.key} title={`${k.key} · ${k.name} · ${k.cooldown}`}>
                {k.note}
              </Advice>
            ))}
          </div>
        ) : null}
        {modern
          ? phases.map((p) =>
              modern.avoid[p.id] ? (
                <Advice key={p.id} title={`Evita en ${p.label.toLowerCase()}`}>
                  {modern.avoid[p.id]}
                </Advice>
              ) : null,
            )
          : Array.isArray(result.plan.avoid)
            ? result.plan.avoid.map((a, i) => (
                <Advice key={i} title="Evita">
                  {a}
                </Advice>
              ))
            : null}
      </PlanSection>
      <PlanSection
        id="plan-build"
        icon={Gem}
        title="Preparación en detalle"
        hint="Motivos, alternativas y orden de habilidades"
      >
        <LoadoutDetails build={result.plan.build} maps={maps} />
      </PlanSection>
      <PlanSection
        id="plan-map"
        icon={Map}
        title="Mapa y peleas"
        hint="Rotaciones, objetivos y decisiones de equipo"
      >
        <TeamfightView plan={coachBrief(result).teamfight} input={input} />
        {modern
          ? (["mid", "late"] as const).map((phase) =>
              modern.phases[phase].length ? (
                <div key={phase} className="space-y-3">
                  <h4 className="text-small text-accent-300">
                    {phase === "mid" ? "Mid game" : "Late game"}
                  </h4>
                  {modern.phases[phase].map((s, i) => (
                    <Advice key={i} title={s.cue}>
                      {s.text}
                    </Advice>
                  ))}
                </div>
              ) : null,
            )
          : null}
        <ul className="list-disc space-y-3 pl-5 text-neutral-300">
          {result.plan.macro.map((text, i) => (
            <li key={i}>{text}</li>
          ))}
        </ul>
        {!result.plan.macro.length && !modern?.phases.mid.length && !modern?.phases.late.length ? (
          <p className="text-neutral-400">No se incluyeron decisiones de mapa.</p>
        ) : null}
        {modern?.compNotes.map((n, i) => (
          <Advice key={i} title={n.title}>
            {n.action}
          </Advice>
        ))}
      </PlanSection>
      {teams.some((t) => t.ids.length > 1) || modern?.composition.some((c) => c.note) ? (
        <PlanSection
          icon={Users}
          title="Composición usada"
          hint="Sólo los campeones que incluiste en este análisis"
        >
          <div className="grid gap-5 xl:grid-cols-2">
            {teams.map((team) => (
              <div key={team.label}>
                <h4 className="mb-3 text-small text-neutral-400">{team.label}</h4>
                <ul className="space-y-3">
                  {team.ids.map((id) => (
                    <li key={id} className="flex items-center gap-3">
                      <Portrait champion={maps.champions.get(id)} />
                      <span>
                        {maps.champions.get(id)?.name || id}
                        {modern?.composition
                          .filter((c) => c.champion === id)
                          .map((c) => (
                            <span
                              key={`${c.team}-${c.champion}`}
                              className="block text-small text-neutral-400"
                            >
                              {c.label}
                              {c.note ? ` · ${c.note}` : ""}
                            </span>
                          ))}
                      </span>
                    </li>
                  ))}
                </ul>
                {team.ids.length < 5 ? (
                  <p className="mt-3 text-small text-neutral-400">
                    {5 - team.ids.length} sin especificar
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </PlanSection>
      ) : null}
    </div>
  );
}
