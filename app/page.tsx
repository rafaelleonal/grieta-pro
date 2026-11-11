"use client";

import { useEffect, useRef, useState } from "react";
import { AccountScreen } from "@/components/account/account-screen";
import { CoachScreen } from "@/components/coach/coach-screen";
import { CoachTopbar } from "@/components/coach/coach-topbar";
import { GuideScreen } from "@/components/guide/guide-screen";
import { useCoachWorkspace } from "@/components/hooks/use-coach-workspace";
import { OfflineNotice } from "@/components/pwa-manager";
import { SessionsScreen } from "@/components/sessions/sessions-screen";
import { AppShell } from "@/components/shell/app-shell";
import type { View } from "@/components/shell/navigation";
import { useChampionPreferences } from "@/components/use-champion-preferences";

/** Shell de Elociencia: navegación por breakpoint y una pantalla por destino. */
export default function Home() {
  const ws = useCoachWorkspace();
  const [view, setView] = useState<View>("coach");
  const preferences = useChampionPreferences(ws.session.verifiedOwner);
  const exampleRequested = useRef(false);

  // «Ver una build de ejemplo sin cuenta» (/?ejemplo=1): se abre tras leer la sesión para
  // que el cambio de identidad no la borre, y se retira de la URL.
  const accountRead = Boolean(ws.session.account);
  useEffect(() => {
    if (!accountRead || exampleRequested.current) return;
    exampleRequested.current = true;
    const params = new URLSearchParams(window.location.search);
    if (params.get("ejemplo") !== "1") return;
    window.history.replaceState(null, "", "/");
    ws.showExample();
  }, [accountRead, ws]);
  const champions = ws.catalog?.champions || [];

  if (ws.switchingAccount)
    return (
      <main role="status" className="grid min-h-dvh place-items-center text-small text-neutral-400">
        Actualizando tu cuenta…
      </main>
    );

  function navigate(next: View) {
    setView(next);
    window.scrollTo({ top: 0 });
  }

  return (
    <AppShell
      view={view}
      onNavigate={navigate}
      onNewPreparation={() => {
        ws.resetSession();
        navigate("coach");
      }}
      account={ws.session.account}
      keyReady={Boolean(ws.status?.configured)}
      topbar={
        <CoachTopbar
          account={ws.session.account}
          catalog={ws.catalog}
          onAccount={() => navigate("account")}
        />
      }
    >
      <div className="px-4 pt-3 empty:hidden md:px-7">
        <OfflineNotice />
      </div>
      {view === "coach" ? (
        <CoachScreen ws={ws} preferences={preferences} />
      ) : view === "sessions" ? (
        <SessionsScreen
          key={ws.session.owner || "guest"}
          owner={ws.session.owner}
          champions={champions}
          onOpen={(record) => {
            ws.restoreHistory(record);
            navigate("coach");
          }}
          onReprepare={(record) => {
            ws.restoreHistory(record);
            ws.setEditing(true);
            navigate("coach");
          }}
          onNew={() => {
            ws.resetSession();
            navigate("coach");
          }}
        />
      ) : view === "guide" ? (
        <GuideScreen
          onExample={() => {
            ws.showExample();
            navigate("coach");
          }}
          onPrepare={() => navigate("coach")}
        />
      ) : (
        <AccountScreen key={ws.session.owner || "guest"} ws={ws} />
      )}
    </AppShell>
  );
}
