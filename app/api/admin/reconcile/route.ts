import { requireAdmin } from "@/lib/auth-session";
import { assertSameOrigin, errorResponse, jsonResponse } from "@/lib/http";
import { reconcileOutstandingUsage } from "@/lib/reconciliation";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireAdmin(request);
    return jsonResponse(await reconcileOutstandingUsage({ maxUsers: 4 }));
  } catch (error) {
    return errorResponse(error);
  }
}
