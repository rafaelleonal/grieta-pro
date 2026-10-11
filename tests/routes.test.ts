import { strict as assert } from "node:assert";
import test from "node:test";
import { POST as coachPost } from "../app/api/coach/route";
import { POST as draftPost } from "../app/api/draft/route";
import { POST as riotPost } from "../app/api/riot/route";
import { GET as historyGet } from "../app/api/history/route";
import { GET as statusGet } from "../app/api/status/route";

const input = {
  champion: "Ahri",
  enemy: "Yasuo",
  role: "MID",
  rank: "Oro",
  allies: [],
  enemies: [],
  notes: "",
  webSearch: false,
};
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

test("all private routes fail closed before input parsing or network, including personal provider keys", async () => {
  await unconfiguredAuth(async () => {
    const responses = await Promise.all([
      coachPost(request("/api/coach", input)),
      coachPost(request("/api/coach", { ...input, apiKey: "personal-key-does-not-bypass-login" })),
      draftPost(request("/api/draft", { text: "Soy Ahri contra Yasuo", apiKey: "personal-key" })),
      riotPost(request("/api/riot", { gameName: "Jugador", tagLine: "LAN", platform: "LA1" })),
      coachPost(request("/api/coach", { ...input, role: "INVALID" })),
      historyGet(new Request("http://localhost:3000/api/history")),
    ]);
    assert.deepEqual(
      responses.map((response) => response.status),
      [503, 503, 503, 503, 503, 503],
    );
    for (const response of responses) {
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.ok(!JSON.stringify(await response.json()).includes("personal-key"));
    }
  });
});

test("cross-origin mutations are rejected before authentication or paid calls", async () => {
  await unconfiguredAuth(async () => {
    const foreign = "https://foreign.example";
    const responses = await Promise.all([
      coachPost(request("/api/coach", { ...input, apiKey: "personal-key" }, foreign)),
      draftPost(request("/api/draft", { text: "Soy Ahri", apiKey: "personal-key" }, foreign)),
      riotPost(request("/api/riot", {}, foreign)),
    ]);
    assert.deepEqual(
      responses.map((response) => response.status),
      [403, 403, 403],
    );
  });
});

test("status route exposes only safe public connection information", async () => {
  const response = statusGet();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.equal(typeof body.defaultModel, "string");
  assert.equal(typeof body.configured, "boolean");
  for (const property of ["apiKey", "accessToken", "databaseUrl", "secret", "cookie", "userId"])
    assert.equal(body[property], undefined);
});
