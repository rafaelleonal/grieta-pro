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

export function readAuthConfig(env: Environment = process.env): AuthConfig | null {
  const production = env.NODE_ENV === "production";
  const secret = env.BETTER_AUTH_SECRET?.trim();
  const databaseUrl = env.DATABASE_URL?.trim();
  const baseUrl = originUrl(env.BETTER_AUTH_URL?.trim(), production);
  const emailFrom = env.AUTH_EMAIL_FROM?.trim();
  if (
    !secret ||
    secret.length < 32 ||
    !databaseUrl ||
    !baseUrl ||
    !emailFrom ||
    /[\r\n]/.test(emailFrom)
  )
    return null;
  try {
    if (!["postgresql:", "postgres:"].includes(new URL(databaseUrl).protocol)) return null;
  } catch {
    return null;
  }
  const configuredMode = env.APP_REGISTRATION_MODE?.trim() || "open";
  if (configuredMode !== "invite" && configuredMode !== "open") return null;
  const resendKey = env.RESEND_API_KEY?.trim();
  let mail: AuthConfig["mail"] | undefined;
  if (resendKey) mail = { kind: "resend", apiKey: resendKey };
  else if (!production && env.AUTH_MAILPIT_URL?.trim()) {
    const mailpitUrl = originUrl(env.AUTH_MAILPIT_URL.trim(), false);
    if (mailpitUrl && loopback(new URL(mailpitUrl).hostname))
      mail = { kind: "mailpit", baseUrl: mailpitUrl };
  }
  if (!mail) return null;
  const trustedOrigins = [baseUrl];
  const additionalOrigins = env.BETTER_AUTH_TRUSTED_ORIGINS?.trim();
  if (additionalOrigins) {
    const values = additionalOrigins.split(",").map((value) => value.trim());
    if (values.length > 8) return null;
    for (const value of values) {
      const allowedOrigin = originUrl(value, production);
      if (!allowedOrigin) return null;
      if (!trustedOrigins.includes(allowedOrigin)) trustedOrigins.push(allowedOrigin);
    }
  }
  return {
    databaseUrl,
    secret,
    baseUrl,
    trustedOrigins,
    registrationMode: configuredMode === "open" ? "OPEN" : "INVITE",
    emailFrom,
    mail,
  };
}

/** Safe public status; never returns secrets or database/mail connection details. */
export function authConfigurationStatus(env: Environment = process.env) {
  const config = readAuthConfig(env);
  return {
    configured: Boolean(config),
    mailConfigured: Boolean(config?.mail),
    registrationMode: config?.registrationMode ?? ("CLOSED" as RegistrationMode),
  };
}
