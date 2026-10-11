import test from "node:test";
import assert from "node:assert/strict";
import { readAuthConfig } from "../lib/auth-config";
import { sendAuthEmail } from "../lib/auth-mail";

const configuration = {
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://fixture:fixture@127.0.0.1:5432/fixture",
  BETTER_AUTH_SECRET: "a-secure-test-secret-with-more-than-32-characters",
  BETTER_AUTH_URL: "http://127.0.0.1:3000",
  AUTH_EMAIL_FROM: "GrietaPro <coach@example.test>",
  AUTH_MAILPIT_URL: "http://127.0.0.1:55441",
};

test("local verification email is delivered only to loopback mail and the requested recipient", async () => {
  const config = readAuthConfig(configuration)!;
  const previousFetch = globalThis.fetch;
  let captured: { url: string; body: Record<string, unknown>; headers: Headers } | undefined;
  try {
    globalThis.fetch = async (input, options) => {
      captured = {
        url: String(input),
        body: JSON.parse(String(options?.body)),
        headers: new Headers(options?.headers),
      };
      return Response.json({ ID: "local" });
    };
    await sendAuthEmail(
      config,
      "user@example.test",
      "http://127.0.0.1:3000/api/auth/verify-email?token=private-token&callbackURL=%2F",
      "verify",
    );
    assert.equal(captured?.url, "http://127.0.0.1:55441/api/v1/send");
    assert.deepEqual(captured?.body.To, [{ Email: "user@example.test" }]);
    assert.equal(captured?.headers.has("Authorization"), false);
    assert.match(String(captured?.body.HTML), /&amp;callbackURL=/);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("auth mail rejects an unexpected link origin before sending", async () => {
  const config = readAuthConfig(configuration)!;
  const previousFetch = globalThis.fetch;
  let sends = 0;
  try {
    globalThis.fetch = async () => {
      sends++;
      return Response.json({});
    };
    await assert.rejects(
      sendAuthEmail(
        config,
        "user@example.test",
        "https://attacker.example/reset?token=private",
        "reset",
      ),
    );
    assert.equal(sends, 0);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("mail provider errors are replaced by a static error without credentials or response content", async () => {
  const config = readAuthConfig({ ...configuration, RESEND_API_KEY: "re_private-fixture" })!;
  const previousFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      Response.json({ detail: "private-provider-error re_private-fixture" }, { status: 401 });
    await assert.rejects(
      sendAuthEmail(
        config,
        "user@example.test",
        "http://127.0.0.1:3000/api/auth/reset-password/token",
        "reset",
      ),
      (error) => {
        assert.equal(error instanceof Error && error.message.includes("private"), false);
        return true;
      },
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});
