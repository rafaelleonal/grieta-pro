"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readAccount, reconcileAccount, type AccountStatus } from "@/lib/auth-client";
import { GenerationIntents } from "@/lib/generation-intent";

/**
 * Sesión verificada en el servidor y conciliación del consumo. Nunca inicia una
 * generación: sólo consulta cargos existentes y conserva las reservas inciertas.
 */
export function useAccountSession(handlers: {
  /** Un inicio de sesión completado limpia el estado privado antes de leer la nueva sesión. */
  onSessionChanged: () => void;
  /** Se llama al cambiar el dueño visible; `previous` es `undefined` en la primera lectura. */
  onIdentityChange: (previous: string | null | undefined, next: string | null) => void;
}) {
  const [account, setAccount] = useState<AccountStatus | null>(null);
  const [accountError, setAccountError] = useState("");
  const [checkingConsumption, setCheckingConsumption] = useState(false);
  const [consumptionError, setConsumptionError] = useState("");
  /** Dueño del estado privado visible; `undefined` hasta leer la primera sesión. */
  const identityRef = useRef<string | null | undefined>(undefined);
  const accountRequest = useRef(0);
  const intentsRef = useRef(new GenerationIntents());
  const reconciliation = useRef<{
    owner: string;
    abort: AbortController;
    promise: Promise<void>;
  } | null>(null);
  const pollsRef = useRef(0);
  // Latest handlers, read from network and event callbacks rather than from effects.
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });
  const owner = account?.authenticated ? account.user?.id || null : null;
  const verifiedOwner = account?.user?.emailVerified ? owner : null;
  const hasReservedRequests = Boolean(account?.usage?.pending || account?.usage?.uncertain);

  /** Aplica una cuenta leída y avisa del cambio de dueño en el mismo evento. */
  const applyAccount = useCallback((next: AccountStatus) => {
    setAccount(next);
    const nextOwner = next.authenticated ? next.user?.id || null : null;
    if (identityRef.current === nextOwner) return;
    const previous = identityRef.current;
    identityRef.current = nextOwner;
    handlersRef.current.onIdentityChange(previous, nextOwner);
  }, []);

  const refreshAccount = useCallback(async () => {
    const request = ++accountRequest.current;
    try {
      const next = await readAccount();
      if (request !== accountRequest.current) return;
      setAccountError("");
      applyAccount(next);
    } catch {
      if (request === accountRequest.current)
        setAccountError(
          "No pudimos comprobar tu cuenta. Las consultas siguen protegidas en el servidor.",
        );
    }
  }, [applyAccount]);

  const checkConsumption = useCallback(
    async (idempotencyKey?: string) => {
      const current = identityRef.current;
      if (
        !current ||
        current !== verifiedOwner ||
        document.visibilityState !== "visible" ||
        !navigator.onLine
      )
        return;
      if (reconciliation.current?.owner === current) return reconciliation.current.promise;
      const abort = new AbortController();
      const key = idempotencyKey || intentsRef.current.latest();
      setCheckingConsumption(true);
      setConsumptionError("");
      const promise = (async () => {
        try {
          const outcome = await reconcileAccount(key, abort.signal);
          if (abort.signal.aborted || identityRef.current !== current) return;
          if (key) intentsRef.current.resolve(key, outcome.attempt);
          setAccount((previous) =>
            previous?.authenticated && previous.user?.id === current
              ? { ...previous, usage: outcome.usage }
              : previous,
          );
        } catch {
          if (!abort.signal.aborted && identityRef.current === current)
            setConsumptionError(
              "No pudimos confirmar el consumo todavía. Conservamos la reserva y no iniciamos otro análisis.",
            );
        } finally {
          if (reconciliation.current?.abort === abort) {
            reconciliation.current = null;
            setCheckingConsumption(false);
          }
        }
      })();
      reconciliation.current = { owner: current, abort, promise };
      return promise;
    },
    [verifiedOwner],
  );

  /** Detiene la conciliación y olvida los intentos al cambiar de identidad o salir. */
  const resetConsumption = useCallback((nextOwner: string | null) => {
    reconciliation.current?.abort.abort();
    reconciliation.current = null;
    intentsRef.current.clear();
    intentsRef.current.setOwner(nextOwner);
    pollsRef.current = 0;
    setCheckingConsumption(false);
    setConsumptionError("");
  }, []);

  /** Tras cerrar sesión en el servidor, la cuenta visible pasa a anónima. */
  const markLoggedOut = useCallback(() => {
    if (account)
      applyAccount({ ...account, authenticated: false, user: undefined, usage: undefined });
  }, [account, applyAccount]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetches the verified server session; state updates happen after the network response.
    void refreshAccount();
    const focus = () => {
      if (document.visibilityState === "visible") void refreshAccount();
    };
    const changed = () => {
      handlersRef.current.onSessionChanged();
      setAccount(null);
      void refreshAccount();
    };
    const current = reconciliation;
    window.addEventListener("focus", focus);
    window.addEventListener("cholo-coach:session-changed", changed);
    document.addEventListener("visibilitychange", focus);
    return () => {
      accountRequest.current += 1;
      current.current?.abort.abort();
      window.removeEventListener("focus", focus);
      window.removeEventListener("cholo-coach:session-changed", changed);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [refreshAccount]);

  // Pending or uncertain reservations are checked a bounded number of times.
  useEffect(() => {
    if (!verifiedOwner) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      if (
        disposed ||
        document.visibilityState !== "visible" ||
        !hasReservedRequests ||
        pollsRef.current >= 10
      )
        return;
      timer = setTimeout(() => {
        pollsRef.current += 1;
        void checkConsumption().finally(schedule);
      }, 30_000);
    };
    const checkAndSchedule = () => {
      if (timer) clearTimeout(timer);
      if (document.visibilityState === "visible") void checkConsumption().finally(schedule);
    };
    const visibility = () => {
      if (timer) clearTimeout(timer);
      if (document.visibilityState === "visible") checkAndSchedule();
      else reconciliation.current?.abort.abort();
    };
    checkAndSchedule();
    window.addEventListener("focus", checkAndSchedule);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener("focus", checkAndSchedule);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [verifiedOwner, hasReservedRequests, checkConsumption]);

  return {
    account,
    accountError,
    owner,
    verifiedOwner,
    hasReservedRequests,
    checkingConsumption,
    consumptionError,
    identityRef,
    intentsRef,
    pollsRef,
    refreshAccount,
    checkConsumption,
    resetConsumption,
    markLoggedOut,
  };
}

export type AccountSession = ReturnType<typeof useAccountSession>;
