"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { inferRole, toggleChampionFavorite } from "@/lib/champion-roles";
import { ROLES, roleName } from "@/lib/coach-draft";
import type { CoachInput, Role } from "@/lib/types";
import type { CoachWorkspace } from "@/components/hooks/use-coach-workspace";
import { ChampionGrid } from "./champion-grid";
import { MatchupCards } from "./matchup-cards";
import { matchupSlots, nextSlot, slotValue, type SlotKey } from "./slots";

type Preferences = {
  favorites: Record<Role, string[]>;
  ready: boolean;
  saving: boolean;
  error: string;
  save: (role: Role, champions: string[]) => Promise<void>;
};

/**
 * Preparar partida (ADR 0009): eliges tu campeón y tu rival. El rol se sugiere a partir
 * de tu campeón y puedes cambiarlo. No hay más campos.
 */
export function PrepareScreen({
  ws,
  preferences,
}: {
  ws: CoachWorkspace;
  preferences: Preferences;
}) {
  const { input, catalog } = ws;
  const champions = catalog?.champions || [];
  const slots = matchupSlots(input.role);
  const [active, setActive] = useState<SlotKey | null>(() => nextSlot(input, slots));
  const activeSlot = slots.find((slot) => slot.key === active) || null;
  const champion = champions.find((entry) => entry.id === input.champion);
  const enemy = champions.find((entry) => entry.id === input.enemy);
  const canGenerate = ws.generationAccess.allowed;
  const picked = new Map(
    slots
      .map((slot) => [slotValue(input, slot.key), slot.label] as const)
      .filter(([id]) => Boolean(id)),
  );

  function pick(championId: string) {
    if (!activeSlot) return;
    const next: CoachInput = { ...input, [activeSlot.key]: championId };
    // A champion sits in one slot only.
    const other = activeSlot.key === "champion" ? "enemy" : "champion";
    if (next[other] === championId) next[other] = "";
    if (activeSlot.key === "champion") next.role = inferRole(championId, input.role);
    ws.setInput(next);
    ws.setNotice("");
    setActive(nextSlot(next, matchupSlots(next.role), activeSlot.key));
  }

  // Ctrl/⌘ + Enter pide la build cuando el matchup está completo.
  const onShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey) && canGenerate)
      void ws.generate();
  });
  useEffect(() => {
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  const ctaLabel = !champion
    ? "Elige tu campeón"
    : !enemy
      ? slots[1].emptyTitle
      : canGenerate
        ? "Ver build"
        : ws.generationAccess.reason === "account_loading" ||
            ws.generationAccess.reason === "configuration_loading"
          ? "Comprobando acceso…"
          : "Build no disponible";

  return (
    <div className="flex flex-1 flex-col gap-5 px-4 py-5 md:px-7 md:py-7">
      <header className="flex flex-col gap-1">
        <h1 className="text-h1 font-medium md:text-display">Prepara tu partida</h1>
        <p className="text-small text-neutral-400">
          Tu campeón y tu rival. Recibes hechizos, runas, build y habilidades 1–6.
        </p>
      </header>

      <MatchupCards
        slots={slots}
        input={input}
        champions={champions}
        active={active}
        onActivate={setActive}
        onClear={(key) => {
          ws.setInput({ ...input, [key]: "" });
          setActive(key);
        }}
      />

      <section
        aria-label="Elegir campeones"
        className="flex flex-col gap-4 rounded-lg bg-surface/60 p-4 md:p-5"
      >
        <div className="no-scrollbar flex items-center gap-3 overflow-x-auto">
          <span className="hidden flex-none text-overline font-medium uppercase text-neutral-500 sm:inline">
            Tu rol
          </span>
          <div role="group" aria-label="Tu rol" className="flex gap-2">
            {ROLES.map((role) => (
              <button
                key={role.id}
                type="button"
                aria-pressed={input.role === role.id}
                onClick={() => ws.setInput({ ...input, role: role.id })}
                className="inline-flex min-h-11 flex-none items-center rounded-full px-4 text-sm text-neutral-300 ring-1 ring-inset ring-neutral-700 hover:ring-neutral-500 aria-pressed:bg-accent-900 aria-pressed:text-accent-200 aria-pressed:ring-accent"
              >
                {role.name}
              </button>
            ))}
          </div>
        </div>
        {catalog ? (
          <ChampionGrid
            key={input.role}
            champions={champions}
            role={input.role}
            roleName={roleName(input.role)}
            favorites={preferences.favorites[input.role] || []}
            favoritesEditor={
              preferences.ready
                ? {
                    toggle: (championId) =>
                      void preferences.save(
                        input.role,
                        toggleChampionFavorite(preferences.favorites[input.role] || [], championId),
                      ),
                    saving: preferences.saving,
                    error: preferences.error,
                  }
                : undefined
            }
            picked={picked}
            choosingLabel={activeSlot ? activeSlot.choosing : null}
            onPick={pick}
          />
        ) : (
          <p role="status" className="text-small text-neutral-400">
            Cargando campeones…
          </p>
        )}
      </section>

      <footer className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 -mx-4 mt-auto flex border-t border-divider bg-bg/95 px-4 py-3 backdrop-blur md:bottom-0 md:-mx-7 md:px-7">
        <Button
          variant="primary"
          className={cn(
            "w-full lg:ml-auto lg:w-auto lg:min-w-96",
            !canGenerate && "justify-center",
          )}
          disabled={!canGenerate}
          title={!canGenerate ? ws.generationAccess.message : undefined}
          onClick={() => void ws.generate()}
        >
          <Sparkles size={17} aria-hidden="true" />
          <span className="truncate">{ctaLabel}</span>
          {canGenerate ? (
            <kbd className="ml-auto hidden rounded-sm px-1.5 text-xs text-accent-300 ring-1 ring-inset ring-accent-700 md:inline">
              Ctrl ↵
            </kbd>
          ) : null}
        </Button>
      </footer>
    </div>
  );
}
