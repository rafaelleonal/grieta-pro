"use client";

import { useState } from "react";
import { ArrowRight, RotateCcw, Trash2 } from "lucide-react";
import { splashUrl } from "@/components/coach/slots";
import { Button } from "@/components/ui/button";
import { Overline } from "@/components/ui/feedback";
import { roleName } from "@/lib/coach-draft";
import { modelLabel } from "@/lib/model-labels";
import type { Champion } from "@/lib/types";
import type { HistoryRecord } from "@/lib/types";
import { recordSummary } from "./session-utils";

export function SessionPreview({
  record,
  champions,
  deleting,
  onOpen,
  onReprepare,
  onDelete,
}: {
  record: HistoryRecord;
  champions: Champion[];
  deleting: boolean;
  onOpen: () => void;
  onReprepare: () => void;
  onDelete: () => Promise<boolean>;
}) {
  const [confirm, setConfirm] = useState(false);
  const name = (id: string) => champions.find((entry) => entry.id === id)?.name || id;
  const meta = record.result.meta;
  const date = new Date(record.createdAt);
  return (
    <aside
      aria-label="Vista previa de la sesión"
      className="flex flex-col gap-4 rounded-lg bg-surface p-5"
    >
      <div
        aria-hidden="true"
        className="relative grid h-32 grid-cols-2 overflow-hidden rounded-control"
      >
        {[record.input.champion, record.input.enemy].map((id) => (
          <span
            key={id}
            className="bg-cover bg-center opacity-70"
            style={{ backgroundImage: `url(${splashUrl(id)})` }}
          />
        ))}
        <span className="absolute top-1/2 left-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-bg text-sm font-semibold italic text-accent-200 ring-2 ring-accent-700">
          VS
        </span>
      </div>
      <Overline>
        {date.toLocaleDateString("es-MX", { day: "numeric", month: "short" })} ·{" "}
        {date.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} ·{" "}
        {roleName(record.input.role)} · {record.input.rank}
      </Overline>
      <h2 className="text-h2 font-medium">
        {name(record.input.champion)} vs {name(record.input.enemy)}
      </h2>
      <p className="text-small text-neutral-300">{recordSummary(record)}</p>
      <dl className="grid grid-cols-[80px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-small">
        <dt className="text-neutral-400">Modelo</dt>
        <dd className="truncate">{modelLabel(meta.model)}</dd>
        <dt className="text-neutral-400">Datos</dt>
        <dd>
          Riot {meta.version} · {meta.catalogSource === "live" ? "en vivo" : "respaldo"}
        </dd>
      </dl>
      <div className="mt-auto flex flex-col gap-2">
        <Button variant="primary" block onClick={onOpen}>
          Abrir plan
          <ArrowRight size={16} aria-hidden="true" />
        </Button>
        <Button onClick={onReprepare} className="justify-start">
          <RotateCcw size={15} aria-hidden="true" />
          Reutilizar selección
        </Button>
        {confirm ? (
          <div
            role="group"
            aria-label="Confirmar borrado"
            className="flex flex-col gap-2 rounded-control bg-danger-bg p-3 ring-1 ring-inset ring-danger-border"
          >
            <p className="text-small text-danger-text">¿Borrar este plan?</p>
            <div className="flex gap-2">
              <Button
                variant="danger"
                loading={deleting}
                loadingLabel="Borrando…"
                onClick={() => void onDelete().then((done) => done || setConfirm(false))}
              >
                Sí, borrar
              </Button>
              <Button variant="ghost" disabled={deleting} onClick={() => setConfirm(false)}>
                Conservar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            className="justify-start text-danger-text"
            onClick={() => setConfirm(true)}
          >
            <Trash2 size={15} aria-hidden="true" />
            Borrar plan
          </Button>
        )}
        <p className="border-t border-divider pt-3 text-xs text-neutral-400">
          Borrar no devuelve la cuota usada.
        </p>
      </div>
    </aside>
  );
}
