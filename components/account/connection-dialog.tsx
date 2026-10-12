"use client";

import { Dialog } from "@/components/ui/dialog";
import type { CoachWorkspace } from "@/components/hooks/use-coach-workspace";
import { ConnectionForm } from "./connection-form";

export function ConnectionDialog({ ws }: { ws: CoachWorkspace }) {
  return (
    <Dialog
      title="Conecta tu coach"
      description="Tu plan habilita los modelos disponibles. Puedes añadir tu propia clave de OpenRouter; tu cuenta y sus límites siguen siendo necesarios."
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
