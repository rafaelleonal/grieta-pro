"use client";
import { useMemo } from "react";
import { Preparation } from "@/components/plan/preparation";
import { catalogMaps } from "@/components/plan/shared";
import { Button, Spinner } from "@/components/ui/button";
import type { Catalog, CoachInput, CoachPreparation } from "@/lib/types";

/** Show only validated build choices while the same request finishes. */
export function GeneratingScreen({
  input,
  catalog,
  onCancel,
  preparation,
}: {
  input: CoachInput;
  catalog: Catalog | null;
  onCancel: () => void;
  preparation?: CoachPreparation | null;
}) {
  const maps = useMemo(() => (catalog ? catalogMaps(catalog) : null), [catalog]);
  const name = (id: string) => maps?.champions.get(id)?.name || id;
  return (
    <section className="mx-auto flex w-full flex-col gap-4 px-4 py-5 md:px-7 md:py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h3 font-medium">
            {name(input.champion)} vs. {name(input.enemy)}
          </h1>
          <p role="status" className="mt-1 flex items-center gap-2 text-small text-neutral-400">
            <Spinner className="size-3.5" />
            {preparation?.runes
              ? "Completando tus compras…"
              : "Preparando build, hechizos y runas…"}
          </p>
        </div>
        <Button onClick={onCancel}>Cancelar</Button>
      </header>
      <div className="grid items-start gap-4 md:grid-cols-2">
        {maps ? (
          <Preparation build={preparation} maps={maps} pending />
        ) : (
          <p role="status">Cargando catálogo…</p>
        )}
      </div>
      <p className="text-xs text-neutral-400">
        Avance provisional. Se guarda al terminar. Cancelar puede consumir cuota.
      </p>
    </section>
  );
}
