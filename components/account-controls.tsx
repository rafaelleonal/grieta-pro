"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Check,
  Copy,
  History,
  LoaderCircle,
  LogOut,
  ShieldCheck,
  Trash2,
  UserRound,
} from "lucide-react";
import { Modal } from "@/components/modal";
import { authClient, authErrorMessage, type AccountStatus } from "@/lib/auth-client";
import type { Champion, CoachInput, SavedCoachResult } from "@/lib/types";
import "./account.css";

export type HistoryRecord = {
  id: string;
  input: CoachInput;
  result: SavedCoachResult;
  createdAt: string;
};

export function AccountBadge({
  account,
  onOpen,
}: {
  account: AccountStatus | null;
  onOpen: () => void;
}) {
  if (!account)
    return (
      <span className="account-badge muted" role="status">
        Cuenta...
      </span>
    );
  if (!account.authenticated)
    return (
      <Link className="account-badge" href="/login">
        <UserRound size={14} />
        <span>Entrar</span>
      </Link>
    );
  return (
    <button
      type="button"
      className="account-badge"
      onClick={onOpen}
      aria-label="Mi cuenta y cuota de IA"
    >
      <UserRound size={14} />
      <span>
        {account.user?.plan === "PRO" ? "Pro" : "Free"}
        {account.usage ? ` · ${account.usage.coachRemaining} planes` : ""}
      </span>
    </button>
  );
}

