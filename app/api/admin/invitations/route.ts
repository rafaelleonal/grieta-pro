import { randomBytes } from "node:crypto";
import { z } from "zod";
import { hashInvitationCode } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth-session";
import { getDb } from "@/lib/db";
import { ApiError, assertSameOrigin, errorResponse, jsonResponse, readJsonBody } from "@/lib/http";
const schema = z
  .object({
    email: z
      .email()
      .max(254)
      .transform((value) => value.trim().toLowerCase()),
    plan: z.enum(["FREE", "PRO"]),
    expiresInDays: z.number().int().min(1).max(30).optional(),
  })
  .strict();
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { user } = await requireAdmin(request);
    const body = schema.safeParse(await readJsonBody(request, 2048));
    if (!body.success)
      throw new ApiError(
        400,
        "Escribe un correo y un plan válidos. La invitación puede durar entre 1 y 30 días.",
      );
    const db = getDb();
    const plan = await db.plan.findUniqueOrThrow({
      where: { code: body.data.plan },
    });
    const code = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + (body.data.expiresInDays || 7) * 86_400_000);
    await db.invitation.create({
      data: {
        email: body.data.email,
        planId: plan.id,
        tokenHash: hashInvitationCode(code),
        expiresAt,
        createdById: user.id,
      },
    });
    return jsonResponse({ code, expiresAt: expiresAt.toISOString() }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
