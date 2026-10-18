import type { Plan } from "../generated/prisma/client";
import { ApiError } from "./http";

export type AccessMode = "beta" | "plans";

export function getAccessMode(): AccessMode {
  const mode = process.env.APP_ACCESS_MODE?.trim() || "beta";
  if (mode === "beta" || mode === "plans") return mode;
  throw new ApiError(503, "Revisa la configuración de acceso del servidor.");
}

/** Shared beta access is a projection; it never updates administered plan rows. */
export function betaAccessPolicy(freePlan: Plan, supportedModels: readonly string[]): Plan {
  if (freePlan.code !== "FREE") throw new Error("Beta access requires the shared Free baseline");
  return {
    ...freePlan,
    name: "Beta",
    allowedModels: [...supportedModels],
    monthlySearchLimit: 0,
    webSearchAllowed: false,
  };
}
