"use client";

import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import type { GenerationAccess } from "@/lib/generation-access";
import type { AccountSession } from "@/components/hooks/use-account-session";

/** Explica por qué no se puede pedir una build; sus acciones nunca llaman a la IA. */
export function AccessNotice({
  session,
  access,
}: {
  session: Pick<AccountSession, "refreshAccount">;
  access: GenerationAccess;
}) {
  if (access.allowed || access.reason === "selection" || access.reason === "busy") return null;
  const link = (href: string, label: string) => (
    <Link href={href} className={buttonClasses("ghost")}>
      {label}
      <ArrowRight size={15} aria-hidden="true" />
    </Link>
  );
  const action =
    access.action === "login" ? (
      link("/login", "Entrar")
    ) : access.action === "verify" ? (
      link("/verify-email", "Verificar")
    ) : access.action === "refresh" ? (
      <Button variant="ghost" onClick={() => void session.refreshAccount()}>
        Reintentar
      </Button>
    ) : undefined;
  return (
    <Alert
      tone={access.reason === "account_error" ? "danger" : "info"}
      icon={<ShieldCheck size={18} />}
      role={access.reason === "account_error" ? "alert" : undefined}
    >
      <div className="min-w-0 space-y-3">
        <p>{access.message}</p>
        {action ? <div className="flex min-w-0 flex-wrap gap-2">{action}</div> : null}
      </div>
    </Alert>
  );
}
