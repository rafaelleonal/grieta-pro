"use client";

import { useCallback, useState } from "react";
import type { RiotResult } from "@/lib/types";

/** Estado del formulario de partida activa con Riot ID; la llamada vive en el workspace. */
export function useRiotImport() {
  const [riotOpen, setRiotOpen] = useState(false);
  const [riotId, setRiotId] = useState("");
  const [platform, setPlatform] = useState("LA1");
  const [riot, setRiot] = useState<RiotResult | null>(null);
  const reset = useCallback(() => {
    setRiot(null);
    setRiotId("");
  }, []);
  return { riotOpen, setRiotOpen, riotId, setRiotId, platform, setPlatform, riot, setRiot, reset };
}

export type RiotImport = ReturnType<typeof useRiotImport>;
