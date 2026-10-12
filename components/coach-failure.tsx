import { AlertCircle, ChevronDown, History, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CoachFailure({
  checking,
  checked,
  uncertain,
  error,
  checkError,
  previousPlan,
  onCheck,
  onHistory,
}: {
  checking: boolean;
  checked: boolean;
  uncertain: boolean;
  error: string;
  checkError?: string;
  previousPlan: boolean;
  onCheck: () => void;
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
              El coste sigue por confirmar. Conservamos la reserva.
            </p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Button
          variant="primary"
          onClick={onCheck}
          disabled={checking}
          loading={checking}
          loadingLabel="Comprobando…"
        >
          <RefreshCw size={16} aria-hidden="true" />
          Comprobar estado
        </Button>
        <Button onClick={onHistory}>
          <History size={16} aria-hidden="true" />
          Ver mis planes
        </Button>
      </div>
      {checked ? (
        <p className="text-small text-neutral-300" role="status">
          {checkError
            ? "Estado sin confirmar. No iniciamos otra consulta."
            : uncertain
              ? "Consulta pendiente o coste por confirmar. No iniciamos otra consulta."
              : "Sin consultas pendientes. No llegó el plan; puedes generar otro."}
        </p>
      ) : null}
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
