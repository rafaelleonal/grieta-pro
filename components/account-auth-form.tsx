"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  MailCheck,
  ShieldCheck,
  Swords,
} from "lucide-react";
import { authClient, authErrorMessage, readAccount, type AccountStatus } from "@/lib/auth-client";
import { LegalLinks } from "@/components/legal-links";
import { RiotNotice } from "@/components/riot-notice";
import "./account.css";

type Mode = "login" | "signup" | "forgot";

function AuthLayout({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="account-page">
      <div className="account-card">
        <Link href="/" className="account-brand">
          <span>
            <Swords size={24} />
          </span>
          elo<strong>ciencia</strong>
        </Link>
        <h1>{title}</h1>
        <p className="account-intro">{description}</p>
        {children}
        <div className="account-legal">
          <LegalLinks openInNewTab />
          <RiotNotice />
        </div>
        <Link href="/" className="account-back">
          <ArrowLeft size={15} />
          Volver al coach
        </Link>
      </div>
    </main>
  );
}

function Feedback({ error, notice }: { error: string; notice: string }) {
  return (
    <>
      {error ? (
        <p className="account-error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="account-notice" role="status">
          {notice}
        </p>
      ) : null}
    </>
  );
}

export function AccountAuthForm() {
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      busy ||
      !account?.configured ||
      (mode === "signup" && account.registrationMode === "CLOSED")
    )
      return;
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
        const registration = {
          name: name.trim(),
          email: email.trim(),
          password,
          callbackURL: `${window.location.origin}/verify-email?confirmed=1`,
          ...(invitationCode.trim() || account.registrationMode === "INVITE"
            ? { invitationCode: invitationCode.trim() }
            : {}),
        };
        const outcome = await authClient.signUp.email(registration);
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

  const title =
    mode === "login"
      ? "Iniciar sesión"
      : mode === "signup"
        ? "Crear cuenta"
        : "Recuperar contraseña";
  return (
    <AuthLayout
      title={title}
      description={
        mode === "forgot" ? "Recibe un enlace por correo." : "Tus planes, en un solo lugar."
      }
    >
      {account?.authenticated ? (
        <div className="account-notice">
          <p>Ya entraste como {account.user?.name}.</p>
          <Link className="account-submit" href="/">
            Ir al coach
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <>
          {mode !== "forgot" ? (
            <div className="account-tabs">
              <button
                type="button"
                aria-pressed={mode === "login"}
                disabled={busy}
                onClick={() => changeMode("login")}
              >
                Entrar
              </button>
              <button
                type="button"
                aria-pressed={mode === "signup"}
                disabled={busy}
                onClick={() => changeMode("signup")}
              >
                Crear cuenta
              </button>
            </div>
          ) : null}
          {account && !account.configured ? (
            <p className="account-notice" role="status">
              Las cuentas aún no están disponibles. Puedes probar el ejemplo.
            </p>
          ) : null}
          {mode === "signup" && account?.configured && account.registrationMode === "CLOSED" ? (
            <p className="account-notice">Registro cerrado. ¿Ya tienes cuenta? Entra.</p>
          ) : null}
          <form
            className="account-form"
            onSubmit={(event) => {
              void submit(event);
            }}
          >
            {mode === "signup" ? (
              <>
                <label htmlFor="account-name">Nombre</label>
                <input
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
              </>
            ) : null}
            <label htmlFor="account-email">Correo</label>
            <input
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
            {mode !== "forgot" ? (
              <>
                <label htmlFor="account-password">Contraseña</label>
                <div className="account-password">
                  <input
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
                  />
                  <button
                    type="button"
                    aria-pressed={visible}
                    aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
                    onClick={() => setVisible(!visible)}
                  >
                    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {mode === "signup" ? (
                  <p className="account-help">Mínimo 12 caracteres.</p>
                ) : (
                  <button
                    className="account-link"
                    type="button"
                    onClick={() => changeMode("forgot")}
                  >
                    Olvidé mi contraseña
                  </button>
                )}
              </>
            ) : null}
            {mode === "signup" &&
            (account?.registrationMode === "OPEN" || account?.registrationMode === "INVITE") ? (
              <>
                <label htmlFor="account-invitation">
                  Código de invitación{account.registrationMode === "OPEN" ? " (opcional)" : ""}
                </label>
                <input
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
                <p id="account-invitation-help" className="account-help">
                  {account.registrationMode === "INVITE"
                    ? "Necesitas una invitación."
                    : "Opcional. Usa tu código si tienes uno."}
                </p>
              </>
            ) : null}
            <Feedback error={error} notice={notice} />
            <button
              type="submit"
              className="account-submit"
              disabled={
                busy ||
                !account?.configured ||
                (mode === "signup" && account.registrationMode === "CLOSED")
              }
            >
              {busy ? <LoaderCircle className="spin" size={17} /> : <ArrowRight size={17} />}
              {busy
                ? "Cargando…"
                : mode === "signup"
                  ? "Crear cuenta"
                  : mode === "forgot"
                    ? "Enviar enlace"
                    : "Entrar"}
            </button>
          </form>
          {resend ? (
            <button
              className="account-link"
              type="button"
              disabled={busy}
              onClick={() => {
                void resendEmail();
              }}
            >
              Reenviar verificación
            </button>
          ) : null}
          {mode === "forgot" ? (
            <button className="account-link" type="button" onClick={() => changeMode("login")}>
              Volver
            </button>
          ) : null}
          <p className="account-privacy">
            <ShieldCheck size={16} />
            Historial privado. Uso sujeto a cuota.
          </p>
        </>
      )}
    </AuthLayout>
  );
}

