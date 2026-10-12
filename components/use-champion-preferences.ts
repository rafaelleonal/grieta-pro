"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  emptyChampionPreferences,
  MAX_CHAMPION_FAVORITES,
  readChampionPreferences,
  type ChampionPreferences,
} from "@/lib/champion-roles";
import type { Role } from "@/lib/types";

type Snapshot = ChampionPreferences & {
  owner: string;
  loading: boolean;
  saving: boolean;
  ready: boolean;
  error: string;
};
const EMPTY = emptyChampionPreferences();

export function useChampionPreferences(owner: string | null) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const identity = useRef<string | null>(null);
  const sequence = useRef(0);
  const controller = useRef<AbortController | null>(null);
  const writing = useRef(false);

  const refresh = useCallback(async (expectedOwner: string, conflict = false) => {
    const request = ++sequence.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    const current = () =>
      identity.current === expectedOwner && sequence.current === request && !abort.signal.aborted;
    setSnapshot((previous) =>
      previous?.owner === expectedOwner
        ? { ...previous, loading: true, error: "" }
        : {
            ...emptyChampionPreferences(),
            owner: expectedOwner,
            loading: true,
            saving: false,
            ready: false,
            error: "",
          },
    );
    try {
      const response = await fetch("/api/champion-preferences", {
        cache: "no-store",
        signal: abort.signal,
      });
      if (!response.ok) throw new Error("No pudimos cargar tus favoritos. Vuelve a intentar.");
      const preferences = readChampionPreferences(await response.json());
      if (!current()) return;
      setSnapshot({
        ...preferences,
        owner: expectedOwner,
        loading: false,
        saving: false,
        ready: true,
        error: conflict
          ? "Tus favoritos cambiaron en otra pestaña. Ya los actualizamos; repite el cambio si lo necesitas."
          : "",
      });
    } catch {
      if (!current()) return;
      setSnapshot((previous) => ({
        ...(previous?.owner === expectedOwner ? previous : emptyChampionPreferences()),
        owner: expectedOwner,
        loading: false,
        saving: false,
        ready: false,
        error: "No pudimos cargar tus favoritos. Tu selección sigue aquí; vuelve a intentar.",
      }));
    }
  }, []);

  useEffect(() => {
    identity.current = owner;
    sequence.current += 1;
    writing.current = false;
    controller.current?.abort();
    if (!owner) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Erase private data when the verified account disappears, also guarded by owner during render.
      setSnapshot(null);
      return;
    }
    void refresh(owner);
    return () => {
      sequence.current += 1;
      controller.current?.abort();
      identity.current = null;
    };
  }, [owner, refresh]);

  const save = useCallback(
    async (role: Role, champions: string[]) => {
      if (
        !owner ||
        identity.current !== owner ||
        snapshot?.owner !== owner ||
        !snapshot.ready ||
        snapshot.loading ||
        writing.current
      )
        return;
      if (champions.length > MAX_CHAMPION_FAVORITES) {
        setSnapshot((previous) =>
          previous?.owner === owner
            ? {
                ...previous,
                error:
                  "Puedes guardar hasta 12 favoritos por posición. Quita uno para añadir otro.",
              }
            : previous,
        );
        return;
      }
      writing.current = true;
      const request = ++sequence.current;
      controller.current?.abort();
      const abort = new AbortController();
      controller.current = abort;
      const current = () =>
        identity.current === owner && sequence.current === request && !abort.signal.aborted;
      setSnapshot((previous) =>
        previous?.owner === owner ? { ...previous, saving: true, error: "" } : previous,
      );
      try {
        const response = await fetch("/api/champion-preferences", {
          method: "PUT",
          cache: "no-store",
          signal: abort.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role, champions, version: snapshot.versions[role] }),
        });
        if (!current()) return;
        if (response.status === 409) {
          await refresh(owner, true);
          if (identity.current === owner) writing.current = false;
          return;
        }
        if (!response.ok) throw new Error();
        const preferences = readChampionPreferences(await response.json());
        if (!current()) return;
        setSnapshot({
          ...preferences,
          owner,
          loading: false,
          saving: false,
          ready: true,
          error: "",
        });
      } catch {
        if (!current()) return;
        setSnapshot((previous) =>
          previous?.owner === owner
            ? {
                ...previous,
                saving: false,
                ready: false,
                error:
                  "No pudimos confirmar el cambio. Actualiza tus favoritos antes de volver a guardar.",
              }
            : previous,
        );
      } finally {
        if (current()) writing.current = false;
      }
    },
    [owner, snapshot, refresh],
  );

  const owned = owner && snapshot?.owner === owner ? snapshot : null;
  return {
    favorites: owned?.favorites || EMPTY.favorites,
    loading: Boolean(owner && (!owned || owned.loading)),
    saving: owned?.saving || false,
    ready: owned?.ready || false,
    error: owned?.error || "",
    save,
    refresh: () => {
      if (owner && identity.current === owner && !writing.current) void refresh(owner);
    },
  };
}
