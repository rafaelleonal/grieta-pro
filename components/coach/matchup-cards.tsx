"use client";

import { Plus, RefreshCw } from "lucide-react";
import { cn } from "@/components/ui/cn";
import type { Champion, CoachInput } from "@/lib/types";
import { slotValue, splashUrl, type Slot, type SlotKey } from "./slots";

/**
 * Tarjetas «Tú / Tu rival» (o las cuatro de bot). La ranura activa pulsa y marca
 * «Eligiendo»; las elegidas muestran el splash de Data Dragon con una capa oscura.
 */
export function MatchupCards({
  slots,
  input,
  champions,
  active,
  onActivate,
  onClear,
}: {
  slots: Slot[];
  input: CoachInput;
  champions: Champion[];
  active: SlotKey | null;
  onActivate: (key: SlotKey) => void;
  onClear: (key: SlotKey) => void;
}) {
  const bot = slots.length === 4;
  return (
    <div className={cn("relative grid gap-3", bot ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2")}>
      {slots.map((slot) => {
        const id = slotValue(input, slot.key);
        const champion = champions.find((entry) => entry.id === id);
        const selected = active === slot.key;
        return (
          <div
            key={slot.key}
            className={cn(
              "relative isolate flex overflow-hidden rounded-lg ring-1 ring-inset",
              bot ? "min-h-28 sm:min-h-36" : "min-h-36 sm:min-h-64 xl:min-h-72",
              selected ? "ring-2 ring-accent motion-safe:animate-glow" : "ring-neutral-800",
            )}
          >
            {champion ? (
              <>
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 bg-cover bg-[center_20%]"
                  style={{ backgroundImage: `url(${splashUrl(champion.id)})` }}
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-0 -z-10 bg-linear-to-t from-bg via-bg/50 to-bg/10"
                />
              </>
            ) : null}
            <button
              type="button"
              onClick={() => onActivate(slot.key)}
              aria-pressed={selected}
              aria-label={
                champion
                  ? `${slot.label}: ${champion.name}. Cambiar`
                  : `${slot.label}: ${slot.emptyTitle}`
              }
              className={cn(
                "flex w-full flex-col p-4 sm:p-5",
                champion
                  ? cn(
                      "items-start justify-end text-left",
                      slot.team === "enemy" && !bot && "sm:items-end sm:text-right",
                    )
                  : "items-center justify-center text-center",
                !champion && "border border-dashed border-neutral-700 rounded-lg",
                !champion && selected && "border-accent bg-accent-900/40",
              )}
            >
              {champion ? (
                <>
                  <span className="text-overline font-medium uppercase text-neutral-300">
                    {slot.label}
                  </span>
                  <strong
                    className={cn(
                      "font-semibold tracking-tight text-text",
                      bot ? "text-h2" : "text-h1 sm:text-display",
                    )}
                  >
                    {champion.name}
                  </strong>
                  {!bot ? (
                    <span className="hidden text-small text-neutral-300 sm:block">
                      {champion.title}
                    </span>
                  ) : null}
                </>
              ) : (
                <>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mb-3 size-12 place-items-center rounded-full border border-dashed border-accent-400 text-accent-300",
                      bot ? "hidden sm:grid" : "grid",
                    )}
                  >
                    <Plus size={20} />
                  </span>
                  <span className="text-overline font-medium uppercase text-neutral-400">
                    {slot.label}
                  </span>
                  <strong className="text-h3 font-medium text-text">{slot.emptyTitle}</strong>
                  <span className={cn("text-xs text-neutral-400", bot && "hidden sm:inline")}>
                    {slot.optional ? "Opcional" : "Toca un campeón abajo"}
                  </span>
                </>
              )}
            </button>
            {selected ? (
              <span
                className={cn(
                  "pointer-events-none absolute top-3 right-3 rounded-sm bg-accent-800 px-2 py-1 text-overline font-semibold uppercase text-accent-200",
                  bot && "hidden sm:block",
                )}
              >
                Eligiendo
              </span>
            ) : null}
            {champion && slot.optional ? (
              <button
                type="button"
                onClick={() => onClear(slot.key)}
                className="absolute top-2 left-2 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-bg/70 px-3 text-xs text-neutral-200 backdrop-blur hover:bg-bg"
              >
                Quitar
              </button>
            ) : champion ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-bg/70 px-3 py-1.5 text-xs text-neutral-200 backdrop-blur"
              >
                <RefreshCw size={12} />
                Cambiar
              </span>
            ) : null}
          </div>
        );
      })}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute top-1/2 left-1/2 hidden size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-bg text-control font-semibold italic text-accent-200 ring-2 ring-accent-700 sm:grid",
          bot && "grid size-11",
        )}
      >
        VS
      </span>
    </div>
  );
}
