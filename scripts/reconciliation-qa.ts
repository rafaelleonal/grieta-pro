import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Prisma } from "../generated/prisma/client";
import type { getDb } from "../lib/db";
import * as usage from "../lib/usage";
import {
  reconcileUserUsage,
  RECONCILIATION_COOLDOWN_MS,
  ABANDONED_GENERATION_MS,
} from "../lib/reconciliation";
import type { CoachResult } from "../lib/types";

type Fixture = { user: { id: string }; cookie: string };
type MakeRequest = (
  path: string,
  cookie: string,
  method?: string,
  body?: unknown,
  key?: string,
) => Request;

export async function runReconciliationQa(args: {
  db: ReturnType<typeof getDb>;
  user: Fixture;
  other: Fixture;
  proPlanId: string;
  result: CoachResult;
  input: ReturnType<typeof usage.safeCoachInput>;
  origin: string;
  privateRequest: MakeRequest;
}) {
  const { db, user, other, proPlanId, result, input, privateRequest, origin } = args;
  const originalPro = await db.plan.findUniqueOrThrow({ where: { id: proPlanId } });
  await db.plan.update({
    where: { id: proPlanId },
    data: { minuteRequestLimit: 100, monthlyCoachLimit: 100, dailyBudgetUsd: "10" },
  });
  await db.accessGrant.createMany({
    data: [user, other].map((fixture) => ({
      userId: fixture.user.id,
      planId: proPlanId,
      source: "COMPLIMENTARY" as const,
    })),
  });
  let lookupCalls = 0;
  let paidCalls = 0;
  const statuses = (error: unknown) =>
    error && typeof error === "object" && "status" in error ? error.status : undefined;
  const reserve = (owner = user.user.id, byok = false) =>
    usage.reserveGeneration({
      userId: owner,
      key: randomUUID(),
      inputHash: randomUUID(),
      operation: "COACH",
      model: "openai/gpt-5.6-luna",
      byok,
      webSearch: false,
      reserveUsd: new Prisma.Decimal(byok ? 0 : "0.005"),
    });
  const snapshot = () => db.usageBucket.findMany({ orderBy: { id: "asc" } });
  const unknown = async (providerId?: string, owner = user.user.id, byok = false) => {
    const reservation = await reserve(owner, byok);
    await usage.dispatchGeneration(reservation.request.id);
    if (providerId) await usage.observeUsage(reservation.request.id, { id: providerId });
    await usage.finishGeneration(reservation.request.id, {
      error: { status: 504, message: "La consulta tardó demasiado." },
    });
    return reservation.request;
  };
  const provider =
    (make: (id: string) => Response | Promise<Response>): typeof fetch =>
    async (destination, options) => {
      const url = new URL(String(destination));
      if (options?.method === "POST") paidCalls++;
      assert.equal(url.origin, "https://openrouter.ai");
      assert.equal(url.pathname, "/api/v1/generation");
      assert.notEqual(options?.method, "POST");
      assert.equal(options?.redirect, "error");
      assert.ok(options?.signal instanceof AbortSignal);
      assert.equal(new Headers(options?.headers).get("Authorization"), "Bearer qa-no-real-key");
      lookupCalls++;
      return make(url.searchParams.get("id") || "");
    };
  const previousKey = process.env.OPENROUTER_API_KEY;
  const previousFetch = globalThis.fetch;
  process.env.OPENROUTER_API_KEY = "qa-no-real-key";
  try {
    const late = await reserve();
    await usage.dispatchGeneration(late.request.id);
    await usage.observeUsage(late.request.id, { cost: "0.001" });
    await usage.finishGeneration(late.request.id, {});
    const beforeLate = await snapshot();
    await Promise.all(
      Array.from({ length: 8 }, () =>
        usage.finishGeneration(late.request.id, { response: result, recordInput: input }),
      ),
    );
    assert.equal(await db.coachRecord.count({ where: { requestId: late.request.id } }), 1);
    assert.deepEqual(await snapshot(), beforeLate, "Late saves never settle money twice");
    const history = await db.coachRecord.findUniqueOrThrow({
      where: { requestId: late.request.id },
    });
    const { deleteHistory } = await import("../lib/history");
    await deleteHistory(user.user.id, history.id);
    await usage.finishGeneration(late.request.id, { response: result, recordInput: input });
    assert.equal(await db.coachRecord.count({ where: { requestId: late.request.id } }), 0);
    const deleted = await db.aiRequest.findUniqueOrThrow({ where: { id: late.request.id } });
    assert.equal(deleted.response, null);
    assert.equal(deleted.failureStatus, 410, "Late workers cannot resurrect deleted replay");
    console.info(
      "PASS · resultado tardío guardado una vez sin doble gasto y borrado sin resurrección",
    );

    const noId = await unknown();
    assert.equal((await usage.getAccountUsage(user.user.id)).pending, 0);
    assert.equal((await usage.getAccountUsage(user.user.id)).uncertain, 1);
    const beforeNoId = await snapshot();
    const noNetwork = provider(() => {
      throw new Error("Unexpected provider lookup");
    });
    const emptyLeaseBefore = await db.rateLimit.findUnique({
      where: { key: "grietapro-reconcile-lease:global" },
    });
    await reconcileUserUsage(other.user.id, { fetcher: noNetwork });
    assert.deepEqual(
      await db.rateLimit.findUnique({ where: { key: "grietapro-reconcile-lease:global" } }),
      emptyLeaseBefore,
      "An account without pending work cannot consume provider lookup capacity",
    );
    await reconcileUserUsage(user.user.id, { fetcher: noNetwork });
    assert.deepEqual(
      await db.rateLimit.findUnique({ where: { key: "grietapro-reconcile-lease:global" } }),
      emptyLeaseBefore,
      "A request without a provider ID cannot consume provider lookup capacity",
    );
    assert.equal(lookupCalls, 0);
    assert.deepEqual(await snapshot(), beforeNoId, "No provider ID never implies cost zero");
    const newIntent = await reserve();
    await usage.finishGeneration(newIntent.request.id, {});
    const retries = await Promise.all(
      Array.from({ length: 8 }, () =>
        usage.reserveGeneration({
          userId: user.user.id,
          key: randomUUID(),
          inputHash: noId.inputHash,
          operation: "COACH",
          model: noId.model,
          byok: false,
          webSearch: false,
          reserveUsd: new Prisma.Decimal("0.005"),
        }),
      ),
    );
    assert.ok(retries.every((entry) => entry.replay && entry.request.id === noId.id));
    assert.equal(lookupCalls, 0);
    const globalBefore = await db.usageBucket.findMany({ where: { scope: "GLOBAL" } });
    const previousBudget = process.env.AI_MONTHLY_BUDGET_USD;
    const monthBucket = globalBefore.find((bucket) => bucket.period.startsWith("month:"))!;
    process.env.AI_MONTHLY_BUDGET_USD = monthBucket.costUsedUsd
      .add(monthBucket.costReservedUsd)
      .toFixed(8);
    await assert.rejects(reserve(), (error) => statuses(error) === 429);
    if (previousBudget === undefined) delete process.env.AI_MONTHLY_BUDGET_USD;
    else process.env.AI_MONTHLY_BUDGET_USD = previousBudget;
    console.info(
      "PASS · UNKNOWN conserva fondos y cuota, permite otra intención y nunca duplica la incierta",
    );

    const charge = await unknown("gen-qa-auto-final");
    const now = new Date(Date.now() + 180_000);
    const finalProvider = provider(async (id) => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return Response.json({ data: { id, total_cost: 0.002, finish_reason: "stop" } });
    });
    const beforeConcurrent = lookupCalls;
    await Promise.all(
      Array.from({ length: 12 }, () =>
        reconcileUserUsage(user.user.id, { fetcher: finalProvider, now }),
      ),
    );
    assert.equal(
      lookupCalls - beforeConcurrent,
      1,
      "A persistent lease deduplicates provider GETs",
    );
    const settled = await db.aiRequest.findUniqueOrThrow({ where: { id: charge.id } });
    assert.equal(settled.status, "SETTLED");
    assert.equal(settled.actualCostUsd?.toString(), "0.002");
    const afterSettlement = await snapshot();
    await reconcileUserUsage(user.user.id, { fetcher: finalProvider, now });
    assert.deepEqual(await snapshot(), afterSettlement);
    console.info("PASS · conciliación automática concurrente por GET con un cargo y un cierre");

    const unavailable = await unknown("gen-qa-unavailable");
    const beforeUncertain = await snapshot();
    let nextTime = now.getTime();
    for (const make of [
      () => new Response("missing", { status: 404 }),
      (id: string) => Response.json({ data: { id, total_cost: -1, finish_reason: "stop" } }),
      () => Response.json({ data: { id: "gen-another", total_cost: 0, finish_reason: "stop" } }),
      (id: string) => Response.json({ data: { id, total_cost: 0, finish_reason: null } }),
      () => {
        throw new TypeError("synthetic timeout");
      },
      () => new Response("x".repeat(33_000), { status: 200 }),
    ]) {
      nextTime += RECONCILIATION_COOLDOWN_MS * 2;
      await reconcileUserUsage(user.user.id, {
        fetcher: provider(make),
        now: new Date(nextTime),
      });
      assert.deepEqual(await snapshot(), beforeUncertain);
      const pendingCost = await db.aiRequest.findUniqueOrThrow({ where: { id: unavailable.id } });
      assert.equal(pendingCost.status, "UNKNOWN");
      assert.equal(pendingCost.actualCostUsd, null);
    }
    console.info(
      "PASS · 404, coste inválido, ID ajeno, ejecución no final, timeout y cuerpo excesivo conservan reservas",
    );

    const uncertainPlan = await reserve();
    await usage.dispatchGeneration(uncertainPlan.request.id);
    await usage.finishGeneration(uncertainPlan.request.id, {
      response: result,
      recordInput: input,
    });
    const uncertainHistory = await db.coachRecord.findUniqueOrThrow({
      where: { requestId: uncertainPlan.request.id },
    });
    await deleteHistory(user.user.id, uncertainHistory.id);
    const beforeDeletedUnknown = await snapshot();
    await usage.finishGeneration(uncertainPlan.request.id, {
      response: result,
      recordInput: input,
      error: { status: 503, message: "Late synthetic failure" },
    });
    const uncertainDeleted = await db.aiRequest.findUniqueOrThrow({
      where: { id: uncertainPlan.request.id },
    });
    assert.equal(uncertainDeleted.status, "UNKNOWN");
    assert.equal(uncertainDeleted.failureStatus, 410);
    assert.equal(uncertainDeleted.response, null);
    assert.equal(await db.coachRecord.count({ where: { requestId: uncertainPlan.request.id } }), 0);
    assert.deepEqual(await snapshot(), beforeDeletedUnknown);
    console.info("PASS · borrar un plan con coste incierto tampoco permite resucitarlo");

    const staleReserve = await reserve(other.user.id);
    const staleSent = new Date(Date.now() - ABANDONED_GENERATION_MS - 1_000);
    await db.aiRequest.update({
      where: { id: staleReserve.request.id },
      data: { createdAt: staleSent },
    });
    await usage.recoverAbandonedGenerations(other.user.id);
    await assert.rejects(
      usage.dispatchGeneration(staleReserve.request.id),
      (error) => statuses(error) === 409,
    );
    assert.equal(
      (await db.aiRequest.findUniqueOrThrow({ where: { id: staleReserve.request.id } })).status,
      "VOID",
    );
    const staleDispatch = await reserve(other.user.id);
    await usage.dispatchGeneration(staleDispatch.request.id);
    await db.aiRequest.update({
      where: { id: staleDispatch.request.id },
      data: { dispatchedAt: staleSent },
    });
    const beforeAbandoned = await snapshot();
    await usage.recoverAbandonedGenerations(other.user.id);
    assert.deepEqual(await snapshot(), beforeAbandoned);
    const recovered = await usage.getAccountUsage(other.user.id);
    assert.equal(recovered.pending, 0);
    assert.equal(recovered.uncertain, 1);
    const privateByok = await reserve(other.user.id, true);
    await usage.dispatchGeneration(privateByok.request.id);
    await db.aiRequest.update({
      where: { id: privateByok.request.id },
      data: { status: "UNKNOWN", providerRequestId: "gen-private-byok" },
    });
    const beforePrivate = lookupCalls;
    await reconcileUserUsage(other.user.id, {
      fetcher: noNetwork,
      now: new Date(nextTime + 60_000),
    });
    assert.equal(lookupCalls, beforePrivate, "BYOK never uses the application's key for lookup");
    console.info(
      "PASS · reserva abandonada sin POST tardío, envío abandonado sin reembolso y BYOK aislado",
    );

    const rotating = [];
    for (let index = 0; index < 4; index++)
      rotating.push(await unknown(`gen-qa-fair-${index}`, other.user.id));
    const unavailableIds = rotating.slice(0, 3).map((row) => row.id);
    const unresolvedRows = () =>
      db.aiRequest.findMany({
        where: { id: { in: unavailableIds } },
        orderBy: { id: "asc" },
      });
    const beforeRotation = await unresolvedRows();
    const fairProvider = provider((id) =>
      id === "gen-qa-fair-3"
        ? Response.json({ data: { id, total_cost: 0.002, finish_reason: "stop" } })
        : new Response("missing", { status: 404 }),
    );
    const firstBatchAt = new Date(nextTime + 120_000);
    const beforeFirstBatch = lookupCalls;
    const firstBatch = await reconcileUserUsage(other.user.id, {
      fetcher: fairProvider,
      now: firstBatchAt,
    });
    assert.equal(firstBatch.checked, 3);
    assert.equal(lookupCalls - beforeFirstBatch, 3);
    assert.equal(firstBatch.reconciled, 0);
    const secondBatchAt = new Date(firstBatchAt.getTime() + RECONCILIATION_COOLDOWN_MS);
    const beforeSecondBatch = lookupCalls;
    const secondBatch = await reconcileUserUsage(other.user.id, {
      fetcher: fairProvider,
      now: secondBatchAt,
    });
    assert.equal(secondBatch.checked, 3);
    assert.equal(lookupCalls - beforeSecondBatch, 3);
    assert.equal(secondBatch.reconciled, 1);
    assert.equal(
      (await db.aiRequest.findUniqueOrThrow({ where: { id: rotating[3].id } })).status,
      "SETTLED",
      "Three permanent 404s cannot prevent the fourth generation from settling",
    );
    assert.deepEqual(await unresolvedRows(), beforeRotation, "The 404 reservations remain intact");

    const knownCharge = await unknown(undefined, other.user.id);
    await usage.observeUsage(knownCharge.id, { cost: "0.001" });
    const knownChargeAt = new Date(secondBatchAt.getTime() + RECONCILIATION_COOLDOWN_MS);
    const globalKey = "grietapro-reconcile-lease:global";
    const fullLookupWindow = BigInt(Math.floor(knownChargeAt.getTime() / 60_000) * 60_000);
    await db.rateLimit.upsert({
      where: { key: globalKey },
      create: { id: randomUUID(), key: globalKey, count: 10, lastRequest: fullLookupWindow },
      update: { count: 10, lastRequest: fullLookupWindow },
    });
    const beforeKnownCharge = lookupCalls;
    const priority = await reconcileUserUsage(other.user.id, {
      fetcher: noNetwork,
      now: knownChargeAt,
    });
    assert.equal(priority.reconciled, 1);
    assert.equal(priority.checked, 0);
    assert.equal(lookupCalls, beforeKnownCharge);
    assert.equal(
      (await db.aiRequest.findUniqueOrThrow({ where: { id: knownCharge.id } })).status,
      "SETTLED",
      "Known costs settle without waiting for shared provider lookup capacity",
    );
    assert.deepEqual(await unresolvedRows(), beforeRotation);
    console.info(
      "PASS · rotación persistente entre consultas, tres 404 sin bloquear la cuarta y coste conocido prioritario sin red",
    );

    const route = await import("../app/api/account/reconcile/route");
    globalThis.fetch = noNetwork;
    const path = "/api/account/reconcile";
    assert.equal((await route.POST(privateRequest(path, "", "POST", {}))).status, 401);
    const foreign = privateRequest(path, user.cookie, "POST", {});
    foreign.headers.set("origin", "https://attacker.example");
    assert.equal((await route.POST(foreign)).status, 403);
    assert.equal(foreign.bodyUsed, false);
    const invalidBody = privateRequest(path, user.cookie, "POST", { userId: other.user.id });
    assert.equal((await route.POST(invalidBody)).status, 400);
    const tooLarge = privateRequest(path, user.cookie, "POST", {
      idempotencyKey: "x".repeat(2_500),
    });
    assert.equal((await route.POST(tooLarge)).status, 413);
    const privateResult = await route.POST(
      privateRequest(path, other.cookie, "POST", { idempotencyKey: noId.idempotencyKey }),
    );
    assert.equal(privateResult.status, 200);
    assert.match(privateResult.headers.get("cache-control") || "", /no-store/);
    const privateData = await privateResult.json();
    assert.equal(privateData.attempt, null, "Another account cannot inspect a request key");
    assert.ok(!JSON.stringify(privateData).includes(noId.id));
    assert.ok(!JSON.stringify(privateData).includes(user.user.id));
    assert.equal(paidCalls, 0, "Automatic checks never make a completion POST");
    assert.equal(new URL(origin).hostname, "localhost");
    console.info(
      "PASS · ruta automática autenticada, origen, cuerpo acotado y estado aislado por propietario",
    );
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = previousKey;
    await db.plan.update({
      where: { id: proPlanId },
      data: {
        minuteRequestLimit: originalPro.minuteRequestLimit,
        monthlyCoachLimit: originalPro.monthlyCoachLimit,
        dailyBudgetUsd: originalPro.dailyBudgetUsd,
      },
    });
  }
}
