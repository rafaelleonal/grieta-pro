"use client";

import { useEffect, useRef, useState } from "react";
import { AccountScreen } from "@/components/account/account-screen";
import { ConnectionDialog } from "@/components/account/connection-dialog";
import { CoachScreen } from "@/components/coach/coach-screen";
import { CoachTopbar } from "@/components/coach/coach-topbar";
import { GuideScreen } from "@/components/guide/guide-screen";
import { useCoachWorkspace } from "@/components/hooks/use-coach-workspace";
import { OfflineNotice } from "@/components/pwa-manager";
import { SessionsScreen } from "@/components/sessions/sessions-screen";
import { AppShell } from "@/components/shell/app-shell";
import type { View } from "@/components/shell/navigation";
import { useGameProfile } from "@/components/hooks/use-game-profile";
import { OnboardingScreen, type OnboardingResult } from "@/components/onboarding/onboarding-screen";
import { useChampionPreferences } from "@/components/use-champion-preferences";
import { MAX_CHAMPION_FAVORITES } from "@/lib/champion-roles";
import { PROFILE_RANKS, type ProfileRank } from "@/lib/game-profile-client";
import type { Role } from "@/lib/types";

/** Shell de Elociencia: navegación por breakpoint y una pantalla por destino. */
export default function Home() {
  const ws = useCoachWorkspace();
  const [view, setView] = useState<View>("coach");
  const [editingProfile, setEditingProfile] = useState(false);
  const preferences = useChampionPreferences(ws.session.verifiedOwner);
  const profile = useGameProfile(ws.session.verifiedOwner, (loaded) => {
    // A fresh preparation starts from the saved rank and main position.
    if (ws.result || ws.input.champion) return;
    ws.setInput({
      ...ws.input,
      rank: loaded.rank || ws.input.rank,
      role: loaded.positions[0] || ws.input.role,
    });
  });
  const positions: Role[] = profile.positions;
  const exampleRequested = useRef(false);

  // «Ver un plan de ejemplo sin cuenta» (/?ejemplo=1): se abre tras leer la sesión para que
  // el cambio de identidad no lo borre, y se retira de la URL.
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

  async function finishOnboarding(result: OnboardingResult) {
    const saved = await profile.save({
      rank: result.rank,
      positions: result.positions,
      onboarded: true,
    });
    if (!saved) return;
    // Mastery picks join the existing favorites of their position, never replace them.
    for (const role of new Set(result.favorites.map((entry) => entry.role))) {
      const picked = result.favorites
        .filter((entry) => entry.role === role)
        .map((entry) => entry.id);
      const merged = [...new Set([...picked, ...(preferences.favorites[role] || [])])].slice(
        0,
        MAX_CHAMPION_FAVORITES,
      );
      await preferences.save(role, merged);
    }
    if (result.rank) ws.update("rank", result.rank);
    if (result.positions[0] && !ws.input.champion) ws.update("role", result.positions[0]);
    setEditingProfile(false);
  }

  function changeRank(rank: string) {
    ws.update("rank", rank);
    if ((PROFILE_RANKS as readonly string[]).includes(rank))
      void profile.save({ rank: rank as ProfileRank });
  }

  if (ws.switchingAccount)
    return (
      <main role="status" className="grid min-h-dvh place-items-center text-small text-neutral-400">
        Actualizando tu cuenta…
      </main>
    );

  if ((profile.needsOnboarding || editingProfile) && ws.catalog)
    return (
      <OnboardingScreen
        catalog={champions}
        riotConfigured={Boolean(ws.status?.riotConfigured)}
        saving={profile.saving}
        saveError={profile.error}
        initial={
          editingProfile && profile.profile
            ? { rank: profile.profile.rank, positions: profile.profile.positions }
            : undefined
        }
        onFinish={(result) => void finishOnboarding(result)}
        onSkip={() => {
          if (editingProfile) setEditingProfile(false);
          else void profile.save({ onboarded: true });
        }}
      />
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
      onOpenSettings={() => ws.setSettingsOpen(true)}
      account={ws.session.account}
      keyReady={ws.ready}
      topbar={
        <CoachTopbar
          modelId={
            ws.credentials.model ||
            ws.session.account?.usage?.defaultModel ||
            ws.status?.defaultModel
          }
          account={ws.session.account}
          catalog={ws.catalog}
          onModel={() => ws.setSettingsOpen(true)}
          onAccount={() => navigate("account")}
        />
      }
    >
      <div className="px-4 pt-3 empty:hidden md:px-7">
        <OfflineNotice />
      </div>
      {view === "coach" ? (
        <CoachScreen
          ws={ws}
          preferences={preferences}
          positions={positions}
          onOpenSessions={() => navigate("sessions")}
          onRankChange={changeRank}
        />
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
        <AccountScreen
          key={ws.session.owner || "guest"}
          ws={ws}
          positions={positions}
          onEditProfile={() => setEditingProfile(true)}
        />
      )}
      {ws.settingsOpen ? <ConnectionDialog ws={ws} /> : null}
    </AppShell>
  );
}
