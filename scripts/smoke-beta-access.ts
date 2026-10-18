import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { getDb } from "../lib/db";
import { getAuth } from "../lib/auth";
import { runGeneration } from "../lib/generation";
import { demoResult } from "../lib/demo";
import { ApiError } from "../lib/http";
import * as usage from "../lib/usage";

/** Only called after migrations/seeding in smoke-accounts' empty disposable database. */
export async function smokeBetaAccess() {
  const db = getDb();
  assert.equal(await db.aiRequest.count(), 0, "Beta QA requires the fresh disposable database");
  assert.equal(await db.usageBucket.count(), 0);
  const plans = await db.plan.findMany({ orderBy: { code: "asc" } });
  const free = plans.find((plan) => plan.code === "FREE")!;
  const pro = plans.find((plan) => plan.code === "PRO")!;
  const beforeMode = process.env.APP_ACCESS_MODE;
  const beforeModel = process.env.OPENROUTER_MODEL;
  const ids = [randomUUID(), randomUUID()];
  const requests: string[] = [];
  const denied = (status: number) => (error: unknown) =>
    error instanceof ApiError && error.status === status;
  try {
    for (const id of ids)
      await db.user.create({
        data: { id, name: "Beta QA", email: `${id}@example.test`, emailVerified: true },
      });
    await db.accessGrant.create({
      data: { userId: ids[1], planId: pro.id, source: "COMPLIMENTARY" },
    });
    process.env.APP_ACCESS_MODE = "plans";
    process.env.OPENROUTER_MODEL = usage.OPUS_MODEL;
    const legacyKey = randomUUID();
    const legacyInput = { champion: "Ahri", enemy: "Yasuo", webSearch: true };
    const legacy = await usage.reserveGeneration({
      userId: ids[1],
      key: legacyKey,
      inputHash: usage.inputHash({
        operation: "COACH",
        model: usage.OPUS_MODEL,
        byok: false,
        input: legacyInput,
      }),
      operation: "COACH",
      model: usage.OPUS_MODEL,
      byok: false,
      webSearch: true,
      reserveUsd: usage.maximumCost(usage.OPUS_MODEL, "COACH", false, true),
    });
    requests.push(legacy.request.id);
    await usage.dispatchGeneration(legacy.request.id);
    await usage.observeUsage(legacy.request.id, { id: "gen-qa-beta-legacy" });
    await usage.finishGeneration(legacy.request.id, {
      error: { status: 504, message: "QA timeout" },
    });
    const held = await db.aiRequest.findUniqueOrThrow({ where: { id: legacy.request.id } });
    assert.equal(held.status, "UNKNOWN");
    const beforeBuckets = await db.usageBucket.findMany({ orderBy: { id: "asc" } });

    delete process.env.APP_ACCESS_MODE; // Beta is the actual default, not a test-only override.
    for (const id of ids) {
      const account = await usage.getAccountUsage(id);
      assert.equal(account.accessMode, "beta");
      assert.equal(account.coachLimit, null);
      assert.equal(account.draftLimit, free.monthlyDraftLimit);
      assert.equal(account.webAllowed, false);
      assert.equal(account.webRemaining, 0);
      assert.equal(account.defaultModel, usage.OPUS_MODEL);
      assert.deepEqual(account.allowedModels.sort(), Object.keys(usage.MODEL_POLICIES).sort());
      for (const model of [usage.OPUS_MODEL, usage.GEMINI_FLASH_MODEL]) {
        const policy = await usage.generationPolicy(id, model);
        assert.equal(policy.model, model);
        assert.equal(policy.plan.dailyBudgetUsd.toString(), free.dailyBudgetUsd.toString());
        assert.equal(policy.plan.monthlyBudgetUsd.toString(), free.monthlyBudgetUsd.toString());
      }
      await assert.rejects(usage.generationPolicy(id, usage.GEMINI_FLASH_MODEL, true), denied(403));
      await assert.rejects(usage.generationPolicy(id, "unapproved/model"), denied(403));
    }
    assert.equal((await usage.getAccountUsage(ids[1])).coachRemaining, null);
    assert.equal((await usage.getAccountUsage(ids[1])).uncertain, 1);
    assert.deepEqual(await db.usageBucket.findMany({ orderBy: { id: "asc" } }), beforeBuckets);
    assert.deepEqual(await db.aiRequest.findUniqueOrThrow({ where: { id: held.id } }), held);

    // Replaying an admitted web request is read-only even after beta disables web.
    const context = await getAuth().$context;
    const token = randomUUID();
    await db.session.create({
      data: {
        id: randomUUID(),
        token,
        userId: ids[1],
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const signedToken = encodeURIComponent(
      `${token}.${createHmac("sha256", context.secret).update(token).digest("base64")}`,
    );
    const replayRequest = (key = legacyKey) =>
      new Request("http://localhost:3000/api/coach", {
        method: "POST",
        headers: {
          cookie: `${context.authCookies.sessionToken.name}=${signedToken}`,
          "idempotency-key": key,
        },
      });
    const replayArgs = {
      operation: "COACH" as const,
      input: { model: usage.OPUS_MODEL, webSearch: true },
      fingerprint: legacyInput,
      work: async (): Promise<typeof demoResult> => {
        assert.fail("A legacy replay must never invoke a provider");
      },
    };
    await assert.rejects(runGeneration(replayRequest(), replayArgs), denied(504));
    await usage.finishGeneration(held.id, { response: demoResult });
    assert.deepEqual(await runGeneration(replayRequest(), replayArgs), demoResult);
    assert.equal(
      (await db.aiRequest.findUniqueOrThrow({ where: { id: held.id } })).status,
      "UNKNOWN",
    );
    // A retry still reconciles a newly known cost into its original PRO bucket.
    await usage.observeUsage(held.id, { cost: "0.02" });
    assert.deepEqual(await runGeneration(replayRequest(), replayArgs), demoResult);
    const settled = await db.aiRequest.findUniqueOrThrow({ where: { id: held.id } });
    assert.equal(settled.status, "SETTLED");
    const oldPool = await db.usageBucket.findFirstOrThrow({
      where: { scope: "PLAN", scopeId: "PRO" },
    });
    assert.equal(oldPool.costUsedUsd.toString(), "0.02");
    assert.equal(oldPool.costReservedUsd.toString(), "0");
    const beforeReplay = await db.usageBucket.findMany({ orderBy: { id: "asc" } });
    assert.deepEqual(await runGeneration(replayRequest(), replayArgs), demoResult);
    await assert.rejects(
      runGeneration(replayRequest(), {
        ...replayArgs,
        fingerprint: { ...legacyInput, enemy: "Zed" },
      }),
      denied(409),
    );
    await assert.rejects(
      runGeneration(replayRequest(), {
        ...replayArgs,
        input: { model: usage.GEMINI_FLASH_MODEL, webSearch: true },
      }),
      denied(409),
    );
    const previousProviderKey = process.env.OPENROUTER_API_KEY;
    process.env.OPENROUTER_API_KEY = "synthetic-beta-provider-key";
    try {
      await assert.rejects(runGeneration(replayRequest(randomUUID()), replayArgs), denied(403));
    } finally {
      if (previousProviderKey === undefined) delete process.env.OPENROUTER_API_KEY;
      else process.env.OPENROUTER_API_KEY = previousProviderKey;
    }
    assert.equal(
      await usage.findGenerationReplay({
        userId: ids[0],
        key: legacyKey,
        operation: "COACH",
        byok: false,
        fingerprint: legacyInput,
      }),
      null,
      "Another owner cannot read the original key",
    );
    assert.deepEqual(await db.usageBucket.findMany({ orderBy: { id: "asc" } }), beforeReplay);

    const beta = await usage.reserveGeneration({
      userId: ids[0],
      key: randomUUID(),
      inputHash: "beta-qa-flash",
      operation: "COACH",
      model: usage.GEMINI_FLASH_MODEL,
      byok: false,
      webSearch: false,
      reserveUsd: usage.maximumCost(usage.GEMINI_FLASH_MODEL, "COACH"),
    });
    requests.push(beta.request.id);
    const snapshot = beta.request.pricing as {
      accessMode?: string;
      buckets?: { scope: string; scopeId: string }[];
    };
    assert.equal(snapshot.accessMode, "beta");
    assert.ok(snapshot.buckets?.some((ref) => ref.scope === "PLAN" && ref.scopeId === "FREE"));
    await assert.rejects(
      usage.reserveGeneration({
        userId: ids[0],
        key: randomUUID(),
        inputHash: "beta-qa-concurrent",
        operation: "COACH",
        model: usage.OPUS_MODEL,
        byok: true,
        webSearch: false,
        reserveUsd: usage.maximumCost(usage.OPUS_MODEL, "COACH"),
      }),
      denied(429),
    );
    await usage.dispatchGeneration(beta.request.id);
    await usage.observeUsage(beta.request.id, { id: "gen-qa-beta-flash", cost: "0.004" });
    await usage.finishGeneration(beta.request.id, {});
    assert.equal((await usage.getAccountUsage(ids[0])).coachRemaining, null);
    const commonPool = await db.usageBucket.findFirstOrThrow({
      where: { scope: "PLAN", scopeId: "FREE" },
    });
    assert.equal(commonPool.costUsedUsd.toString(), "0.004");
    assert.deepEqual(await db.plan.findMany({ orderBy: { code: "asc" } }), plans);

    const { smokeBetaCoachUsage } = await import("./smoke-beta-usage");
    await smokeBetaCoachUsage(ids[0]);

    process.env.APP_ACCESS_MODE = "plans";
    await assert.rejects(usage.generationPolicy(ids[0], usage.OPUS_MODEL), denied(403));
    assert.equal((await usage.getAccountUsage(ids[1])).coachLimit, pro.monthlyCoachLimit);
    console.info(
      "PASS · beta común, Opus/Flash sin niveles comerciales, presupuestos y capturas intactos y reservas anteriores conciliadas en su fondo original",
    );
  } finally {
    if (beforeMode === undefined) delete process.env.APP_ACCESS_MODE;
    else process.env.APP_ACCESS_MODE = beforeMode;
    if (beforeModel === undefined) delete process.env.OPENROUTER_MODEL;
    else process.env.OPENROUTER_MODEL = beforeModel;
    await db.aiRequest.deleteMany({ where: { id: { in: requests } } });
    await db.accessGrant.deleteMany({ where: { userId: { in: ids } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    // No bucket existed on entry; all are synthetic rows from this isolated fixture.
    const fixtureBuckets = await db.usageBucket.findMany({ select: { id: true } });
    await db.usageBucket.deleteMany({ where: { id: { in: fixtureBuckets.map((row) => row.id) } } });
  }
}
