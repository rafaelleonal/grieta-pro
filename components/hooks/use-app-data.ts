"use client";

import { useEffect, useState } from "react";
import { DRAFT_STORAGE_KEY } from "@/lib/coach-draft";
import type { AppStatus, Catalog } from "@/lib/types";

/** Catálogo de Riot y estado del servidor; datos públicos, una carga por montaje. */
export function useAppData() {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [statusError, setStatusError] = useState("");

  useEffect(() => {
    try {
      // A legacy draft without an owner must never leak between accounts.
      localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      /* Storage may be unavailable. */
    }
    const abort = new AbortController();
    void Promise.allSettled([
      fetch("/api/catalog?format=2", { signal: abort.signal }).then(async (response) => {
        if (!response.ok) throw new Error();
        setCatalog((await response.json()) as Catalog);
      }),
      fetch("/api/status", { signal: abort.signal }).then(async (response) => {
        if (!response.ok) throw new Error();
        setStatus((await response.json()) as AppStatus);
      }),
    ]).then((outcomes) => {
      if (abort.signal.aborted) return;
      if (outcomes[0].status === "rejected")
        setCatalogError(
          "No pudimos cargar el catálogo de Riot. Recarga la página para volver a intentar.",
        );
      if (outcomes[1].status === "rejected")
        setStatusError(
          "No pudimos verificar la configuración del servidor. Puedes ingresar tu clave en Conexión.",
        );
    });
    return () => abort.abort();
  }, []);

  return { catalog, status, catalogError, statusError };
}
