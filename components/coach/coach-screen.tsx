"use client";

import { type ComponentProps } from "react";
import { AlertCircle, Info, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import type { CoachWorkspace } from "@/components/hooks/use-coach-workspace";
import { AccessNotice } from "./access-notice";
import { GeneratingScreen } from "./generating-screen";
import { PlanScreen } from "./plan-screen";
import { PrepareScreen } from "./prepare-screen";

/** Etapas del coach: elegir matchup → esperar la build → build. */
export function CoachScreen({
  ws,
  preferences,
}: {
  ws: CoachWorkspace;
  preferences: ComponentProps<typeof PrepareScreen>["preferences"];
}) {
  const showPlan = Boolean(ws.result && ws.resultInput && ws.catalog && !ws.editing);

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-3 px-4 pt-4 empty:hidden md:px-7">
        <AccessNotice session={ws.session} access={ws.generationAccess} />
        {ws.catalogError || ws.error ? (
          <Alert
            tone="danger"
            role="alert"
            icon={<AlertCircle size={18} />}
            title={ws.catalogError ? "No pudimos cargar los campeones" : "No llegó la build"}
            action={
              ws.error && !ws.busy && ws.generationAccess.allowed ? (
                <Button variant="ghost" onClick={() => void ws.generate()}>
                  <RotateCcw size={15} aria-hidden="true" />
                  Reintentar
                </Button>
              ) : undefined
            }
          >
            {ws.catalogError || ws.error}
          </Alert>
        ) : null}
        {ws.notice ? (
          <Alert tone="info" icon={<Info size={18} />}>
            {ws.notice}
          </Alert>
        ) : null}
      </div>
      {ws.busy ? (
        <GeneratingScreen input={ws.input} catalog={ws.catalog} onCancel={ws.cancel} />
      ) : showPlan ? (
        <PlanScreen ws={ws} />
      ) : (
        <PrepareScreen ws={ws} preferences={preferences} />
      )}
    </div>
  );
}
