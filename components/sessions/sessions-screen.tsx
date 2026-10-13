"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, History, Plus, Search } from "lucide-react";
import { Mascot } from "@/components/brand";
import { Button, buttonClasses } from "@/components/ui/button";
import { Alert, EmptyState, Overline } from "@/components/ui/feedback";
import { cn } from "@/components/ui/cn";
import { ROLES, roleName } from "@/lib/coach-draft";
import type { Champion, Role } from "@/lib/types";
import type { HistoryRecord } from "@/lib/types";
import { useHistory } from "@/components/hooks/use-history";
import { SessionPreview } from "./session-preview";
import { groupRecords, recordSummary, relativeTime } from "./session-utils";

/** Sesiones: lista privada agrupada por fecha, filtros, vista previa y borrado. */
export function SessionsScreen({
  owner,
  champions,
  onOpen,
  onReprepare,
  onNew,
}: {
  owner: string | null;
  champions: Champion[];
  onOpen: (record: HistoryRecord) => void;
  onReprepare: (record: HistoryRecord) => void;
  onNew: () => void;
}) {
  const history = useHistory(owner);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<Role | "ALL">("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const name = (id: string) => champions.find((entry) => entry.id === id)?.name || id;
  const search = query.trim().toLocaleLowerCase("es");
  const filtered = history.records.filter(
    (record) =>
      (role === "ALL" || record.input.role === role) &&
      (!search ||
        `${name(record.input.champion)} ${name(record.input.enemy)}`
          .toLocaleLowerCase("es")
          .includes(search)),
  );
  const selected = filtered.find((record) => record.id === selectedId) || filtered[0];

  if (!owner)
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10 text-center">
        <Mascot size={112} />
        <h1 className="text-h1 font-medium">Tus sesiones</h1>
        <p className="max-w-md text-small text-neutral-400">
          Entra para ver tus planes. Los ejemplos no se guardan.
        </p>
        <Link href="/login" className={buttonClasses("primary")}>
          Entrar
        </Link>
      </div>
    );

  return (
    <div className="flex flex-1 flex-col gap-5 px-4 py-5 md:px-7 md:py-7">
      <header className="flex flex-wrap items-end gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="text-h1 font-medium md:text-display">Sesiones</h1>
          <p className="text-small text-neutral-400 md:text-body">Sólo tú puedes ver tus planes.</p>
        </div>
        <Button variant="primary" onClick={onNew}>
          <Plus size={17} aria-hidden="true" />
          Nuevo plan
        </Button>
      </header>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative md:w-80">
          <span className="sr-only">Buscar campeón o rival</span>
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-neutral-500"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar campeón o rival"
            className="min-h-11 w-full rounded-full bg-surface pr-4 pl-11 text-control text-text ring-1 ring-inset ring-neutral-800 placeholder:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent-800 focus-visible:ring-accent"
          />
        </label>
        <div
          role="group"
          aria-label="Filtrar por línea"
          className="no-scrollbar flex gap-2 overflow-x-auto"
        >
          {(
            [["ALL", "Todas"], ...ROLES.map((entry) => [entry.id, entry.name])] as [
              Role | "ALL",
              string,
            ][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={role === value}
              onClick={() => setRole(value)}
              className="inline-flex min-h-11 flex-none items-center rounded-full px-4 text-sm text-neutral-300 ring-1 ring-inset ring-neutral-700 hover:ring-neutral-500 aria-pressed:bg-accent-900 aria-pressed:text-accent-200 aria-pressed:ring-accent"
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-small text-neutral-400 md:ml-auto">
          {filtered.length} {filtered.length === 1 ? "sesión" : "sesiones"}
        </span>
      </div>

      {history.error ? (
        <Alert
          tone="danger"
          role="alert"
          action={
            <Button variant="ghost" onClick={history.retry}>
              Reintentar
            </Button>
          }
        >
          {history.error}
        </Alert>
      ) : null}

      {history.loading && !history.records.length ? (
        <p role="status" className="text-small text-neutral-400">
          Cargando…
        </p>
      ) : !history.records.length ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <Mascot size={96} />
          <EmptyState icon={<History size={20} />} title="Aún no tienes planes">
            Tu próximo plan aparecerá aquí. Los ejemplos no se guardan.
          </EmptyState>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section
            aria-label="Planes guardados"
            className="flex flex-col rounded-lg bg-surface p-2"
          >
            {filtered.length ? (
              groupRecords(filtered).map(([group, records]) => (
                <div
                  key={group}
                  className="flex flex-col border-b border-divider pb-2 last:border-0"
                >
                  <Overline className="px-3 pt-3 pb-2">{group}</Overline>
                  <ul>
                    {records.map((record) => (
                      <li key={record.id}>
                        <SessionRow
                          record={record}
                          champions={champions}
                          selected={selected?.id === record.id}
                          onSelect={() => setSelectedId(record.id)}
                          onOpen={() => onOpen(record)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <p className="p-4 text-small text-neutral-400">Sin resultados.</p>
            )}
            {history.hasMore ? (
              <Button
                className="m-3 self-center"
                loading={history.loading}
                onClick={() => void history.loadMore()}
              >
                Cargar más
              </Button>
            ) : null}
          </section>
          {selected ? (
            <div>
              <SessionPreview
                key={selected.id}
                record={selected}
                champions={champions}
                deleting={history.deleting === selected.id}
                onOpen={() => onOpen(selected)}
                onReprepare={() => onReprepare(selected)}
                onDelete={() => history.remove(selected.id)}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function SessionRow({
  record,
  champions,
  selected,
  onSelect,
  onOpen,
}: {
  record: HistoryRecord;
  champions: Champion[];
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}) {
  const champion = champions.find((entry) => entry.id === record.input.champion);
  const enemy = champions.find((entry) => entry.id === record.input.enemy);
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-control transition-colors hover:bg-neutral-900",
        selected && "bg-accent-900/50 ring-1 ring-inset ring-accent-800",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        onDoubleClick={onOpen}
        aria-pressed={selected}
        className="flex min-h-16 min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left"
        aria-label={`${champion?.name || record.input.champion} contra ${enemy?.name || record.input.enemy}, ${roleName(record.input.role)}`}
      >
        <span aria-hidden="true" className="flex flex-none -space-x-2">
          {[champion, enemy].map((entry, index) =>
            entry ? (
              <Image
                key={entry.id}
                src={entry.image}
                alt=""
                width={36}
                height={36}
                unoptimized
                className={cn("rounded-md ring-2 ring-surface", index === 1 && "relative")}
              />
            ) : (
              <span key={index} className="size-9 rounded-md bg-neutral-800" />
            ),
          )}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex items-center gap-2">
            <strong className="truncate text-sm font-medium">
              {champion?.name || record.input.champion} vs {enemy?.name || record.input.enemy}
            </strong>
          </span>
          <span className="truncate text-xs text-neutral-400">{recordSummary(record)}</span>
        </span>
        <span className="hidden flex-none text-xs text-neutral-300 sm:block">
          {roleName(record.input.role)} · {record.input.rank}
        </span>
        <span className="hidden w-24 flex-none text-xs text-neutral-400 md:block">
          {relativeTime(record.createdAt)}
        </span>
        <ChevronRight size={16} aria-hidden="true" className="flex-none text-neutral-500" />
      </button>
    </div>
  );
}
