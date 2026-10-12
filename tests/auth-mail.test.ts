import test from "node:test";
import assert from "node:assert/strict";
import { readAuthConfig } from "../lib/auth-config";
import { sendAuthEmail } from "../lib/auth-mail";

const configuration = {
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://fixture:fixture@127.0.0.1:5432/fixture",
  BETTER_AUTH_SECRET: "a-secure-test-secret-with-more-than-32-characters",
  BETTER_AUTH_URL: "http://127.0.0.1:3000",
  AUTH_EMAIL_FROM: "Elociencia <coach@example.test>",
  AUTH_MAILPIT_URL: "http://127.0.0.1:55441",
};
const privateRecipient = "private-recipient@example.test";
const privateKey = "re_private-fixture";
const privateToken = "private-verification-token";
const privateText = `${privateRecipient} ${privateKey} ${privateToken}`;

function safeMailError(error: unknown, original?: unknown): boolean {
  assert.ok(error instanceof Error);
  assert.equal(error.message, "No pudimos enviar el correo. Inténtalo nuevamente.");
  assert.equal(error.cause, undefined);
  assert.deepEqual(Object.keys(error), []);
  if (original !== undefined) assert.notEqual(error, original);
  for (const representation of [String(error), JSON.stringify(error), error.stack || ""])
    for (const value of [privateRecipient, privateKey, privateToken])
      assert.ok(!representation.includes(value));
  return true;
}

async function captureMailDiagnostics(work: () => Promise<void>) {
  const previousInfo = console.info;
  const previousError = console.error;
  const logs: { level: "info" | "error"; line: string }[] = [];
  const capture = (level: "info" | "error", args: unknown[]) => {
    assert.equal(args.length, 1);
    assert.equal(typeof args[0], "string");
    logs.push({ level, line: args[0] as string });
  };
  console.info = (...args: unknown[]) => capture("info", args);
  console.error = (...args: unknown[]) => capture("error", args);
  try {
    await work();
    for (const { line } of logs) {
      for (const value of [
        privateRecipient,
        privateKey,
        privateToken,
        "synthetic-private-email-id",
      ])
        assert.ok(!line.includes(value));
      assert.deepEqual(Object.keys(JSON.parse(line)), [
        "event",
        "version",
        "provider",
        "purpose",
        "outcome",
        "category",
        "httpStatus",
      ]);
    }
    return logs.map(({ level, line }) => ({ level, diagnostic: JSON.parse(line) }));
  } finally {
    console.info = previousInfo;
    console.error = previousError;
  }
}

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

