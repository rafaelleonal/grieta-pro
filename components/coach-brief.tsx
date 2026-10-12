import { Crosshair, ShieldAlert, Target } from "lucide-react";
import { coachBrief } from "@/lib/coach-presentation";
import type { SavedCoachResult } from "@/lib/types";

export function CoachBriefView({ result }: { result: SavedCoachResult }) {
  const brief = coachBrief(result);
  return (
    <div className="cp-brief" aria-label="Tus primeras decisiones">
      {brief.priority ? (
        <section className="cp-brief-priority">
          <Target size={20} aria-hidden="true" />
          <div>
            <h3>Tu prioridad</h3>
            <p>{brief.priority}</p>
          </div>
        </section>
      ) : (
        <p className="cp-detail-unavailable">Esta respuesta no incluyó una prioridad de juego.</p>
      )}
      <div className="cp-brief-decisions">
        <section>
          <h3>
            <Crosshair size={16} aria-hidden="true" />
            Tu ventana
          </h3>
          {brief.window ? (
            <>
              <strong>{brief.window.trigger}</strong>
              <p>{brief.window.response}</p>
            </>
          ) : (
            <p className="cp-detail-unavailable">
              No hay una ventana confirmada en esta respuesta.
            </p>
          )}
        </section>
        <section>
          <h3>
            <ShieldAlert size={16} aria-hidden="true" />
            Qué evitar
          </h3>
          <p className={brief.avoid ? undefined : "cp-detail-unavailable"}>
            {brief.avoid || "Esta respuesta no incluyó un error a evitar."}
          </p>
        </section>
      </div>
    </div>
  );
}
