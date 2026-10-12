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
    <section className="panel result-panel coach-recovery" aria-label="Recuperar esta consulta">
      <h2>El coach no respondió esta vez</h2>
      <p>
        Tu selección sigue guardada. Puedes revisar este intento o consultar tus planes anteriores.
      </p>
      <div className="coach-recovery-actions">
        <button className="primary-button" type="button" onClick={onCheck} disabled={checking}>
          <RefreshCw size={16} className={checking ? "spin" : undefined} aria-hidden="true" />
          {checking ? "Comprobando…" : "Comprobar estado"}
        </button>
        <button className="secondary-button" type="button" onClick={onHistory}>
          <History size={16} aria-hidden="true" />
          Ver planes guardados
        </button>
      </div>
      {checked ? (
        <p role="status">
          {checkError
            ? "Todavía no pudimos confirmar el estado del intento. No hemos iniciado otra consulta."
            : uncertain
              ? "Todavía hay un intento pendiente o con coste incierto. No hemos iniciado otra consulta."
              : "No hay consultas en curso. No obtuvimos consejos para este intento; tu selección está lista si decides generar otro."}
        </p>
      ) : null}
      {previousPlan ? (
        <p className="coach-recovery-previous">
          El plan que aparece debajo pertenece a una consulta anterior.
        </p>
      ) : null}
      <details>
        <summary>Ver qué ocurrió</summary>
        <p>{error}</p>
      </details>
    </section>
  );
}
