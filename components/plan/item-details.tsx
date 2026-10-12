import { Coins, ShoppingBag } from "lucide-react";
import type { SavedCoachResult } from "@/lib/types";
import { CatalogArt, resolveEntry } from "./catalog-art";
import { DetailHeading, type Maps } from "./shared";

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
        <h5 className="text-body font-semibold leading-snug text-text">{entry?.name || id}</h5>
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
  const groups = [
    { title: "Objetos iniciales", ids: build.starting },
    { title: "Compras principales", ids: build.core },
  ];
  return (
    <div className="space-y-8">
      <DetailHeading
        icon={ShoppingBag}
        title="Tu ruta de compra"
        description="El núcleo va en orden. Ajusta los situacionales a lo que ocurra en la partida."
      />
      {groups.map(({ title, ids }, group) => (
        <section key={title} className="space-y-4">
          <h4 className="text-h3 font-semibold text-neutral-100">{title}</h4>
          {ids.length ? (
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {ids.map((id, i) => (
                <Item
                  key={`${id}-${i}`}
                  id={id}
                  maps={maps}
                  order={group === 1 ? i + 1 : undefined}
                />
              ))}
            </ul>
          ) : (
            <p className="text-small text-neutral-400">No se incluyeron objetos.</p>
          )}
        </section>
      ))}
      {build.situational.length ? (
        <section className="space-y-4">
          <h4 className="text-h3 font-semibold text-neutral-100">Situacionales · cuándo cambiar</h4>
          <ul className="grid gap-4 md:grid-cols-2">
            {build.situational.map((item, i) => (
              <Item key={`${item.item}-${i}`} id={item.item} maps={maps} reason={item.reason} />
            ))}
          </ul>
        </section>
      ) : null}
      {"nowByPhase" in build && Object.values(build.nowByPhase).some((ids) => ids.length) ? (
        <div className="space-y-5 border-t border-divider pt-6">
          <h4 className="text-h3 font-semibold">Compras por fase</h4>
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
        </div>
      ) : null}
    </div>
  );
}
