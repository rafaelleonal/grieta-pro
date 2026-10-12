"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck, UserRound } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import type { AccountSession } from "@/components/hooks/use-account-session";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "en el próximo periodo"
    : date.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

/** Estado de acceso: cuenta, verificación, consultas en curso y reservas inciertas. */
export function AccessNotice({ session }: { session: AccountSession }) {
  const { account, accountError, consumptionError, checkingConsumption } = session;
  const link = (href: string, label: string) => (
    <Link href={href} className={buttonClasses("ghost")}>
      {label}
      <ArrowRight size={15} aria-hidden="true" />
    </Link>
  );
  if (accountError)
    return (
      <Alert
        tone="danger"
        role="alert"
        action={
          <Button variant="ghost" onClick={() => void session.refreshAccount()}>
            Reintentar
          </Button>
        }
      >
        {accountError}
      </Alert>
    );
  if (!account) return null;
  if (!account.configured)
    return (
      <Alert tone="info" icon={<ShieldCheck size={18} />} action={link("/login", "Ver acceso")}>
        El registro está pendiente de configuración. Puedes preparar tu partida y explorar el
        ejemplo.
      </Alert>
    );
  if (!account.authenticated)
    return (
      <Alert tone="info" icon={<UserRound size={18} />} action={link("/login", "Entrar")}>
        Entra para usar la IA y guardar tus planes en tu cuenta.
      </Alert>
    );
  if (!account.user?.emailVerified)
    return (
      <Alert
        tone="warning"
        icon={<ShieldCheck size={18} />}
        action={link("/verify-email", "Verificar")}
      >
        Verifica tu correo para activar tus consultas al coach.
      </Alert>
    );
  if (account.usage?.pending || account.usage?.uncertain || consumptionError)
    return (
      <Alert
        tone="warning"
        icon={<ShieldCheck size={18} />}
        action={
          <Button
            variant="ghost"
            onClick={() => void session.checkConsumption()}
            loading={checkingConsumption}
            loadingLabel="Comprobando…"
          >
            Comprobar estado
          </Button>
        }
      >
        {consumptionError ||
          (account.usage?.pending
            ? "Tu consulta sigue en curso. Comprobamos su estado automáticamente."
            : "Hay una reserva con coste por confirmar. Puedes preparar otro análisis si te queda cuota; esta reserva se conserva.")}
      </Alert>
    );
  if (account.usage?.coachRemaining === 0)
    return (
      <Alert tone="warning" icon={<ShieldCheck size={18} />}>
        Usaste tus planes de este periodo. Tu historial sigue disponible; la cuota se renueva{" "}
        {formatDate(account.usage.resetsAt)}.
      </Alert>
    );
  return null;
}
