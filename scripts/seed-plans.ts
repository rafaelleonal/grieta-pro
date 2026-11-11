import { loadEnvConfig } from "@next/env";
import { getDb } from "../lib/db";

/**
 * Las filas Free/Pro sólo se conservan porque las invitaciones de registro apuntan a
 * un plan. Desde la ADR 0009 no deciden modelos, cupos ni presupuestos de las builds.
 */
export async function seedPlans() {
  const db = getDb();
  const shared = {
    monthlyCoachLimit: 0,
    monthlyDraftLimit: 0,
    monthlySearchLimit: 0,
    monthlyBudgetUsd: "0",
    dailyBudgetUsd: "0",
    minuteRequestLimit: 0,
    allowedModels: [],
    webSearchAllowed: false,
    concurrentLimit: 1,
  };
  // Existing rows are preserved exactly as administered.
  for (const plan of [
    { code: "FREE" as const, name: "Free", ...shared },
    { code: "PRO" as const, name: "Pro", ...shared },
  ])
    await db.plan.upsert({ where: { code: plan.code }, create: plan, update: {} });
}

if (process.argv[1]?.endsWith("seed-plans.ts")) {
  loadEnvConfig(process.cwd());
  seedPlans()
    .then(() => console.info("Planes de invitación listos; se conservaron las filas existentes."))
    .catch(() => {
      console.error(
        "No pudimos preparar los planes. Revisa la conexión y las migraciones de la base de datos.",
      );
      process.exitCode = 1;
    })
    .finally(async () => {
      try {
        await getDb().$disconnect();
      } catch {
        /* Startup can fail before a database client exists. */
      }
    });
}