export function AccountAccessNotice({
  account,
  error,
  onRetry,
  onCheck,
  checking,
  consumptionError,
}: {
  account: AccountStatus | null;
  error: string;
  onRetry: () => void;
  onCheck: () => void;
  checking: boolean;
  consumptionError: string;
}) {
  if (error)
    return (
      <div className="account-access" role="alert">
        <span>{error}</span>
        <button type="button" onClick={onRetry}>
          Reintentar
        </button>
      </div>
    );
  if (!account) return null;
  if (!account.configured)
    return (
      <div className="account-access">
        <ShieldCheck size={17} />
        <span>
          El registro está pendiente de configuración. Puedes preparar tu partida y explorar el
          ejemplo.
        </span>
        <Link href="/login">
          Ver acceso
          <ArrowRight size={14} />
        </Link>
      </div>
    );
  if (!account.authenticated)
    return (
      <div className="account-access">
        <UserRound size={17} />
        <span>Entra para usar la IA y guardar tus planes en tu cuenta.</span>
        <Link href="/login">
          Entrar
          <ArrowRight size={14} />
        </Link>
      </div>
    );
  if (!account.user?.emailVerified)
    return (
      <div className="account-access">
        <ShieldCheck size={17} />
        <span>Verifica tu correo para activar tus consultas al coach.</span>
        <Link href="/verify-email">
          Verificar
          <ArrowRight size={14} />
        </Link>
      </div>
    );
  if (account.usage?.pending || account.usage?.uncertain || consumptionError)
    return (
      <div className="account-access" role="status">
        <ShieldCheck size={17} />
        <span>
          {consumptionError ||
            (account.usage?.pending
              ? "Tu consulta sigue en curso. Comprobamos su estado automáticamente."
              : "Hay una reserva con coste por confirmar. Puedes preparar otro análisis si te queda cuota; esta reserva se conserva.")}
        </span>
        <button type="button" onClick={onCheck} disabled={checking}>
          {checking ? <LoaderCircle size={14} className="spin" /> : null}
          {checking ? "Comprobando…" : "Comprobar estado"}
        </button>
      </div>
    );
  if (account.usage?.coachRemaining === 0)
    return (
      <div className="account-access">
        <ShieldCheck size={17} />
        <span>
          Usaste tus planes de este periodo. Tu historial sigue disponible; la cuota se renueva{" "}
          {formatDate(account.usage.resetsAt)}.
        </span>
      </div>
    );
  return null;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "en el próximo periodo"
    : date.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

export function AccountModal({
  account,
  onClose,
  onClear,
  onLoggedOut,
  onRefresh,
  onCheck,
  checking,
  consumptionError,
}: {
  account: AccountStatus;
  onClose: () => void;
  onClear: () => void;
  onLoggedOut: () => void;
  onRefresh: () => Promise<void>;
  onCheck: () => void;
  checking: boolean;
  consumptionError: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    if (busy) return;
    setBusy(true);
    setError("");
    onClear();
    try {
      const outcome = await authClient.signOut();
      if (outcome.error) {
        setError(authErrorMessage(outcome.error));
        return;
      }
      onLoggedOut();
      onClose();
      await onRefresh();
    } catch {
      setError(
        "No pudimos cerrar la sesión en el servidor. Vuelve a intentar; los datos abiertos ya se limpiaron.",
      );
    } finally {
      setBusy(false);
    }
  }
  const user = account.user;
  return (
    <Modal title="Mi cuenta" onClose={onClose}>
      <div className="account-summary">
        <div className="account-avatar">{user?.name.slice(0, 2).toUpperCase() || "GG"}</div>
        <div>
          <strong>{user?.name}</strong>
          <span>{user?.email}</span>
        </div>
        <span className="account-plan">{user?.plan === "PRO" ? "Pro" : "Free"}</span>
      </div>
      {account.usage ? (
        <>
          <p className="account-section-label">Tu cuota disponible</p>
          <dl className="account-quota">
            <div>
              <dt>Planes de partida</dt>
              <dd>{account.usage.coachRemaining}</dd>
            </div>
            <div>
              <dt>Lecturas de foto o texto</dt>
              <dd>{account.usage.draftRemaining}</dd>
            </div>
            <div>
              <dt>Búsquedas de fuentes</dt>
              <dd>{account.usage.webRemaining}</dd>
            </div>
          </dl>
          <p className="account-help">
            Se renueva {formatDate(account.usage.resetsAt)}. Leer una captura y generar su plan
            consumen cuotas distintas. Cada pregunta al coach genera un nuevo plan.
          </p>
          {account.usage.pending ? (
            <p className="account-help">
              Hay {account.usage.pending} consulta(s) en curso. Comprobamos su estado
              automáticamente sin iniciar otro análisis.
            </p>
          ) : null}
          {account.usage.uncertain ? (
            <p className="account-help">
              Hay {account.usage.uncertain} reserva(s) con coste por confirmar. Su cuota y
              presupuesto se conservan. Puedes hacer otro análisis si todavía tienes cuota y
              presupuesto disponible.
            </p>
          ) : null}
          {account.usage.pending || account.usage.uncertain ? (
            <button
              className="secondary-button"
              type="button"
              onClick={onCheck}
              disabled={checking}
            >
              {checking ? <LoaderCircle size={15} className="spin" /> : <ShieldCheck size={15} />}
              {checking ? "Comprobando…" : "Comprobar estado"}
            </button>
          ) : null}
          {consumptionError ? (
            <p className="account-help" role="status">
              {consumptionError}
            </p>
          ) : null}
        </>
      ) : null}
      <p className="account-help">
        Tus planes se guardan en tu cuenta. Las claves API y las fotos originales quedan fuera del
        historial.
      </p>
      {user?.role === "ADMIN" ? <AdminControls /> : null}
      {error ? (
        <p className="account-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="modal-footer">
        <button className="secondary-button" type="button" onClick={onClose}>
          Volver
        </button>
        <button
          className="secondary-button"
          type="button"
          onClick={() => {
            void logout();
          }}
          disabled={busy}
        >
          {busy ? <LoaderCircle size={15} className="spin" /> : <LogOut size={15} />}Cerrar sesión
        </button>
      </div>
    </Modal>
  );
}

async function adminRequest<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : "No pudimos actualizar el acceso. Revisa los datos e intenta de nuevo.",
    );
  return data as T;
}

export function AdminControls() {
  const [tab, setTab] = useState<"grant" | "invite">("grant");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<"FREE" | "PRO">("PRO");
  const [days, setDays] = useState("7");
  const [expires, setExpires] = useState("");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reconciling, setReconciling] = useState(false);
  async function copyInvitation() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setError("No pudimos copiar el código. Selecciónalo y cópialo manualmente.");
    }
  }
  async function reconcile() {
    if (busy || reconciling) return;
    setReconciling(true);
    setError("");
    setNotice("");
    try {
      const data = await adminRequest<{ reconciled: number; unresolved: number }>(
        "/api/admin/reconcile",
        {},
      );
      setNotice(
        `Consumo comprobado: ${data.reconciled} registros conciliados; ${data.unresolved} pendientes. Se consultan cargos existentes, sin generar análisis nuevos.`,
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No pudimos comprobar el consumo pendiente.",
      );
    } finally {
      setReconciling(false);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || reconciling) return;
    setBusy(true);
    setError("");
    setNotice("");
    setCode("");
    setCopied(false);
    try {
      if (tab === "grant") {
        await adminRequest("/api/admin/grants", {
          email: email.trim(),
          plan,
          ...(plan === "PRO" && expires
            ? { expiresAt: new Date(`${expires}T23:59:59`).toISOString() }
            : {}),
        });
        setNotice("Acceso actualizado. El usuario verá su plan al consultar de nuevo su cuenta.");
      } else {
        const invitation = await adminRequest<{ code: string; expiresAt: string }>(
          "/api/admin/invitations",
          { email: email.trim(), plan, expiresInDays: Number(days) },
        );
        setCode(invitation.code);
        setNotice(
          `Invitación creada. Vence ${formatDate(invitation.expiresAt)}. Comparte el código con esa persona; solo se muestra ahora.`,
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos completar esta acción.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="account-admin">
      <summary>
        <ShieldCheck size={15} />
        Administrar accesos
      </summary>
      <p className="account-help">Los beneficios Pro no conceden permisos de administrador.</p>
      <div className="account-tabs">
        <button
          type="button"
          aria-pressed={tab === "grant"}
          disabled={busy || reconciling}
          onClick={() => {
            setTab("grant");
            setCode("");
            setNotice("");
            setError("");
          }}
        >
          Cambiar plan
        </button>
        <button
          type="button"
          aria-pressed={tab === "invite"}
          disabled={busy || reconciling}
          onClick={() => {
            setTab("invite");
            setCode("");
            setNotice("");
            setError("");
          }}
        >
          Invitar
        </button>
      </div>
      <form
        className="account-form"
        onSubmit={(event) => {
          void submit(event);
        }}
      >
        <label htmlFor="admin-email">Correo de la persona</label>
        <input
          id="admin-email"
          type="email"
          autoComplete="off"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          maxLength={254}
          disabled={busy}
          required
        />
        <label htmlFor="admin-plan">Plan</label>
        <select
          id="admin-plan"
          value={plan}
          onChange={(event) => setPlan(event.target.value as "FREE" | "PRO")}
          disabled={busy}
        >
          <option value="PRO">Pro de cortesía</option>
          <option value="FREE">{tab === "grant" ? "Retirar Pro de cortesía" : "Free"}</option>
        </select>
        {tab === "grant" && plan === "PRO" ? (
          <>
            <label htmlFor="admin-expiry">
              Vence el <span>· opcional</span>
            </label>
            <input
              id="admin-expiry"
              type="date"
              value={expires}
              onChange={(event) => setExpires(event.target.value)}
              disabled={busy}
            />
            <p className="account-help">
              Sin fecha, el acceso Pro se mantiene hasta que lo retires.
            </p>
          </>
        ) : tab === "invite" ? (
          <>
            <label htmlFor="admin-days">Vigencia del código</label>
            <select
              id="admin-days"
              value={days}
              onChange={(event) => setDays(event.target.value)}
              disabled={busy}
            >
              <option value="1">1 día</option>
              <option value="7">7 días</option>
              <option value="30">30 días</option>
            </select>
          </>
        ) : (
          <p className="account-help">
            Se retirará el acceso Pro de cortesía. Las futuras suscripciones pagadas se administran
            por separado.
          </p>
        )}
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
        {code ? (
          <div className="account-invite-code">
            <code>{code}</code>
            <button
              type="button"
              aria-label="Copiar código de invitación"
              onClick={() => {
                void copyInvitation();
              }}
            >
              {copied ? <Check size={17} /> : <Copy size={17} />}
            </button>
          </div>
        ) : null}
        <button className="secondary-button" type="submit" disabled={busy || reconciling}>
          {busy ? <LoaderCircle size={14} className="spin" /> : <Check size={14} />}
          {tab === "grant" ? "Guardar acceso" : "Crear invitación"}
        </button>
      </form>
      <div className="account-admin-consumption">
        <p className="account-help">
          Si un proveedor dejó cargos pendientes, comprueba su consumo antes de liberar el
          presupuesto reservado.
        </p>
        <button
          className="secondary-button"
          type="button"
          disabled={busy || reconciling}
          onClick={() => {
            void reconcile();
          }}
        >
          {reconciling ? <LoaderCircle size={14} className="spin" /> : <ShieldCheck size={14} />}
          Confirmar consumo pendiente
        </button>
      </div>
    </details>
  );
}

export function AccountHistory({
  account,
  champions,
  onClose,
  onSelect,
}: {
  account: AccountStatus | null;
  champions: Champion[];
  onClose: () => void;
  onSelect: (record: HistoryRecord) => void;
}) {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!account?.authenticated) return;
    const abort = new AbortController();
    fetch("/api/history", { cache: "no-store", signal: abort.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("No pudimos cargar tu historial. Vuelve a intentar.");
        const data = (await response.json()) as { records: HistoryRecord[]; nextCursor?: string };
        if (!abort.signal.aborted) {
          setRecords(data.records);
          setCursor(data.nextCursor || null);
          setError("");
        }
      })
      .catch((cause) => {
        if (!abort.signal.aborted)
          setError(cause instanceof Error ? cause.message : "No pudimos cargar tu historial.");
      })
      .finally(() => {
        if (!abort.signal.aborted) setBusy(false);
      });
    return () => abort.abort();
  }, [account?.authenticated, account?.user?.id, retry]);
  async function loadMore() {
    if (!cursor || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/history?cursor=${encodeURIComponent(cursor)}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("No pudimos cargar más planes. Intenta de nuevo.");
      const data = (await response.json()) as { records: HistoryRecord[]; nextCursor?: string };
      setRecords((previous) => [
        ...previous,
        ...data.records.filter((entry) => !previous.some((record) => record.id === entry.id)),
      ]);
      setCursor(data.nextCursor || null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos cargar más planes.");
    } finally {
      setBusy(false);
    }
  }
  async function removeRecord(id: string) {
    if (deleting) return;
    setDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/history/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("No pudimos borrar el plan. Intenta de nuevo.");
      setRecords((previous) => previous.filter((entry) => entry.id !== id));
      setDeleteId(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos borrar el plan.");
    } finally {
      setDeleting(false);
    }
  }
  return (
    <Modal title="Mis sesiones" wide onClose={onClose}>
      {!account?.authenticated ? (
        <div className="account-history-empty">
          <History size={30} />
          <p>Entra a tu cuenta para consultar tus planes guardados.</p>
          <Link className="secondary-button" href="/login">
            Entrar
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <>
          <p className="modal-intro">Abre un plan para volver a consultar tus consejos.</p>
          {error ? (
            <p className="account-error" role="alert">
              {error}
              <button
                type="button"
                className="account-link"
                onClick={() => {
                  setRecords([]);
                  setCursor(null);
                  setDeleteId(null);
                  setError("");
                  setBusy(true);
                  setRetry((value) => value + 1);
                }}
              >
                Reintentar
              </button>
            </p>
          ) : null}
          {busy && !records.length ? (
            <p className="account-help" role="status">
              <LoaderCircle className="spin" size={17} />
              Cargando tus planes...
            </p>
          ) : records.length ? (
            <ul className="account-history-list" aria-label="Planes guardados">
              {records.map((record) => {
                const champion = champions.find((entry) => entry.id === record.input.champion);
                const enemy = champions.find((entry) => entry.id === record.input.enemy);
                const championName = champion?.name || record.input.champion;
                const enemyName = enemy?.name || record.input.enemy;
                const roleName = {
                  TOP: "Top",
                  JUNGLE: "Jungla",
                  MID: "Mid",
                  ADC: "ADC",
                  SUPPORT: "Support",
                }[record.input.role];
                return (
                  <li className="account-history-row" key={record.id}>
                    <button
                      type="button"
                      className="account-history-open"
                      onClick={() => onSelect(record)}
                      aria-label={`Abrir plan de ${championName} contra ${enemyName} en ${roleName}`}
                    >
                      {champion || enemy ? (
                        <span className="account-history-portraits" aria-hidden="true">
                          {champion ? (
                            <Image src={champion.image} alt="" width={36} height={36} unoptimized />
                          ) : null}
                          {enemy ? (
                            <Image src={enemy.image} alt="" width={36} height={36} unoptimized />
                          ) : null}
                        </span>
                      ) : (
                        <span className="account-history-portraits" aria-hidden="true">
                          <History size={24} />
                        </span>
                      )}
                      <span className="account-history-matchup">
                        <strong>
                          {championName} <span className="account-history-vs">vs.</span> {enemyName}
                        </strong>
                        <span className="account-history-meta">
                          {roleName} · {record.input.rank}
                          <span className="account-history-date">
                            <span aria-hidden="true"> · </span>
                            <time dateTime={record.createdAt}>{formatDate(record.createdAt)}</time>
                          </span>
                        </span>
                      </span>
                      <span className="account-history-action" aria-hidden="true">
                        Abrir <ArrowRight size={16} />
                      </span>
                    </button>
                    <button
                      type="button"
                      className="account-history-delete"
                      aria-label={`Borrar plan de ${championName} contra ${enemyName}`}
                      disabled={deleting}
                      onClick={() => setDeleteId(record.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                    {deleteId === record.id ? (
                      <div className="account-history-confirm">
                        <span>¿Borrar este plan de tu historial?</span>
                        <button
                          type="button"
                          disabled={deleting}
                          onClick={() => void removeRecord(record.id)}
                        >
                          {deleting ? "Borrando..." : "Sí, borrar"}
                        </button>
                        <button type="button" disabled={deleting} onClick={() => setDeleteId(null)}>
                          Conservar
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : !error ? (
            <div className="account-history-empty">
              <History size={30} />
              <p>
                Tu primer plan aparecerá aquí después de consultar al coach. Los ejemplos locales no
                se guardan.
              </p>
            </div>
          ) : null}
          {cursor ? (
            <button
              className="secondary-button"
              type="button"
              disabled={busy}
              onClick={() => {
                void loadMore();
              }}
            >
              {busy ? <LoaderCircle size={14} className="spin" /> : null}Ver más planes
            </button>
          ) : null}
        </>
      )}
    </Modal>
  );
}
