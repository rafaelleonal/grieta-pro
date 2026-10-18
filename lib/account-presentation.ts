import type { AccountStatus } from "./auth-client";

/** Missing mode is beta while clients transition to the unified testing access. */
export function usesPlanAccess(account: AccountStatus | null): boolean {
  return account?.usage?.accessMode === "plans";
}

export function accountAccessLabel(account: AccountStatus | null): string {
  if (!usesPlanAccess(account)) return "Beta";
  return account?.user?.plan === "PRO" ? "Pro" : "Free";
}

/** Restored drafts cannot carry a web request into beta generation. */
export function webSearchEnabled(account: AccountStatus | null, requested: boolean): boolean {
  return Boolean(
    requested &&
    usesPlanAccess(account) &&
    account?.usage?.webAllowed &&
    account.usage.webRemaining > 0,
  );
}
