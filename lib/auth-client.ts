"use client";

import { createAuthClient } from "better-auth/react";
import type { GenerationAttempt } from "./generation-intent";
import type { AccessMode } from "./access-policy";

export const authClient = createAuthClient();

export interface AccountStatus {
  configured: boolean;
  authenticated: boolean;
  registrationMode: "OPEN" | "INVITE" | "CLOSED";
  user?: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    role: "USER" | "ADMIN";
    plan: "FREE" | "PRO";
  };
  usage?: {
    accessMode?: AccessMode;
    coachRemaining: number | null;
    draftRemaining: number;
    webRemaining: number;
    coachLimit: number | null;
    draftLimit: number;
    webLimit: number;
    resetsAt: string;
    pending: number;
    uncertain: number;
    /** Budget snapshot for server-funded coach calls; admission remains authoritative. */
    coachAvailability?: Record<string, { standard: boolean; web: boolean }>;
    concurrentLimit?: number;
    rateLimitedUntil?: string | null;
    defaultModel?: string;
    allowedModels: string[];
    webAllowed: boolean;
  };
}

export interface ReconciliationResult {
  usage: NonNullable<AccountStatus["usage"]>;
  checked: number;
  reconciled: number;
  attempt?: GenerationAttempt | null;
}

export async function reconcileAccount(
  idempotencyKey?: string,
  signal?: AbortSignal,
): Promise<ReconciliationResult> {
  const response = await fetch("/api/account/reconcile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    redirect: "error",
    body: JSON.stringify(idempotencyKey ? { idempotencyKey } : {}),
    signal,
  });
  if (!response.ok)
    throw new Error("No pudimos comprobar el consumo todavía. No se ha iniciado otro análisis.");
  return response.json() as Promise<ReconciliationResult>;
}

export async function readAccount(signal?: AbortSignal): Promise<AccountStatus> {
  const response = await fetch("/api/account", { cache: "no-store", signal });
  if (!response.ok) throw new Error("No pudimos comprobar tu cuenta. Vuelve a intentar.");
  return response.json() as Promise<AccountStatus>;
}

export function authErrorMessage(error: unknown): string {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  const status =
    error && typeof error === "object" && "status" in error ? Number(error.status) : null;
  const message =
    error && typeof error === "object" && "message" in error ? String(error.message) : "";
  if (status === 429)
    return "Hiciste varios intentos seguidos. Espera unos minutos y vuelve a intentar.";
  if (
    message === "Necesitas una invitación válida para este correo." ||
    message === "La invitación ya no está disponible."
  )
    return "Revisa tu correo y código de invitación. La invitación puede haber vencido o ya estar utilizada.";
  if (message === "Escribe un nombre entre 2 y 80 caracteres.") return message;
  const messages: Record<string, string> = {
    INVALID_EMAIL_OR_PASSWORD: "Revisa tu correo y contraseña e intenta de nuevo.",
    INVALID_PASSWORD: "Revisa tu contraseña e intenta de nuevo.",
    EMAIL_NOT_VERIFIED: "Verifica tu correo para entrar. Puedes solicitar otro enlace abajo.",
    PASSWORD_TOO_SHORT: "Usa una contraseña de al menos 12 caracteres.",
    PASSWORD_TOO_LONG: "La contraseña admite hasta 128 caracteres.",
    INVALID_EMAIL: "Escribe un correo válido.",
    INVALID_NAME: "Escribe un nombre entre 2 y 80 caracteres.",
    INVALID_TOKEN: "El enlace venció o ya se utilizó. Solicita uno nuevo.",
    TOKEN_EXPIRED: "El enlace venció. Solicita uno nuevo.",
    TOO_MANY_REQUESTS: "Hiciste varios intentos seguidos. Espera unos minutos y vuelve a intentar.",
    SIGN_UP_DISABLED: "El registro está cerrado por ahora.",
    INVITATION_REQUIRED: "Necesitas una invitación para crear tu cuenta.",
    INVALID_INVITATION: "Revisa tu código de invitación. Puede haber vencido o ya estar utilizado.",
    INVALID_INVITATION_CODE:
      "Revisa tu código de invitación. Puede haber vencido o ya estar utilizado.",
  };
  return (
    messages[code] ||
    "No pudimos completar esta acción. Revisa los datos o vuelve a intentar más tarde."
  );
}
