import type { AccountStatus } from "./auth-client";
import type { AppStatus } from "./types";

export type GenerationBlock =
  | "selection"
  | "busy"
  | "offline"
  | "account_loading"
  | "account_error"
  | "accounts_unavailable"
  | "login"
  | "verification"
  | "configuration_loading"
  | "configuration";
export type GenerationAccess =
  | { allowed: true }
  | {
      allowed: false;
      reason: GenerationBlock;
      message: string;
      action?: "login" | "verify" | "refresh";
    };

/**
 * Disponibilidad del botón. Es orientativa: el servidor decide. Los límites diarios no
 * bloquean aquí porque un matchup ya generado sale de la caché sin contar.
 */
export function generationAccess({
  account,
  accountError,
  status,
  statusError,
  busy = false,
  selectionReady = true,
  online = true,
}: {
  account: AccountStatus | null;
  accountError?: string;
  status?: AppStatus | null;
  statusError?: string;
  busy?: boolean;
  selectionReady?: boolean;
  online?: boolean;
}): GenerationAccess {
  const block = (
    reason: GenerationBlock,
    message: string,
    action?: "login" | "verify" | "refresh",
  ): GenerationAccess => ({ allowed: false, reason, message, ...(action ? { action } : {}) });
  if (busy) return block("busy", "Espera a que termine la build actual.");
  if (!online) return block("offline", "Sin conexión. Conéctate y reintenta.");
  if (accountError) return block("account_error", accountError, "refresh");
  if (!account) return block("account_loading", "Comprobando tu cuenta…");
  if (!account.configured)
    return block(
      "accounts_unavailable",
      "Las cuentas aún no están disponibles. Puedes ver el ejemplo.",
    );
  if (!account.authenticated) return block("login", "Entra para pedir builds.", "login");
  if (!account.user?.emailVerified)
    return block("verification", "Verifica tu correo para pedir builds.", "verify");
  if (!status?.configured) {
    if (!status && !statusError)
      return block("configuration_loading", "Comprobando la conexión de IA…");
    return block("configuration", "La IA no está configurada en el servidor.", "refresh");
  }
  if (!selectionReady) return block("selection", "Elige tu campeón y tu rival.");
  return { allowed: true };
}
