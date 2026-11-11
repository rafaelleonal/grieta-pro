import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AccountScreen } from "../components/account/account-screen";
import { CoachTopbar } from "../components/coach/coach-topbar";
import { AppShell, type ShellProps } from "../components/shell/app-shell";
import type { AccountStatus } from "../lib/auth-client";

const account: AccountStatus = {
  configured: true,
  authenticated: true,
  registrationMode: "OPEN",
  user: {
    id: "synthetic-user",
    name: "Prueba",
    email: "prueba@example.test",
    emailVerified: true,
    role: "USER",
  },
  usage: {
    buildsToday: 4,
    dailyLimit: 30,
    appBudgetReached: false,
    resetsAt: "2026-11-12T00:00:00.000Z",
  },
};
const noop = () => undefined;
function renderAccount(value: AccountStatus) {
  const ws: ComponentProps<typeof AccountScreen>["ws"] = {
    session: { account: value, refreshAccount: async () => undefined, markLoggedOut: noop },
    clearPrivateState: noop,
  };
  return renderToStaticMarkup(createElement(AccountScreen, { ws }));
}

test("account shows today's new builds and explains that cached matchups are free", () => {
  const html = renderAccount(account);
  assert.ok(html.includes("Builds de hoy"));
  assert.ok(html.includes("4 usadas de 30"));
  assert.ok(html.includes("no cuenta"));
  for (const removed of ["Clave de OpenRouter", "Por confirmar", "Capturas", "Rango", "Pro"])
    assert.ok(!html.includes(removed), removed);
  const exhausted = renderAccount({
    ...account,
    usage: { ...account.usage!, appBudgetReached: true },
  });
  assert.ok(exhausted.includes("sólo responden los matchups ya generados"));
});

test("topbar and shell show the daily counter without a model or key selector", () => {
  const topbar = renderToStaticMarkup(
    createElement(CoachTopbar, { account, catalog: null, onAccount: noop }),
  );
  assert.ok(topbar.includes("Hoy 4/30"));
  assert.ok(!topbar.includes("modelo"));
  const shellProps: ShellProps = {
    view: "coach",
    onNavigate: noop,
    onNewPreparation: noop,
    account,
    keyReady: true,
    children: null,
  };
  const shell = renderToStaticMarkup(createElement(AppShell, shellProps));
  assert.ok(shell.includes("Hoy 4/30 builds"));
  assert.ok(!shell.includes("Conexión y modelo"));
});
