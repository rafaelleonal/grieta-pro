import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  ApiError,
  assertSameOrigin,
  authorizeServerKey,
  errorResponse,
  readJsonBody,
} from "../lib/http";

const originalEnv = { ...process.env };
afterEach(() => {
  process.env = { ...originalEnv };
});

test("production server credentials fail closed until access is configured", () => {
  process.env = { ...process.env, NODE_ENV: "production" };
  delete process.env.COACH_ACCESS_TOKEN;
  assert.throws(
    () => authorizeServerKey(),
    (error) => error instanceof ApiError && error.status === 503,
  );
  process.env.COACH_ACCESS_TOKEN = "test-only-long-access-token";
  assert.throws(
    () => authorizeServerKey("incorrect"),
    (error) => error instanceof ApiError && error.status === 401,
  );
  assert.doesNotThrow(() => authorizeServerKey("test-only-long-access-token"));
});

test("cross-origin browser calls are rejected before provider requests", () => {
  assert.throws(
    () =>
      assertSameOrigin(
        new Request("https://coach.example/api/coach", {
          headers: { origin: "https://unrelated.example" },
        }),
      ),
    (error) => error instanceof ApiError && error.status === 403,
  );
  assert.doesNotThrow(() =>
    assertSameOrigin(
      new Request("https://coach.example/api/coach", {
        headers: { origin: "https://coach.example" },
      }),
    ),
  );
});

test("Next internal localhost normalization preserves the actual browser Host origin", () => {
  assert.doesNotThrow(() =>
    assertSameOrigin(
      new Request("http://localhost:3000/api/coach", {
        headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
      }),
    ),
  );
  assert.throws(
    () =>
      assertSameOrigin(
        new Request("http://localhost:3000/api/coach", {
          headers: {
            host: "127.0.0.1:3000",
            origin: "http://foreign.example",
            "x-forwarded-host": "foreign.example",
          },
        }),
      ),
    (error) => error instanceof ApiError && error.status === 403,
  );
  assert.throws(
    () =>
      assertSameOrigin(
        new Request("http://localhost:3000/api/coach", {
          headers: { host: "127.0.0.1:3000", origin: "http://localhost:3000" },
        }),
      ),
    (error) => error instanceof ApiError && error.status === 403,
  );
  assert.throws(
    () =>
      assertSameOrigin(
        new Request("http://localhost:3000/api/coach", {
          headers: { host: "127.0.0.1:3000,evil.example", origin: "http://127.0.0.1:3000" },
        }),
      ),
    (error) => error instanceof ApiError && error.status === 403,
  );
  assert.doesNotThrow(() =>
    assertSameOrigin(
      new Request("http://localhost:3000/api/coach", {
        headers: {
          host: "coach.example",
          origin: "https://coach.example",
          "x-forwarded-proto": "https",
        },
      }),
    ),
  );
});

test("chunked uploads are bounded even without Content-Length", async () => {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("123456789"));
      controller.close();
    },
  });
  const request = new Request("https://coach.example/api/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    duplex: "half",
  } as RequestInit);
  await assert.rejects(
    () => readJsonBody(request, 4),
    (error) => error instanceof ApiError && error.status === 413,
  );
});

test("JSON errors are actionable and internal exceptions never leak secrets", async () => {
  await assert.rejects(
    () =>
      readJsonBody(
        new Request("https://coach.example/api/coach", {
          method: "POST",
          body: "x",
          headers: { "Content-Type": "application/json" },
        }),
      ),
    (error) => error instanceof ApiError && error.status === 400,
  );
  await assert.rejects(
    () =>
      readJsonBody(new Request("https://coach.example/api/coach", { method: "POST", body: "{}" })),
    (error) => error instanceof ApiError && error.status === 415,
  );
  const response = errorResponse(new Error("sk-secret-provider-key"));
  assert.equal(response.status, 500);
  assert.ok(!(await response.text()).includes("sk-secret"));
});
