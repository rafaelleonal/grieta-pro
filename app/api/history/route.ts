import { requireUser } from "@/lib/auth-session";
import { errorResponse, jsonResponse } from "@/lib/http";
import { listHistory } from "@/lib/history";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const { user } = await requireUser(request);
    return jsonResponse(
      await listHistory(user.id, new URL(request.url).searchParams.get("cursor") || undefined),
    );
  } catch (error) {
    return errorResponse(error);
  }
}
