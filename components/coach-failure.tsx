import { AlertCircle, ChevronDown, History } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CoachFailure({
  uncertain,
  error,
  previousPlan,
  onHistory,
}: {
  uncertain: boolean;
  error: string;
  previousPlan: boolean;
  onHistory: () => void;
}) {
  return (
    <section
      className="flex flex-col gap-4 rounded-lg border border-divider bg-surface p-5 md:p-6"
      aria-label="Revisar consulta"
    >
      <div className="flex items-start gap-3">
        <AlertCircle size={22} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />
        <div className="flex min-w-0 flex-col gap-1" role="status">
          <h2 className="text-h2 font-medium text-text">No llegó el plan</h2>
          <p className="text-body text-neutral-300">Tu selección sigue guardada.</p>
          {uncertain ? (
            <p className="text-small text-warning-text">
              La solicitud anterior aún cuenta en tu saldo hasta que confirmemos su consumo.
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button variant="primary" onClick={onHistory}>
          <History size={16} aria-hidden="true" />
          Ver mis planes
        </Button>
      </div>
      {previousPlan ? (
        <p className="text-small text-neutral-300">El plan de abajo es de una consulta anterior.</p>
      ) : null}
      <details className="group border-t border-divider pt-2">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-md text-small text-neutral-300 hover:text-text [&::-webkit-details-marker]:hidden">
          <ChevronDown size={16} className="group-open:rotate-180" aria-hidden="true" />
          Ver detalles
        </summary>
        <p className="max-w-prose pb-2 text-small text-neutral-400 wrap-anywhere">{error}</p>
      </details>
    </section>
  );
}
