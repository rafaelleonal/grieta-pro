import { loadEnvConfig } from "@next/env";
import { getDb } from "../lib/db";
import { DEFAULT_MODEL } from "../lib/usage";

export async function seedPlans(options: { enableDefaultModel?: boolean } = {}) {
  const db = getDb();
  const economyModels = [DEFAULT_MODEL, "anthropic/claude-haiku-5.5", "openai/gpt-6-luna"];
  const plans = [
    {
      code: "FREE" as const,
      name: "Free",
      monthlyCoachLimit: 10,
      monthlyDraftLimit: 5,
      monthlySearchLimit: 0,
      monthlyBudgetUsd: "1.00",
      dailyBudgetUsd: "0.25",
      minuteRequestLimit: 2,
      allowedModels: economyModels,
      webSearchAllowed: false,
      concurrentLimit: 1,
    },
    {
      code: "PRO" as const,
      name: "Pro",
      monthlyCoachLimit: 50,
      monthlyDraftLimit: 20,
      monthlySearchLimit: 10,
      monthlyBudgetUsd: "5.00",
      dailyBudgetUsd: "1.00",
      minuteRequestLimit: 5,
      allowedModels: [...economyModels, "anthropic/claude-sonnet-5.5"],
      webSearchAllowed: true,
      concurrentLimit: 1,
    },
  ];
  // An operator's existing policy is preserved; later changes are explicit.
  for (const plan of plans)
    await db.plan.upsert({ where: { code: plan.code }, create: plan, update: {} });
  // Opt in to adding the new default without replacing an operator's other settings.
  if (options.enableDefaultModel)
    await db.plan.updateMany({
      where: {
        code: { in: ["FREE", "PRO"] },
        NOT: { allowedModels: { has: DEFAULT_MODEL } },
      },
      data: { allowedModels: { push: DEFAULT_MODEL }, version: { increment: 1 } },
    });
}

if (process.argv[1]?.endsWith("seed-plans.ts")) {
  loadEnvConfig(process.cwd());
  const enableDefaultModel = process.argv.includes("--enable-default-model");
  seedPlans({ enableDefaultModel })
    .then(() =>
      console.info(
        enableDefaultModel
          ? "Planes Free y Pro listos; modelo predeterminado permitido sin cambiar los demás límites."
          : "Planes Free y Pro listos; se conservaron las políticas existentes.",
      ),
    )
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
