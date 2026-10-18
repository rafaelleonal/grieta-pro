"use client";

import { ChevronDown, Sparkles } from "lucide-react";
import { StatusPill } from "@/components/ui/tag";
import { modelLabel } from "@/lib/model-labels";
import { accountAccessLabel } from "@/lib/account-presentation";
import type { AccountStatus } from "@/lib/auth-client";
import type { Catalog } from "@/lib/types";

/** Modelo, cuota disponible y estado del catálogo de Riot (barra superior). */
export function CoachTopbar({
  modelId,
  account,
  catalog,
  onModel,
  onAccount,
}: {
  modelId?: string;
  account: AccountStatus | null;
  catalog: Catalog | null;
  onModel: () => void;
  onAccount: () => void;
}) {
  const usage = account?.usage;
  const ratio = usage && usage.coachLimit ? usage.coachRemaining / usage.coachLimit : 0;
  return (
    <>
      <button
        type="button"
        onClick={onModel}
        title={modelId ? `Cambiar modelo · ${modelLabel(modelId)} (${modelId})` : "Cambiar modelo"}
        className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-label ring-1 ring-inset ring-neutral-700 hover:ring-neutral-500"
      >
        <Sparkles size={14} aria-hidden="true" className="text-accent-300" />
        {modelId ? modelLabel(modelId) : "Modelo de OpenRouter"}
        <ChevronDown size={14} aria-hidden="true" className="text-neutral-400" />
      </button>
      {account?.authenticated && usage ? (
        <button
          type="button"
          onClick={onAccount}
          aria-label={`${accountAccessLabel(account)}: ${usage.coachRemaining} builds disponibles`}
          className="inline-flex min-h-11 items-center gap-2.5 rounded-md px-3 text-label ring-1 ring-inset ring-neutral-700 hover:ring-neutral-500"
        >
          {accountAccessLabel(account)}
          <span aria-hidden="true" className="h-1 w-11 overflow-hidden rounded-full bg-neutral-800">
            <span
              className="block h-full rounded-full bg-accent"
              style={{ width: `${Math.min(1, ratio) * 100}%` }}
            />
          </span>
          {usage.coachRemaining} restantes
        </button>
      ) : null}
      {catalog ? (
        <StatusPill live={catalog.source === "live"}>
          CATÁLOGO {catalog.version}
          {catalog.source === "snapshot" ? " · RESPALDO" : ""}
        </StatusPill>
      ) : (
        <StatusPill live={false}>CARGANDO DATOS</StatusPill>
      )}
    </>
  );
}
