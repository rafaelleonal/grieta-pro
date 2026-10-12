import { loadEnvConfig } from "@next/env";
import { defineConfig } from "prisma/config";

loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx scripts/seed-plans.ts" },
  // Generation is possible without database credentials; migration still fails closed.
  // Administrative commands bypass the runtime pool when the provider offers a direct URL.
  datasource: { url: process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL || "" },
});
