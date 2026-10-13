import { Crosshair, ShieldAlert, Target, Swords } from "lucide-react";
import { coachBrief, MATCHUP_LABELS } from "@/lib/coach-presentation";
import { cn } from "@/components/ui/cn";
import type { CoachBrief, CoachInput, SavedCoachResult } from "@/lib/types";
import { ROLE_FOCUS } from "@/lib/role-focus";

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
  return (
    <section
      className="min-w-0 space-y-5 rounded-lg border border-divider bg-surface p-4 md:p-5"
      aria-label="Tu plan de inicio"
    >
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-h3 font-semibold">
          <Target size={18} aria-hidden="true" /> Plan de inicio · {ROLE_FOCUS[input.role].name}
        </h2>
        <p className="max-w-prose text-body font-medium leading-relaxed text-neutral-100">
          {brief.priority ||
            (pending ? "Preparando tu primera decisión…" : "No se incluyó una prioridad de juego.")}
        </p>
      </div>
      <div className="space-y-2 border-t border-divider pt-4">
        <h3 className="text-xs text-neutral-400">{ROLE_FOCUS[input.role].matchup} · Orientativo</h3>
        <p
          className={cn(
            "flex items-center gap-2 text-h3 font-semibold",
            read?.verdict === "enemy_counter"
              ? "text-warning-text"
              : read?.verdict === "favored" || read?.verdict === "you_counter"
                ? "text-success-text"
                : "text-neutral-100",
          )}
        >
          <Swords size={18} className="shrink-0" aria-hidden="true" />
          {read ? MATCHUP_LABELS[read.verdict] : pending ? "Leyendo el matchup…" : "Sin valoración"}
        </p>
        {read ? (
          <>
            <p className="max-w-prose text-small leading-relaxed text-neutral-200">{read.reason}</p>
            <p className="max-w-prose text-small leading-relaxed text-neutral-400">
              {read.condition}
            </p>
          </>
        ) : null}
      </div>
      {(!pending || brief.window) && (
        <div className="space-y-2 border-t border-divider pt-4">
          <h3 className="flex items-center gap-2 font-semibold">
            <Crosshair size={17} aria-hidden="true" /> Cuándo actuar
          </h3>
          {brief.window ? (
            <>
              <p className="text-small font-medium">{brief.window.trigger}</p>
              <p className="max-w-prose text-small leading-relaxed text-neutral-300">
                {brief.window.response}
              </p>
            </>
          ) : (
            <p className="text-small text-neutral-400">No se incluyó una ventana de juego.</p>
          )}
        </div>
      )}
      {(!pending || brief.avoid) && (
        <div className="space-y-2 rounded-md border border-warning-border bg-warning-bg/30 p-3">
          <h3 className="flex items-center gap-2 font-semibold text-warning-text">
            <ShieldAlert size={17} aria-hidden="true" /> Evita
          </h3>
          <p className="max-w-prose text-small leading-relaxed text-neutral-200">
            {brief.avoid || "No se incluyó un riesgo concreto."}
          </p>
        </div>
      )}
    </section>
  );
}
