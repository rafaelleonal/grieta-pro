"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Download, LogOut } from "lucide-react";
import { PwaInstall } from "@/components/pwa-manager";
import { Mascot } from "@/components/brand";
import { Button, buttonClasses } from "@/components/ui/button";
import { Meter } from "@/components/ui/feedback";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import type { CoachWorkspace } from "@/components/hooks/use-coach-workspace";

const SECTIONS = [
  ["builds", "Builds de hoy"],
  ["perfil", "Perfil"],
  ["privacidad", "Privacidad"],
] as const;

type AccountWorkspace = Pick<CoachWorkspace, "clearPrivateState"> & {
  session: Pick<CoachWorkspace["session"], "account" | "markLoggedOut" | "refreshAccount">;
};

/** Cuenta (ADR 0009): builds nuevas de hoy, perfil, privacidad e instalación. */
export function AccountScreen({ ws }: { ws: AccountWorkspace }) {
  const { session } = ws;
  const account = session.account;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    if (busy) return;
    setBusy(true);
    setError("");
    ws.clearPrivateState();
    try {
      const outcome = await authClient.signOut();
      if (outcome.error) {
        setError(authErrorMessage(outcome.error));
        return;
      }
      session.markLoggedOut();
      await session.refreshAccount();
    } catch {
      setError("No se cerró la sesión. Reintenta; los datos locales ya se limpiaron.");
    } finally {
      setBusy(false);
    }
  }

  if (!account?.authenticated)
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-10 text-center">
        <Mascot size={112} />
        <h1 className="text-h1 font-medium">Tu cuenta</h1>
        <p className="max-w-md text-small text-neutral-400">
          Entra para pedir builds y ver las que ya generaste.
        </p>
        <Link href="/login" className={buttonClasses("primary")}>
          Entrar o crear cuenta
        </Link>
      </div>
    );

  const user = account.user;
  const usage = account.usage;
  return (
    <div className="flex flex-1 flex-col gap-5 px-4 py-5 md:px-7 md:py-7 xl:grid xl:grid-cols-[220px_minmax(0,1fr)] xl:items-start xl:gap-7">
      <div className="flex flex-col gap-4 xl:sticky xl:top-6">
        <h1 className="text-h1 font-medium md:text-display">Cuenta</h1>
        <nav aria-label="Secciones de la cuenta" className="hidden flex-col gap-1 xl:flex">
          {SECTIONS.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="flex min-h-11 items-center rounded-md px-3 text-sm text-neutral-300 hover:bg-neutral-900 hover:text-text"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <Section id="builds" title="Builds de hoy">
          {usage ? (
            <div className="flex flex-col gap-3">
              <Meter
                label="Builds nuevas"
                value={Math.max(0, usage.dailyLimit - usage.buildsToday)}
                max={usage.dailyLimit}
                detail={`${usage.buildsToday} usadas de ${usage.dailyLimit}`}
              />
              <p className="text-xs text-neutral-400">
                Se renuevan a las 00:00 UTC. Un matchup que ya se generó en este parche sale al
                instante y no cuenta.
              </p>
              {usage.appBudgetReached ? (
                <p role="status" className="text-small text-warning-text">
                  La app alcanzó su presupuesto de IA de hoy: sólo responden los matchups ya
                  generados.
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-small text-neutral-400">Verifica tu correo para pedir builds.</p>
          )}
        </Section>

        <div className="grid gap-5 lg:grid-cols-2">
          <Section id="perfil" title="Perfil">
            <dl className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-x-3 gap-y-2.5 text-small">
              <dt className="text-neutral-400">Nombre</dt>
              <dd>{user?.name}</dd>
              <dt className="text-neutral-400">Correo</dt>
              <dd className="truncate">
                {user?.email}{" "}
                {user?.emailVerified ? (
                  <span className="text-xs text-success-text">· verificado</span>
                ) : null}
              </dd>
              <dt className="text-neutral-400">Rol</dt>
              <dd>{user?.role === "ADMIN" ? "Administrador" : "Jugador"}</dd>
            </dl>
            {error ? (
              <p role="alert" className="text-small text-danger-text">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Link href="/login?mode=forgot" className={buttonClasses("secondary")}>
                Cambiar contraseña
              </Link>
              <Button variant="ghost" loading={busy} onClick={() => void logout()}>
                <LogOut size={16} aria-hidden="true" />
                Cerrar sesión
              </Button>
            </div>
          </Section>

          <Section id="privacidad" title="Privacidad">
            <p className="text-small text-neutral-300">
              Sólo guardamos tu campeón, tu rival, tu rol y la build. Cerrar sesión limpia el
              borrador local. Borra tus builds desde Sesiones.
            </p>
            <Link
              href="/privacidad"
              target="_blank"
              className="inline-flex min-h-11 items-center text-small text-accent-300 underline underline-offset-2 hover:text-accent-200"
            >
              Política de privacidad
            </Link>
          </Section>

          <Section id="instalar" title="Instalar app">
            <p className="text-small text-neutral-300">
              Ábrela desde tu pantalla de inicio, en pantalla completa. Sólo guarda archivos
              públicos, nunca tus builds.
            </p>
            <PwaInstall
              trigger={(open) => (
                <Button onClick={open} className="self-start">
                  <Download size={16} aria-hidden="true" />
                  Instalar app
                </Button>
              )}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  id,
  title,
  aside,
  children,
}: {
  id: string;
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="flex scroll-mt-6 flex-col gap-4 rounded-lg bg-surface p-5 md:p-6"
    >
      <header className="flex flex-wrap items-center gap-3">
        <h2 id={`${id}-title`} className="text-h2 font-medium">
          {title}
        </h2>
        {aside}
      </header>
      {children}
    </section>
  );
}
