import { Coins, ShoppingBag } from "lucide-react";
import type { SavedCoachResult } from "@/lib/types";
import { CatalogArt, resolveEntry } from "./catalog-art";
import { type Maps } from "./shared";

function Item({
  id,
  maps,
  order,
  reason,
}: {
  id: string;
  maps: Maps;
  order?: number;
  reason?: string;
}) {
  const entry = resolveEntry(maps.items, id);
  return (
    <li className="flex min-w-0 items-start gap-4 rounded-md border border-divider bg-bg p-4">
      <CatalogArt entry={entry} kind="item" prominent />
      <div className="min-w-0 space-y-2">
        {order ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-300">
            Compra {order}
          </p>
        ) : null}
        <h3 className="text-body font-semibold leading-snug text-text">{entry?.name || id}</h3>
        {entry ? (
          <p className="flex items-center gap-1.5 text-small text-warning-text">
            <Coins size={14} aria-hidden="true" />
            {entry.gold.toLocaleString("es-MX")} oro
          </p>
        ) : null}
        {reason ? <p className="text-small leading-relaxed text-neutral-300">{reason}</p> : null}
      </div>
    </li>
  );
}
export function ItemDetails({
  build,
  maps,
}: {
  build: SavedCoachResult["plan"]["build"];
  maps: Maps;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-h3 font-semibold">
          <ShoppingBag size={18} aria-hidden="true" /> Próximas compras
        </h2>
        <p className="mt-2 text-small text-neutral-400">
          Compra en este orden; ajusta los situacionales a la partida.
        </p>
      </div>
      {build.core.length ? (
        <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {build.core.map((id, i) => (
            <Item key={`${id}-${i}`} id={id} maps={maps} order={i + 1} />
          ))}
        </ol>
      ) : (
        <p className="text-small text-neutral-400">No se incluyeron compras principales.</p>
      )}
      {build.situational.length ? (
        <section className="space-y-4">
          <h3 className="text-h3 font-semibold text-neutral-100">Situacionales · cuándo cambiar</h3>
          <ul className="grid gap-4 md:grid-cols-2">
            {build.situational.map((item, i) => (
              <Item key={`${item.item}-${i}`} id={item.item} maps={maps} reason={item.reason} />
            ))}
          </ul>
        </section>
      ) : null}
      {"nowByPhase" in build && Object.values(build.nowByPhase).some((ids) => ids.length) ? (
        <details className="space-y-5 border-t border-divider">
          <summary className="min-h-11 cursor-pointer py-3 text-small text-neutral-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
            Compras por fase
          </summary>
          {Object.entries(build.nowByPhase)
            .filter(([, ids]) => ids.length)
            .map(([phase, ids]) => (
              <div key={phase} className="space-y-3">
                <h5 className="text-small font-semibold text-accent-300">
                  {phase === "linea" ? "Línea" : phase === "mid" ? "Mid game" : "Late game"}
                </h5>
                <ul className="flex flex-wrap gap-3">
                  {ids.map((id, i) => {
                    const item = resolveEntry(maps.items, id);
                    return (
                      <li
                        key={`${id}-${i}`}
                        className="flex max-w-full items-center gap-3 rounded-md bg-bg px-3 py-2"
                      >
                        <CatalogArt entry={item} kind="item" />
                        <span className="min-w-0 text-small text-neutral-200">
                          {item?.name || id}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
        </details>
      ) : null}
    </div>
  );
}
