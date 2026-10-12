import { Crosshair, ShieldAlert, Target, Scale, Swords } from "lucide-react";
import { coachBrief, MATCHUP_LABELS } from "@/lib/coach-presentation";
import { cn } from "@/components/ui/cn";
import type { CoachBrief, CoachInput, SavedCoachResult } from "@/lib/types";
import { ROLE_FOCUS } from "@/lib/role-focus";
import { TeamfightView } from "./plan/teamfight-view";

export function CoachBriefView({ result, input }: { result: SavedCoachResult; input: CoachInput }) {
  return <CoachBriefContent brief={coachBrief(result)} input={input} />;
}

export function CoachBriefContent({
  brief,
  input,
  pending = false,
}: {
  brief: CoachBrief;
  input: CoachInput;
  pending?: boolean;
}) {
  const read = brief.matchup;
  const focus = ROLE_FOCUS[input.role];
  return (
    <div className="space-y-5 md:space-y-6" aria-label="Tus primeras decisiones">
      <section className="rounded-lg border border-accent-600 bg-accent-900/60 p-5 md:p-6">
        <h2 className="mb-4 flex items-center gap-3 text-h3 font-semibold text-accent-200">
          <Target size={18} aria-hidden="true" /> Tu prioridad · {focus.name}
        </h2>
        <p className="max-w-prose text-h3 font-medium leading-relaxed text-neutral-100">
          {brief.priority || "Esta respuesta no incluyó una prioridad de juego."}
        </p>
      </section>
      <section
        className="rounded-lg border border-divider bg-surface p-5 md:p-6"
        aria-labelledby="matchup-reading"
      >
        <div className="mb-4 flex items-center gap-3 text-h3 font-semibold text-neutral-200">
          <Scale size={18} aria-hidden="true" />
          <h2 id="matchup-reading">{focus.matchup}</h2>
          <span className="ml-auto shrink-0 rounded-full border border-divider px-2.5 py-1 text-xs font-normal text-neutral-400">
            Orientativa
          </span>
        </div>
        <p
          className={cn(
            "flex items-start gap-3 text-h2 font-semibold text-pretty md:text-h1",
            read?.verdict === "enemy_counter"
              ? "text-warning-text"
              : read?.verdict === "favored" || read?.verdict === "you_counter"
                ? "text-success-text"
                : "text-accent-200",
          )}
        >
          <Swords size={22} aria-hidden="true" className="mt-0.5 shrink-0" />
          {read ? MATCHUP_LABELS[read.verdict] : "Este plan no incluye una valoración"}
        </p>
        <p className="mt-4 max-w-prose text-body leading-relaxed text-neutral-200">
          {read?.reason ||
            "Puedes consultar sus consejos. La lectura del matchup estará disponible en los nuevos análisis que la incluyan."}
        </p>
        {read ? (
          <p className="mt-5 max-w-prose border-t border-divider pt-4 text-small leading-relaxed text-neutral-300">
            <strong className="font-medium text-neutral-300">Qué puede cambiarlo: </strong>
            {read.condition}
          </p>
        ) : null}
      </section>
      {(!pending || brief.teamfight) && <TeamfightView plan={brief.teamfight} input={input} />}
      <div className="grid gap-5 xl:grid-cols-2">
        {(!pending || brief.window) && (
          <section className="rounded-lg border border-divider p-5">
            <h2 className="mb-4 flex items-center gap-3 text-h3 font-semibold text-accent-200">
              <Crosshair size={18} aria-hidden="true" />
              Cuándo actuar
            </h2>
            {brief.window ? (
              <>
                <p className="font-semibold text-neutral-100">{brief.window.trigger}</p>
                <p className="mt-3 text-body leading-relaxed text-neutral-200">
                  {brief.window.response}
                </p>
              </>
            ) : (
              <p className="text-small text-neutral-400">No se incluyó una ventana de juego.</p>
            )}
          </section>
        )}
        {(!pending || brief.avoid) && (
          <section className="rounded-lg border border-warning-border bg-warning-bg/30 p-5">
            <h2 className="mb-4 flex items-center gap-3 text-h3 font-semibold text-warning-text">
              <ShieldAlert size={18} aria-hidden="true" />
              Qué evitar
            </h2>
            <p className="text-body leading-relaxed text-neutral-200">
              {brief.avoid || "Esta respuesta no incluyó un error a evitar."}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
