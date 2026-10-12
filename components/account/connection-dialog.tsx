"use client";

import { Dialog } from "@/components/ui/dialog";
import type { CoachWorkspace } from "@/components/hooks/use-coach-workspace";
import { ConnectionForm } from "./connection-form";

export function ConnectionDialog({ ws }: { ws: CoachWorkspace }) {
  return (
    <Dialog
      title="Conexión de IA"
      description="Elige un modelo o añade tu clave de OpenRouter."
      onClose={() => ws.setSettingsOpen(false)}
    >
      <ConnectionForm
        credentials={ws.credentials}
        status={ws.status}
        account={ws.session.account}
        onSave={ws.setCredentials}
        onDone={() => ws.setSettingsOpen(false)}
      />
    </Dialog>
  );
}
