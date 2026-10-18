import assert from "node:assert/strict";
import test from "node:test";
import { Prisma, type Plan } from "../generated/prisma/client";
import { betaAccessPolicy, getAccessMode } from "../lib/access-policy";
import { ApiError } from "../lib/http";

const freePlan: Plan = {
  id: "synthetic-free-plan",
  code: "FREE",
  name: "Administered limits",
  version: 9,
  monthlyCoachLimit: 17,
  monthlyDraftLimit: 3,
  monthlySearchLimit: 2,
  monthlyBudgetUsd: new Prisma.Decimal("0.73"),
  dailyBudgetUsd: new Prisma.Decimal("0.19"),
  minuteRequestLimit: 4,
  allowedModels: ["previous/model"],
  webSearchAllowed: true,
  concurrentLimit: 2,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-02"),
};

test("beta is the default and legacy plans require an explicit valid access mode", () => {
  const previous = process.env.APP_ACCESS_MODE;
  try {
    delete process.env.APP_ACCESS_MODE;
    assert.equal(getAccessMode(), "beta");
    process.env.APP_ACCESS_MODE = " plans ";
    assert.equal(getAccessMode(), "plans");
    process.env.APP_ACCESS_MODE = "beta";
    assert.equal(getAccessMode(), "beta");
    process.env.APP_ACCESS_MODE = "unknown";
    assert.throws(
      getAccessMode,
      (error: unknown) => error instanceof ApiError && error.status === 503,
    );
  } finally {
    if (previous === undefined) delete process.env.APP_ACCESS_MODE;
    else process.env.APP_ACCESS_MODE = previous;
  }
});

test("beta projects shared models without modifying administered limits or source policy", () => {
  const before = structuredClone(freePlan.allowedModels);
  const supported = ["anthropic/claude-opus-5.5", "google/gemini-3.8-flash"];
  const beta = betaAccessPolicy(freePlan, supported);
  assert.deepEqual(beta, {
    ...freePlan,
    name: "Beta",
    allowedModels: supported,
    monthlySearchLimit: 0,
    webSearchAllowed: false,
  });
  assert.deepEqual(freePlan.allowedModels, before);
  assert.equal(freePlan.webSearchAllowed, true);
  assert.equal(freePlan.monthlySearchLimit, 2);
  assert.notEqual(beta.allowedModels, supported);
  assert.equal(beta.monthlyBudgetUsd.toString(), "0.73");
  assert.equal(beta.dailyBudgetUsd.toString(), "0.19");
  assert.equal(beta.version, 9);
  assert.throws(() => betaAccessPolicy({ ...freePlan, code: "PRO" }, supported));
});
