import { ShoppingBag, Zap, Gem } from "lucide-react";
import type { CoachPreparation, SavedCoachResult } from "@/lib/types";
import { CatalogArt, resolveEntry } from "./catalog-art";
import type { Maps } from "./shared";

type Choices = Pick<SavedCoachResult["plan"]["build"], "summoners" | "starting" | "runes">;

/** The same stable slots are used while streaming and in the saved plan. */
export function Preparation({
  build,
  maps,
  pending = false,
}: {
  build?: Choices | CoachPreparation | null;
  maps: Maps;
  pending?: boolean;
}) {
  const summoners = build?.summoners;
  const spells = Array.isArray(summoners) ? summoners : summoners?.pick;
  const runes = build?.runes;
  const starting = build?.starting;
  const items = starting?.map((id) => resolveEntry(maps.items, id));
  const cost =
    items?.length && items.every(Boolean)
      ? items.reduce((sum, item) => sum + item!.gold, 0)
      : undefined;
  const missing = (label: string) => (
    <p className="text-small text-neutral-400">
      {pending ? `Preparando ${label}…` : `No se incluyeron ${label}.`}
    </p>
  );
  const rune = (value: string) => {
    const entry = resolveEntry(maps.runes, value);
    return (
      <li key={value} className="flex min-w-0 items-center gap-2">
        <CatalogArt entry={entry} kind="rune" />
        <span className="text-small leading-snug">{entry?.name || value}</span>
      </li>
    );
  };
  return (
    <section
      aria-label="Elige antes de entrar"
      className="min-w-0 space-y-5 rounded-lg border border-control-border bg-surface p-4 md:p-5"
    >
      <div className="space-y-3">
        <h2 className="flex items-center gap-2 text-h3 font-semibold">
          <Zap size={18} aria-hidden="true" /> Hechizos
        </h2>
        {spells?.length ? (
          <>
            <ul className="grid grid-cols-2 gap-3">
              {spells.map((id, i) => {
                const spell = resolveEntry(maps.summoners, id);
                return (
                  <li key={`${id}-${i}`} className="flex min-w-0 items-center gap-2">
                    <CatalogArt entry={spell} kind="spell" prominent />
                    <span className="text-small font-semibold">{spell?.name || id}</span>
                  </li>
                );
              })}
            </ul>
            {!Array.isArray(summoners) && summoners ? (
              <p className="text-small leading-relaxed text-neutral-300">{summoners.why}</p>
            ) : null}
          </>
        ) : (
          missing("hechizos")
        )}
      </div>
      <div className="space-y-3 border-t border-divider pt-4">
        <h2 className="flex flex-wrap items-center gap-2 text-h3 font-semibold">
          <ShoppingBag size={18} aria-hidden="true" /> Compra inicial{" "}
          {cost !== undefined ? (
            <span className="ml-auto text-small font-normal text-warning-text">{cost} oro</span>
          ) : null}
        </h2>
        {starting?.length ? (
          <ul className="flex flex-wrap gap-x-5 gap-y-3">
            {starting.map((id, i) => {
              const item = resolveEntry(maps.items, id);
              return (
                <li key={`${id}-${i}`} className="flex items-center gap-2">
                  <CatalogArt entry={item} kind="item" />
                  <div>
                    <p className="text-small font-medium">{item?.name || id}</p>
                    {item ? <p className="text-xs text-neutral-400">{item.gold} oro</p> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          missing("compras iniciales")
        )}
      </div>
      <div className="space-y-3 border-t border-divider pt-4">
        <h2 className="flex items-center gap-2 text-h3 font-semibold">
          <Gem size={18} aria-hidden="true" /> Runas
        </h2>
        {Array.isArray(runes) ? (
          <ul className="grid grid-cols-2 gap-2">{runes.map(rune)}</ul>
        ) : runes ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  style: runes.primary.style,
                  values: [runes.primary.keystone, ...runes.primary.minors],
                },
                { style: runes.secondary.style, values: runes.secondary.minors },
              ].map((branch) => (
                <div key={branch.style} className="min-w-0 space-y-2">
                  <h3 className="text-xs font-medium text-neutral-400">
                    {resolveEntry(maps.styles, branch.style)?.name || branch.style}
                  </h3>
                  <ul className="space-y-2">{branch.values.map(rune)}</ul>
                </div>
              ))}
            </div>
            <p className="text-xs leading-relaxed text-neutral-300">
              <span className="text-neutral-400">Fragmentos: </span>
              {runes.shards.join(" · ")}
            </p>
          </>
        ) : (
          missing("runas")
        )}
      </div>
    </section>
  );
}
