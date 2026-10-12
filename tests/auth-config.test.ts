import test from "node:test";
import assert from "node:assert/strict";
import { authConfigurationStatus, readAuthConfig } from "../lib/auth-config";

const config = {
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://local:local@127.0.0.1:5432/cholo",
  BETTER_AUTH_SECRET: "a-secure-local-fixture-secret-of-more-than-32-characters",
  BETTER_AUTH_URL: "http://localhost:3000",
  AUTH_EMAIL_FROM: "GrietaPro <coach@example.test>",
  AUTH_MAILPIT_URL: "http://127.0.0.1:55441",
};

function captureConfigurationDiagnostics(work: () => void): string[] {
  const previous = console.error;
  const lines: string[] = [];
  console.error = (...args: unknown[]) => {
    assert.equal(args.length, 1);
    assert.equal(typeof args[0], "string");
    lines.push(args[0] as string);
  };
  try {
    work();
    return lines;
  } finally {
    console.error = previous;
  }
}

test("auth defaults to open registration and trusts only its explicitly configured origin", () => {
  const value = readAuthConfig(config);
  assert.equal(value?.registrationMode, "OPEN");
  assert.deepEqual(value?.trustedOrigins, ["http://localhost:3000"]);
});

test("public auth status does not expose any configuration secret", () => {
  const status = authConfigurationStatus(config);
  assert.deepEqual(status, { configured: true, mailConfigured: true, registrationMode: "OPEN" });
  const serialized = JSON.stringify(status);
  assert.equal(serialized.includes(config.BETTER_AUTH_SECRET), false);
  assert.equal(serialized.includes(config.DATABASE_URL), false);
});

test("invitation-only registration remains an explicit option", () => {
  const value = readAuthConfig({ ...config, APP_REGISTRATION_MODE: "invite" });
  assert.equal(value?.registrationMode, "INVITE");
});

test("invalid configuration reports only fixed safe reasons and preserves the public shape", () => {
  const privateConfig = {
    ...config,
    DATABASE_URL: "postgresql://private-user:private-password@private-db.test/private-db",
    BETTER_AUTH_SECRET: "synthetic-private-auth-secret-that-must-never-be-logged",
    BETTER_AUTH_URL: "https://private-auth-host.test",
    AUTH_EMAIL_FROM: "Private Sender <private-recipient@example.test>",
    AUTH_MAILPIT_URL: undefined,
    RESEND_API_KEY: "synthetic-private-resend-api-key",
    APP_REGISTRATION_MODE: "invite",
  };
  const cases: [string, Record<string, string | undefined>][] = [
    ["missing_secret", { BETTER_AUTH_SECRET: undefined }],
    ["weak_secret", { BETTER_AUTH_SECRET: "private-weak-secret" }],
    ["missing_database", { DATABASE_URL: undefined }],
    ["invalid_database", { DATABASE_URL: "https://private-db-user:private-db-key@db.test" }],
    ["invalid_base_url", { BETTER_AUTH_URL: "https://private-url-key@private-host.test" }],
    ["missing_email_from", { AUTH_EMAIL_FROM: undefined }],
    ["invalid_email_from", { AUTH_EMAIL_FROM: "private-sender\r\nBcc:private-email@test" }],
    ["invalid_registration_mode", { APP_REGISTRATION_MODE: "private-invalid-mode" }],
    ["missing_mail_provider", { RESEND_API_KEY: undefined }],
    ["invalid_trusted_origins", { BETTER_AUTH_TRUSTED_ORIGINS: "https://private-wildcard.*" }],
  ];
  const lines = captureConfigurationDiagnostics(() => {
    for (const [, overrides] of cases) {
      const value = { ...privateConfig, ...overrides };
      assert.equal(readAuthConfig(value), null);
      assert.deepEqual(authConfigurationStatus(value), {
        configured: false,
        mailConfigured: false,
        registrationMode: "CLOSED",
      });
    }
  });
  assert.deepEqual(
    lines.map((line) => JSON.parse(line)),
    cases.map(([reason]) => ({
      event: "auth_configuration_failure",
      version: 1,
      reason,
      production: false,
    })),
  );
  const privateValues = [
    ...Object.values(privateConfig),
    ...cases.flatMap(([, overrides]) => Object.values(overrides)),
  ].filter((value): value is string => Boolean(value));
  for (const line of lines) {
    assert.equal(line.includes("private"), false);
    for (const value of privateValues) assert.equal(line.includes(value), false);
  }
});

