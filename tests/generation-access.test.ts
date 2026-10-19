import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  generationAccess,
  type GenerationAccessInput,
  type GenerationBlock,
} from "../lib/generation-access";
import { AccessNotice } from "../components/coach/access-notice";
import type { AccountStatus } from "../lib/auth-client";
import type { AppStatus } from "../lib/types";

const flash = "google/gemini-3.8-flash";
const opus = "anthropic/claude-opus-5.5";
const account: AccountStatus = {
  configured: true,
  authenticated: true,
  registrationMode: "OPEN",
  user: {
    id: "synthetic-access",
    email: "access@example.test",
    name: "Prueba",
    role: "USER",
    emailVerified: true,
    plan: "FREE",
  },
  usage: {
    accessMode: "beta",
    coachRemaining: null,
    coachLimit: null,
    draftRemaining: 3,
    draftLimit: 4,
    webRemaining: 0,
    webLimit: 0,
    webAllowed: false,
    pending: 0,
    uncertain: 0,
    concurrentLimit: 2,
    rateLimitedUntil: null,
    defaultModel: flash,
    allowedModels: [flash, opus],
    resetsAt: "2026-11-01T00:00:00Z",
    coachAvailability: {
      [flash]: { standard: true, web: false },
      [opus]: { standard: false, web: false },
    },
  },
};
const status: AppStatus = {
  configured: true,
  defaultModel: flash,
  accessRequired: true,
  riotConfigured: false,
};
const base: GenerationAccessInput = { account, status, now: Date.parse("2026-10-18T12:00:00Z") };
function usage(change: Partial<NonNullable<AccountStatus["usage"]>>): AccountStatus {
  return { ...account, usage: { ...account.usage!, ...change } };
}
function blocked(reason: GenerationBlock, change: Partial<GenerationAccessInput>) {
  const value = generationAccess({ ...base, ...change });
  assert.equal(value.allowed, false);
  if (!value.allowed) assert.equal(value.reason, reason);
  return value;
}

test("beta removes the monthly build count while legacy plans and draft caps remain", () => {
  assert.deepEqual(generationAccess(base), { allowed: true });
  assert.deepEqual(
    generationAccess({ ...base, account: usage({ coachRemaining: 0, coachLimit: 10 }) }),
    { allowed: true },
  );
  blocked("quota", { account: usage({ accessMode: "plans", coachRemaining: 0, coachLimit: 10 }) });
  blocked("quota", { operation: "draft", account: usage({ draftRemaining: 0 }) });
});

test("the selected model budget blocks server funding and BYOK bypasses only that budget", () => {
  blocked("budget", { credentials: { model: opus } });
  assert.deepEqual(
    generationAccess({ ...base, credentials: { model: opus, apiKey: "synthetic-personal-key" } }),
    { allowed: true },
  );
  blocked("budget", { credentials: { model: opus, apiKey: " " } });
  blocked("model", {
    credentials: { model: "unsupported/model", apiKey: "synthetic-personal-key" },
  });
  blocked("concurrency", {
    credentials: { apiKey: "synthetic-personal-key" },
    account: usage({ pending: 2 }),
  });
  blocked("rate", {
    credentials: { apiKey: "synthetic-personal-key" },
    account: usage({ rateLimitedUntil: "2026-10-18T12:00:30Z" }),
  });
});

test("budget snapshots distinguish standard and web calls without treating missing snapshots as denial", () => {
  assert.deepEqual(
    generationAccess({ ...base, account: usage({ coachAvailability: undefined }) }),
    { allowed: true },
  );
  blocked("budget", {
    account: usage({
      accessMode: "plans",
      webAllowed: true,
      webRemaining: 2,
      coachRemaining: 4,
      coachLimit: 10,
    }),
    requestedWeb: true,
  });
  assert.deepEqual(generationAccess({ ...base, requestedWeb: true }), { allowed: true });
  blocked("budget", {
    account: usage({ coachAvailability: { [flash]: { standard: false, web: false } } }),
  });
});

