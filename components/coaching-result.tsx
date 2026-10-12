"use client";
import { useMemo } from "react";
import { ExternalLink, Info } from "lucide-react";
import { CoachBriefView } from "./coach-brief";
import { PlanDetails } from "./plan/plan-details";
import { PlanActions } from "./plan/plan-actions";
import { planText } from "./plan/plan-text";
import { catalogMaps, safeUrl } from "./plan/shared";
import { isPartialCoachResult } from "@/lib/types";
import type { Catalog, CoachInput, SavedCoachResult } from "@/lib/types";

type Props = {
  result: SavedCoachResult;
  catalog: Catalog;
  input: CoachInput;
  formOpen: boolean;
  ownerId?: string;
  sample: boolean;
  busy: boolean;
  followupError?: string;
  onFollowup: (message: string) => boolean;
};
export function CoachingResult({
  result,
  catalog,
  input,
  ownerId,
  sample,
  busy,
  followupError,
  onFollowup,
}: Props) {
  const maps = useMemo(() => catalogMaps(catalog), [catalog]);
  const sources = result.meta.sources.filter((s) => safeUrl(s.url));
  const invalid = isPartialCoachResult(result) ? result.meta.partial.invalid || [] : [];
  return (
    <section
      aria-label="Tu plan de partida"
      className="min-w-0 space-y-6 text-body [overflow-wrap:anywhere]"
    >
      {sample ? (
        <p className="rounded-md border border-warning-border bg-warning-bg px-4 py-3 text-small text-warning-text">
          Demostración escrita · sin IA · sin verificar para el parche actual.
        </p>
      ) : null}
      <CoachBriefView result={result} input={input} />
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-divider pt-4">
        <div>
          <h2 className="text-h3 font-medium">Tu plan, paso a paso</h2>
          <p className="mt-1 text-small text-neutral-400">Abre sólo lo que necesitas consultar.</p>
        </div>
        <PlanActions
          key={`${ownerId || "anonymous"}:${result.meta.generatedAt}`}
          text={() => planText(result, maps, sample, input)}
          busy={busy}
          error={followupError}
          onFollowup={onFollowup}
        />
      </div>
      {invalid.length ? (
        <p className="text-small text-warning-text">
          Algunos detalles no superaron la validación. Se muestran sólo los consejos disponibles.
        </p>
      ) : null}
      <PlanDetails result={result} input={input} maps={maps} />
      <details className="rounded-md border border-divider px-4">
        <summary className="min-h-11 cursor-pointer py-3 text-small text-neutral-400">
          Fuentes y alcance · Catálogo {result.meta.version}
        </summary>
        <div className="space-y-3 pb-4 text-small text-neutral-400">
          <p className="flex items-start gap-2">
            <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            Lectura táctica orientativa. No es una estadística de victorias ni garantiza el
            resultado de la partida.
          </p>
          {result.meta.warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
          {sources.length ? (
            sources.map((s, i) => (
              <a
                key={i}
                href={safeUrl(s.url)!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center gap-2 text-accent-300 underline underline-offset-4"
              >
                <ExternalLink size={16} aria-hidden="true" />
                {s.title}
              </a>
            ))
          ) : (
            <p>Este plan no incluye fuentes web citadas.</p>
          )}
        </div>
      </details>
      <p className="text-center text-xs text-neutral-400">Elociencia · No avalado por Riot Games</p>
    </section>
  );
}
