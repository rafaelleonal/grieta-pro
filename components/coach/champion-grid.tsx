"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { Search, Star } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { championOptions } from "@/lib/champion-roles";
import type { Champion, Role } from "@/lib/types";

const GRID_SIZE = 20;

/**
 * Cuadrícula de 20 campeones del rol activo con los favoritos primero. La búsqueda
 * recorre todo el catálogo: ningún campeón queda bloqueado fuera de posición.
 */
export function ChampionGrid({
  champions,
  role,
  roleName,
  favorites,
  picked,
  choosingLabel,
  onPick,
}: {
  champions: Champion[];
  role: Role;
  roleName: string;
  favorites: readonly string[];
  /** Campeones ya colocados, con la etiqueta que muestran en la cuadrícula. */
  picked: Map<string, string>;
  choosingLabel: string | null;
  onPick: (championId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const searchId = useId();
  const options = championOptions(champions, { role, favorites, query, showAll });
  const visible = query || showAll ? options : options.slice(0, GRID_SIZE);
  const favoriteSet = new Set(favorites);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <p className="text-small text-neutral-300" aria-live="polite">
          {choosingLabel ? (
            <>
              Eligiendo: <strong className="font-semibold text-text">{choosingLabel}</strong> ·{" "}
              {roleName}
            </>
          ) : (
            "Toca una tarjeta para cambiar un campeón."
          )}
        </p>
        <label htmlFor={searchId} className="relative md:ml-auto md:w-72">
          <span className="sr-only">Buscar campeón</span>
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-neutral-500"
          />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Buscar en ${roleName}`}
            className="min-h-11 w-full rounded-full bg-bg pr-4 pl-11 text-control text-text ring-1 ring-inset ring-neutral-800 placeholder:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent-800 focus-visible:ring-accent"
          />
        </label>
      </div>

      {visible.length ? (
        <ul
          aria-label={`Campeones de ${roleName}`}
          className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] sm:grid-cols-[repeat(auto-fill,minmax(76px,1fr))] gap-x-3 gap-y-4"
        >
          {visible.map((champion) => {
            const tag = picked.get(champion.id);
            return (
              <li key={champion.id}>
                <button
                  type="button"
                  onClick={() => onPick(champion.id)}
                  disabled={!choosingLabel}
                  aria-pressed={Boolean(tag)}
                  aria-label={`${champion.name}${tag ? ` · ${tag}` : ""}`}
                  className="group flex w-full flex-col items-center gap-1.5 text-xs text-neutral-300 disabled:cursor-default disabled:text-neutral-300"
                >
                  <span
                    className={cn(
                      "relative block aspect-square w-full max-w-19 overflow-hidden rounded-control ring-1 ring-inset ring-neutral-800 transition-shadow group-enabled:group-hover:ring-neutral-500",
                      tag && "ring-2 ring-accent",
                    )}
                  >
                    <Image
                      src={champion.image}
                      alt=""
                      width={76}
                      height={76}
                      loading="lazy"
                      unoptimized
                      className="size-full object-cover"
                    />
                    {favoriteSet.has(champion.id) ? (
                      <Star
                        size={12}
                        aria-hidden="true"
                        className="absolute top-1 left-1 fill-warning text-warning drop-shadow"
                      />
                    ) : null}
                    {tag ? (
                      <span className="absolute inset-x-1 bottom-1 truncate rounded-sm bg-accent-800 px-1 text-center text-overline leading-4 font-semibold tracking-normal uppercase text-accent-200">
                        {tag}
                      </span>
                    ) : null}
                  </span>
                  <span className="w-full truncate text-center">{champion.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-small text-neutral-400">
          No encontramos «{query}». Revisa el nombre o busca otro campeón.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
        {favorites.length ? (
          <span className="inline-flex items-center gap-1.5">
            <Star size={12} aria-hidden="true" className="fill-warning text-warning" />
            Tus favoritos primero · mostrando {roleName}
          </span>
        ) : (
          <span>Comunes en {roleName}. Busca para ver cualquier campeón.</span>
        )}
        {!query && options.length > GRID_SIZE ? (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="ml-auto inline-flex min-h-11 items-center text-small text-accent-300 hover:text-accent-200"
          >
            {showAll ? "Ver menos" : `Ver todos (${options.length})`}
          </button>
        ) : null}
      </div>
    </div>
  );
}
