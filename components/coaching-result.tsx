"use client";
import { useMemo } from "react";
import { ExternalLink, Info } from "lucide-react";
import { ItemDetails } from "./plan/item-details";
import { Preparation } from "./plan/preparation";
import { SkillOrder } from "./plan/skill-order";
import { PlanActions } from "./plan/plan-actions";
import { planText } from "./plan/plan-text";
import { catalogMaps, safeUrl } from "./plan/shared";
import type { Catalog, CoachInput, SavedCoachResult } from "@/lib/types";

type Props = {
  result: SavedCoachResult;
  catalog: Catalog;
  input: CoachInput;
  ownerId?: string;
  sample: boolean;
};
export function CoachingResult({ result, catalog, input, ownerId, sample }: Props) {
  const maps = useMemo(() => catalogMaps(catalog), [catalog]);
  const sources = result.meta.sources.filter((s) => safeUrl(s.url));
  const invalid =
    "partial" in result.meta
      ? (result.meta.partial?.invalid || []).filter((section) =>
          ["items", "runes", "summoners", "skillOrder"].includes(section),
        )
      : [];
  return (
    <section
      aria-label="Tu build recomendada"
      className="min-w-0 space-y-6 text-body [overflow-wrap:anywhere]"
    >
      {sample ? (
        <p className="rounded-md border border-warning-border bg-warning-bg px-4 py-3 text-small text-warning-text">
          Demostración escrita · sin IA · sin verificar para el parche actual.
        </p>
      ) : null}
      <div className="grid items-start gap-4 md:grid-cols-2">
        <Preparation build={result.plan.build} maps={maps} />
        <section
          aria-label="Build recomendada"
          className="min-w-0 space-y-4 rounded-lg border border-divider bg-surface p-4 md:p-5"
        >
          <SkillOrder order={result.plan.build.skillOrder} champion={input.champion} />
          <ItemDetails build={result.plan.build} maps={maps} />
        </section>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-divider pt-4">
        <PlanActions
          key={`${ownerId || "anonymous"}:${result.meta.generatedAt}`}
          text={() => planText(result, maps, sample, input)}
        />
      </div>
      {invalid.length ? (
        <p className="text-small text-warning-text">
          Algunas elecciones no superaron la validación. Se muestran las disponibles.
        </p>
      ) : null}
      <details className="rounded-md border border-divider px-4">
        <summary className="min-h-11 cursor-pointer py-3 text-small text-neutral-400">
          Fuentes y alcance · Catálogo {result.meta.version}
        </summary>
        <div className="space-y-3 pb-4 text-small text-neutral-400">
          <p className="flex items-start gap-2">
            <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            Recomendación orientativa. No es una build óptima acreditada ni garantiza victorias.
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
