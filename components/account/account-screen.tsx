"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Crown, Download, LogOut, ShieldCheck } from "lucide-react";
import { PwaInstall } from "@/components/pwa-manager";
import { AdminControls } from "./admin-controls";
import { Mascot, RankTile } from "@/components/brand";
import { Button, buttonClasses } from "@/components/ui/button";
import { Alert, Meter } from "@/components/ui/feedback";
import { Tag } from "@/components/ui/tag";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { roleName } from "@/lib/coach-draft";
import type { Role } from "@/lib/types";
import type { CoachWorkspace } from "@/components/hooks/use-coach-workspace";
import { ConnectionForm } from "./connection-form";

const SECTIONS = [
  ["consumo", "Consumo"],
  ["clave", "Clave de OpenRouter"],
  ["perfil", "Perfil"],
  ["privacidad", "Privacidad"],
] as const;

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "en el próximo periodo"
    : date.toLocaleDateString("es-MX", { day: "numeric", month: "long" });
}

/** Cuenta y consumo: cuota, clave en memoria, perfil de juego y privacidad. */
export function AccountScreen({
  ws,
  positions,
  onEditProfile,
}: {
  ws: CoachWorkspace;
  positions: Role[];
  onEditProfile: () => void;
}) {
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
          Entra para ver tus planes, consumo y perfil.
        </p>
        <Link href="/login" className={buttonClasses("primary")}>
          Entrar o crear cuenta
        </Link>
      </div>
    );

  const user = account.user;
  const usage = account.usage;
  const pending = (usage?.pending || 0) + (usage?.uncertain || 0);
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
        <Section
          id="consumo"
          title="Consumo"
          aside={
            <Tag tone={user?.plan === "PRO" ? "pro" : "neutral"}>
              {user?.plan === "PRO" ? "Pro" : "Free"}
            </Tag>
          }
        >
          {usage ? (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="flex flex-col gap-4">
                <Meter
                  label="Planes este mes"
                  value={usage.coachRemaining}
                  max={usage.coachLimit}
                  detail={`${usage.coachRemaining} disponibles de ${usage.coachLimit}`}
                />
                <p className="text-xs text-neutral-400">
                  Se renuevan el {formatDate(usage.resetsAt)}. Cada pregunta consume un plan.
                </p>
                <dl className="grid gap-2 sm:grid-cols-3">
                  <Stat label="Capturas" value={`${usage.draftRemaining} de ${usage.draftLimit}`} />
                  <Stat
                    label="Fuentes web"
                    value={
                      usage.webAllowed
                        ? `${usage.webRemaining} de ${usage.webLimit}`
                        : "No incluidas"
                    }
                  />
                  <Stat label="Por confirmar" value={String(pending)} />
                </dl>
                {pending ? (
                  <Alert
                    tone="warning"
                    action={
                      <Button
                        variant="ghost"
                        loading={session.checkingConsumption}
                        loadingLabel="Comprobando…"
                        onClick={() => void session.checkConsumption()}
                      >
                        Actualizar saldo
                      </Button>
                    }
                  >
                    Estas solicitudes cuentan en tu saldo hasta confirmar su consumo. Lo revisamos
                    automáticamente.
                  </Alert>
                ) : null}
                {session.consumptionError ? (
                  <p role="status" className="text-xs text-warning-text">
                    {session.consumptionError}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col gap-3 rounded-lg p-4 ring-1 ring-inset ring-accent-800">
                <strong className="flex items-center gap-2 text-sm font-medium">
                  <Crown size={16} aria-hidden="true" className="text-accent-300" />
                  Elociencia Pro
                </strong>
                <ul className="flex flex-col gap-1.5 text-small text-neutral-300">
                  <li>Más planes al mes</li>
                  <li>Fuentes web</li>
                  <li>Más modelos</li>
                </ul>
                <p className="text-xs text-neutral-400">
                  {user?.plan === "PRO"
                    ? "Pro activo."
                    : "Pro por invitación o cortesía. Sin pagos en la app."}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-small text-neutral-400">Verifica tu correo para ver tu consumo.</p>
          )}
        </Section>

        <Section
          id="clave"
          title="Clave de OpenRouter"
          aside={
            ws.credentials.apiKey ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-success-text">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
                Activa
              </span>
            ) : null
          }
        >
          <ConnectionForm
            credentials={ws.credentials}
            status={ws.status}
            account={account}
            onSave={ws.setCredentials}
          />
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
              <dt className="text-neutral-400">Rango</dt>
              <dd className="flex items-center gap-2">
                <RankTile rank={ws.input.rank} size={26} compact />
                {ws.input.rank} ·
                <button
                  type="button"
                  onClick={onEditProfile}
                  className="min-h-11 text-accent-300 hover:text-accent-200"
                >
                  cambiar
                </button>
              </dd>
              <dt className="text-neutral-400">Posiciones</dt>
              <dd>
                {positions.length ? positions.map(roleName).join(" / ") : "Sin elegir"} ·{" "}
                <button
                  type="button"
                  onClick={onEditProfile}
                  className="min-h-11 text-accent-300 hover:text-accent-200"
                >
                  cambiar
                </button>
              </dd>
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
              No guardamos fotos originales ni prompts enviados. Cerrar sesión limpia el borrador
              local. Borra tus planes desde Sesiones.
            </p>
            <p className="text-xs text-neutral-400">Borrar planes no cambia tu consumo del mes.</p>
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
              públicos, nunca tus planes.
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

        {user?.role === "ADMIN" ? (
          <Section
            id="administrar"
            title="Accesos"
            aside={<ShieldCheck size={18} aria-hidden="true" className="text-accent-300" />}
          >
            <AdminControls />
          </Section>
        ) : null}
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-control bg-bg p-3">
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className="text-h3 font-medium">{value}</dd>
    </div>
  );
}
