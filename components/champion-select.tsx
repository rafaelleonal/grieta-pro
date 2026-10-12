"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  LoaderCircle,
  Search,
  Star,
  X,
} from "lucide-react";
import {
  championOptions,
  moveChampionFavorite,
  toggleChampionFavorite,
} from "@/lib/champion-roles";
import type { Champion, Role } from "@/lib/types";

const NO_FAVORITES: readonly string[] = [];

export function ChampionSelect({
  champions,
  value,
  onChange,
  label,
  compact = false,
  optional = false,
  role,
  favorites = NO_FAVORITES,
  onFavoritesChange,
  canPersonalize = false,
  preferencesReady = false,
  preferencesLoading = false,
  preferencesSaving = false,
  preferencesError = "",
  onPreferencesRetry,
}: {
  champions: Champion[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  compact?: boolean;
  optional?: boolean;
  role?: Role;
  favorites?: readonly string[];
  onFavoritesChange?: (ids: string[]) => void;
  canPersonalize?: boolean;
  preferencesReady?: boolean;
  preferencesLoading?: boolean;
  preferencesSaving?: boolean;
  preferencesError?: string;
  onPreferencesRetry?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const champion = champions.find((entry) => entry.id === value);
  const filtered = championOptions(champions, { role, favorites, query, showAll });
  const favoriteSet = new Set(favorites);
  const favoriteOptions = filtered.filter((entry) => favoriteSet.has(entry.id));
  const otherOptions = filtered.filter((entry) => !favoriteSet.has(entry.id));
  const personal = Boolean(onFavoritesChange);
  const canSave = canPersonalize && preferencesReady && !preferencesLoading && !preferencesSaving;

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

  function championRow(entry: Champion, favorite: boolean) {
    const position = favorites.indexOf(entry.id);
    return (
      <div key={entry.id} className="champion-option-row">
        <button
          type="button"
          className="champion-option"
          onClick={() => select(entry.id)}
          aria-pressed={entry.id === value}
        >
          <Image src={entry.image} alt="" width={28} height={28} loading="lazy" unoptimized />
          <span>{entry.name}</span>
          {entry.id === value ? <Check size={13} /> : null}
        </button>
        {personal && canPersonalize ? (
          <div className="champion-option-actions">
            {favorite ? (
              <>
                <button
                  type="button"
                  className="champion-favorite-action"
                  disabled={!canSave || position <= 0}
                  aria-label={`Subir prioridad de ${entry.name}`}
                  title="Subir prioridad"
                  onClick={() => onFavoritesChange?.(moveChampionFavorite(favorites, entry.id, -1))}
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  className="champion-favorite-action"
                  disabled={!canSave || position === favorites.length - 1}
                  aria-label={`Bajar prioridad de ${entry.name}`}
                  title="Bajar prioridad"
                  onClick={() => onFavoritesChange?.(moveChampionFavorite(favorites, entry.id, 1))}
                >
                  <ArrowDown size={14} />
                </button>
              </>
            ) : null}
            <button
              type="button"
              className="champion-favorite-action"
              disabled={!canSave}
              aria-label={`${favorite ? "Quitar" : "Añadir"} ${entry.name} ${favorite ? "de" : "a"} favoritos de ${role}`}
              aria-pressed={favorite}
              title={favorite ? "Quitar favorito" : "Añadir favorito"}
              onClick={() => onFavoritesChange?.(toggleChampionFavorite(favorites, entry.id))}
            >
              <Star size={15} fill={favorite ? "currentColor" : "none"} />
            </button>
          </div>
        ) : null}
      </div>
    );
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
          setShowAll(false);
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
          <div className="champion-picker-heading">
            <strong>{label}</strong>
            <button
              type="button"
              className="champion-favorite-action"
              aria-label={`Cerrar selección de ${label}`}
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              <X size={16} />
            </button>
          </div>
          <div className="search-wrap">
            <Search size={14} />
            <input
              ref={search}
              placeholder="Buscar entre todos..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Buscar campeón"
            />
          </div>
          {role ? (
            <>
              <div className="champion-filter-tabs" role="group" aria-label="Filtrar campeones">
                <button
                  type="button"
                  aria-pressed={!showAll}
                  onClick={() => {
                    setShowAll(false);
                    setQuery("");
                  }}
                >
                  Habituales
                </button>
                <button
                  type="button"
                  aria-pressed={showAll}
                  onClick={() => {
                    setShowAll(true);
                    setQuery("");
                  }}
                >
                  Todos
                </button>
              </div>
              <p className="champion-picker-hint">
                Los habituales son orientativos. Puedes elegir cualquiera.
              </p>
            </>
          ) : null}
          {personal ? (
            <div className="champion-preferences-status" aria-live="polite">
              {preferencesLoading || preferencesSaving ? (
                <span>
                  <LoaderCircle size={13} className="spin" />
                  {preferencesSaving ? "Guardando favoritos..." : "Cargando favoritos..."}
                </span>
              ) : !canPersonalize ? (
                <span>Entra con tu cuenta verificada para guardar favoritos por posición.</span>
              ) : null}
              {preferencesError ? <p role="alert">{preferencesError}</p> : null}
              {preferencesError && !preferencesLoading && !preferencesSaving ? (
                <button className="text-button" type="button" onClick={onPreferencesRetry}>
                  Actualizar favoritos
                </button>
              ) : null}
            </div>
          ) : null}
          <div className="champion-list">
            {optional ? (
              <button className="champion-option" type="button" onClick={() => select("")}>
                <X size={15} />
                Sin especificar
              </button>
            ) : null}
            {favoriteOptions.length ? (
              <>
                <div className="champion-group-title">
                  Favoritos · {role}
                  <small>Primero los que prefieres</small>
                </div>
                {favoriteOptions.map((entry) => championRow(entry, true))}
              </>
            ) : null}
            {favoriteOptions.length && otherOptions.length ? (
              <div className="champion-group-title">
                {query.trim()
                  ? "Más resultados"
                  : showAll || !role
                    ? "Todos los campeones"
                    : "Habituales"}
              </div>
            ) : null}
            {otherOptions.map((entry) => championRow(entry, false))}
            {!filtered.length ? (
              <span className="search-empty">
                No encontramos ese campeón. Prueba otra búsqueda o elige Todos.
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
