"use client";

import { useCallback, useEffect, useState } from "react";
import type { HistoryRecord } from "@/lib/types";

/**
 * Historial privado del dueño de la sesión. El servidor filtra por propietario en la
 * lista, la paginación y el borrado; borrar no devuelve cuota.
 */
export function useHistory(owner: string | null) {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(owner));
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!owner) return;
    const abort = new AbortController();
    fetch("/api/history", { cache: "no-store", signal: abort.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("No pudimos cargar tu historial. Vuelve a intentar.");
        const data = (await response.json()) as { records: HistoryRecord[]; nextCursor?: string };
        if (abort.signal.aborted) return;
        setRecords(data.records);
        setCursor(data.nextCursor || null);
        setError("");
      })
      .catch((cause) => {
        if (!abort.signal.aborted)
          setError(cause instanceof Error ? cause.message : "No pudimos cargar tu historial.");
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [owner, attempt]);

  const retry = useCallback(() => {
    setRecords([]);
    setCursor(null);
    setError("");
    setLoading(true);
    setAttempt((value) => value + 1);
  }, []);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/history?cursor=${encodeURIComponent(cursor)}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("No pudimos cargar más planes. Intenta de nuevo.");
      const data = (await response.json()) as { records: HistoryRecord[]; nextCursor?: string };
      setRecords((previous) => [
        ...previous,
        ...data.records.filter((entry) => !previous.some((record) => record.id === entry.id)),
      ]);
      setCursor(data.nextCursor || null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos cargar más planes.");
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);

  const remove = useCallback(
    async (id: string) => {
      if (deleting) return false;
      setDeleting(id);
      setError("");
      try {
        const response = await fetch(`/api/history/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error("No pudimos borrar el plan. Intenta de nuevo.");
        setRecords((previous) => previous.filter((entry) => entry.id !== id));
        return true;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No pudimos borrar el plan.");
        return false;
      } finally {
        setDeleting(null);
      }
    },
    [deleting],
  );

  return { records, hasMore: Boolean(cursor), loading, error, deleting, retry, loadMore, remove };
}
