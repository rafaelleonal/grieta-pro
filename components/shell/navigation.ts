import { BookOpen, Crosshair, History, Plus, UserRound, type LucideIcon } from "lucide-react";

export type View = "coach" | "sessions" | "guide" | "account";

export type NavItem = { view: View; label: string; short: string; icon: LucideIcon };

/** Destinos principales; el orden es el mismo en sidebar, riel y barra inferior. */
export const NAV_ITEMS: readonly NavItem[] = [
  { view: "coach", label: "Coach de partida", short: "Coach", icon: Crosshair },
  { view: "sessions", label: "Mis sesiones", short: "Sesiones", icon: History },
  { view: "guide", label: "Cómo funciona", short: "Guía", icon: BookOpen },
  { view: "account", label: "Cuenta", short: "Cuenta", icon: UserRound },
];

export const NEW_PREPARATION = { label: "Nueva preparación", short: "Nueva", icon: Plus };

export const VIEW_TITLES: Record<View, string> = {
  coach: "League of Legends",
  sessions: "Mis sesiones",
  guide: "Cómo funciona",
  account: "Cuenta",
};
