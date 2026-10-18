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
    <li className="flex min-w-0 items-start gap-3 rounded-md bg-bg p-3">
      <CatalogArt entry={entry} kind="item" prominent />
      <div className="min-w-0 space-y-1">
        {order ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-300">
            Compra {order}
          </p>
        ) : null}
        <h3 className="text-small font-semibold leading-snug text-text">{entry?.name || id}</h3>
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
          <ShoppingBag size={18} aria-hidden="true" /> Build recomendada
        </h2>
        <p className="mt-2 text-small text-neutral-400">
          Compra en este orden; ajusta los situacionales a la partida.
        </p>
      </div>
      {build.core.length ? (
        <ol className="grid gap-2">
          {build.core.map((id, i) => (
            <Item key={`${id}-${i}`} id={id} maps={maps} order={i + 1} />
          ))}
        </ol>
      ) : (
        <p className="text-small text-neutral-400">No se incluyeron compras principales.</p>
      )}
      {build.situational.length ? (
        <section className="space-y-4">
          <h3 className="text-h3 font-semibold text-neutral-100">Situacionales</h3>
          <ul className="grid gap-2">
            {build.situational.map((item, i) => (
              <Item key={`${item.item}-${i}`} id={item.item} maps={maps} reason={item.reason} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
