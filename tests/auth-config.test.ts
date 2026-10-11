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
