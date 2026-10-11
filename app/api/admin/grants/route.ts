import { z } from "zod";
import { requireAdmin } from "@/lib/auth-session";
import { getDb } from "@/lib/db";
import { ApiError, assertSameOrigin, errorResponse, jsonResponse, readJsonBody } from "@/lib/http";
const schema = z
  .object({
    email: z
      .email()
      .max(254)
      .transform((value) => value.trim().toLowerCase()),
    plan: z.enum(["PRO", "FREE"]),
    expiresAt: z.iso.datetime().optional(),
  })
  .strict();
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const session = await requireAdmin(request);
    const body = schema.safeParse(await readJsonBody(request, 2048));
    if (!body.success)
      throw new ApiError(
        400,
        "Escribe el correo, un plan válido y una fecha de vencimiento válida si la necesitas.",
      );
    const expiresAt = body.data.expiresAt ? new Date(body.data.expiresAt) : null;
    if (expiresAt && expiresAt <= new Date())
      throw new ApiError(400, "El vencimiento debe ser una fecha futura.");
    const db = getDb();
    const user = await db.user.findUnique({
      where: { email: body.data.email },
    });
    if (!user) throw new ApiError(404, "Esa persona todavía no tiene una cuenta.");
    const plan = await db.plan.findUniqueOrThrow({
      where: { code: body.data.plan },
    });
    await db.$transaction(async (tx) => {
      await tx.accessGrant.updateMany({
        where: { userId: user.id, source: "COMPLIMENTARY", revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (body.data.plan === "PRO")
        await tx.accessGrant.create({
          data: {
            userId: user.id,
            planId: plan.id,
            source: "COMPLIMENTARY",
            grantedById: session.user.id,
            expiresAt,
          },
        });
    });
    return jsonResponse({ updated: true });
  } catch (error) {
    return errorResponse(error);
  }
}
