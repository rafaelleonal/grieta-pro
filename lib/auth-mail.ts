import type { AuthConfig } from "./auth-config";

const AUTH_MAIL_ERROR = "No pudimos enviar el correo. Inténtalo nuevamente.";

type MailFailureCategory =
  "invalid_link" | "http_error" | "timeout" | "cancelled" | "transport_error";

function boundedHttpStatus(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 100 && value <= 599
    ? value
    : null;
}

function transportFailureCategory(error: unknown): MailFailureCategory {
  try {
    if (error instanceof Error && error.name === "TimeoutError") return "timeout";
    if (error instanceof Error && error.name === "AbortError") return "cancelled";
  } catch {
    // A transport exception can carry arbitrary data or throwing properties.
  }
  return "transport_error";
}

function logAuthMail(
  provider: "resend" | "mailpit",
  purpose: "verify" | "reset",
  outcome: "accepted" | "failed",
  category: MailFailureCategory | "provider_accepted",
  httpStatus: number | null,
): void {
  try {
    const line = JSON.stringify({
      event: "auth_mail_delivery",
      version: 1,
      provider,
      purpose,
      outcome,
      category,
      httpStatus,
    });
    if (outcome === "accepted") console.info(line);
    else console.error(line);
  } catch {
    // Logging cannot turn an accepted email into an error or trigger another send.
  }
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  );
}

/** Authentication links are sent only to the intended recipient, never logged. */
export async function sendAuthEmail(
  config: AuthConfig,
  recipient: string,
  url: string,
  purpose: "verify" | "reset",
) {
  const provider = config.mail.kind === "resend" ? "resend" : "mailpit";
  const mailPurpose = purpose === "verify" ? "verify" : "reset";
  let category: MailFailureCategory = "invalid_link";
  let httpStatus: number | null = null;
  try {
    const link = new URL(url);
    if (link.origin !== config.baseUrl) throw new Error(AUTH_MAIL_ERROR);
    category = "transport_error";
    const response = await deliverAuthEmail(config, recipient, link, mailPurpose);
    httpStatus = boundedHttpStatus(response.status);
    if (!response.ok || httpStatus === null || httpStatus < 200 || httpStatus >= 300) {
      category = "http_error";
      throw new Error(AUTH_MAIL_ERROR);
    }
    // An HTTP success proves provider acceptance, never delivery to the inbox.
    logAuthMail(provider, mailPurpose, "accepted", "provider_accepted", httpStatus);
  } catch (error) {
    if (category === "transport_error") category = transportFailureCategory(error);
    logAuthMail(provider, mailPurpose, "failed", category, httpStatus);
    // Dependencies may log non-API errors. Never let transport errors or their
    // causes carry recipients, signed links or credentials beyond this boundary.
    throw new Error(AUTH_MAIL_ERROR);
  }
}

async function deliverAuthEmail(
  config: AuthConfig,
  recipient: string,
  link: URL,
  purpose: "verify" | "reset",
) {
  const subject =
    purpose === "verify"
      ? "Confirma tu correo · Elociencia"
      : "Restablece tu contraseña · Elociencia";
  const message =
    purpose === "verify"
      ? "Confirma tu correo para comenzar a usar Elociencia."
      : "Solicitaste restablecer tu contraseña de Elociencia.";
  const action = purpose === "verify" ? "Confirmar mi correo" : "Restablecer contraseña";
  const html = `<p>${message}</p><p><a href="${escapeHtml(link.href)}">${action}</a></p><p>Si no solicitaste este correo, puedes ignorarlo.</p>`;
  const text = `${message}\n\n${link.href}\n\nSi no solicitaste este correo, puedes ignorarlo.`;
  const isResend = config.mail.kind === "resend";
  const endpoint =
    config.mail.kind === "resend"
      ? "https://api.resend.com/emails"
      : `${config.mail.baseUrl}/api/v1/send`;
  const fromMatch = config.emailFrom.match(/^(.*?)\s*<([^<>]+)>$/);
  return fetch(endpoint, {
    method: "POST",
    redirect: "error",
    headers: {
      "Content-Type": "application/json",
      ...(isResend && config.mail.kind === "resend"
        ? { Authorization: `Bearer ${config.mail.apiKey}` }
        : {}),
    },
    body: JSON.stringify(
      isResend
        ? { from: config.emailFrom, to: [recipient], subject, html, text }
        : {
            From: {
              Name: fromMatch?.[1].trim() || "Elociencia",
              Email: fromMatch?.[2] || config.emailFrom,
            },
            To: [{ Email: recipient }],
            Subject: subject,
            HTML: html,
            Text: text,
          },
    ),
    signal: AbortSignal.timeout(10_000),
  });
}
