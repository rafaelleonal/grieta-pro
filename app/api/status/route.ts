import { getAuthStatus } from "@/lib/auth";
import { jsonResponse } from "@/lib/http";
import type { AppStatus } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Response {
  const status: AppStatus = {
    configured: getAuthStatus().configured && Boolean(process.env.OPENROUTER_API_KEY?.trim()),
  };
  return jsonResponse(status);
}
