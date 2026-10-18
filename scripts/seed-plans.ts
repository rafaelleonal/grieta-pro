import { loadEnvConfig } from "@next/env";
import { getDb } from "../lib/db";
import { DEFAULT_MODEL, GEMINI_FLASH_MODEL, GEMINI_PRO_MODEL, OPUS_MODEL } from "../lib/usage";

export async function seedPlans(
  options: {
    enableDefaultModel?: boolean;
    enableFlash?: boolean;
    enableGeminiDailyBudgets?: boolean;
    enableOpus?: boolean;
  } = {},
) {
  const db = getDb();
  const includedModels = [
    ...new Set([
      GEMINI_FLASH_MODEL,
      GEMINI_PRO_MODEL,
      "openai/gpt-5.6-luna",
      "anthropic/claude-haiku-5.5",
      "openai/gpt-6-luna",
    ]),
  ];
  const plans = [
    {
      code: "FREE" as const,
      name: "Free",
      monthlyCoachLimit: 10,
      monthlyDraftLimit: 5,
      monthlySearchLimit: 0,
      monthlyBudgetUsd: "1.00",
      dailyBudgetUsd: "1.00",
      minuteRequestLimit: 2,
      allowedModels: includedModels,
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
      dailyBudgetUsd: "2.00",
      minuteRequestLimit: 5,
      allowedModels: [
        ...includedModels,
        "anthropic/claude-sonnet-5.5",
        "anthropic/claude-opus-5.5",
      ],
      webSearchAllowed: true,
      concurrentLimit: 1,
    },
  ];
  // An operator's existing policy is preserved; later changes are explicit.
  for (const plan of plans)
    await db.plan.upsert({ where: { code: plan.code }, create: plan, update: {} });
  // Opus remains Pro-only even when it is the app default. This flag cannot
  // expand Free permissions as a side effect of changing the default model.
  if (options.enableDefaultModel)
    await db.plan.updateMany({
      where: {
        code: DEFAULT_MODEL === OPUS_MODEL ? "PRO" : { in: ["FREE", "PRO"] },
        NOT: { allowedModels: { has: DEFAULT_MODEL } },
      },
      data: { allowedModels: { push: DEFAULT_MODEL }, version: { increment: 1 } },
    });
  // Fast coach is an explicit option while tactical quality is still under review.
  if (options.enableFlash)
    await db.plan.updateMany({
      where: { code: { in: ["FREE", "PRO"] }, NOT: { allowedModels: { has: GEMINI_FLASH_MODEL } } },
      data: { allowedModels: { push: GEMINI_FLASH_MODEL }, version: { increment: 1 } },
    });
  // Opt in to Opus for existing Pro plans; quotas and budgets stay as administered.
  if (options.enableOpus)
    await db.plan.updateMany({
      where: { code: "PRO", NOT: { allowedModels: { has: OPUS_MODEL } } },
      data: { allowedModels: { push: OPUS_MODEL }, version: { increment: 1 } },
    });
  // Apply only the explicitly enabled daily increases. Never lower a custom
  // allowance or reset monthly quotas, budgets, usage or pending reservations.
  if (options.enableGeminiDailyBudgets)
    for (const plan of plans)
      await db.plan.updateMany({
        where: { code: plan.code, dailyBudgetUsd: { lt: plan.dailyBudgetUsd } },
        data: { dailyBudgetUsd: plan.dailyBudgetUsd, version: { increment: 1 } },
      });
}

if (process.argv[1]?.endsWith("seed-plans.ts")) {
  loadEnvConfig(process.cwd());
  const enableDefaultModel = process.argv.includes("--enable-default-model");
  const enableGeminiDailyBudgets = process.argv.includes("--enable-gemini-daily-budgets");
  const enableFlash = process.argv.includes("--enable-flash");
  const enableOpus = process.argv.includes("--enable-opus");
  seedPlans({ enableDefaultModel, enableGeminiDailyBudgets, enableOpus, enableFlash })
    .then(() =>
      console.info(
        enableGeminiDailyBudgets
          ? `Planes Free y Pro listos; presupuestos diarios de al menos USD 1 y USD 2${enableDefaultModel ? " y modelo predeterminado permitido en Pro" : ""}. Se conservaron los demás límites.`
          : enableDefaultModel
            ? "Planes Free y Pro listos; modelo predeterminado permitido en Pro sin cambiar los demás límites."
            : "Planes Free y Pro listos; se conservaron las políticas existentes.",
        enableOpus ? "Opus 5.5 permitido en Pro sin cambiar sus límites." : "",
        enableFlash ? "Gemini Flash permitido sin cambiar límites ni modelo predeterminado." : "",
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
