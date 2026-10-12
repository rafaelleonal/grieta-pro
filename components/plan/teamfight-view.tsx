import { Users } from "lucide-react";
import type { CoachBrief, CoachInput } from "@/lib/types";

export function TeamfightView({
  plan,
  input,
}: {
  plan: CoachBrief["teamfight"];
  input: CoachInput;
}) {
  if (!plan)
    return (
      <p className="text-small text-neutral-400">
        Este plan no incluye una lectura de peleas de equipo.
      </p>
    );
  const allies = new Set([input.champion, input.allyDuo, ...input.allies].filter(Boolean)).size;
  const enemies = new Set([input.enemy, input.enemyDuo, ...input.enemies].filter(Boolean)).size;
  return (
    <section
      className="rounded-lg border border-accent-800 bg-surface p-5 md:p-6"
      aria-labelledby="teamfight-title"
    >
      <h2
        id="teamfight-title"
        className="flex items-center gap-3 text-h3 font-semibold text-accent-200"
      >
        <Users size={20} aria-hidden="true" /> Tu papel en las peleas
      </h2>
      {allies < 5 || enemies < 5 ? (
        <p className="mt-2 text-xs text-neutral-400">
          Composición parcial · {allies}/5 aliados · {enemies}/5 rivales
        </p>
      ) : null}
      <dl className="mt-5 grid gap-5 xl:grid-cols-3">
        {[
          ["Antes", plan.setup],
          ["Tu trabajo", plan.job],
          ["Si no conviene pelear", plan.fallback],
        ].map(([label, text]) => (
          <div key={label} className="space-y-2">
            <dt className="font-semibold text-neutral-100">{label}</dt>
            <dd className="text-body leading-relaxed text-neutral-200">{text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
