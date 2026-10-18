"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { Camera, ScrollText, Sparkles, Swords, Users } from "lucide-react";
import { RankTile } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/tag";
import { cn } from "@/components/ui/cn";
import { toggleChampionFavorite } from "@/lib/champion-roles";
import { isBotLane, RANKS, ROLES, roleName } from "@/lib/coach-draft";
import type { CoachInput, Role } from "@/lib/types";
import type { CoachWorkspace } from "@/components/hooks/use-coach-workspace";
import { ChampionGrid } from "./champion-grid";
import { MatchupCards } from "./matchup-cards";
import {
  NotePanel,
  RiotPanel,
  TeamsPanel,
  WebSearchControl,
  type ExtraPanel,
} from "./prepare-extras";
import { matchupSlots, nextSlot, slotValue, type SlotKey } from "./slots";

type Preferences = {
  favorites: Record<Role, string[]>;
  ready: boolean;
  saving: boolean;
  error: string;
  save: (role: Role, champions: string[]) => Promise<void>;
};

/**
 * Preparar partida: el matchup ocupa la pantalla, la cuadrícula cambia al rol de la
 * ranura activa y lo opcional vive en chips. Sólo campeón y rival son obligatorios.
 */
export function PrepareScreen({
  ws,
  preferences,
  positions,
  onCapture,
  onRankChange,
}: {
  onRankChange: (rank: string) => void;
  ws: CoachWorkspace;
  preferences: Preferences;
  positions: Role[];
  onCapture: () => void;
}) {
  const { input, catalog, session } = ws;
  const champions = catalog?.champions || [];
  const slots = matchupSlots(input.role);
  const [active, setActive] = useState<SlotKey | null>(() => nextSlot(input, slots));
  const [panel, setPanel] = useState<ExtraPanel | null>(null);
  const [rankOpen, setRankOpen] = useState(false);
  const activeSlot = slots.find((slot) => slot.key === active) || null;
  const gridRole = activeSlot?.role || input.role;
  const champion = champions.find((entry) => entry.id === input.champion);
  const enemy = champions.find((entry) => entry.id === input.enemy);
  const canGenerate = Boolean(champion && enemy && catalog && !ws.busy);
  const picked = new Map(
    slots
      .map((slot) => [slotValue(input, slot.key), slot.label] as const)
      .filter(([id]) => Boolean(id)),
  );

  function pick(championId: string) {
    if (!activeSlot) return;
    // A champion can only sit in one slot: clear it from any other one first.
    const next: CoachInput = { ...input };
    for (const slot of slots)
      if (slot.key !== activeSlot.key && slotValue(next, slot.key) === championId) {
        if (slot.key === "allyDuo" || slot.key === "enemyDuo") next[slot.key] = undefined;
        else next[slot.key] = "";
      }
    next[activeSlot.key] = championId;
    next.allies = next.allies.filter((id) => id !== championId);
    next.enemies = next.enemies.filter((id) => id !== championId);
    ws.setInput(next);
    ws.setNotice("");
    setActive(nextSlot(next, slots, activeSlot.key));
  }

  function changeRole(role: Role) {
    const next = {
      ...input,
      role,
      ...(isBotLane(role) ? {} : { allyDuo: undefined, enemyDuo: undefined }),
    };
    ws.setInput(next);
    setActive(nextSlot(next, matchupSlots(role)));
  }

  // Ctrl/⌘ + Enter genera cuando el matchup está completo.
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
      ? slots.find((slot) => slot.key === "enemy")!.emptyTitle
      : "Generar build";

  return (
    <div className="flex flex-1 flex-col gap-5 px-4 py-5 md:px-7 md:py-7">
      <header className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h1 className="text-h1 font-medium md:text-display">Prepara tu partida</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setRankOpen(!rankOpen)}
              aria-expanded={rankOpen}
              aria-controls="rank-picker"
              className="inline-flex min-h-11 items-center gap-2 rounded-full px-3.5 text-sm ring-1 ring-inset ring-neutral-700 hover:ring-neutral-500"
            >
              <RankTile rank={input.rank} size={28} compact />
              <span>{input.rank}</span>
              {positions.length ? (
                <span className="text-neutral-400">
                  · {positions.map((role) => roleName(role)).join(" / ")}
                </span>
              ) : null}
            </button>
            {rankOpen ? (
              <div
                id="rank-picker"
                role="group"
                aria-label="Tu rango"
                className="absolute left-0 z-20 mt-2 grid w-80 grid-cols-4 gap-2 rounded-lg bg-surface p-3 shadow-lg md:right-0 md:left-auto"
              >
                {RANKS.map((rank) => (
                  <button
                    key={rank}
                    type="button"
                    aria-pressed={input.rank === rank}
                    onClick={() => {
                      onRankChange(rank);
                      setRankOpen(false);
                    }}
                    className="flex flex-col items-center gap-1 rounded-md p-1 text-xs text-neutral-300 hover:bg-neutral-900 aria-pressed:bg-accent-900"
                  >
                    <RankTile rank={rank} size={52} compact active={input.rank === rank} />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <Button onClick={onCapture}>
            <Camera size={16} aria-hidden="true" />
            Usar captura
          </Button>
        </div>
      </header>

      <MatchupCards
        slots={slots}
        input={input}
        champions={champions}
        active={active}
        onActivate={setActive}
        onClear={(key) => {
          const next = { ...input, [key]: undefined };
          ws.setInput(next);
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
                onClick={() => changeRole(role.id)}
                className="inline-flex min-h-11 flex-none items-center gap-1.5 rounded-full px-4 text-sm text-neutral-300 ring-1 ring-inset ring-neutral-700 hover:ring-neutral-500 aria-pressed:bg-accent-900 aria-pressed:text-accent-200 aria-pressed:ring-accent"
              >
                {role.name}
                {positions.includes(role.id) ? (
                  <span aria-label="tu posición" className="text-warning">
                    ★
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
        {catalog ? (
          <ChampionGrid
            key={gridRole}
            champions={champions}
            role={gridRole}
            roleName={roleName(gridRole)}
            favorites={preferences.favorites[gridRole] || []}
            favoritesEditor={
              preferences.ready
                ? {
                    toggle: (championId) =>
                      void preferences.save(
                        gridRole,
                        toggleChampionFavorite(preferences.favorites[gridRole] || [], championId),
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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-small">
        <p className="text-neutral-400">Los equipos afinan las compras y los hechizos.</p>
        <Button
          variant="ghost"
          aria-expanded={panel === "teams"}
          aria-controls={panel === "teams" ? "prepare-extra" : undefined}
          onClick={() => setPanel(panel === "teams" ? null : "teams")}
        >
          <Users size={16} aria-hidden="true" /> Añadir equipos · opcional
        </Button>
      </div>

      {panel ? (
        <section
          id="prepare-extra"
          aria-label="Contexto opcional"
          className="rounded-lg bg-surface/60 p-4 md:p-5"
        >
          {panel === "teams" ? (
            <TeamsPanel
              input={input}
              champions={champions}
              onTeamChange={(team, index, value) => {
                const next = [...input[team]];
                next[index] = value;
                ws.update(team, next);
              }}
            />
          ) : panel === "note" ? (
            <NotePanel notes={input.notes} onChange={(value) => ws.update("notes", value)} />
          ) : (
            <RiotPanel
              riot={ws.riotImport}
              status={ws.status}
              champions={champions}
              busy={ws.busy}
              onSearch={() => void ws.importRiot()}
              onApply={(enemyId) => {
                ws.applyRiot(enemyId);
                setPanel("teams");
              }}
            />
          )}
        </section>
      ) : null}

      <footer className="sticky bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 -mx-4 mt-auto flex flex-col gap-3 border-t border-divider bg-bg/95 px-4 py-3 backdrop-blur md:bottom-0 md:-mx-7 md:px-7 lg:flex-row lg:items-center">
        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto">
          <span className="hidden flex-none text-overline font-medium uppercase text-neutral-500 sm:inline">
            Añadir
          </span>
          <Chip
            pressed={panel === "note"}
            onClick={() => setPanel(panel === "note" ? null : "note")}
            className="flex-none"
          >
            <ScrollText size={15} aria-hidden="true" />
            Nota
          </Chip>
          <Chip
            pressed={panel === "riot"}
            onClick={() => setPanel(panel === "riot" ? null : "riot")}
            className="flex-none"
          >
            <Swords size={15} aria-hidden="true" />
            Riot ID
          </Chip>
          <WebSearchControl
            account={session.account}
            requested={input.webSearch}
            onChange={(next) => ws.update("webSearch", next)}
          />
        </div>
        <Button
          variant="primary"
          className={cn("lg:ml-auto lg:min-w-96", !canGenerate && "justify-center")}
          disabled={!canGenerate}
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
