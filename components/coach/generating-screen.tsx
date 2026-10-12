"use client";

import { Check } from "lucide-react";
import { Mascot } from "@/components/brand";
import { Button, Spinner } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/feedback";
import { cn } from "@/components/ui/cn";
import { roleName } from "@/lib/coach-draft";
import type { Catalog, CoachInput } from "@/lib/types";

type StepState = "done" | "active" | "pending";

/**
 * Generando plan. Los dos primeros pasos ya ocurrieron en el cliente (selección y
 * catálogo); el servidor escribe y valida el plan. Cancelar no garantiza que la
 * consulta sea gratuita: si ya se envió, puede contar en el consumo.
 */
export function GeneratingScreen({
  input,
  catalog,
  onCancel,
}: {
  input: CoachInput;
  catalog: Catalog | null;
  onCancel: () => void;
}) {
  const name = (id: string) => catalog?.champions.find((entry) => entry.id === id)?.name || id;
  const steps: { label: string; state: StepState }[] = [
    { label: "Validar selección", state: "done" },
    { label: `Catálogo Riot ${catalog?.version || ""}`.trim(), state: "done" },
    { label: "Escribir el plan", state: "active" },
    { label: "Revisar coherencia", state: "pending" },
  ];
  return (
    <section
      aria-live="polite"
      aria-busy="true"
      className="flex flex-1 flex-col gap-5 px-4 py-5 md:px-7 md:py-7"
    >
      <div className="flex flex-col gap-5 rounded-lg bg-surface p-5 md:p-7">
        <header className="flex flex-wrap items-start gap-4">
          <Mascot size={64} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-overline font-medium uppercase text-accent-300">
              — {name(input.champion)} vs {name(input.enemy)} · {roleName(input.role)} ·{" "}
              {input.rank}
            </span>
            <h1 className="text-h1 font-medium">Preparando tu plan…</h1>
            <p className="text-small text-neutral-400 md:text-body">
              Suele tardar entre 15 y 60 segundos. Puedes seguir en otra pestaña.
            </p>
          </div>
          <div className="flex w-full flex-col items-stretch gap-1.5 sm:w-auto sm:items-end">
            <Button onClick={onCancel}>Cancelar</Button>
            <p className="max-w-64 text-xs text-neutral-400 sm:text-right">
              Si cancelas ahora, la consulta ya enviada puede contar en tu consumo.
            </p>
          </div>
        </header>

        <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {steps.map((step) => (
            <li
              key={step.label}
              className={cn(
                "flex flex-col gap-2 rounded-control bg-bg p-4 ring-1 ring-inset",
                step.state === "active" ? "bg-accent-900/60 ring-accent" : "ring-transparent",
              )}
            >
              <span
                className={cn(
                  "inline-flex items-center gap-2 text-xs",
                  step.state === "done" && "text-success-text",
                  step.state === "active" && "text-accent-200",
                  step.state === "pending" && "text-neutral-400",
                )}
              >
                {step.state === "done" ? (
                  <Check size={14} aria-hidden="true" />
                ) : step.state === "active" ? (
                  <Spinner className="size-3.5" />
                ) : null}
                {step.state === "done"
                  ? "Hecho"
                  : step.state === "active"
                    ? "En curso"
                    : "Pendiente"}
              </span>
              <strong className="text-sm font-medium">{step.label}</strong>
              <span className="h-1 overflow-hidden rounded-full bg-neutral-800">
                <span
                  className={cn(
                    "block h-full rounded-full",
                    step.state === "done" && "w-full bg-success",
                    step.state === "active" && "w-3/5 bg-accent motion-safe:animate-pulse",
                    step.state === "pending" && "w-0",
                  )}
                />
              </span>
            </li>
          ))}
        </ol>

        <div aria-hidden="true" className="grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((card) => (
            <div key={card} className="flex min-h-40 flex-col gap-3 rounded-lg bg-bg p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="size-5" />
                <Skeleton className="h-4 w-36" />
              </div>
              <Skeleton className="w-3/4" />
              <Skeleton className="w-5/6" />
              <Skeleton className="w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
