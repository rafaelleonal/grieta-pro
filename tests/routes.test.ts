import { strict as assert } from "node:assert";
import test from "node:test";
import { POST as coachPost } from "../app/api/coach/route";
import { GET as historyGet } from "../app/api/history/route";
import { GET as statusGet } from "../app/api/status/route";

const input = { champion: "Ahri", enemy: "Yasuo", role: "MID" };
const request = (path: string, body: unknown, origin = "http://localhost:3000") =>
  new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });

async function unconfiguredAuth(work: () => Promise<void>) {
  const keys = [
    "DATABASE_URL",
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    "AUTH_MAILPIT_URL",
    "RESEND_API_KEY",
  ];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  const originalFetch = globalThis.fetch;
  let networkCalls = 0;
  globalThis.fetch = async () => {
    networkCalls++;
    throw new Error("Unexpected network call before authentication");
  };
  try {
    await work();
    assert.equal(networkCalls, 0);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("private routes fail closed before input parsing, catalog or provider calls", async () => {
  await unconfiguredAuth(async () => {
    const responses = await Promise.all([
      coachPost(request("/api/coach", input)),
      coachPost(request("/api/coach", { ...input, role: "INVALID" })),
      historyGet(new Request("http://localhost:3000/api/history")),
    ]);
    assert.deepEqual(
      responses.map((response) => response.status),
      [503, 503, 503],
    );
    for (const response of responses)
      assert.equal(response.headers.get("cache-control"), "no-store");
  });
});

test("cross-origin build requests are rejected before authentication", async () => {
  await unconfiguredAuth(async () => {
    const response = await coachPost(request("/api/coach", input, "https://foreign.example"));
    assert.equal(response.status, 403);
  });
});

test("status route exposes only whether builds are available", async () => {
  const response = statusGet();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.deepEqual(Object.keys(body), ["configured"]);
  assert.equal(typeof body.configured, "boolean");
});
