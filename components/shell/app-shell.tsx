"use client";

import type { ReactNode } from "react";
import { ChevronRight, Settings2 } from "lucide-react";
import { BrandLogo, BrandTile } from "@/components/brand";
import { PwaInstall } from "@/components/pwa-manager";
import { cn } from "@/components/ui/cn";
import type { AccountStatus } from "@/lib/auth-client";
import { NAV_ITEMS, NEW_PREPARATION, VIEW_TITLES, type View } from "./navigation";

export type ShellProps = {
  view: View;
  onNavigate: (view: View) => void;
  onNewPreparation: () => void;
  onOpenSettings: () => void;
  account: AccountStatus | null;
  keyReady: boolean;
  topbar?: ReactNode;
  children: ReactNode;
};

function initials(name?: string) {
  return (name || "GG").slice(0, 2).toUpperCase();
}

function planLabel(account: AccountStatus | null) {
  if (!account?.authenticated) return "Entrar o crear cuenta";
  return account.user?.plan === "PRO" ? "Plan Pro" : "Plan Free";
}

/**
 * Navegación por breakpoint (lienzo «Patrones»): sidebar de 232 px en escritorio, riel de
 * 76 px en tablet y barra superior + pestañas inferiores en móvil. El contenido no cambia.
 */
export function AppShell({
  view,
  onNavigate,
  onNewPreparation,
  onOpenSettings,
  account,
  keyReady,
  topbar,
  children,
}: ShellProps) {
  const primary = NAV_ITEMS.filter((item) => item.view !== "account");
  return (
    <div className="min-h-dvh bg-bg text-text md:grid md:grid-cols-[76px_minmax(0,1fr)] xl:grid-cols-[232px_minmax(0,1fr)]">
      {/* Escritorio: sidebar */}
      <aside
        aria-label="Navegación principal"
        className="sticky top-0 hidden h-dvh flex-col border-r border-divider px-3.5 py-5 xl:flex"
      >
        <button
          type="button"
          onClick={() => onNavigate("coach")}
          className="mb-7 flex min-h-11 items-center rounded-md px-2"
          aria-label="Elociencia, inicio"
        >
          <BrandLogo size={34} />
        </button>
        <p className="mb-2 px-2.5 text-overline font-medium uppercase text-neutral-500">
          Tu espacio de juego
        </p>
        <nav className="flex flex-col gap-1">
          {primary.map((item) => (
            <SidebarLink
              key={item.view}
              active={view === item.view}
              icon={<item.icon size={18} aria-hidden="true" />}
              onClick={() => onNavigate(item.view)}
            >
              {item.label}
            </SidebarLink>
          ))}
          <SidebarLink
            icon={<NEW_PREPARATION.icon size={18} aria-hidden="true" />}
            onClick={onNewPreparation}
          >
            {NEW_PREPARATION.label}
          </SidebarLink>
          <PwaInstall onOpen={() => undefined} />
        </nav>
        <div className="mt-auto flex flex-col gap-3">
          <p className="flex items-center gap-2 px-2.5 text-xs text-neutral-400">
            <span
              aria-hidden="true"
              className={cn("size-1.5 rounded-full", keyReady ? "bg-success" : "bg-neutral-600")}
            />
            {keyReady ? "OpenRouter · clave disponible" : "OpenRouter · sin configurar"}
          </p>
          <button
            type="button"
            onClick={() => onNavigate("account")}
            aria-label={account?.authenticated ? "Mi cuenta" : "Entrar a mi cuenta"}
            aria-current={view === "account" ? "page" : undefined}
            className="flex min-h-14 items-center gap-3 rounded-control border-t border-divider px-2 pt-3 text-left transition-colors hover:bg-neutral-900 aria-[current=page]:bg-accent-900"
          >
            <span className="grid size-9 flex-none place-items-center rounded-full bg-neutral-800 text-xs font-semibold text-neutral-200">
              {initials(account?.user?.name)}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <strong className="truncate text-sm font-medium">
                {account?.user?.name || "Tu espacio personal"}
              </strong>
              <span className="text-xs text-neutral-400">{planLabel(account)}</span>
            </span>
            <ChevronRight size={16} aria-hidden="true" className="text-neutral-500" />
          </button>
        </div>
      </aside>

      {/* Tablet: riel */}
      <aside
        aria-label="Navegación principal"
        className="sticky top-0 hidden h-dvh flex-col items-center gap-2 border-r border-divider py-4 md:flex xl:hidden"
      >
        <button
          type="button"
          onClick={() => onNavigate("coach")}
          className="mb-3 grid size-11 place-items-center"
          aria-label="Elociencia, inicio"
        >
          <BrandTile size={40} />
        </button>
        {primary.map((item) => (
          <RailLink
            key={item.view}
            active={view === item.view}
            label={item.short}
            icon={<item.icon size={20} aria-hidden="true" />}
            onClick={() => onNavigate(item.view)}
          />
        ))}
        <RailLink
          label={NEW_PREPARATION.short}
          icon={<NEW_PREPARATION.icon size={20} aria-hidden="true" />}
          onClick={onNewPreparation}
        />
        <button
          type="button"
          onClick={() => onNavigate("account")}
          aria-label={account?.authenticated ? "Mi cuenta" : "Entrar a mi cuenta"}
          aria-current={view === "account" ? "page" : undefined}
          className="mt-auto grid size-11 place-items-center rounded-full bg-neutral-800 text-xs font-semibold text-neutral-200 ring-accent aria-[current=page]:ring-2"
        >
          {initials(account?.user?.name)}
        </button>
      </aside>

      <div className="flex min-w-0 flex-col pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-0">
        {/* Móvil: barra superior */}
        <header className="sticky top-0 z-30 flex min-h-15 items-center gap-2 border-b border-divider bg-bg/95 px-4 backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => onNavigate("coach")}
            className="flex min-h-11 items-center"
            aria-label="Elociencia, inicio"
          >
            <BrandLogo size={30} />
          </button>
          <div className="ml-auto flex items-center gap-2">
            {account?.authenticated && account.usage ? (
              <button
                type="button"
                onClick={() => onNavigate("account")}
                className="inline-flex min-h-11 items-center rounded-full px-3 text-label ring-1 ring-inset ring-neutral-700"
                aria-label="Mi plan y consumo"
              >
                {account.user?.plan === "PRO" ? "Pro" : "Free"} · {account.usage.coachRemaining}
              </button>
            ) : null}
            <button
              type="button"
              onClick={onOpenSettings}
              className="grid size-11 place-items-center rounded-full text-neutral-300 hover:bg-neutral-900"
              aria-label="Conexión y modelo"
            >
              <Settings2 size={19} aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Escritorio y tablet: barra superior */}
        <header className="hidden min-h-15 items-center gap-3 border-b border-divider px-7 md:flex">
          <nav aria-label="Ruta" className="flex items-center gap-2 text-small">
            <span className="text-neutral-400">Tu espacio</span>
            <ChevronRight size={13} aria-hidden="true" className="text-neutral-600" />
            <span aria-current="page">{VIEW_TITLES[view]}</span>
          </nav>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">{topbar}</div>
        </header>

        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>

      {/* Móvil: pestañas inferiores */}
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-divider bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {NAV_ITEMS.map((item) => (
          <button
            key={item.view}
            type="button"
            onClick={() => onNavigate(item.view)}
            aria-current={view === item.view ? "page" : undefined}
            className="group flex min-h-16 flex-col items-center justify-center gap-1 text-overline tracking-normal text-neutral-400 aria-[current=page]:text-text"
          >
            <span className="grid h-8 w-12 place-items-center rounded-full transition-colors group-aria-[current=page]:bg-accent-900 group-aria-[current=page]:text-accent-200">
              <item.icon size={20} aria-hidden="true" />
            </span>
            {item.short}
          </button>
        ))}
      </nav>
    </div>
  );
}

function SidebarLink({
  active,
  icon,
  onClick,
  children,
}: {
  active?: boolean;
  icon: ReactNode;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className="flex min-h-11 items-center gap-3 rounded-md px-2.5 text-left text-sm text-neutral-300 transition-colors hover:bg-neutral-900 hover:text-text aria-[current=page]:bg-accent-900 aria-[current=page]:text-text"
    >
      {icon}
      <span className="flex-1 truncate">{children}</span>
      {active ? <span aria-hidden="true" className="size-1.5 rounded-full bg-accent" /> : null}
    </button>
  );
}

function RailLink({
  active,
  icon,
  label,
  onClick,
}: {
  active?: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className="flex min-h-14 w-15 flex-col items-center justify-center gap-1 rounded-control text-overline tracking-normal text-neutral-400 transition-colors hover:bg-neutral-900 hover:text-text aria-[current=page]:bg-accent-900 aria-[current=page]:text-text"
    >
      {icon}
      {label}
    </button>
  );
}
