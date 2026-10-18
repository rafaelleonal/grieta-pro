"use client";

import Image from "next/image";
import { AlertCircle, Pencil } from "lucide-react";
import { CoachingResult } from "@/components/coaching-result";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Tag } from "@/components/ui/tag";
import { roleName } from "@/lib/coach-draft";
import type { CoachWorkspace } from "@/components/hooks/use-coach-workspace";

/** Build generada o recuperada, con la opción de editar la selección. */
export function PlanScreen({ ws }: { ws: CoachWorkspace }) {
  const { result, resultInput, catalog, input } = ws;
  if (!result || !resultInput || !catalog) return null;
  const champion = catalog.champions.find((entry) => entry.id === resultInput.champion);
  const enemy = catalog.champions.find((entry) => entry.id === resultInput.enemy);
  const changed = JSON.stringify(resultInput) !== JSON.stringify(input);

  return (
    <div className="mx-auto flex w-full flex-1 flex-col gap-5 px-4 py-5 md:px-7 md:py-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {[champion, enemy].map((entry, index) =>
            entry ? (
              <Image
                key={entry.id}
                src={entry.image}
                alt={index === 0 ? `Tú: ${entry.name}` : `Rival: ${entry.name}`}
                width={36}
                height={36}
                unoptimized
                className="rounded-md ring-1 ring-neutral-700"
              />
            ) : null,
          )}
          <h1 className="text-h3">
            <strong className="font-medium">{champion?.name || resultInput.champion}</strong>{" "}
            <span className="text-neutral-400">vs.</span>{" "}
            <strong className="font-medium">{enemy?.name || resultInput.enemy}</strong>
          </h1>
          <span className="text-xs text-neutral-400">
            {roleName(resultInput.role)} · {resultInput.rank}
          </span>
          {ws.sample ? <Tag tone="warning">Ejemplo</Tag> : null}
        </div>
        <Button className="ml-auto" onClick={() => ws.setEditing(true)}>
          <Pencil size={15} aria-hidden="true" />
          Editar partida
        </Button>
      </div>
      {changed && !ws.busy ? (
        <Alert tone="warning" icon={<AlertCircle size={18} />}>
          La selección cambió. La build visible corresponde a{" "}
          {champion?.name || resultInput.champion} vs. {enemy?.name || resultInput.enemy}; genera
          una nueva para actualizarla.
        </Alert>
      ) : null}
      <CoachingResult
        key={`${result.meta.generatedAt}-${ws.sample}`}
        result={result}
        catalog={catalog}
        input={resultInput}
        ownerId={ws.session.owner || undefined}
        sample={ws.sample}
      />
    </div>
  );
}
