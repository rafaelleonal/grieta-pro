"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { DRAFT_STORAGE_KEY, EMPTY_INPUT, loadDraft, serializeDraft } from "@/lib/coach-draft";
import { postJson } from "@/lib/client-api";
import { generationAccess } from "@/lib/generation-access";
import { demoInput, demoResult } from "@/lib/demo";
import type { CoachInput, HistoryRecord, SavedCoachResult } from "@/lib/types";
import { useAccountSession } from "./use-account-session";
import { useAppData } from "./use-app-data";

function subscribeOnline(notify: () => void) {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
}
const onlineSnapshot = () => navigator.onLine;
const serverOnlineSnapshot = () => true;

/**
 * Estado del coach (ADR 0009): campeón, rival y rol → una build. El borrador vive por
 * cuenta y se limpia al salir o cambiar de identidad. No hay reservas que esperar: si
 * una consulta falla, se puede volver a pedir.
 */
export function useCoachWorkspace() {
  const router = useRouter();
  const online = useSyncExternalStore(subscribeOnline, onlineSnapshot, serverOnlineSnapshot);
  const data = useAppData();
  const [input, setInput] = useState<CoachInput>(EMPTY_INPUT);
  const [storageReady, setStorageReady] = useState(false);
  const [draftOwner, setDraftOwner] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<SavedCoachResult | null>(null);
  const [resultInput, setResultInput] = useState<CoachInput | null>(null);
  const [sample, setSample] = useState(false);
  const [editing, setEditing] = useState(true);
  const controller = useRef<AbortController | null>(null);

  const resetWorkspace = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    setBusy(false);
    setResult(null);
    setEditing(true);
    setResultInput(null);
    setSample(false);
    setError("");
    setNotice("");
  }, []);

  const clearPrivateStateRef = useRef<() => void>(() => undefined);
  const session = useAccountSession({
    onSessionChanged: () => clearPrivateStateRef.current(),
    onIdentityChange: (previous, next) => {
      // The first anonymous read has nothing private to clear.
      if (previous === undefined && next === null) {
        setDraftOwner(null);
        setStorageReady(true);
        return;
      }
      resetWorkspace();
      let saved: CoachInput | null = null;
      try {
        if (previous) localStorage.removeItem(`${DRAFT_STORAGE_KEY}:${previous}`);
        if (next) saved = loadDraft(localStorage.getItem(`${DRAFT_STORAGE_KEY}:${next}`));
      } catch {
        /* Browser storage is optional. */
      }
      setInput(saved || EMPTY_INPUT);
      setDraftOwner(next);
      setStorageReady(true);
    },
  });
  const { account, owner, identityRef, refreshAccount } = session;

  const clearPrivateState = useCallback(() => {
    resetWorkspace();
    setInput(EMPTY_INPUT);
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      if (identityRef.current)
        localStorage.removeItem(`${DRAFT_STORAGE_KEY}:${identityRef.current}`);
    } catch {
      /* Private state is cleared in memory even without browser storage. */
    }
  }, [resetWorkspace, identityRef]);
  useEffect(() => {
    clearPrivateStateRef.current = clearPrivateState;
  }, [clearPrivateState]);

  // Abort a request in flight when the workspace unmounts.
  useEffect(() => () => controller.current?.abort(), []);

  // Persist the draft only for the account that owns it.
  useEffect(() => {
    if (!storageReady || !owner || draftOwner !== owner) return;
    try {
      localStorage.setItem(`${DRAFT_STORAGE_KEY}:${owner}`, serializeDraft(input));
    } catch {
      /* The draft remains available in memory. */
    }
  }, [input, storageReady, owner, draftOwner]);

  const switchingAccount = Boolean(account && draftOwner !== owner);
  const access = generationAccess({
    account,
    accountError: session.accountError,
    status: data.status,
    statusError: data.statusError,
    online,
    busy: busy || switchingAccount,
    selectionReady: Boolean(
      input.champion &&
      input.enemy &&
      input.champion !== input.enemy &&
      data.catalog?.champions.some((entry) => entry.id === input.champion) &&
      data.catalog?.champions.some((entry) => entry.id === input.enemy),
    ),
  });

  async function generate() {
    if (controller.current) return;
    if (!access.allowed) {
      if (access.action === "login") router.push("/login");
      else if (access.action === "verify") router.push("/verify-email");
      else setError(access.message);
      return;
    }
    const requested: CoachInput = {
      champion: input.champion,
      enemy: input.enemy,
      role: input.role,
    };
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const next = await postJson<SavedCoachResult>("/api/coach", requested, abort.signal);
      if (abort.signal.aborted || identityRef.current !== owner) return;
      setResult(next);
      setResultInput(requested);
      setEditing(false);
      setSample(false);
    } catch (cause) {
      if (!abort.signal.aborted)
        setError(cause instanceof Error ? cause.message : "No pudimos obtener la build.");
    } finally {
      if (controller.current === abort) {
        controller.current = null;
        setBusy(false);
      }
      void refreshAccount();
    }
  }

  /** La build sigue generándose en el servidor y quedará en Sesiones y en la caché. */
  function cancel() {
    controller.current?.abort();
    controller.current = null;
    setBusy(false);
    setNotice("Dejaste de esperar. Si la build termina, aparecerá en Sesiones.");
  }

  function restoreHistory(record: HistoryRecord) {
    if (busy) cancel();
    const restored: CoachInput = {
      champion: record.input.champion,
      enemy: record.input.enemy,
      role: record.input.role,
    };
    setInput(restored);
    setResultInput(restored);
    setResult(record.result);
    setEditing(false);
    setSample(false);
    setError("");
    setNotice("Build guardada. Revisa el parche antes de reutilizarla.");
  }

  function showExample() {
    setInput({ ...demoInput });
    setResult(demoResult);
    setEditing(false);
    setResultInput({ ...demoInput });
    setSample(true);
    setError("");
    setNotice("");
  }

  function resetSession() {
    if (busy) cancel();
    setInput(EMPTY_INPUT);
    setResult(null);
    setEditing(true);
    setResultInput(null);
    setSample(false);
    setError("");
    setNotice("");
  }

  return {
    ...data,
    session,
    input,
    setInput,
    generationAccess: access,
    busy,
    error,
    notice,
    setNotice,
    result,
    resultInput,
    sample,
    editing,
    setEditing,
    switchingAccount,
    generate,
    restoreHistory,
    showExample,
    resetSession,
    cancel,
    clearPrivateState,
  };
}

export type CoachWorkspace = ReturnType<typeof useCoachWorkspace>;
