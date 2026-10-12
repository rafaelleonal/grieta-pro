import { Diamond, Gem, ListOrdered, Zap } from "lucide-react";
import type { SavedCoachResult } from "@/lib/types";
import { CatalogArt, resolveEntry } from "./catalog-art";
import { DetailHeading, type Maps } from "./shared";

function Rune({
  value,
  maps,
  keystone = false,
}: {
  value: string;
  maps: Maps;
  keystone?: boolean;
}) {
  const rune = resolveEntry(maps.runes, value);
  return (
    <li
      className={`flex items-center gap-3 rounded-md p-3 ${keystone ? "border border-accent-800 bg-accent-900/40" : "bg-bg"}`}
    >
      <CatalogArt entry={rune} kind="rune" prominent={keystone} />
      <div className="min-w-0">
        {keystone ? (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent-300">
            Runa clave
          </p>
        ) : null}
        <p className="text-body font-medium text-text">{rune?.name || value}</p>
      </div>
    </li>
  );
}
function Spells({ values, maps }: { values: string[]; maps: Maps }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {values.map((value, i) => {
        const spell = resolveEntry(maps.summoners, value);
        return (
          <li
            key={`${value}-${i}`}
            className="flex min-w-0 items-center gap-3 rounded-md border border-divider bg-bg p-4"
          >
            <CatalogArt entry={spell} kind="spell" prominent />
            <span className="text-body font-semibold text-text">{spell?.name || value}</span>
          </li>
        );
      })}
    </ul>
  );
}
export function LoadoutDetails({
  build,
  maps,
}: {
  build: SavedCoachResult["plan"]["build"];
  maps: Maps;
}) {
  const { runes, summoners, skillOrder } = build;
  return (
    <div className="space-y-8">
      <section className="space-y-5">
        <DetailHeading
          icon={Zap}
          title="Hechizos de invocador"
          description="Tu elección y el motivo para esta partida."
        />
        {Array.isArray(summoners) ? (
          <Spells values={summoners} maps={maps} />
        ) : summoners ? (
          <>
            <Spells values={summoners.pick} maps={maps} />
            <p className="max-w-prose text-body leading-relaxed text-neutral-200">
              {summoners.why}
            </p>
            {summoners.alternative ? (
              <div className="space-y-4 rounded-md border border-divider p-4">
                <h5 className="font-semibold text-accent-200">
                  Alternativa · {summoners.alternative.when}
                </h5>
                <Spells values={summoners.alternative.pick} maps={maps} />
                <p className="text-small text-neutral-300">{summoners.alternative.why}</p>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-neutral-400">No se incluyeron hechizos válidos.</p>
        )}
      </section>
      <section className="space-y-5 border-t border-divider pt-8">
        <DetailHeading
          icon={Gem}
          title="Runas"
          description="Identifica la runa clave y las dos ramas antes de entrar."
        />
        {Array.isArray(runes) ? (
          <ul className="grid gap-3 md:grid-cols-2">
            {runes.map((r, i) => (
              <Rune key={`${r}-${i}`} value={r} maps={maps} />
            ))}
          </ul>
        ) : runes ? (
          <>
            <div className="grid items-start gap-6 md:grid-cols-2">
              {[
                {
                  label: "Rama principal",
                  style: runes.primary.style,
                  values: [runes.primary.keystone, ...runes.primary.minors],
                },
                {
                  label: "Rama secundaria",
                  style: runes.secondary.style,
                  values: runes.secondary.minors,
                },
              ].map((branch, branchIndex) => (
                <div key={branch.label} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CatalogArt entry={resolveEntry(maps.styles, branch.style)} kind="style" />
                    <div>
                      <p className="text-xs text-neutral-400">{branch.label}</p>
                      <h5 className="mt-1 text-h3 font-semibold">
                        {resolveEntry(maps.styles, branch.style)?.name || branch.style}
                      </h5>
                    </div>
                  </div>
                  <ul className="space-y-3">
                    {branch.values.map((r, i) => (
                      <Rune
                        key={`${r}-${i}`}
                        value={r}
                        maps={maps}
                        keystone={branchIndex === 0 && i === 0}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <h5 className="font-semibold">Fragmentos</h5>
              <ul className="flex flex-wrap gap-3">
                {runes.shards.map((shard, i) => (
                  <li
                    key={`${shard}-${i}`}
                    className="flex items-center gap-2 rounded-md border border-divider px-3 py-2 text-small text-neutral-200"
                  >
                    <Diamond size={16} aria-hidden="true" className="text-accent-300" />
                    {shard}
                  </li>
                ))}
              </ul>
            </div>
            <p className="max-w-prose text-body leading-relaxed text-neutral-200">{runes.why}</p>
            {runes.alternative ? (
              <div className="space-y-3 rounded-md border border-divider p-4">
                <h5 className="font-semibold text-accent-200">
                  Alternativa · {runes.alternative.when}
                </h5>
                <ul>
                  <Rune value={runes.alternative.keystone} maps={maps} />
                </ul>
                <p className="text-small text-neutral-300">{runes.alternative.why}</p>
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-neutral-400">No se incluyeron runas válidas.</p>
        )}
      </section>
      <section className="space-y-5 border-t border-divider pt-8">
        <DetailHeading
          icon={ListOrdered}
          title="Orden de habilidades"
          description="Qué subir en tus primeros seis niveles."
        />
        {typeof skillOrder === "string" ? (
          <p className="text-h3 font-semibold text-accent-200">{skillOrder}</p>
        ) : skillOrder ? (
          <>
            <ol className="grid grid-cols-6 gap-2 sm:gap-3">
              {skillOrder.first6.map((skill, i) => (
                <li key={i} className="space-y-2 text-center">
                  <span className="block text-xs text-neutral-400">Nv. {i + 1}</span>
                  <span className="grid min-h-12 place-items-center rounded-md border border-accent-800 bg-accent-900/40 text-h2 font-semibold text-accent-200">
                    {skill || "—"}
                  </span>
                </li>
              ))}
            </ol>
            <p className="rounded-md bg-bg p-4 text-body text-neutral-300">
              Prioridad de mejora{" "}
              <strong className="ml-2 inline-block text-h3 font-semibold text-text">
                {skillOrder.max}
              </strong>
            </p>
          </>
        ) : (
          <p className="text-neutral-400">No se incluyó un orden válido.</p>
        )}
      </section>
    </div>
  );
}
