import { getAuthStatus } from "@/lib/auth";
import { requireUser } from "@/lib/auth-session";
import { getBuildUsage } from "@/lib/build-quota";
import { ApiError, errorResponse, jsonResponse } from "@/lib/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const status = getAuthStatus();
  if (!status.configured) return jsonResponse({ ...status, authenticated: false });
  try {
    const session = await requireUser(request);
    return jsonResponse({
      ...status,
      authenticated: true,
      user: session.user,
      usage: await getBuildUsage(session.user.id),
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401)
      return jsonResponse({ ...status, authenticated: false });
    return errorResponse(error);
  }
}
