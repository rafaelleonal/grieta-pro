"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, MailCheck } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { authClient, authErrorMessage, readAccount } from "@/lib/auth-client";
import { AuthLayout, Feedback } from "./auth-layout";

type State = "loading" | "verified" | "confirmed" | "pending" | "invalid";

const TITLES: Record<State, string> = {
  loading: "Confirma tu correo",
  verified: "Correo confirmado",
  confirmed: "Revisa tu cuenta",
  pending: "Confirma tu correo",
  invalid: "Confirma tu correo",
};
const DESCRIPTIONS: Record<State, string> = {
  loading: "Comprobando…",
  verified: "Tu cuenta está lista.",
  confirmed: "Inicia sesión para comprobar tu cuenta.",
  pending: "Abre el enlace de tu correo o pide otro.",
  invalid: "Enlace inválido o vencido. Pide otro o entra si ya verificaste tu correo.",
};

export function VerifyEmail() {
  const [state, setState] = useState<State>("loading");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invalid = Boolean(params.get("error"));
    const confirmed = params.get("confirmed") === "1";
    const abort = new AbortController();
    readAccount(abort.signal)
      .then((account) => {
        setConfigured(account.configured);
        setEmail(account.user?.email || "");
        setState(
          invalid
            ? "invalid"
            : account.user?.emailVerified
              ? "verified"
              : confirmed
                ? "confirmed"
                : "pending",
        );
      })
      .catch(() => {
        if (!abort.signal.aborted) {
          setState("pending");
          setError("No se pudo comprobar tu cuenta. Inicia sesión.");
        }
      });
    return () => abort.abort();
  }, []);

  async function resendEmail(event: FormEvent) {
    event.preventDefault();
    if (busy || !configured) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const outcome = await authClient.sendVerificationEmail({
        email: email.trim(),
        callbackURL: `${window.location.origin}/verify-email?confirmed=1`,
      });
      if (outcome.error) setError(authErrorMessage(outcome.error));
      else setNotice("Si corresponde, recibirás un enlace. Revisa también spam.");
    } catch {
      setError("No se envió el enlace. Reintenta en unos minutos.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title={TITLES[state]} description={DESCRIPTIONS[state]}>
      <span
        aria-hidden="true"
        className="grid size-14 place-items-center self-center rounded-full bg-accent-900 text-accent-200"
      >
        <MailCheck size={28} />
      </span>
      {state === "pending" || state === "invalid" ? (
        <form onSubmit={(event) => void resendEmail(event)} className="flex flex-col gap-4">
          <Field id="verify-email" label="Correo">
            <Input
              id="verify-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              maxLength={254}
              disabled={busy}
            />
          </Field>
          <Feedback error={error} notice={notice} />
          <Button type="submit" loading={busy} disabled={busy || !configured}>
            Reenviar enlace
          </Button>
        </form>
      ) : null}
      {state !== "loading" ? (
        <Link
          href={state === "verified" ? "/" : "/login"}
          className={buttonClasses(state === "verified" ? "primary" : "secondary", true)}
        >
          {state === "verified" ? "Ir al coach" : "Entrar"}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      ) : null}
    </AuthLayout>
  );
}
