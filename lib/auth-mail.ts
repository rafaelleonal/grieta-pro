import type { AuthConfig } from "./auth-config";

const AUTH_MAIL_ERROR = "No pudimos enviar el correo. Inténtalo nuevamente.";

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
  try {
    await deliverAuthEmail(config, recipient, url, purpose);
  } catch {
    // Dependencies may log non-API errors. Never let transport errors or their
    // causes carry recipients, signed links or credentials beyond this boundary.
    throw new Error(AUTH_MAIL_ERROR);
  }
}

async function deliverAuthEmail(
  config: AuthConfig,
  recipient: string,
  url: string,
  purpose: "verify" | "reset",
) {
  const link = new URL(url);
  if (link.origin !== config.baseUrl) throw new Error(AUTH_MAIL_ERROR);
  const subject =
    purpose === "verify"
      ? "Confirma tu correo · GrietaPro"
      : "Restablece tu contraseña · GrietaPro";
  const message =
    purpose === "verify"
      ? "Confirma tu correo para comenzar a usar GrietaPro."
      : "Solicitaste restablecer tu contraseña de GrietaPro.";
  const action = purpose === "verify" ? "Confirmar mi correo" : "Restablecer contraseña";
  const html = `<p>${message}</p><p><a href="${escapeHtml(link.href)}">${action}</a></p><p>Si no solicitaste este correo, puedes ignorarlo.</p>`;
  const text = `${message}\n\n${link.href}\n\nSi no solicitaste este correo, puedes ignorarlo.`;
  const isResend = config.mail.kind === "resend";
  const endpoint =
    config.mail.kind === "resend"
      ? "https://api.resend.com/emails"
      : `${config.mail.baseUrl}/api/v1/send`;
  const fromMatch = config.emailFrom.match(/^(.*?)\s*<([^<>]+)>$/);
  const response = await fetch(endpoint, {
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
              Name: fromMatch?.[1].trim() || "GrietaPro",
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
  if (!response.ok) throw new Error(AUTH_MAIL_ERROR);
}
