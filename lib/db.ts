import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { ApiError } from "./errors";

const globalDatabase = globalThis as unknown as {
  choloPrisma?: PrismaClient;
  choloPrismaUrl?: string;
};

/** No client or connection pool is constructed during import/build without config. */
export function getDb(): PrismaClient {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString)
    throw new ApiError(503, "Las cuentas todavía no están configuradas. Inténtalo más tarde.");
  try {
    if (!["postgresql:", "postgres:"].includes(new URL(connectionString).protocol))
      throw new Error("invalid");
  } catch {
    throw new ApiError(503, "Las cuentas todavía no están configuradas. Inténtalo más tarde.");
  }
  if (!globalDatabase.choloPrisma || globalDatabase.choloPrismaUrl !== connectionString) {
    const adapter = new PrismaPg({
      connectionString,
      max: 5,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 20_000,
    });
    globalDatabase.choloPrisma = new PrismaClient({ adapter });
    globalDatabase.choloPrismaUrl = connectionString;
  }
  return globalDatabase.choloPrisma;
}