test("budget notice identifies the enforced period and explains uncertain reservations", () => {
  const daily = blocked("budget", {
    account: usage({
      uncertain: 1,
      coachAvailability: {
        [flash]: { standard: false, web: false, standardBlock: "user_daily" },
      },
    }),
  });
  assert.ok(!daily.allowed && daily.message.includes("presupuesto diario"));
  assert.ok(!daily.allowed && daily.message.includes("1 solicitud por confirmar"));
  const shared = blocked("budget", {
    account: usage({
      coachAvailability: {
        [flash]: { standard: false, web: false, standardBlock: "shared_monthly" },
      },
    }),
  });
  assert.ok(!shared.allowed && shared.message.includes("fondo compartido"));
});

test("concurrency follows its actual limit and rate expiry restores advisory availability", () => {
  assert.deepEqual(generationAccess({ ...base, account: usage({ pending: 1 }) }), {
    allowed: true,
  });
  blocked("concurrency", { account: usage({ pending: 2 }) });
  blocked("concurrency", { account: usage({ pending: 1, concurrentLimit: undefined }) });
  blocked("rate", { account: usage({ rateLimitedUntil: "2026-10-18T12:00:30Z" }) });
  assert.deepEqual(
    generationAccess({
      ...base,
      now: Date.parse("2026-10-18T12:00:31Z"),
      account: usage({ rateLimitedUntil: "2026-10-18T12:00:30Z" }),
    }),
    { allowed: true },
  );
});

test("account, connection, selection and local active states prevent knowingly unavailable generation", () => {
  blocked("account_loading", { account: null });
  blocked("account_error", { accountError: "No pudimos comprobar la cuenta." });
  blocked("accounts_unavailable", { account: { ...account, configured: false } });
  const login = blocked("login", {
    account: { ...account, authenticated: false, user: undefined },
  });
  assert.ok(!login.allowed && login.action === "login");
  const verification = blocked("verification", {
    account: { ...account, user: { ...account.user!, emailVerified: false } },
  });
  assert.ok(!verification.allowed && verification.action === "verify");
  blocked("usage_loading", { account: { ...account, usage: undefined } });
  blocked("configuration_loading", { status: null });
  const configuration = blocked("configuration", { status: { ...status, configured: false } });
  assert.ok(!configuration.allowed && configuration.action === "settings");
  blocked("configuration", { status: null, statusError: "Estado no disponible." });
  blocked("model", {
    account: usage({ defaultModel: undefined }),
    status: { ...status, defaultModel: "" },
  });
  blocked("selection", { selectionReady: false });
  blocked("busy", { busy: true });
  blocked("offline", { online: false });
  assert.deepEqual(
    generationAccess({ ...base, status: null, credentials: { apiKey: "synthetic-personal-key" } }),
    { allowed: true },
  );
});

test("confirmed response replay retains authentication but never reserves another quota or budget", () => {
  const exhausted = usage({
    accessMode: "plans",
    coachRemaining: 0,
    coachLimit: 10,
    pending: 2,
    rateLimitedUntil: "2026-10-18T12:00:30Z",
  });
  assert.deepEqual(
    generationAccess({
      ...base,
      account: exhausted,
      credentials: { model: opus },
      status: null,
      replay: true,
    }),
    { allowed: true },
  );
  blocked("verification", {
    replay: true,
    account: { ...exhausted, user: { ...account.user!, emailVerified: false } },
  });
  blocked("account_error", { replay: true, accountError: "No se pudo comprobar tu cuenta." });
});

test("availability notices expose login, setup and budget refresh without creating an AI action", () => {
  const render = (input: GenerationAccessInput) =>
    renderToStaticMarkup(
      createElement(AccessNotice, {
        access: generationAccess(input),
        session: { refreshAccount: async () => undefined },
        onSettings: () => undefined,
      }),
    );
  assert.ok(
    render({ ...base, account: { ...account, authenticated: false } }).includes('href="/login"'),
  );
  assert.ok(
    render({ ...base, status: { ...status, configured: false } }).includes("Configurar IA"),
  );
  const budget = render({ ...base, credentials: { model: opus } });
  assert.ok(budget.includes("Actualizar disponibilidad"));
  assert.ok(budget.includes("Cambiar modelo o clave"));
  assert.ok(!budget.includes("Generar build"));
});
