"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { championOptions } from "@/lib/champion-roles";
import type { Champion, Role } from "@/lib/types";

/**
 * Selector de campeón con búsqueda (resto de equipos). Muestra primero los habituales del
 * rol, pero cualquier campeón se puede elegir; Escape o clic fuera lo cierran.
 */
export function ChampionSelect({
  champions,
  value,
  onChange,
  label,
  compact = false,
  optional = false,
  role,
}: {
  champions: Champion[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  compact?: boolean;
  optional?: boolean;
  role?: Role;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapper = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const champion = champions.find((entry) => entry.id === value);
  const options = championOptions(champions, { role, query, showAll: !role || Boolean(query) });

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    function onOutside(event: PointerEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onOutside);
    return () => document.removeEventListener("pointerdown", onOutside);
  }, [open]);

  function select(championId: string) {
    onChange(championId);
    setOpen(false);
    setQuery("");
    trigger.current?.focus();
  }

  return (
    <div
      ref={wrapper}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-label={`${label}: ${champion?.name || value || "Elegir campeón"}`}
        aria-expanded={open}
        aria-controls={id}
        aria-haspopup="dialog"
        onClick={() => {
          setOpen(!open);
          setQuery("");
        }}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-md bg-bg px-2.5 text-left ring-1 ring-inset ring-neutral-800 transition-colors hover:ring-neutral-600",
          compact ? "min-h-12" : "min-h-16",
          !champion && "border border-dashed border-neutral-700 ring-0",
        )}
      >
        {champion ? (
          <Image
            src={champion.image}
            alt=""
            width={compact ? 32 : 40}
            height={compact ? 32 : 40}
            unoptimized
            className="rounded-md"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-8 place-items-center rounded-md bg-neutral-900 text-neutral-500"
          >
            <Search size={15} />
          </span>
        )}
        <span className="flex min-w-0 flex-1 flex-col">
          <strong
            className={cn(
              "truncate text-sm font-medium",
              !champion && "font-normal text-neutral-400",
            )}
          >
            {champion?.name || value || (optional ? "Sin especificar" : "Elegir campeón")}
          </strong>
          {!compact && champion ? (
            <span className="truncate text-xs text-neutral-400">{champion.title}</span>
          ) : null}
        </span>
        <ChevronDown size={15} aria-hidden="true" className="flex-none text-neutral-500" />
      </button>
      {open ? (
        <div
          id={id}
          role="dialog"
          aria-label={`Seleccionar ${label}`}
          className="absolute z-30 mt-2 flex max-h-80 w-full min-w-64 flex-col gap-2 rounded-lg bg-surface p-2 shadow-lg"
        >
          <label className="relative">
            <span className="sr-only">Buscar campeón</span>
            <Search
              size={15}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-500"
            />
            <input
              ref={search}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar entre todos…"
              className="min-h-11 w-full rounded-md bg-bg pr-3 pl-9 text-control text-text ring-1 ring-inset ring-neutral-800 placeholder:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent-800 focus-visible:ring-accent"
            />
          </label>
          <ul className="flex min-h-0 flex-col overflow-y-auto">
            {optional ? (
              <li>
                <button
                  type="button"
                  onClick={() => select("")}
                  className="flex min-h-11 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm text-neutral-300 hover:bg-neutral-900"
                >
                  <X size={15} aria-hidden="true" />
                  Sin especificar
                </button>
              </li>
            ) : null}
            {options.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => select(entry.id)}
                  aria-pressed={entry.id === value}
                  className="flex min-h-11 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-sm hover:bg-neutral-900 aria-pressed:bg-accent-900 aria-pressed:text-accent-200"
                >
                  <Image
                    src={entry.image}
                    alt=""
                    width={28}
                    height={28}
                    loading="lazy"
                    unoptimized
                    className="rounded-md"
                  />
                  <span className="flex-1 truncate">{entry.name}</span>
                  {entry.id === value ? <Check size={14} aria-hidden="true" /> : null}
                </button>
              </li>
            ))}
            {!options.length ? (
              <li className="px-2.5 py-3 text-small text-neutral-400">
                No encontramos ese campeón.
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
