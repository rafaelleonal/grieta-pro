import type { SavedCoachResult } from "@/lib/types";

type Props = {
  order: SavedCoachResult["plan"]["build"]["skillOrder"];
  champion: string;
};

/** Only per-level choices already present in the validated result are displayed. */
export function SkillOrder({ order, champion }: Props) {
  if (!order || typeof order === "string") return null;
  const attributes = champion === "Aphelios" && order.first6.every((skill) => skill === null);
  return (
    <section
      aria-label="Habilidades de nivel 1 a 6"
      className="space-y-3 border-b border-divider pb-4"
    >
      <h2 className="text-h3 font-semibold">Habilidades 1–6</h2>
      {attributes ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-small">
          <span className="text-neutral-400">Mejora atributos</span>
          <strong className="font-semibold text-text">{order.max}</strong>
        </div>
      ) : (
        <ol className="grid grid-cols-6 gap-2">
          {order.first6.map((skill, index) => (
            <li
              key={index}
              aria-label={`Nivel ${index + 1}: ${skill || "sin dato"}`}
              className="min-w-0 space-y-1 text-center"
            >
              <span aria-hidden="true" className="block text-xs text-neutral-400">
                Nivel {index + 1}
              </span>
              <strong
                aria-hidden="true"
                className="grid min-h-11 place-items-center rounded-md bg-bg text-h3 font-semibold text-text"
              >
                {skill || "—"}
              </strong>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
