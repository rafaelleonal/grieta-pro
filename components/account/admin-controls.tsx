"use client";

import { useState, type FormEvent } from "react";
import { Check, Copy, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "en el próximo periodo"
    : date.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
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

/**
 * Administración de accesos. El servidor exige rol de administrador en cada acción; Pro
 * de cortesía no concede permisos de administrador. Conciliar sólo consulta cargos.
 */
export function AdminControls() {
  const [tab, setTab] = useState<"grant" | "invite">("grant");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<"FREE" | "PRO">("PRO");
  const [days, setDays] = useState("7");
  const [expires, setExpires] = useState("");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function switchTab(next: "grant" | "invite") {
    setTab(next);
    setCode("");
    setNotice("");
    setError("");
  }

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
          `Invitación creada. Vence ${formatDate(invitation.expiresAt)}. Comparte el código con esa persona; sólo se muestra ahora.`,
        );
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No pudimos completar esta acción.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-small text-neutral-400">
        Los beneficios Pro no conceden permisos de administrador.
      </p>
      <Segmented
        label="Acción"
        value={tab}
        onChange={switchTab}
        options={[
          { value: "grant", label: "Cambiar plan" },
          { value: "invite", label: "Invitar" },
        ]}
      />
      <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <Field id="admin-email" label="Correo de la persona">
          <Input
            id="admin-email"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={254}
            disabled={busy}
            required
          />
        </Field>
        <Field id="admin-plan" label="Plan">
          <Select
            id="admin-plan"
            value={plan}
            onChange={(event) => setPlan(event.target.value as "FREE" | "PRO")}
            disabled={busy}
          >
            <option value="PRO">Pro de cortesía</option>
            <option value="FREE">{tab === "grant" ? "Retirar Pro de cortesía" : "Free"}</option>
          </Select>
        </Field>
        {tab === "grant" && plan === "PRO" ? (
          <Field
            id="admin-expiry"
            label="Vence el"
            optional
            help="Sin fecha, el acceso Pro se mantiene hasta que lo retires."
          >
            <Input
              id="admin-expiry"
              type="date"
              value={expires}
              onChange={(event) => setExpires(event.target.value)}
              disabled={busy}
              aria-describedby="admin-expiry-help"
            />
          </Field>
        ) : tab === "invite" ? (
          <Field id="admin-days" label="Vigencia del código">
            <Select
              id="admin-days"
              value={days}
              onChange={(event) => setDays(event.target.value)}
              disabled={busy}
            >
              <option value="1">1 día</option>
              <option value="7">7 días</option>
              <option value="30">30 días</option>
            </Select>
          </Field>
        ) : (
          <p className="text-small text-neutral-400">
            Se retirará el acceso Pro de cortesía. Las futuras suscripciones pagadas se administran
            por separado.
          </p>
        )}
        {error ? (
          <Alert tone="danger" role="alert">
            {error}
          </Alert>
        ) : null}
        {notice ? <Alert tone="success">{notice}</Alert> : null}
        {code ? (
          <div className="flex items-center gap-2 rounded-md bg-bg p-2 ring-1 ring-inset ring-neutral-800">
            <code className="min-w-0 flex-1 truncate px-2 text-small">{code}</code>
            <Button
              variant="icon"
              aria-label="Copiar código de invitación"
              onClick={() => void copyInvitation()}
            >
              {copied ? (
                <Check size={17} aria-hidden="true" />
              ) : (
                <Copy size={17} aria-hidden="true" />
              )}
            </Button>
          </div>
        ) : null}
        <Button type="submit" loading={busy} disabled={busy || reconciling}>
          <Check size={15} aria-hidden="true" />
          {tab === "grant" ? "Guardar acceso" : "Crear invitación"}
        </Button>
      </form>
      <div className="flex flex-col gap-2 border-t border-divider pt-4">
        <p className="text-small text-neutral-400">
          Si un proveedor dejó cargos pendientes, comprueba su consumo antes de liberar el
          presupuesto reservado.
        </p>
        <Button
          loading={reconciling}
          disabled={busy || reconciling}
          onClick={() => void reconcile()}
        >
          <ShieldCheck size={15} aria-hidden="true" />
          Confirmar consumo pendiente
        </Button>
      </div>
    </div>
  );
}
