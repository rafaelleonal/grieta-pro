import { loadEnvConfig } from "@next/env";
import { getDb } from "../lib/db";
import { reconcileOutstandingUsage } from "../lib/reconciliation";

async function main() {
  loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production", {
    info: () => undefined,
    error: () => undefined,
  });
  const args = process.argv.slice(2);
  const limitArg = args.find((arg) => /^--max-users=\d{1,3}$/.test(arg));
  if (args.some((arg) => arg !== limitArg)) throw new Error("Use only --max-users=1..100");
  // Validate configuration before connecting. Values never enter logs.
  const connection = process.env.DATABASE_URL?.trim();
  if (!connection || !["postgres:", "postgresql:"].includes(new URL(connection).protocol))
    throw new Error("Database configuration is required");
  const maxUsers = limitArg ? Number(limitArg.slice("--max-users=".length)) : 10;
  const result = await reconcileOutstandingUsage({ maxUsers });
  console.info(JSON.stringify({ event: "elociencia_usage_reconciliation", ...result }));
}

void main()
  .catch(() => {
    console.error(
      "No pudimos conciliar el consumo. Revisa la configuración de la base y OpenRouter; las reservas inciertas se conservan.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await getDb().$disconnect();
    } catch {
      /* Configuration can fail before a database client is constructed. */
    }
  });
