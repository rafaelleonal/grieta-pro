import test from "node:test";
import assert from "node:assert/strict";
import { createSessionGuards, type AccountSession } from "../lib/auth-session";
import { ApiError } from "../lib/errors";

const request = new Request("http://localhost:3000/api/coach", {
  headers: { Cookie: "arbitrary-cookie=forged" },
});
const account: AccountSession = {
  user: {
    id: "owner",
    email: "owner@example.test",
    name: "Owner",
    role: "USER",
    emailVerified: true,
  },
  session: { id: "active-session" },
};

test("cookies alone do not authorize access without an actual server session", async () => {
  let resolved = false;
  const guards = createSessionGuards(async (incoming) => {
    resolved = incoming === request;
    return null;
  });
  await assert.rejects(
    guards.requireUser(request),
    (error) => error instanceof ApiError && error.status === 401,
  );
  assert.equal(resolved, true);
});

test("verified users can access the coach but cannot access admin actions", async () => {
  const guards = createSessionGuards(async () => account);
  assert.equal((await guards.requireVerifiedUser(request)).user.id, "owner");
  await assert.rejects(
    guards.requireAdmin(request),
    (error) => error instanceof ApiError && error.status === 403,
  );
});

test("even admins must verify email before administering paid connections", async () => {
  const guards = createSessionGuards(async () => ({
    ...account,
    user: { ...account.user, role: "ADMIN", emailVerified: false },
  }));
  assert.equal((await guards.requireUser(request)).user.role, "ADMIN");
  await assert.rejects(
    guards.requireVerifiedUser(request),
    (error) => error instanceof ApiError && error.status === 403,
  );
  await assert.rejects(
    guards.requireAdmin(request),
    (error) => error instanceof ApiError && error.status === 403,
  );
});

test("admin access is taken from the resolved account", async () => {
  const guards = createSessionGuards(async () => ({
    ...account,
    user: { ...account.user, role: "ADMIN" },
  }));
  assert.equal((await guards.requireAdmin(request)).user.id, "owner");
});
