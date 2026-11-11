"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readAccount, type AccountStatus } from "@/lib/auth-client";

/** Sesión verificada en el servidor y builds de hoy. No genera ni concilia nada. */
export function useAccountSession(handlers: {
  /** Un inicio de sesión completado limpia el estado privado antes de leer la nueva sesión. */
  onSessionChanged: () => void;
  /** Se llama al cambiar el dueño visible; `previous` es `undefined` en la primera lectura. */
  onIdentityChange: (previous: string | null | undefined, next: string | null) => void;
}) {
  const [account, setAccount] = useState<AccountStatus | null>(null);
  const [accountError, setAccountError] = useState("");
  /** Dueño del estado privado visible; `undefined` hasta leer la primera sesión. */
  const identityRef = useRef<string | null | undefined>(undefined);
  const accountRequest = useRef(0);
  // Latest handlers, read from network and event callbacks rather than from effects.
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });
  const owner = account?.authenticated ? account.user?.id || null : null;
  const verifiedOwner = account?.user?.emailVerified ? owner : null;

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
        setAccountError("No se pudo comprobar tu cuenta. Reintenta.");
    }
  }, [applyAccount]);

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
    window.addEventListener("focus", focus);
    window.addEventListener("cholo-coach:session-changed", changed);
    document.addEventListener("visibilitychange", focus);
    return () => {
      accountRequest.current += 1;
      window.removeEventListener("focus", focus);
      window.removeEventListener("cholo-coach:session-changed", changed);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [refreshAccount]);

  return {
    account,
    accountError,
    owner,
    verifiedOwner,
    identityRef,
    refreshAccount,
    markLoggedOut,
  };
}

export type AccountSession = ReturnType<typeof useAccountSession>;
