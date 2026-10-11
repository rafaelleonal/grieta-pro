import { createHash } from "node:crypto";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { authConfigurationStatus, readAuthConfig, type AuthConfig } from "./auth-config";
import { sendAuthEmail } from "./auth-mail";
import { getDb } from "./db";
import { ApiError } from "./errors";

export const getAuthStatus = authConfigurationStatus;

export function hashInvitationCode(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function registrationUsesInvitation(mode: AuthConfig["registrationMode"], code: unknown): boolean {
  if (mode === "INVITE") return true;
  // Open registration treats an omitted or empty optional code as no invitation.
  // Other supplied values must still pass validation instead of silently becoming Free.
  return code !== undefined && code !== null && (typeof code !== "string" || Boolean(code.trim()));
}

async function matchingInvitation(email: unknown, code: unknown) {
  const normalizedCode = typeof code === "string" ? code.trim() : "";
  if (
    typeof email !== "string" ||
    typeof code !== "string" ||
    !/^[A-Za-z0-9_-]{32,128}$/.test(normalizedCode)
  ) {
    throw new APIError("FORBIDDEN", {
      code: "INVALID_INVITATION",
      message: "Necesitas una invitación válida para este correo.",
    });
  }
  const invitation = await getDb().invitation.findFirst({
    where: {
      tokenHash: hashInvitationCode(normalizedCode),
      email: email.trim().toLowerCase(),
      usedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (!invitation)
    throw new APIError("FORBIDDEN", {
      code: "INVALID_INVITATION",
      message: "Necesitas una invitación válida para este correo.",
    });
  return invitation;
}

function createConfiguredAuth(config: AuthConfig) {
  const db = getDb();
  return betterAuth({
    appName: "GrietaPro",
    baseURL: config.baseUrl,
    secret: config.secret,
    trustedOrigins: config.trustedOrigins,
    database: prismaAdapter(db, { provider: "postgresql", transaction: true }),
    logger: { disabled: true },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      requireEmailVerification: true,
      autoSignIn: false,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => sendAuthEmail(config, user.email, url, "reset"),
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: false,
      autoSignInAfterVerification: false,
      expiresIn: 3_600,
      sendVerificationEmail: async ({ user, url }) =>
        sendAuthEmail(config, user.email, url, "verify"),
    },
    user: {
      additionalFields: {
        role: { type: ["USER", "ADMIN"], required: false, defaultValue: "USER", input: false },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/sign-up/email": { window: 3_600, max: 5 },
        "/sign-in/email": { window: 60, max: 8 },
        "/request-password-reset": { window: 3_600, max: 5 },
        "/send-verification-email": { window: 3_600, max: 5 },
      },
    },
    advanced: {
      useSecureCookies: new URL(config.baseUrl).protocol === "https:",
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
      ipAddress: {
        ipAddressHeaders: process.env.VERCEL
          ? ["x-real-ip"]
          : process.env.NETLIFY
            ? ["x-nf-client-connection-ip"]
            : [],
      },
    },
    hooks: {
      before: createAuthMiddleware(async (context) => {
        if (context.path === "/sign-up/email") {
          if (
            typeof context.body?.name !== "string" ||
            context.body.name.trim().length < 2 ||
            context.body.name.length > 80
          ) {
            throw new APIError("BAD_REQUEST", {
              code: "INVALID_NAME",
              message: "Escribe un nombre entre 2 y 80 caracteres.",
            });
          }
          if (
            context.body?.role !== undefined ||
            context.body?.plan !== undefined ||
            context.body?.emailVerified !== undefined
          ) {
            throw new APIError("BAD_REQUEST", {
              message: "Los permisos de la cuenta los administra el servidor.",
            });
          }
          if (registrationUsesInvitation(config.registrationMode, context.body?.invitationCode))
            await matchingInvitation(context.body?.email, context.body?.invitationCode);
        }
      }),
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user, context) => {
            if (registrationUsesInvitation(config.registrationMode, context?.body?.invitationCode))
              await matchingInvitation(user.email, context?.body?.invitationCode);
            return { data: { ...user, role: "USER", emailVerified: false } };
          },
          after: async (user, context) => {
            if (!registrationUsesInvitation(config.registrationMode, context?.body?.invitationCode))
              return;
            const invitation = await matchingInvitation(user.email, context?.body?.invitationCode);
            await db.$transaction(async (transaction) => {
              const claimed = await transaction.invitation.updateMany({
                where: {
                  id: invitation.id,
                  usedAt: null,
                  revokedAt: null,
                  expiresAt: { gt: new Date() },
                },
                data: { usedAt: new Date(), usedById: user.id },
              });
              if (claimed.count !== 1)
                throw new APIError("FORBIDDEN", {
                  code: "INVALID_INVITATION",
                  message: "La invitación ya no está disponible.",
                });
              const plan = await transaction.plan.findUniqueOrThrow({
                where: { id: invitation.planId },
              });
              if (plan.code === "PRO") {
                await transaction.accessGrant.create({
                  data: {
                    userId: user.id,
                    planId: plan.id,
                    source: "COMPLIMENTARY",
                    grantedById: invitation.createdById,
                  },
                });
              }
            });
          },
        },
      },
    },
    plugins: [nextCookies()],
  });
}

type AuthInstance = ReturnType<typeof createConfiguredAuth>;
let authInstance: AuthInstance | undefined;
let authSignature: string | undefined;

/** Missing deployment configuration cannot silently enable anonymous access. */
export function getAuth(): AuthInstance {
  const config = readAuthConfig();
  if (!config)
    throw new ApiError(503, "Las cuentas todavía no están configuradas. Inténtalo más tarde.");
  const signature = createHash("sha256").update(JSON.stringify(config)).digest("hex");
  if (!authInstance || signature !== authSignature) {
    authInstance = createConfiguredAuth(config);
    authSignature = signature;
  }
  return authInstance;
}
