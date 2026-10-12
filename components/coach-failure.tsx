import { History, RefreshCw } from "lucide-react";

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
    <section className="panel result-panel coach-recovery" aria-label="Revisar consulta">
      <h2>No llegó el plan</h2>
      <p>Tu selección sigue guardada.</p>
      <div className="coach-recovery-actions">
        <button className="primary-button" type="button" onClick={onCheck} disabled={checking}>
          <RefreshCw size={16} className={checking ? "spin" : undefined} aria-hidden="true" />
          {checking ? "Comprobando…" : "Comprobar estado"}
        </button>
        <button className="secondary-button" type="button" onClick={onHistory}>
          <History size={16} aria-hidden="true" />
          Ver mis planes
        </button>
      </div>
      {checked ? (
        <p role="status">
          {checkError
            ? "Estado sin confirmar. No iniciamos otra consulta."
            : uncertain
              ? "Consulta pendiente o coste por confirmar. No iniciamos otra consulta."
              : "Sin consultas pendientes. No llegó el plan; puedes generar otro."}
        </p>
      ) : null}
      {previousPlan ? (
        <p className="coach-recovery-previous">El plan de abajo es de una consulta anterior.</p>
      ) : null}
      <details>
        <summary>Ver detalles</summary>
        <p>{error}</p>
      </details>
    </section>
  );
}
