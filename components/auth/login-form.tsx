"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { authClient, authErrorMessage, readAccount, type AccountStatus } from "@/lib/auth-client";
import { AuthLayout, Feedback } from "./auth-layout";

type Mode = "login" | "signup" | "forgot";

/** Entrar, crear cuenta y recuperar contraseña con Better Auth; el correo se verifica siempre. */
export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [account, setAccount] = useState<AccountStatus | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resend, setResend] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("mode");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Read the browser URL only after hydration to select the requested form.
    if (requested === "signup" || requested === "forgot") setMode(requested);
    const abort = new AbortController();
    readAccount(abort.signal)
      .then(setAccount)
      .catch(() => {
        if (!abort.signal.aborted) setError("No se pudo comprobar el registro. Recarga la página.");
      });
    return () => abort.abort();
  }, []);

  function changeMode(next: Mode) {
    if (busy) return;
    setMode(next);
    setError("");
    setNotice("");
    setPassword("");
    setResend(false);
  }

  const closed = mode === "signup" && account?.registrationMode === "CLOSED";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !account?.configured || closed) return;
    setBusy(true);
    setError("");
    setNotice("");
    setResend(false);
    try {
      if (mode === "forgot") {
        const outcome = await authClient.requestPasswordReset({
          email: email.trim(),
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (outcome.error) {
          setError(authErrorMessage(outcome.error));
          return;
        }
        setNotice("Si tienes cuenta, recibirás un enlace. Revisa también spam.");
      } else if (mode === "signup") {
        const outcome = await authClient.signUp.email({
          name: name.trim(),
          email: email.trim(),
          password,
          callbackURL: `${window.location.origin}/verify-email?confirmed=1`,
          ...(invitationCode.trim() || account.registrationMode === "INVITE"
            ? { invitationCode: invitationCode.trim() }
            : {}),
        });
        if (outcome.error) {
          setError(authErrorMessage(outcome.error));
          return;
        }
        setPassword("");
        setInvitationCode("");
        setResend(true);
        setNotice(
          "Revisa tu correo para confirmar. Si ya tienes cuenta, entra o recupera tu contraseña.",
        );
      } else {
        const outcome = await authClient.signIn.email({
          email: email.trim(),
          password,
          rememberMe: true,
        });
        if (outcome.error) {
          setError(authErrorMessage(outcome.error));
          setResend(outcome.error.code === "EMAIL_NOT_VERIFIED");
          return;
        }
        setPassword("");
        window.dispatchEvent(new Event("cholo-coach:session-changed"));
        router.replace("/");
        router.refresh();
      }
    } catch {
      setError("No pudimos conectar. Tus datos siguen aquí; reintenta.");
    } finally {
      setBusy(false);
    }
  }

  async function resendEmail() {
    if (busy || !email.trim() || !account?.configured) return;
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

  if (account?.authenticated)
    return (
      <AuthLayout
        title="Tu espacio personal"
        description={`Ya entraste como ${account.user?.name}.`}
      >
        <Link href="/" className={buttonClasses("primary", true)}>
          Ir al coach
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </AuthLayout>
    );

  return (
    <AuthLayout
      title={mode === "forgot" ? "Recuperar contraseña" : "Tu espacio personal"}
      description={mode === "forgot" ? "Te enviamos un enlace por correo." : undefined}
    >
      {mode !== "forgot" ? (
        <Segmented
          label="Acceso"
          value={mode}
          onChange={(next) => changeMode(next)}
          options={[
            { value: "login", label: "Entrar" },
            { value: "signup", label: "Crear cuenta" },
          ]}
        />
      ) : null}
      {account && !account.configured ? (
        <Alert tone="info">Las cuentas aún no están disponibles. Puedes probar el ejemplo.</Alert>
      ) : null}
      {closed ? <Alert tone="warning">Registro cerrado. ¿Ya tienes cuenta? Entra.</Alert> : null}
      <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        {mode === "signup" ? (
          <Field id="account-name" label="Nombre">
            <Input
              id="account-name"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              minLength={2}
              required
              disabled={busy}
            />
          </Field>
        ) : null}
        <Field id="account-email" label="Correo">
          <Input
            id="account-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={254}
            required
            disabled={busy}
            placeholder="tu@correo.com"
          />
        </Field>
        {mode !== "forgot" ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="account-password" className="text-label font-medium">
                Contraseña
              </label>
              {mode === "login" ? (
                <button
                  type="button"
                  onClick={() => changeMode("forgot")}
                  className="min-h-11 text-small text-accent-300 hover:text-accent-200"
                >
                  ¿La olvidaste?
                </button>
              ) : null}
            </div>
            <div className="relative">
              <Input
                id="account-password"
                name="password"
                type={visible ? "text" : "password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={mode === "signup" ? 12 : undefined}
                maxLength={128}
                required
                disabled={busy}
                aria-describedby={mode === "signup" ? "account-password-help" : undefined}
                className="pr-12"
              />
              <button
                type="button"
                aria-pressed={visible}
                aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
                onClick={() => setVisible(!visible)}
                className="absolute top-0 right-0 grid size-11 place-items-center text-neutral-400 hover:text-text"
              >
                {visible ? (
                  <EyeOff size={18} aria-hidden="true" />
                ) : (
                  <Eye size={18} aria-hidden="true" />
                )}
              </button>
            </div>
            {mode === "signup" ? (
              <p id="account-password-help" className="text-xs text-neutral-500">
                Mínimo 12 caracteres.
              </p>
            ) : null}
          </div>
        ) : null}
        {mode === "signup" &&
        (account?.registrationMode === "OPEN" || account?.registrationMode === "INVITE") ? (
          <Field
            id="account-invitation"
            label="Código de invitación"
            optional={account.registrationMode === "OPEN"}
            help={
              account.registrationMode === "INVITE"
                ? "Necesitas una invitación."
                : "Usa tu código si tienes uno."
            }
          >
            <Input
              id="account-invitation"
              name="invitationCode"
              autoComplete="off"
              aria-describedby="account-invitation-help"
              spellCheck={false}
              value={invitationCode}
              onChange={(event) => setInvitationCode(event.target.value)}
              minLength={32}
              maxLength={128}
              required={account.registrationMode === "INVITE"}
              disabled={busy}
            />
          </Field>
        ) : null}
        <Feedback error={error} notice={notice} />
        <Button
          type="submit"
          variant="primary"
          loading={busy}
          loadingLabel="Cargando…"
          disabled={busy || !account?.configured || closed}
        >
          {mode === "signup" ? "Crear cuenta" : mode === "forgot" ? "Enviar enlace" : "Entrar"}
        </Button>
      </form>
      {resend ? (
        <Button variant="ghost" disabled={busy} onClick={() => void resendEmail()}>
          Reenviar verificación
        </Button>
      ) : null}
      {mode === "forgot" ? (
        <Button variant="ghost" onClick={() => changeMode("login")}>
          Volver a entrar
        </Button>
      ) : (
        <>
          <div className="flex items-center gap-3 text-xs text-neutral-500" aria-hidden="true">
            <span className="h-px flex-1 bg-divider" />o<span className="h-px flex-1 bg-divider" />
          </div>
          <Link href="/?ejemplo=1" className={buttonClasses("secondary", true)}>
            Ver un plan de ejemplo sin cuenta
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </>
      )}
      <p className="flex items-center justify-center gap-2 text-xs text-neutral-400">
        <ShieldCheck size={15} aria-hidden="true" />
        Historial privado. Uso sujeto a cuota.
      </p>
    </AuthLayout>
  );
}