test("diagnostics deduplicate a fixed reason across different private values", () => {
  const lines = captureConfigurationDiagnostics(() => {
    for (const secret of ["different-private-value", "another-private-secret"]) {
      assert.equal(
        authConfigurationStatus({ ...config, NODE_ENV: "production", BETTER_AUTH_SECRET: secret })
          .configured,
        false,
      );
    }
  });
  assert.deepEqual(
    lines.map((line) => JSON.parse(line)),
    [
      {
        event: "auth_configuration_failure",
        version: 1,
        reason: "weak_secret",
        production: true,
      },
    ],
  );
});

test("a throwing logger cannot change the safe response or cause repeated diagnostics", () => {
  const previous = console.error;
  let calls = 0;
  console.error = () => {
    calls++;
    throw new Error("synthetic-private-logger-error");
  };
  try {
    const value = { ...config, NODE_ENV: "production", BETTER_AUTH_SECRET: undefined };
    for (let attempt = 0; attempt < 3; attempt++) {
      assert.deepEqual(authConfigurationStatus(value), {
        configured: false,
        mailConfigured: false,
        registrationMode: "CLOSED",
      });
    }
    assert.equal(calls, 1);
  } finally {
    console.error = previous;
  }
});

test("valid configuration and direct reads emit no diagnostics", () => {
  const lines = captureConfigurationDiagnostics(() => {
    assert.equal(readAuthConfig({ ...config, BETTER_AUTH_SECRET: undefined }), null);
    assert.deepEqual(authConfigurationStatus({ ...config, APP_REGISTRATION_MODE: "invite" }), {
      configured: true,
      mailConfigured: true,
      registrationMode: "INVITE",
    });
    assert.deepEqual(authConfigurationStatus(config), {
      configured: true,
      mailConfigured: true,
      registrationMode: "OPEN",
    });
  });
  assert.deepEqual(lines, []);
});

test("missing settings, weak secret and invalid registration mode fail closed", () => {
  for (const settings of [
    {},
    { ...config, BETTER_AUTH_SECRET: "short" },
    { ...config, APP_REGISTRATION_MODE: "typo" },
    { ...config, AUTH_EMAIL_FROM: "mail\r\nBcc:target" },
    { ...config, DATABASE_URL: "https://database.example" },
  ]) {
    assert.equal(readAuthConfig(settings), null);
    assert.equal(authConfigurationStatus(settings).registrationMode, "CLOSED");
  }
});

test("production requires HTTPS and a real mail provider; local mail is never accepted", () => {
  assert.equal(readAuthConfig({ ...config, NODE_ENV: "production" }), null);
  assert.equal(
    readAuthConfig({
      ...config,
      NODE_ENV: "production",
      BETTER_AUTH_URL: "https://coach.example.test",
    }),
    null,
  );
  const value = readAuthConfig({
    ...config,
    NODE_ENV: "production",
    BETTER_AUTH_URL: "https://coach.example.test",
    RESEND_API_KEY: "re_fixture",
    APP_REGISTRATION_MODE: "open",
  });
  assert.equal(value?.mail.kind, "resend");
  assert.equal(value?.registrationMode, "OPEN");
});

test("untrusted HTTP hosts, URL credentials and local mail SSRF targets are rejected", () => {
  for (const url of [
    "http://public.example.test:3000",
    "https://user:pass@coach.example.test",
    "https://coach.example.test/?redirect=bad",
    "https://coach.example.test/path",
  ]) {
    assert.equal(readAuthConfig({ ...config, BETTER_AUTH_URL: url }), null);
  }
  assert.equal(readAuthConfig({ ...config, AUTH_MAILPIT_URL: "http://169.254.169.254" }), null);
  assert.equal(readAuthConfig({ ...config, AUTH_MAILPIT_URL: "https://mail.example.test" }), null);
});

test("local mobile origins must be explicitly configured and are forbidden in production", () => {
  const local = readAuthConfig({
    ...config,
    BETTER_AUTH_URL: "http://192.168.1.2:3000",
    BETTER_AUTH_TRUSTED_ORIGINS: "http://127.0.0.1:3000,http://localhost:3000",
  });
  assert.deepEqual(local?.trustedOrigins, [
    "http://192.168.1.2:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
  ]);
  assert.equal(
    readAuthConfig({ ...config, BETTER_AUTH_TRUSTED_ORIGINS: "https://*.example.test" }),
    null,
  );
  assert.equal(
    readAuthConfig({
      ...config,
      BETTER_AUTH_URL: "https://coach.example.test",
      NODE_ENV: "production",
      RESEND_API_KEY: "re_fixture",
      BETTER_AUTH_TRUSTED_ORIGINS: "http://192.168.1.2:3000",
    }),
    null,
  );
});
