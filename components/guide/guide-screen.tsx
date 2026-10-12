import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LegalLinks } from "@/components/legal-links";
import { RiotNotice } from "@/components/riot-notice";

const STEPS = [
  [
    "Cuéntanos tu partida",
    "Elige rol, campeón, rival y rango. O sube una foto de la selección y confirma lo que leemos.",
  ],
  [
    "Recibe el plan",
    "Tu prioridad, una ventana para actuar y qué evitar; después niveles 1–6, runas, hechizos, compras y mapa.",
  ],
  [
    "Úsalo en partida",
    "Déjalo abierto en un segundo monitor o en el móvil. Pregunta si algo cambia: cada pregunta genera un plan nuevo.",
  ],
] as const;

/** Cómo funciona: pasos, datos que usamos, límites del coach y atajos. */
export function GuideScreen({
  onExample,
  onPrepare,
}: {
  onExample: () => void;
  onPrepare: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-7 md:py-9 xl:px-14">
      <header className="flex max-w-3xl flex-col gap-2">
        <span className="text-overline font-medium uppercase text-accent-300">— Cómo funciona</span>
        <h1 className="text-h1 font-medium md:text-display">
          Un plan breve para tu partida, en tres pasos.
        </h1>
        <p className="text-small text-neutral-300 md:text-body">
          Elociencia usa un modelo de IA con el catálogo actual de Riot. Son recomendaciones para
          pensar mejor, no estadísticas óptimas.
        </p>
      </header>

      <ol className="grid gap-4 md:grid-cols-3">
        {STEPS.map(([title, text], index) => (
          <li key={title} className="flex flex-col gap-2 rounded-lg bg-surface p-5">
            <span aria-hidden="true" className="text-display font-medium text-accent-300">
              {index + 1}
            </span>
            <h2 className="text-h3 font-medium">{title}</h2>
            <p className="text-small text-neutral-300">{text}</p>
          </li>
        ))}
      </ol>

      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard title="Qué datos usamos">
          <li>Los campeones y el contexto que confirmas.</li>
          <li>El catálogo de Riot (Data Dragon) de la versión actual.</li>
          <li>Fuentes actuales sólo si las activas en Pro.</li>
        </InfoCard>
        <InfoCard title="Lo que no hace">
          <li>No garantiza que ganes ni da tasas de victoria.</li>
          <li>No lee tu partida en vivo ni toca el cliente.</li>
          <li>No guarda tus capturas originales.</li>
        </InfoCard>
        <section className="flex flex-col gap-3 rounded-lg p-5 ring-1 ring-inset ring-neutral-800">
          <h2 className="text-h3 font-medium">Atajos del plan</h2>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-2.5 text-small">
            {[
              [["S", "P"], "Selección / En partida"],
              [["1", "2", "3"], "Línea · Mid · Late"],
              [["/"], "Preguntar al coach"],
              [["Ctrl", "↵"], "Generar plan"],
            ].map(([keys, label]) => (
              <div key={label as string} className="contents">
                <dt className="flex gap-1">
                  {(keys as string[]).map((key) => (
                    <kbd
                      key={key}
                      className="min-w-6 rounded-sm px-1.5 text-center text-xs ring-1 ring-inset ring-neutral-600"
                    >
                      {key}
                    </kbd>
                  ))}
                </dt>
                <dd className="text-neutral-300">{label as string}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <div className="flex flex-col gap-3 rounded-lg bg-accent-900/60 p-5 ring-1 ring-inset ring-accent-800 md:flex-row md:items-center">
        <p className="flex-1 text-body">¿Quieres ver cómo se ve antes de usar un plan?</p>
        <Button variant="primary" onClick={onExample}>
          Ver ejemplo de Ahri
          <ArrowRight size={16} aria-hidden="true" />
        </Button>
        <Button onClick={onPrepare}>Preparar mi partida</Button>
      </div>

      <footer className="mt-auto flex flex-col gap-2 border-t border-divider pt-4">
        <LegalLinks openInNewTab />
        <RiotNotice />
      </footer>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg p-5 ring-1 ring-inset ring-neutral-800">
      <h2 className="text-h3 font-medium">{title}</h2>
      <ul className="flex list-disc flex-col gap-2 pl-5 text-small text-neutral-300">{children}</ul>
    </section>
  );
}
