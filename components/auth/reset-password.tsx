"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { AuthLayout, Feedback } from "./auth-layout";

/** Nueva contraseña con el token de un solo uso del correo; se retira de la URL al usarlo. */
export function ResetPassword() {
  const [token, setToken] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- The reset token comes from the browser URL and must be read after hydration.
    setToken(params.get("error") ? null : params.get("token"));
    setChecked(true);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!token || busy) return;
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const outcome = await authClient.resetPassword({ newPassword: password, token });
      if (outcome.error) setError(authErrorMessage(outcome.error));
      else {
        setPassword("");
        setConfirmation("");
        setToken(null);
        setDone(true);
        window.history.replaceState(null, "", "/reset-password");
      }
    } catch {
      setError("No se cambió la contraseña. Reintenta.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title={done ? "Contraseña actualizada" : "Nueva contraseña"}
      description={done ? "Entra con tu nueva contraseña." : "Mínimo 12 caracteres."}
    >
      {done ? (
        <Link href="/login" className={buttonClasses("primary", true)}>
          Iniciar sesión
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      ) : !checked ? (
        <p role="status" className="text-small text-neutral-400">
          Cargando…
        </p>
      ) : token ? (
        <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
          {(
            [
              ["new-password", "Nueva contraseña", password, setPassword],
              ["confirm-password", "Confirmar contraseña", confirmation, setConfirmation],
            ] as const
          ).map(([id, label, value, set]) => (
            <Field key={id} id={id} label={label}>
              <Input
                id={id}
                type="password"
                autoComplete="new-password"
                value={value}
                onChange={(event) => set(event.target.value)}
                minLength={12}
                maxLength={128}
                required
                disabled={busy}
              />
            </Field>
          ))}
          <Feedback error={error} notice="" />
          <Button type="submit" variant="primary" loading={busy} disabled={busy}>
            <ShieldCheck size={17} aria-hidden="true" />
            Guardar contraseña
          </Button>
        </form>
      ) : (
        <Alert tone="danger" role="alert">
          Enlace inválido o vencido.{" "}
          <Link href="/login?mode=forgot" className="underline underline-offset-2">
            Pide otro enlace.
          </Link>
        </Alert>
      )}
    </AuthLayout>
  );
}
