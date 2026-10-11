import { jsonResponse } from "@/lib/http";
import { getAppStatus } from "@/lib/openrouter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(): Response {
  return jsonResponse(getAppStatus());
}
