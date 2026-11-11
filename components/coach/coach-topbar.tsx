"use client";

import { StatusPill } from "@/components/ui/tag";
import type { AccountStatus } from "@/lib/auth-client";
import type { Catalog } from "@/lib/types";

/** Builds nuevas de hoy y estado del catálogo de Riot (barra superior). */
export function CoachTopbar({
  account,
  catalog,
  onAccount,
}: {
  account: AccountStatus | null;
  catalog: Catalog | null;
  onAccount: () => void;
}) {
  const usage = account?.usage;
  return (
    <>
      {account?.authenticated && usage ? (
        <button
          type="button"
          onClick={onAccount}
          aria-label={`${usage.buildsToday} de ${usage.dailyLimit} builds nuevas hoy. Los matchups ya generados no cuentan.`}
          className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-label ring-1 ring-inset ring-neutral-700 hover:ring-neutral-500"
        >
          Hoy {usage.buildsToday}/{usage.dailyLimit}
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
