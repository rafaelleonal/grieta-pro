import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { getDb } from "../lib/db";
import { GEMINI_FLASH_MODEL } from "../lib/usage";
import { readCoachStream } from "../lib/client-coach-stream";
import { POST } from "../app/api/coach/route";
import { fixturePlan } from "../tests/coach-fixtures";
import type { CoachInput } from "../lib/types";

/** Invoked only by smoke-accounts against its disposable database and synthetic account. */
export async function smokeCoachStream(
  alice: { cookie: string; user: { id: string } },
  planId: string,
  originalInput: CoachInput,
  privateRequest: (
    path: string,
    cookie: string,
    method?: string,
    body?: unknown,
    key?: string,
  ) => Request,
) {
  const db = getDb();
  const originalPlan = await db.plan.findUniqueOrThrow({ where: { id: planId } });
  await db.plan.update({
    where: { id: planId },
    data: {
      allowedModels: [...new Set([...originalPlan.allowedModels, GEMINI_FLASH_MODEL])],
    },
  });
  // Isolate this block from earlier admission probes in the disposable QA database.
  await db.rateLimit.deleteMany({
    where: {
      key: {
        in: ["cholo-generation-input:global", `cholo-generation-input:user:${alice.user.id}`],
      },
    },
  });
  const input = { ...originalInput, model: GEMINI_FLASH_MODEL };
  const brief = {
    matchup: {
      verdict: "even",
      reason: "Depende de acertar E.",
      condition: "Espera a que termine el muro.",
    },
    priority: "Conserva espacio para retirarte.",
    teamfight: {
      setup: "Llega con visión.",
      job: "Busca una captura.",
      fallback: "Protege a tu equipo.",
    },
    window: { trigger: "El muro termina", response: "Busca otro ángulo." },
    avoid: "No avances sin visión.",
  };
  const p = fixturePlan;
  const compact = {
    format: "compact-v1",
    brief,
    levels: p.levels.map((row, i) => ({
      ...row,
      skill: p.build.skillOrder.first6[i],
      champions: [],
    })),
    reactions: { linea: p.reactions.linea },
    build: {
      starting: p.build.starting,
      core: p.build.core,
      situational: p.build.situational,
      runes: p.build.runes,
      summoners: p.build.summoners,
      skillOrder: { first6: p.build.skillOrder.first6, max: ["Q", "W", "E"] },
    },
    macro: p.macro,
  };
  const wire = JSON.stringify({ decision: "coach", plan: compact });
  const boundary = wire.indexOf(',"levels"');
  const encoder = new TextEncoder();
  let calls = 0;
  let activeKey = "";
  let finish = () => {};
  let upstreamCancelled = false;
  const previousFetch = globalThis.fetch;
  const row = () =>
    db.aiRequest.findUniqueOrThrow({
      where: {
        userId_idempotencyKey: { userId: alice.user.id, idempotencyKey: activeKey },
      },
    });
  globalThis.fetch = async (resource, init) => {
    if (String(resource).startsWith("https://ddragon.leagueoflegends.com/"))
      return Response.json({}, { status: 503 });
    assert.equal(String(resource), "https://openrouter.ai/api/v1/chat/completions");
    calls++;
    assert.equal((await row()).status, "DISPATCHED");
    assert.equal(JSON.parse(String(init?.body)).stream, true);
    const id = `gen-qa-stream-${calls}`;
    const event = (content: string) =>
      encoder.encode(`data: ${JSON.stringify({ id, choices: [{ delta: { content } }] })}\n\n`);
    return new Response(
      new ReadableStream({
        start(c) {
          c.enqueue(event(wire.slice(0, boundary)));
          finish = () => {
            c.enqueue(event(wire.slice(boundary)));
            c.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ id, choices: [{ delta: {}, finish_reason: "stop" }], usage: { cost: 0.004 } })}\n\ndata: [DONE]\n\n`,
              ),
            );
            c.close();
          };
        },
        cancel() {
          upstreamCancelled = true;
        },
      }),
      { headers: { "content-type": "text/event-stream" } },
    );
  };
  const request = () => {
    const req = privateRequest("/api/coach", alice.cookie, "POST", input, activeKey);
    req.headers.set("accept", "application/x-ndjson");
    return req;
  };
  try {
    activeKey = randomUUID();
    let resolveBrief!: () => void;
    const arrived = new Promise<void>((resolve) => {
      resolveBrief = resolve;
    });
    const response = await POST(request());
    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control")!, /private, no-store/);
    const reading = readCoachStream(response.body!, new AbortController().signal, (received) => {
      assert.deepEqual(received, brief);
      resolveBrief();
    });
    await arrived;
    const pending = await row();
    assert.equal(pending.status, "DISPATCHED");
    assert.equal(pending.providerRequestId, "gen-qa-stream-1");
    assert.equal(await db.coachRecord.count({ where: { requestId: pending.id } }), 0);
    finish();
    const result = await reading;
    assert.equal((await row()).status, "SETTLED");
    assert.equal((await row()).actualCostUsd?.toString(), "0.004");
    assert.equal(await db.coachRecord.count({ where: { requestId: pending.id } }), 1);
    const replay = await POST(request());
    assert.deepEqual(
      await readCoachStream(replay.body!, new AbortController().signal, () =>
        assert.fail("Replay needs no preview"),
      ),
      result,
    );
    assert.equal(calls, 1);
    activeKey = randomUUID();
    const aborted = await POST(request());
    const reader = aborted.body!.getReader();
    assert.match(new TextDecoder().decode((await reader.read()).value), /"type":"brief"/);
    await reader.cancel();
    for (let attempt = 0; attempt < 100 && (await row()).status === "DISPATCHED"; attempt++)
      await new Promise((resolve) => setTimeout(resolve, 10));
    const cancelled = await row();
    assert.equal(cancelled.status, "UNKNOWN");
    assert.equal(cancelled.providerRequestId, "gen-qa-stream-2");
    assert.equal(cancelled.actualCostUsd, null);
    assert.equal(await db.coachRecord.count({ where: { requestId: cancelled.id } }), 0);
    assert.equal(upstreamCancelled, true);
    assert.equal(calls, 2);
    console.info(
      "PASS · streaming: resumen antes de guardar, cargo único, replay sin envío y cancelación incierta con ID recuperable",
    );
  } finally {
    globalThis.fetch = previousFetch;
    await db.plan.update({
      where: { id: planId },
      data: { allowedModels: originalPlan.allowedModels },
    });
  }
}
