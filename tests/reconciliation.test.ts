import assert from "node:assert/strict";
import test from "node:test";
import {
  generationUsage,
  lookupGenerationUsage,
  readGenerationUsage,
  reconciliationWindow,
} from "../lib/reconciliation";

const id = "gen-reconciliation-qa";
const valid = {
  id,
  finish_reason: "stop",
  total_cost: 0.00412345,
  tokens_prompt: 1200,
  tokens_completion: 200,
};

test("reconciliation accepts only a matching terminal generation and whitelists usage", () => {
  assert.deepEqual(generationUsage({ ...valid, private_data: "never-return" }, id), {
    id,
    cost: "0.004123450000",
    promptTokens: 1200,
    completionTokens: 200,
  });
  for (const finish_reason of ["stop", "length", "content_filter", "tool_calls", "error"])
    assert.equal(generationUsage({ ...valid, finish_reason }, id)?.id, id);
  for (const value of [
    null,
    [],
    "untrusted",
    { ...valid, id: "gen-another-account" },
    { ...valid, finish_reason: null },
    { ...valid, finish_reason: "running" },
    { ...valid, finish_reason: "" },
    { ...valid, finish_reason: "toString" },
    { ...valid, total_cost: undefined },
    { ...valid, total_cost: null },
    { ...valid, total_cost: -0.1 },
    { ...valid, total_cost: Number.NaN },
    { ...valid, total_cost: Number.POSITIVE_INFINITY },
    { ...valid, total_cost: 100_000_000 },
    { ...valid, total_cost: "-1" },
    { ...valid, total_cost: "1e-8" },
    { ...valid, total_cost: "100000000" },
    { ...valid, total_cost: "0.0000000000001" },
    { ...valid, total_cost: {} },
  ])
    assert.equal(generationUsage(value, id), null);
  assert.equal(generationUsage(valid, "https://attacker.example"), null);
});

test("a confirmed zero cost is preserved, but unfinished zero cost stays unknown", () => {
  assert.equal(generationUsage({ ...valid, total_cost: 0 }, id)?.cost, "0.000000000000");
  assert.equal(generationUsage({ ...valid, total_cost: "0.00000000" }, id)?.cost, "0.00000000");
  assert.equal(generationUsage({ ...valid, total_cost: 0, finish_reason: null }, id), null);
  assert.equal(generationUsage({ ...valid, total_cost: "0", finish_reason: "running" }, id), null);
});

test("generation token metadata cannot carry strings, negative values or unbounded integers", () => {
  for (const value of ["private-token", -1, 1.5, 10_000_001, Number.POSITIVE_INFINITY, {}]) {
    const result = generationUsage(
      { ...valid, tokens_prompt: value, tokens_completion: value },
      id,
    );
    assert.equal(result?.cost, "0.004123450000");
    assert.equal(result?.promptTokens, undefined);
    assert.equal(result?.completionTokens, undefined);
  }
});

test("bounded generation reader rejects errors, mismatched IDs and malformed envelopes", async () => {
  assert.deepEqual(
    await readGenerationUsage(Response.json({ data: valid }), id),
    generationUsage(valid, id),
  );
  for (const response of [
    Response.json({ data: valid }, { status: 404 }),
    Response.json({ data: valid }, { status: 403 }),
    new Response(null, { status: 204 }),
    new Response("invalid JSON"),
    Response.json(valid),
    Response.json({ data: { ...valid, id: "gen-another-account" } }),
    Response.json([]),
    Response.json(null),
  ])
    assert.equal(await readGenerationUsage(response, id), null);
});

test("oversized declared and streamed generation bodies are canceled and never parsed", async () => {
  assert.equal(
    await readGenerationUsage(
      Response.json({ data: valid }, { headers: { "content-length": "32001" } }),
      id,
    ),
    null,
  );
  let canceled = false;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(20_000));
      controller.enqueue(new Uint8Array(20_000));
    },
    cancel() {
      canceled = true;
    },
  });
  assert.equal(await readGenerationUsage(new Response(body), id), null);
  assert.equal(canceled, true);
});

