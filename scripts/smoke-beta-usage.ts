import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Prisma, type UsageBucket } from "../generated/prisma/client";
import { getDb } from "../lib/db";
import { ApiError } from "../lib/http";
import * as usage from "../lib/usage";

/** Runs only inside smoke-beta-access's fresh disposable PostgreSQL fixture. */
export async function smokeBetaCoachUsage(userId: string) {
  assert.equal(process.env.NODE_ENV, "test");
  assert.equal(process.env.APP_ACCESS_MODE, undefined);
  const db = getDb();
  const free = await db.plan.findUniqueOrThrow({ where: { code: "FREE" } });
  const originalBuckets = await db.usageBucket.findMany();
  const created: string[] = [];
  const now = new Date();
  const month = `month:${now.toISOString().slice(0, 7)}`;
  const day = `day:${now.toISOString().slice(0, 10)}`;
  const minute = `minute:${now.toISOString().slice(0, 16)}`;
  const userMonth = { scope: "USER" as const, scopeId: userId, period: month };
  const userDay = { scope: "USER" as const, scopeId: userId, period: day };
  const userMinute = { scope: "USER" as const, scopeId: userId, period: minute };
  type Ref = Pick<UsageBucket, "scope" | "scopeId" | "period">;
  type Patch = Partial<
    Pick<UsageBucket, "coachUsed" | "draftUsed" | "costUsedUsd" | "costReservedUsd" | "blocked">
  >;
  const denied = (error: unknown) => error instanceof ApiError && error.status === 429;
  async function patchBucket(ref: Ref, patch: Patch, work: () => Promise<void>) {
    const where = { scope_scopeId_period: ref };
    const before = await db.usageBucket.findUnique({ where });
    await db.usageBucket.upsert({ where, create: { ...ref, ...patch }, update: patch });
    try {
      await work();
    } finally {
      if (before) await db.usageBucket.update({ where, data: before });
      else await db.usageBucket.delete({ where });
    }
  }
  async function reserve(
    operation: "COACH" | "DRAFT" = "COACH",
    byok = false,
    model: string = usage.GEMINI_FLASH_MODEL,
  ) {
    const row = await usage.reserveGeneration({
      userId,
      key: randomUUID(),
      inputHash: randomUUID(),
      operation,
      model,
      byok,
      webSearch: false,
      reserveUsd: usage.maximumCost(model, operation),
    });
    created.push(row.request.id);
    return row.request;
  }
  async function release(row: { id: string }) {
    assert.equal((await usage.finishGeneration(row.id, {})).status, "VOID");
  }
  try {
    await patchBucket(userMonth, { coachUsed: free.monthlyCoachLimit + 10 }, async () => {
      const account = await usage.getAccountUsage(userId);
      assert.equal(account.coachRemaining, null);
      assert.equal(account.coachLimit, null);
      assert.equal(account.concurrentLimit, free.concurrentLimit);
      assert.equal(account.coachAvailability[usage.GEMINI_FLASH_MODEL].standard, true);
      const row = await reserve();
      const reserved = await db.usageBucket.findUniqueOrThrow({
        where: { scope_scopeId_period: userMonth },
      });
      assert.equal(reserved.coachUsed, free.monthlyCoachLimit + 10);
      assert.equal(reserved.coachReserved, 1);
      await release(row);
      // Legacy access keeps its original numerical cap for both funding modes.
      process.env.APP_ACCESS_MODE = "plans";
      try {
        assert.equal((await usage.getAccountUsage(userId)).coachRemaining, 0);
        await assert.rejects(reserve(), denied);
        await assert.rejects(reserve("COACH", true), denied);
      } finally {
        delete process.env.APP_ACCESS_MODE;
      }
    });

    await patchBucket(userMonth, { draftUsed: free.monthlyDraftLimit }, async () => {
      assert.equal((await usage.getAccountUsage(userId)).draftRemaining, 0);
      await assert.rejects(reserve("DRAFT"), denied);
      await assert.rejects(reserve("DRAFT", true), denied);
    });

    // A positive balance is insufficient if the complete maximum reservation will not fit.
    await patchBucket(userDay, { costUsedUsd: free.dailyBudgetUsd.sub("0.2") }, async () => {
      const account = await usage.getAccountUsage(userId);
      assert.equal(account.coachAvailability[usage.GEMINI_FLASH_MODEL].standard, true);
      assert.equal(account.coachAvailability[usage.OPUS_MODEL].standard, false);
      assert.equal(account.coachAvailability[usage.GEMINI_FLASH_MODEL].web, false);
      await assert.rejects(reserve("COACH", false, usage.OPUS_MODEL), denied);
      await release(await reserve("COACH", true, usage.OPUS_MODEL));
    });

    // Equality is admitted, one extra reserved decimal unit is not.
    const flashMaximum = usage.maximumCost(usage.GEMINI_FLASH_MODEL, "COACH");
    await patchBucket(
      userDay,
      {
        costUsedUsd: free.dailyBudgetUsd.sub(flashMaximum),
        costReservedUsd: new Prisma.Decimal(0),
      },
      async () => {
        assert.equal(
          (await usage.getAccountUsage(userId)).coachAvailability[usage.GEMINI_FLASH_MODEL]
            .standard,
          true,
        );
        await release(await reserve());
        await patchBucket(
          userDay,
          { costReservedUsd: new Prisma.Decimal("0.00000001") },
          async () => {
            assert.equal(
              (await usage.getAccountUsage(userId)).coachAvailability[usage.GEMINI_FLASH_MODEL]
                .standard,
              false,
            );
            await assert.rejects(reserve(), denied);
          },
        );
      },
    );

    const funds: { ref: Ref; limit: Prisma.Decimal }[] = [
      { ref: userMonth, limit: free.monthlyBudgetUsd },
      { ref: userDay, limit: free.dailyBudgetUsd },
      {
        ref: { scope: "PLAN", scopeId: "FREE", period: month },
        limit: new Prisma.Decimal(process.env.AI_FREE_POOL_USD || "5"),
      },
      {
        ref: { scope: "GLOBAL", scopeId: "app", period: month },
        limit: new Prisma.Decimal(process.env.AI_MONTHLY_BUDGET_USD || "25"),
      },
      {
        ref: { scope: "GLOBAL", scopeId: "app", period: day },
        limit: new Prisma.Decimal(process.env.AI_DAILY_BUDGET_USD || "5"),
      },
    ];
    for (const { ref, limit } of funds) {
      for (const patch of [{ costUsedUsd: limit }, { blocked: true }]) {
        await patchBucket(ref, patch, async () => {
          const account = await usage.getAccountUsage(userId);
          assert.equal(
            account.coachAvailability[usage.GEMINI_FLASH_MODEL].standard,
            false,
            `${ref.scope}/${ref.period}`,
          );
          await assert.rejects(reserve(), denied);
          await release(await reserve("COACH", true));
        });
      }
    }

    await patchBucket(userMinute, { blocked: true }, async () => {
      assert.equal(
        (await usage.getAccountUsage(userId)).coachAvailability[usage.GEMINI_FLASH_MODEL].standard,
        false,
      );
      await assert.rejects(reserve(), denied);
      await release(await reserve("COACH", true));
    });

    const pending = await reserve();
    assert.equal((await usage.getAccountUsage(userId)).pending, 1);
    await assert.rejects(reserve("COACH", true), denied);
    await release(pending);
    await patchBucket(userMinute, { coachUsed: free.minuteRequestLimit }, async () => {
      const account = await usage.getAccountUsage(userId);
      assert.ok(
        account.rateLimitedUntil && new Date(account.rateLimitedUntil).getTime() > Date.now(),
      );
      await assert.rejects(reserve(), denied);
      await assert.rejects(reserve("COACH", true), denied);
    });

    // An unknown request still holds money even though it no longer occupies concurrency.
    await patchBucket(userMinute, { coachUsed: 0 }, async () => {
      const uncertain = await reserve();
      await usage.dispatchGeneration(uncertain.id);
      await usage.observeUsage(uncertain.id, { id: "gen-qa-beta-unknown-budget" });
      await usage.finishGeneration(uncertain.id, { error: { status: 504, message: "QA timeout" } });
      await patchBucket(
        userDay,
        { costUsedUsd: free.dailyBudgetUsd.sub(flashMaximum).sub("0.01") },
        async () => {
          const account = await usage.getAccountUsage(userId);
          assert.equal(account.uncertain, 1);
          assert.equal(account.pending, 0);
          assert.equal(account.coachRemaining, null);
          assert.equal(account.coachAvailability[usage.GEMINI_FLASH_MODEL].standard, false);
          await assert.rejects(reserve(), denied);
          await release(await reserve("COACH", true));
        },
      );
      await usage.observeUsage(uncertain.id, { cost: "0.004" });
      assert.equal((await usage.finishGeneration(uncertain.id, {})).status, "SETTLED");
    });
    assert.deepEqual(await db.plan.findUniqueOrThrow({ where: { id: free.id } }), free);
    console.info(
      "PASS · beta sin cap mensual COACH, disponibilidad por modelo, fondos/UNKNOWN/capturas/rate/concurrencia/BYOK conservados",
    );
  } finally {
    delete process.env.APP_ACCESS_MODE;
    await db.aiRequest.deleteMany({ where: { id: { in: created } } });
    // All buckets belong to the enclosing fresh disposable QA fixture; restore its snapshot.
    await db.usageBucket.deleteMany();
    if (originalBuckets.length) await db.usageBucket.createMany({ data: originalBuckets });
  }
}
