import assert from "node:assert/strict";
import test from "node:test";
import { NextRequest } from "next/server";
import { browserSecurityPolicy } from "../lib/browser-security";
import { proxy } from "../proxy";

void test("production CSP blocks inline scripts, eval, frames and arbitrary external connections", () => {
  const policy = browserSecurityPolicy("A".repeat(32), true, true);
  const script = policy.split("; ").find((directive) => directive.startsWith("script-src"))!;
  assert.ok(!script.includes("unsafe-inline") && !script.includes("unsafe-eval"));
  assert.ok(script.includes("strict-dynamic"));
  assert.ok(policy.includes("connect-src 'self';"));
  assert.ok(policy.includes("frame-ancestors 'none'"));
  assert.ok(policy.includes("base-uri 'none'"));
  assert.ok(policy.includes("upgrade-insecure-requests"));
  assert.throws(() => browserSecurityPolicy("bad'; script-src *", true, true));
});

void test("each response replaces caller-supplied CSP and nonce and cannot be cached", () => {
  const request = new NextRequest("https://coach.example/login", {
    headers: { "x-nonce": "attacker", "Content-Security-Policy": "script-src *" },
  });
  const first = proxy(request);
  const second = proxy(request);
  const policy = first.headers.get("Content-Security-Policy")!;
  assert.ok(!policy.includes("attacker") && !policy.includes("script-src *"));
  assert.notEqual(policy, second.headers.get("Content-Security-Policy"));
  assert.equal(first.headers.get("x-middleware-request-content-security-policy"), policy);
  assert.equal(first.headers.get("Cache-Control"), "private, no-store");
});

void test("development supports HMR but never permits arbitrary inline scripts", () => {
  const policy = browserSecurityPolicy("A".repeat(32), false, false);
  assert.ok(policy.includes("unsafe-eval"));
  assert.ok(policy.includes("connect-src 'self' ws: wss:"));
  assert.ok(!policy.includes("upgrade-insecure-requests"));
  assert.ok(
    !policy
      .split("; ")
      .find((directive) => directive.startsWith("script-src"))!
      .includes("unsafe-inline"),
  );
});