test("lookup sends exactly one GET to the fixed endpoint with no body, cache or redirect", async () => {
  let calls = 0;
  const key = "synthetic-personal-data-never-log";
  const result = await lookupGenerationUsage(id, key, async (input, options) => {
    calls++;
    const url = new URL(String(input));
    assert.equal(url.origin, "https://openrouter.ai");
    assert.equal(url.pathname, "/api/v1/generation");
    assert.deepEqual([...url.searchParams], [["id", id]]);
    assert.equal(options?.method, "GET");
    assert.equal(options?.body, undefined);
    assert.equal(options?.cache, "no-store");
    assert.equal(options?.redirect, "error");
    assert.ok(options?.signal instanceof AbortSignal);
    assert.equal(new Headers(options?.headers).get("Authorization"), `Bearer ${key}`);
    return Response.json({ data: valid });
  });
  assert.equal(calls, 1);
  assert.equal(result?.cost, "0.004123450000");
});

test("missing credentials or invalid generation IDs cause no network request", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls++;
    return Response.json({ data: valid });
  };
  for (const badId of [
    "",
    "https://attacker.example/?key=secret",
    "gen-../../other",
    `gen-${"x".repeat(181)}`,
  ])
    assert.equal(await lookupGenerationUsage(badId, "synthetic-key", fetcher), null);
  assert.equal(await lookupGenerationUsage(id, "", fetcher), null);
  assert.equal(calls, 0);
});

test("failed generation lookup never retries or assumes a refund", async () => {
  for (const fetcher of [
    async () => Response.json({ error: "not found" }, { status: 404 }),
    async () => Response.json({ data: { ...valid, finish_reason: null } }),
    async () =>
      new Response(null, { status: 302, headers: { location: "https://attacker.example" } }),
    async () => {
      throw new DOMException("Synthetic timeout", "TimeoutError");
    },
  ]) {
    let calls = 0;
    assert.equal(
      await lookupGenerationUsage(id, "synthetic-key", async () => {
        calls++;
        return fetcher();
      }),
      null,
    );
    assert.equal(calls, 1);
  }
});

test("three permanently missing generations cannot starve the fourth generation", () => {
  const requests = ["permanent-404-a", "permanent-404-b", "permanent-404-c", "ready"];
  const batches = [0, 3].map((cursor) => {
    const { skip, take, wrapTake } = reconciliationWindow(requests.length, cursor);
    return [...requests.slice(skip, skip + take), ...requests.slice(0, wrapTake)];
  });
  assert.deepEqual(batches[0], requests.slice(0, 3));
  assert.ok(batches[1].includes("ready"));
  assert.ok(batches.every((batch) => batch.length <= 3 && new Set(batch).size === batch.length));
});

test("fair selection stays bounded and visits every waiting generation across batches", () => {
  for (const total of [1, 2, 3, 4, 7, 100]) {
    const requests = Array.from({ length: total }, (_, index) => index);
    const visited = new Set<number>();
    for (let cursor = 0; cursor < total * 3; cursor += 3) {
      const { skip, take, wrapTake } = reconciliationWindow(total, cursor);
      const batch = [...requests.slice(skip, skip + take), ...requests.slice(0, wrapTake)];
      assert.equal(new Set(batch).size, batch.length);
      assert.ok(batch.length <= 3);
      for (const request of batch) visited.add(request);
    }
    assert.equal(visited.size, total);
  }
  for (const [total, cursor] of [
    [0, 0],
    [-1, 0],
    [4, -1],
    [4, 1.5],
    [Number.POSITIVE_INFINITY, 0],
  ])
    assert.deepEqual(reconciliationWindow(total, cursor), { skip: 0, take: 0, wrapTake: 0 });
});
