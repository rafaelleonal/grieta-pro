/** Coarse authenticated diagnostics; never expose bucket IDs, balances or reservations. */
export type BudgetBlock =
  "user_daily" | "user_monthly" | "shared_monthly" | "app_daily" | "app_monthly" | "paused";
