"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { emptyGameProfile, type GameProfile } from "@/lib/game-profile-client";

type Snapshot = GameProfile & { owner: string; ready: boolean; error: string };

/**
 * Perfil de juego del dueño de la sesión: rango, hasta 2 posiciones y si ya hizo el
 * onboarding. Se guarda en el servidor; nunca incluye el Riot ID.
 */
export function useGameProfile(owner: string | null, onLoaded?: (profile: GameProfile) => void) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [saving, setSaving] = useState(false);
  const loadedRef = useRef(onLoaded);
  useEffect(() => {
    loadedRef.current = onLoaded;
  });

  useEffect(() => {
    if (!owner) return;
    const abort = new AbortController();
    fetch("/api/profile", { cache: "no-store", signal: abort.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("No pudimos cargar tu perfil de juego.");
        const profile = (await response.json()) as GameProfile;
        if (abort.signal.aborted) return;
        setSnapshot({ ...profile, owner, ready: true, error: "" });
        loadedRef.current?.(profile);
      })
      .catch((cause) => {
        if (abort.signal.aborted) return;
        setSnapshot({
          ...emptyGameProfile(),
          // Without a readable profile we never force the onboarding again.
          onboarded: true,
          owner,
          ready: true,
          error: cause instanceof Error ? cause.message : "No pudimos cargar tu perfil de juego.",
        });
      });
    return () => abort.abort();
  }, [owner]);

  const current = snapshot?.owner === owner ? snapshot : null;

  const save = useCallback(
    async (changes: Partial<Pick<GameProfile, "rank" | "positions" | "onboarded">>) => {
      if (!owner || !current || saving) return false;
      setSaving(true);
      try {
        const response = await fetch("/api/profile", {
          method: "PUT",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rank: changes.rank !== undefined ? changes.rank : current.rank,
            positions: changes.positions ?? current.positions,
            onboarded: changes.onboarded ?? current.onboarded,
            version: current.version,
          }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok)
          throw new Error(
            typeof data?.error === "string" ? data.error : "No pudimos guardar tu perfil.",
          );
        setSnapshot({ ...(data as GameProfile), owner, ready: true, error: "" });
        return true;
      } catch (cause) {
        setSnapshot((previous) =>
          previous?.owner === owner
            ? {
                ...previous,
                error: cause instanceof Error ? cause.message : "No pudimos guardar tu perfil.",
              }
            : previous,
        );
        return false;
      } finally {
        setSaving(false);
      }
    },
    [owner, current, saving],
  );

  return {
    profile: current,
    positions: current?.positions || [],
    needsOnboarding: Boolean(current?.ready && !current.onboarded),
    saving,
    error: current?.error || "",
    save,
  };
}

export type GameProfileState = ReturnType<typeof useGameProfile>;
