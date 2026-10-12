export type RegistrationMode = "OPEN" | "INVITE" | "CLOSED";

export type AuthConfig = {
  databaseUrl: string;
  secret: string;
  baseUrl: string;
  trustedOrigins: string[];
  registrationMode: "OPEN" | "INVITE";
  emailFrom: string;
  mail: { kind: "resend"; apiKey: string } | { kind: "mailpit"; baseUrl: string };
};

type Environment = Record<string, string | undefined>;

type AuthConfigurationFailureReason =
  | "missing_secret"
  | "weak_secret"
  | "missing_database"
  | "invalid_database"
  | "invalid_base_url"
  | "missing_email_from"
  | "invalid_email_from"
  | "invalid_registration_mode"
  | "missing_mail_provider"
  | "invalid_trusted_origins";

type AuthConfigurationResolution =
  { config: AuthConfig; reason: null } | { config: null; reason: AuthConfigurationFailureReason };

// Only the finite reason/runtime pairs are retained, never environment values.
const reportedFailures = new Set<string>();

function reportConfigurationFailure(
  reason: AuthConfigurationFailureReason,
  production: boolean,
): void {
  const marker = `${production ? "production" : "nonproduction"}:${reason}`;
  if (reportedFailures.has(marker)) return;
  reportedFailures.add(marker);
  try {
    console.error(
      JSON.stringify({ event: "auth_configuration_failure", version: 1, reason, production }),
    );
  } catch {
    // Diagnostics must never alter the safe public response or enable access.
  }
}

function loopback(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

function privateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255))
    return false;
  return (
    parts[0] === 10 ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
  );
}

function originUrl(value: string | undefined, production: boolean): string | null {
  try {
    if (!value) return null;
    const url = new URL(value);
    if (
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      /[*%]/.test(url.hostname) ||
      (url.pathname !== "/" && url.pathname !== "")
    )
      return null;
    if (
      url.protocol !== "https:" &&
      !(
        url.protocol === "http:" &&
        !production &&
        (loopback(url.hostname) || privateIpv4(url.hostname))
      )
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}

function resolveAuthConfiguration(env: Environment): AuthConfigurationResolution {
  const production = env.NODE_ENV === "production";
  const secret = env.BETTER_AUTH_SECRET?.trim();
  const databaseUrl = env.DATABASE_URL?.trim();
  const baseUrl = originUrl(env.BETTER_AUTH_URL?.trim(), production);
  const emailFrom = env.AUTH_EMAIL_FROM?.trim();
  if (!secret) return { config: null, reason: "missing_secret" };
  if (secret.length < 32) return { config: null, reason: "weak_secret" };
  if (!databaseUrl) return { config: null, reason: "missing_database" };
  try {
    if (!["postgresql:", "postgres:"].includes(new URL(databaseUrl).protocol))
      return { config: null, reason: "invalid_database" };
  } catch {
    return { config: null, reason: "invalid_database" };
  }
  if (!baseUrl) return { config: null, reason: "invalid_base_url" };
  if (!emailFrom) return { config: null, reason: "missing_email_from" };
  if (/[\r\n]/.test(emailFrom)) return { config: null, reason: "invalid_email_from" };
  const configuredMode = env.APP_REGISTRATION_MODE?.trim() || "open";
  if (configuredMode !== "invite" && configuredMode !== "open")
    return { config: null, reason: "invalid_registration_mode" };
  const resendKey = env.RESEND_API_KEY?.trim();
  let mail: AuthConfig["mail"] | undefined;
  if (resendKey) mail = { kind: "resend", apiKey: resendKey };
  else if (!production && env.AUTH_MAILPIT_URL?.trim()) {
    const mailpitUrl = originUrl(env.AUTH_MAILPIT_URL.trim(), false);
    if (mailpitUrl && loopback(new URL(mailpitUrl).hostname))
      mail = { kind: "mailpit", baseUrl: mailpitUrl };
  }
  if (!mail) return { config: null, reason: "missing_mail_provider" };
  const trustedOrigins = [baseUrl];
  const additionalOrigins = env.BETTER_AUTH_TRUSTED_ORIGINS?.trim();
  if (additionalOrigins) {
    const values = additionalOrigins.split(",").map((value) => value.trim());
    if (values.length > 8) return { config: null, reason: "invalid_trusted_origins" };
    for (const value of values) {
      const allowedOrigin = originUrl(value, production);
      if (!allowedOrigin) return { config: null, reason: "invalid_trusted_origins" };
      if (!trustedOrigins.includes(allowedOrigin)) trustedOrigins.push(allowedOrigin);
    }
  }
  return {
    config: {
      databaseUrl,
      secret,
      baseUrl,
      trustedOrigins,
      registrationMode: configuredMode === "open" ? "OPEN" : "INVITE",
      emailFrom,
      mail,
    },
    reason: null,
  };
}

export function readAuthConfig(env: Environment = process.env): AuthConfig | null {
  return resolveAuthConfiguration(env).config;
}

/** Safe public status; never returns secrets or database/mail connection details. */
export function authConfigurationStatus(env: Environment = process.env) {
  const { config, reason } = resolveAuthConfiguration(env);
  if (reason) reportConfigurationFailure(reason, env.NODE_ENV === "production");
  return {
    configured: Boolean(config),
    mailConfigured: Boolean(config?.mail),
    registrationMode: config?.registrationMode ?? ("CLOSED" as RegistrationMode),
  };
}