test("auth mail contains invalid URLs and unexpected origins before sending", async () => {
  const config = readAuthConfig(configuration)!;
  const previousFetch = globalThis.fetch;
  let sends = 0;
  try {
    globalThis.fetch = async () => {
      sends++;
      return Response.json({});
    };
    for (const url of [
      `malformed URL ${privateText}`,
      `/verify-email?token=${privateToken}`,
      `https://attacker.example/reset?token=${privateToken}`,
      `http://127.0.0.1:3001/verify-email?token=${privateToken}`,
      `javascript:${privateText}`,
    ])
      await assert.rejects(sendAuthEmail(config, privateRecipient, url, "verify"), safeMailError);
    assert.equal(sends, 0);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("mail HTTP errors are contained without reading response content, fallback or retries", async () => {
  const config = readAuthConfig({ ...configuration, RESEND_API_KEY: privateKey })!;
  const previousFetch = globalThis.fetch;
  try {
    for (const status of [400, 401, 403, 429, 500]) {
      let sends = 0;
      let bodyReads = 0;
      globalThis.fetch = async (input) => {
        sends++;
        assert.equal(String(input), "https://api.resend.com/emails");
        const response = new Response(privateText, { status });
        response.json = response.text = async () => {
          bodyReads++;
          throw new Error(privateText);
        };
        return response;
      };
      await assert.rejects(
        sendAuthEmail(
          config,
          privateRecipient,
          `http://127.0.0.1:3000/api/auth/reset-password/${privateToken}`,
          "reset",
        ),
        safeMailError,
      );
      assert.equal(sends, 1);
      assert.equal(bodyReads, 0);
    }
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("mail transport and abort exceptions become fresh safe errors without private causes", async () => {
  const config = readAuthConfig({ ...configuration, RESEND_API_KEY: privateKey })!;
  const previousFetch = globalThis.fetch;
  const networkError = new TypeError(privateText, { cause: new Error(privateText) });
  Object.assign(networkError, { request: { recipient: privateRecipient, apiKey: privateKey } });
  try {
    for (const failure of [
      networkError,
      new DOMException(privateText, "AbortError"),
      new DOMException(privateText, "TimeoutError"),
      { message: privateText, token: privateToken },
    ]) {
      let sends = 0;
      globalThis.fetch = async (input) => {
        sends++;
        assert.equal(String(input), "https://api.resend.com/emails");
        throw failure;
      };
      await assert.rejects(
        sendAuthEmail(
          config,
          privateRecipient,
          `http://127.0.0.1:3000/api/auth/verify-email?token=${privateToken}`,
          "verify",
        ),
        (error) => safeMailError(error, failure),
      );
      assert.equal(sends, 1);
    }
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("successful Resend mail keeps a single request, recipient and signing link unchanged", async () => {
  const config = readAuthConfig({ ...configuration, RESEND_API_KEY: privateKey })!;
  const previousFetch = globalThis.fetch;
  let sends = 0;
  let bodyReads = 0;
  const url = `http://127.0.0.1:3000/api/auth/verify-email?token=${privateToken}&callbackURL=%2F`;
  try {
    globalThis.fetch = async (input, options) => {
      sends++;
      assert.equal(String(input), "https://api.resend.com/emails");
      assert.equal(options?.method, "POST");
      assert.equal(options?.redirect, "error");
      assert.ok(options?.signal instanceof AbortSignal);
      assert.equal(new Headers(options?.headers).get("Authorization"), `Bearer ${privateKey}`);
      const body = JSON.parse(String(options?.body));
      assert.equal(body.from, configuration.AUTH_EMAIL_FROM);
      assert.deepEqual(body.to, [privateRecipient]);
      assert.ok(body.text.includes(url));
      assert.ok(body.html.includes(`${privateToken}&amp;callbackURL=`));
      const response = Response.json({ id: "synthetic-email" }, { status: 201 });
      response.json = response.text = async () => {
        bodyReads++;
        throw new Error(privateText);
      };
      return response;
    };
    await sendAuthEmail(config, privateRecipient, url, "verify");
    assert.equal(sends, 1);
    assert.equal(bodyReads, 0);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("mail acceptance is logged only after the one awaited request resolves", async () => {
  const config = readAuthConfig({ ...configuration, RESEND_API_KEY: privateKey })!;
  const previousFetch = globalThis.fetch;
  let sends = 0;
  let complete = false;
  let accept!: (response: Response) => void;
  try {
    globalThis.fetch = () => {
      sends++;
      return new Promise<Response>((resolve) => {
        accept = resolve;
      });
    };
    const logs = await captureMailDiagnostics(async () => {
      const sending = sendAuthEmail(
        config,
        privateRecipient,
        `http://127.0.0.1:3000/api/auth/verify-email?token=${privateToken}`,
        "verify",
      ).then(() => {
        complete = true;
      });
      assert.equal(sends, 1);
      assert.equal(complete, false);
      accept(Response.json({ id: "synthetic-private-email-id" }, { status: 201 }));
      await sending;
      assert.equal(complete, true);
      assert.equal(sends, 1);
    });
    assert.deepEqual(logs, [
      {
        level: "info",
        diagnostic: {
          event: "auth_mail_delivery",
          version: 1,
          provider: "resend",
          purpose: "verify",
          outcome: "accepted",
          category: "provider_accepted",
          httpStatus: 201,
        },
      },
    ]);
    assert.ok(!JSON.stringify(logs).includes("delivered"));
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("mail failure diagnostics classify faults without private values or response body reads", async () => {
  const config = readAuthConfig({ ...configuration, RESEND_API_KEY: privateKey })!;
  const previousFetch = globalThis.fetch;
  const privateFailure = new Error(privateText, { cause: new Error(privateText) });
  const throwingName = new Error(privateText);
  Object.defineProperty(throwingName, "name", {
    get() {
      throw privateFailure;
    },
  });
  let sends = 0;
  let bodyReads = 0;
  try {
    const logs = await captureMailDiagnostics(async () => {
      globalThis.fetch = async () => {
        sends++;
        throw privateFailure;
      };
      await assert.rejects(
        sendAuthEmail(config, privateRecipient, `malformed-${privateToken}`, "verify"),
        safeMailError,
      );
      assert.equal(sends, 0);
      for (const status of [400, 401, 403, 429, 500]) {
        globalThis.fetch = async () => {
          sends++;
          const response = new Response(privateText, { status });
          response.json = response.text = async () => {
            bodyReads++;
            throw privateFailure;
          };
          return response;
        };
        await assert.rejects(
          sendAuthEmail(
            config,
            privateRecipient,
            `${configuration.BETTER_AUTH_URL}/reset`,
            "reset",
          ),
          safeMailError,
        );
      }
      for (const failure of [
        privateFailure,
        new DOMException(privateText, "TimeoutError"),
        new DOMException(privateText, "AbortError"),
        throwingName,
        { message: privateText, recipient: privateRecipient },
      ]) {
        globalThis.fetch = async () => {
          sends++;
          throw failure;
        };
        await assert.rejects(
          sendAuthEmail(
            config,
            privateRecipient,
            `${configuration.BETTER_AUTH_URL}/verify`,
            "verify",
          ),
          safeMailError,
        );
      }
    });
    assert.equal(sends, 10);
    assert.equal(bodyReads, 0);
    assert.ok(
      logs.every(({ level, diagnostic }) => level === "error" && diagnostic.outcome === "failed"),
    );
    assert.deepEqual(
      logs.map(({ diagnostic }) => [diagnostic.category, diagnostic.httpStatus]),
      [
        ["invalid_link", null],
        ...[400, 401, 403, 429, 500].map((status) => ["http_error", status]),
        ["transport_error", null],
        ["timeout", null],
        ["cancelled", null],
        ["transport_error", null],
        ["transport_error", null],
      ],
    );
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("HTTP diagnostic status is bounded and acceptance requires a valid 2xx status", async () => {
  const config = readAuthConfig({ ...configuration, RESEND_API_KEY: privateKey })!;
  const previousFetch = globalThis.fetch;
  const statuses = [100, 599, 0, -1, 600, 200.5, NaN, Infinity, "403", undefined];
  let sends = 0;
  try {
    const logs = await captureMailDiagnostics(async () => {
      for (const status of statuses) {
        globalThis.fetch = async () => {
          sends++;
          const response = new Response(privateText, { status: 201 });
          Object.defineProperty(response, "status", { value: status });
          return response;
        };
        await assert.rejects(
          sendAuthEmail(
            config,
            privateRecipient,
            `${configuration.BETTER_AUTH_URL}/verify`,
            "verify",
          ),
          safeMailError,
        );
      }
    });
    assert.equal(sends, statuses.length);
    assert.deepEqual(
      logs.map(({ diagnostic }) => diagnostic.httpStatus),
      [100, 599, ...Array<null>(8).fill(null)],
    );
    assert.ok(logs.every(({ diagnostic }) => diagnostic.category === "http_error"));
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("diagnostic logger failures preserve acceptance and fresh safe errors without another send", async () => {
  const config = readAuthConfig({ ...configuration, RESEND_API_KEY: privateKey })!;
  const previousFetch = globalThis.fetch;
  const previousInfo = console.info;
  const previousError = console.error;
  let logs = 0;
  let sends = 0;
  console.info = console.error = () => {
    logs++;
    throw new Error(privateText);
  };
  try {
    globalThis.fetch = async () => {
      sends++;
      return new Response(privateText, { status: 202 });
    };
    await sendAuthEmail(
      config,
      privateRecipient,
      `${configuration.BETTER_AUTH_URL}/verify`,
      "verify",
    );
    globalThis.fetch = async () => {
      sends++;
      return new Response(privateText, { status: 403 });
    };
    await assert.rejects(
      sendAuthEmail(config, privateRecipient, `${configuration.BETTER_AUTH_URL}/verify`, "verify"),
      safeMailError,
    );
    assert.equal(sends, 2);
    assert.equal(logs, 2);
  } finally {
    globalThis.fetch = previousFetch;
    console.info = previousInfo;
    console.error = previousError;
  }
});
