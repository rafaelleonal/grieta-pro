import { requireUser } from "@/lib/auth-session";
import { assertSameOrigin, errorResponse, jsonResponse } from "@/lib/http";
import { deleteHistory, readHistory } from "@/lib/history";
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  try {
    const { user } = await requireUser(request);
    const { id } = await context.params;
    return jsonResponse(await readHistory(user.id, id));
  } catch (error) {
    return errorResponse(error);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    assertSameOrigin(request);
    const { user } = await requireUser(request);
    const { id } = await context.params;
    await deleteHistory(user.id, id);
    return jsonResponse({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
