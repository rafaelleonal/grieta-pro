"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { Check, ChevronDown, Search, X } from "lucide-react";
import type { Champion } from "@/lib/types";

export function ChampionSelect({
  champions,
  value,
  onChange,
  label,
  compact = false,
  optional = false,
}: {
  champions: Champion[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  compact?: boolean;
  optional?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapper = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const champion = champions.find((entry) => entry.id === value);
  const filtered = champions.filter((entry) =>
    entry.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    function onOutside(event: PointerEvent) {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onOutside);
    return () => document.removeEventListener("pointerdown", onOutside);
  }, [open]);

  function select(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
    trigger.current?.focus();
  }

  return (
    <div
      className="champion-select"
      ref={wrapper}
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
        className={`champion-trigger ${compact ? "compact" : ""}`}
        aria-label={`${label}: ${champion?.name || value || "Elegir campeón"}`}
        aria-expanded={open}
        aria-controls={id}
        aria-haspopup="dialog"
        onClick={() => {
          setOpen(!open);
          setQuery("");
        }}
      >
        {champion ? (
          <Image src={champion.image} alt="" width={40} height={40} unoptimized />
        ) : (
          <div className="champion-placeholder">
            <Search size={17} />
          </div>
        )}
        <span className="champion-info">
          <strong>{champion?.name || value || "Elegir campeón"}</strong>
          {!compact ? <small>{champion?.title || "Busca entre todos los campeones"}</small> : null}
        </span>
        <ChevronDown size={14} />
      </button>
      {open ? (
        <div className="champion-popover" id={id} role="dialog" aria-label={`Seleccionar ${label}`}>
          <div className="search-wrap">
            <Search size={14} />
            <input
              ref={search}
              placeholder="Buscar campeón..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Buscar campeón"
            />
          </div>
          <div className="champion-list">
            {optional ? (
              <button className="champion-option" type="button" onClick={() => select("")}>
                <X size={15} />
                Sin especificar
              </button>
            ) : null}
            {filtered.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="champion-option"
                onClick={() => select(entry.id)}
                aria-pressed={entry.id === value}
              >
                <Image src={entry.image} alt="" width={28} height={28} loading="lazy" unoptimized />
                {entry.name}
                {entry.id === value ? <Check size={13} /> : null}
              </button>
            ))}
            {!filtered.length ? (
              <span className="search-empty">No encontramos ese campeón.</span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
