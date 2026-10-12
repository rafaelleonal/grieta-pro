"use client";

import { useState } from "react";
import { AlertCircle, Info } from "lucide-react";
import { CoachFailure } from "@/components/coach-failure";
import { Alert } from "@/components/ui/feedback";
import type { Role } from "@/lib/types";
import type { CoachWorkspace } from "@/components/hooks/use-coach-workspace";
import { AccessNotice } from "./access-notice";
import { CaptureScreen } from "./capture-screen";
import { GeneratingScreen } from "./generating-screen";
import { PlanScreen } from "./plan-screen";
import { PrepareScreen } from "./prepare-screen";

/** Etapas del coach: preparar (manual o captura) → generando → plan. */
export function CoachScreen({
  ws,
  preferences,
  positions,
  onOpenSessions,
  onRankChange,
}: {
  onRankChange: (rank: string) => void;
  ws: CoachWorkspace;
  preferences: { favorites: Record<Role, string[]> };
  positions: Role[];
  onOpenSessions: () => void;
}) {
  const [mode, setMode] = useState<"manual" | "capture">("manual");
  const showPlan = Boolean(ws.result && ws.resultInput && ws.catalog && !ws.editing);
  const failure = ws.coachFailure && ws.error && !ws.busy;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-3 px-4 pt-4 empty:hidden md:px-7">
        <AccessNotice session={ws.session} />
        {ws.catalogError || (ws.error && !ws.coachFailure) ? (
          <Alert
            tone="danger"
            role="alert"
            icon={<AlertCircle size={18} />}
            title={
              ws.catalogError
                ? "No pudimos cargar los campeones"
                : "No pudimos completar la solicitud"
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
        {failure ? (
          <CoachFailure
            checking={ws.session.checkingConsumption}
            checked={ws.recoveryChecked}
            uncertain={ws.session.hasReservedRequests}
            error={ws.error}
            checkError={ws.session.consumptionError}
            previousPlan={Boolean(ws.result)}
            onCheck={ws.checkRecovery}
            onHistory={onOpenSessions}
          />
        ) : null}
      </div>
      {ws.busy === "coach" ? (
        <GeneratingScreen input={ws.input} catalog={ws.catalog} onCancel={ws.cancel} />
      ) : showPlan ? (
        <PlanScreen ws={ws} />
      ) : mode === "capture" ? (
        <CaptureScreen ws={ws} onManual={() => setMode("manual")} />
      ) : (
        <PrepareScreen
          ws={ws}
          preferences={preferences}
          positions={positions}
          onCapture={() => setMode("capture")}
          onRankChange={onRankChange}
        />
      )}
    </div>
  );
}
