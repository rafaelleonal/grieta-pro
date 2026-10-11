import { getAuthStatus } from "@/lib/auth";
import { requireUser } from "@/lib/auth-session";
import { ApiError, errorResponse, jsonResponse } from "@/lib/http";
import { getAccountUsage } from "@/lib/usage";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const status = getAuthStatus();
  if (!status.configured) return jsonResponse({ ...status, authenticated: false });
  try {
    const session = await requireUser(request);
    const usage = await getAccountUsage(session.user.id);
    return jsonResponse({
      ...status,
      authenticated: true,
      user: { ...session.user, plan: usage.plan },
      usage,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401)
      return jsonResponse({ ...status, authenticated: false });
    return errorResponse(error);
  }
}
