import type { AccountStatus } from "./auth-client";
import type { AppStatus, Credentials } from "./types";
import { usesPlanAccess, webSearchEnabled } from "./account-presentation";

export type GenerationBlock =
  | "selection"
  | "busy"
  | "offline"
  | "account_loading"
  | "account_error"
  | "accounts_unavailable"
  | "login"
  | "verification"
  | "usage_loading"
  | "quota"
  | "concurrency"
  | "rate"
  | "configuration_loading"
  | "configuration"
  | "model"
  | "budget";
export type GenerationAccess =
  | { allowed: true }
  | {
      allowed: false;
      reason: GenerationBlock;
      message: string;
      action?: "login" | "verify" | "settings" | "refresh";
    };
export type GenerationAccessInput = {
  account: AccountStatus | null;
  accountError?: string;
  status?: AppStatus | null;
  statusError?: string;
  credentials?: Credentials;
  operation?: "coach" | "draft" | "account";
  requestedWeb?: boolean;
  replay?: boolean;
  busy?: boolean;
  selectionReady?: boolean;
  online?: boolean;
  now?: number;
};

/** Client availability is advisory; the server still admits every request atomically. */
export function generationAccess({
  account,
  accountError,
  status,
  statusError,
  credentials = {},
  operation = "coach",
  requestedWeb = false,
  replay = false,
  busy = false,
  selectionReady = true,
  online = true,
  now = Date.now(),
}: GenerationAccessInput): GenerationAccess {
  const block = (
    reason: GenerationBlock,
    message: string,
    action?: "login" | "verify" | "settings" | "refresh",
  ): GenerationAccess => ({ allowed: false, reason, message, ...(action ? { action } : {}) });
  if (busy) return block("busy", "Espera a que termine la solicitud actual.");
  if (!online) return block("offline", "Sin conexión. Conéctate y reintenta.");
  if (accountError) return block("account_error", accountError, "refresh");
  if (!account) return block("account_loading", "Comprobando tu cuenta…");
  if (!account.configured)
    return block(
      "accounts_unavailable",
      "Las cuentas aún no están disponibles. Puedes probar el ejemplo.",
    );
  if (!account.authenticated)
    return block("login", "Entra para generar y guardar builds.", "login");
  if (!account.user?.emailVerified)
    return block("verification", "Verifica tu correo para generar builds.", "verify");
  if (operation === "account" || replay) return { allowed: true };
  const usage = account.usage;
  if (!usage) return block("usage_loading", "Comprobando tu disponibilidad…", "refresh");
  const remaining = operation === "draft" ? usage.draftRemaining : usage.coachRemaining;
  const capped = operation === "draft" || usesPlanAccess(account);
  if (capped && typeof remaining === "number" && remaining <= 0)
    return block(
      "quota",
      operation === "draft"
        ? "Sin lecturas disponibles. Elige los campeones a mano."
        : "Sin builds disponibles. Consulta las anteriores en Sesiones.",
    );
  if (usage.pending >= (usage.concurrentLimit ?? 1))
    return block(
      "concurrency",
      "Ya alcanzaste el límite de consultas en curso. Espera a que terminen.",
      "refresh",
    );
  if (usage.rateLimitedUntil && Date.parse(usage.rateLimitedUntil) > now)
    return block(
      "rate",
      "Alcanzaste el límite de consultas por minuto. Espera un momento.",
      "refresh",
    );
  const byok = Boolean(credentials.apiKey?.trim());
  if (!byok && !status?.configured) {
    if (!status && !statusError)
      return block("configuration_loading", "Comprobando la conexión de IA…");
    return block(
      "configuration",
      "Configura una clave de OpenRouter para generar builds.",
      "settings",
    );
  }
  const model = credentials.model?.trim() || usage.defaultModel || status?.defaultModel;
  if (!model || !usage.allowedModels.includes(model))
    return block("model", "Elige un modelo disponible en Conexión de IA.", "settings");
  const available = usage.coachAvailability?.[model];
  const web = webSearchEnabled(account, requestedWeb);
  if (operation === "coach" && !byok && available && !available[web ? "web" : "standard"])
    return block(
      "budget",
      "El presupuesto disponible no alcanza para este modelo. Cambia de modelo o usa tu clave de OpenRouter.",
      "refresh",
    );
  if (!selectionReady) return block("selection", "Elige tu campeón y rival.");
  return { allowed: true };
}
