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
export function AccessNotice({
  session,
  recoveryVisible = false,
}: {
  session: AccountSession;
  recoveryVisible?: boolean;
}) {
  const { account, accountError } = session;
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
        Las cuentas aún no están disponibles. Puedes probar el ejemplo.
      </Alert>
    );
  if (!account.authenticated)
    return (
      <Alert tone="info" icon={<UserRound size={18} />} action={link("/login", "Entrar")}>
        Entra para generar y guardar planes.
      </Alert>
    );
  if (!account.user?.emailVerified)
    return (
      <Alert
        tone="warning"
        icon={<ShieldCheck size={18} />}
        action={link("/verify-email", "Verificar")}
      >
        Verifica tu correo para generar planes.
      </Alert>
    );
  // Accounting is reconciled in the session hook; only show actionable game status here.
  if (account.usage?.pending && !recoveryVisible)
    return (
      <Alert tone="info" icon={<ShieldCheck size={18} />}>
        Tu plan sigue en preparación. Espera antes de generar otro.
      </Alert>
    );
  if (account.usage?.uncertain && account.usage.coachRemaining === 0 && !recoveryVisible)
    return (
      <Alert tone="warning" icon={<ShieldCheck size={18} />}>
        No tienes planes disponibles por ahora. Hay una solicitud anterior por confirmar;
        revisaremos tu saldo automáticamente.
      </Alert>
    );
  if (account.usage?.coachRemaining === 0)
    return (
      <Alert tone="warning" icon={<ShieldCheck size={18} />}>
        Sin planes disponibles. Tu cuota se renueva {formatDate(account.usage.resetsAt)}.
      </Alert>
    );
  return null;
}