export function AccountVerification() {
  const [state, setState] = useState<"loading" | "verified" | "confirmed" | "pending" | "invalid">(
    "loading",
  );
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
    <AuthLayout
      title={
        state === "verified"
          ? "Correo confirmado"
          : state === "confirmed"
            ? "Revisa tu cuenta"
            : "Confirma tu correo"
      }
      description={
        state === "verified"
          ? "Tu cuenta está lista."
          : state === "confirmed"
            ? "Inicia sesión para comprobar tu cuenta."
            : state === "invalid"
              ? "Enlace inválido o vencido. Pide otro o entra si ya verificaste tu correo."
              : "Abre el enlace de tu correo o pide otro."
      }
    >
      <div className="account-illustration">
        <MailCheck size={36} />
      </div>
      {state === "loading" ? (
        <p className="account-help" role="status">
          Comprobando…
        </p>
      ) : state !== "verified" && state !== "confirmed" ? (
        <form
          className="account-form"
          onSubmit={(event) => {
            void resendEmail(event);
          }}
        >
          <label htmlFor="verify-email">Correo</label>
          <input
            id="verify-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            maxLength={254}
            disabled={busy}
          />
          <Feedback error={error} notice={notice} />
          <button className="account-submit" disabled={busy || !configured}>
            {busy ? <LoaderCircle className="spin" size={17} /> : <MailCheck size={17} />}Reenviar
            enlace
          </button>
        </form>
      ) : null}
      <Link className="account-link" href={state === "verified" ? "/" : "/login"}>
        {state === "verified" ? "Ir al coach" : "Entrar"}
      </Link>
    </AuthLayout>
  );
}

export function AccountResetPassword() {
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
        <Link href="/login" className="account-submit">
          Iniciar sesión
          <ArrowRight size={17} />
        </Link>
      ) : !checked ? (
        <p role="status">Cargando…</p>
      ) : token ? (
        <form
          className="account-form"
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          <label htmlFor="new-password">Nueva contraseña</label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={12}
            maxLength={128}
            required
            disabled={busy}
          />
          <label htmlFor="confirm-password">Confirmar contraseña</label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            minLength={12}
            maxLength={128}
            required
            disabled={busy}
          />
          <Feedback error={error} notice="" />
          <button className="account-submit" disabled={busy}>
            {busy ? <LoaderCircle className="spin" size={17} /> : <ShieldCheck size={17} />}Guardar
            contraseña
          </button>
        </form>
      ) : (
        <p className="account-error" role="alert">
          Enlace inválido o vencido.{" "}
          <Link href="/login">Pide otro desde “Olvidé mi contraseña”.</Link>
        </p>
      )}
    </AuthLayout>
  );
}
