import { z } from "zod";
import { requireVerifiedUser } from "@/lib/auth-session";
import { ApiError, assertSameOrigin, errorResponse, jsonResponse, readJsonBody } from "@/lib/http";
import {
  getReconciliationAttempt,
  limitReconciliationInput,
  reconcileUserUsage,
} from "@/lib/reconciliation";
import { getAccountUsage } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 30;

const inputSchema = z
  .object({
    idempotencyKey: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{16,80}$/)
      .optional(),
  })
  .strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireVerifiedUser(request);
    await limitReconciliationInput(session.user.id);
    const input = inputSchema.safeParse(await readJsonBody(request, 2000));
    if (!input.success)
      throw new ApiError(400, "No pudimos comprobar esta consulta para tu cuenta.");
    const result = await reconcileUserUsage(session.user.id);
    const [usage, attempt] = await Promise.all([
      getAccountUsage(session.user.id),
      input.data.idempotencyKey
        ? getReconciliationAttempt(session.user.id, input.data.idempotencyKey)
        : Promise.resolve(null),
    ]);
    return jsonResponse({ ...result, usage, attempt });
  } catch (error) {
    return errorResponse(error);
  }
}
