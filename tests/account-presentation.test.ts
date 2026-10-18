import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AccountScreen } from "../components/account/account-screen";
import { ConnectionForm } from "../components/account/connection-form";
import { CoachTopbar } from "../components/coach/coach-topbar";
import { AppShell } from "../components/shell/app-shell";
import { GuideScreen } from "../components/guide/guide-screen";
import { WebSearchControl, webSearchState } from "../components/coach/prepare-extras";
import { accountAccessLabel, usesPlanAccess, webSearchEnabled } from "../lib/account-presentation";
import type { AccountStatus } from "../lib/auth-client";
import { demoInput } from "../lib/demo";

const account: AccountStatus = {
  configured: true,
  authenticated: true,
  registrationMode: "OPEN",
  user: {
    id: "synthetic-beta-user",
    name: "Prueba",
    email: "beta@example.test",
    emailVerified: true,
    role: "USER",
    plan: "FREE",
  },
  usage: {
    accessMode: "beta",
    coachRemaining: 7,
    coachLimit: 10,
    draftRemaining: 2,
    draftLimit: 4,
    webRemaining: 0,
    webLimit: 0,
    webAllowed: false,
    pending: 1,
    uncertain: 0,
    resetsAt: "2026-11-01T00:00:00.000Z",
    defaultModel: "anthropic/claude-opus-5.5",
    allowedModels: ["anthropic/claude-opus-5.5", "google/gemini-3.8-flash"],
  },
};
const noop = () => undefined;
function renderAccount(value: AccountStatus) {
  const ws: ComponentProps<typeof AccountScreen>["ws"] = {
    session: {
      account: value,
      checkingConsumption: false,
      consumptionError: "",
      checkConsumption: async () => undefined,
      refreshAccount: async () => undefined,
      markLoggedOut: noop,
    },
    credentials: {},
    status: null,
    input: demoInput,
    clearPrivateState: noop,
    setCredentials: noop,
  };
  return renderToStaticMarkup(
    createElement(AccountScreen, { ws, positions: ["MID"], onEditProfile: noop }),
  );
}
function assertNoCommercialLabels(html: string) {
  for (const label of [
    ">Free<",
    ">Pro<",
    "Elociencia Pro",
    "Pro por invitación",
    "Cambiar plan",
    "Modelos incluidos en tu plan",
  ])
    assert.ok(!html.includes(label), label);
}

test("beta account presents the same access for stored tiers and retains quotas and authentication", () => {
  for (const plan of ["FREE", "PRO"] as const) {
    const value = { ...account, user: { ...account.user!, plan } };
    const html = renderAccount(value);
    assert.equal(accountAccessLabel(value), "Beta");
    assertNoCommercialLabels(html);
    for (const label of [
      "Beta",
      "7 disponibles de 10",
      "2 de 4",
      "Por confirmar",
      "Actualizar saldo",
      "Cambiar contraseña",
      "Cerrar sesión",
      "Modelos disponibles para probar",
      "Gemini 3.8 Flash",
    ])
      assert.ok(html.includes(label), label);
    assert.ok(html.includes("Jugador"));
  }
});

test("beta administrator keeps its role without displaying commercial grants", () => {
  const value = {
    ...account,
    user: { ...account.user!, role: "ADMIN" as const, plan: "PRO" as const },
  };
  const html = renderAccount(value);
  assert.ok(html.includes("Administrador"));
  assert.ok(!html.includes('id="administrar"'));
  assertNoCommercialLabels(html);
});

test("shell and topbar show beta availability while model selection remains explicit", () => {
  const shellProps: ComponentProps<typeof AppShell> = {
    account,
    view: "coach",
    onNavigate: noop,
    onNewPreparation: noop,
    onOpenSettings: noop,
    keyReady: true,
    children: "Preparar",
  };
  const shell = renderToStaticMarkup(createElement(AppShell, shellProps));
  const topbar = renderToStaticMarkup(
    createElement(CoachTopbar, {
      account,
      modelId: "google/gemini-3.8-flash",
      catalog: null,
      onModel: noop,
      onAccount: noop,
    }),
  );
  const connection = renderToStaticMarkup(
    createElement(ConnectionForm, {
      account,
      credentials: {},
      status: null,
      onSave: noop,
    }),
  );
  for (const html of [shell, topbar, connection]) assertNoCommercialLabels(html);
  assert.ok(shell.includes("Beta"));
  assert.ok(topbar.includes("Beta: 7 builds disponibles"));
  assert.ok(topbar.includes("Gemini 3.8 Flash"));
  assert.ok(connection.includes("Opus 5.5"));
  assert.ok(connection.includes("Gemini 3.8 Flash"));
  assert.deepEqual(webSearchState(account, true), { allowed: false, on: false, remaining: 0 });
});

test("legacy plans mode remains explicit and a missing mode uses beta presentation", () => {
  const legacy = {
    ...account,
    user: { ...account.user!, role: "ADMIN" as const, plan: "PRO" as const },
    usage: { ...account.usage!, accessMode: "plans" as const },
  };
  assert.ok(usesPlanAccess(legacy));
  const html = renderAccount(legacy);
  assert.ok(html.includes("Elociencia Pro"));
  assert.ok(html.includes('id="administrar"'));
  assert.equal(
    accountAccessLabel({ ...account, usage: { ...account.usage!, accessMode: undefined } }),
    "Beta",
  );
  const guide = renderToStaticMarkup(
    createElement(GuideScreen, { onExample: noop, onPrepare: noop }),
  );
  assert.ok(!guide.includes("en Pro"));
});

test("beta hides web search and normalizes a restored true request before submission", () => {
  // A stale draft or inconsistent previous availability must never enable beta web requests.
  const stale = { ...account, usage: { ...account.usage!, webAllowed: true, webRemaining: 3 } };
  assert.equal(webSearchEnabled(stale, true), false);
  assert.deepEqual(webSearchState(stale, true), { allowed: false, on: false, remaining: 3 });
  const hidden = renderToStaticMarkup(
    createElement(WebSearchControl, { account: stale, requested: true, onChange: noop }),
  );
  assert.equal(hidden, "");
  const plans = { ...stale, usage: { ...stale.usage, accessMode: "plans" as const } };
  assert.equal(webSearchEnabled(plans, true), true);
  const visible = renderToStaticMarkup(
    createElement(WebSearchControl, { account: plans, requested: true, onChange: noop }),
  );
  assert.ok(visible.includes("Fuentes web"));
  assert.ok(visible.includes('aria-pressed="true"'));
});
