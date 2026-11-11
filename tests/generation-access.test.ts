import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { generationAccess, type GenerationBlock } from "../lib/generation-access";
import { AccessNotice } from "../components/coach/access-notice";
import type { AccountStatus } from "../lib/auth-client";

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
  },
  usage: {
    buildsToday: 0,
    dailyLimit: 30,
    appBudgetReached: false,
    resetsAt: "2026-11-12T00:00:00.000Z",
  },
};
const base = { account, status: { configured: true } };
function blocked(reason: GenerationBlock, change: Partial<Parameters<typeof generationAccess>[0]>) {
  const value = generationAccess({ ...base, ...change });
  assert.equal(value.allowed, false);
  if (!value.allowed) assert.equal(value.reason, reason);
  return value;
}

test("a verified account with a configured server can always ask for a build", () => {
  assert.deepEqual(generationAccess(base), { allowed: true });
});

test("daily limits never disable the button: cached matchups do not count", () => {
  const exhausted: AccountStatus = {
    ...account,
    usage: { ...account.usage!, buildsToday: 30, appBudgetReached: true },
  };
  assert.deepEqual(generationAccess({ ...base, account: exhausted }), { allowed: true });
});

test("account, connection, selection and an active request block knowingly unavailable builds", () => {
  blocked("busy", { busy: true });
  blocked("offline", { online: false });
  blocked("account_loading", { account: null });
  blocked("account_error", { accountError: "No se pudo comprobar tu cuenta." });
  blocked("accounts_unavailable", { account: { ...account, configured: false } });
  blocked("login", { account: { ...account, authenticated: false, user: undefined } });
  blocked("verification", {
    account: { ...account, user: { ...account.user!, emailVerified: false } },
  });
  blocked("configuration_loading", { status: null });
  blocked("configuration", { status: { configured: false } });
  blocked("selection", { selectionReady: false });
});

test("notices offer login, verification or a retry without starting a build", () => {
  const render = (access: ReturnType<typeof generationAccess>) =>
    renderToStaticMarkup(
      createElement(AccessNotice, { session: { refreshAccount: async () => undefined }, access }),
    );
  assert.ok(
    render(blocked("login", { account: { ...account, authenticated: false } })).includes(
      'href="/login"',
    ),
  );
  assert.ok(
    render(blocked("configuration", { status: { configured: false } })).includes("Reintentar"),
  );
  assert.equal(render(blocked("selection", { selectionReady: false })), "");
});
