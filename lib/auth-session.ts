import { getAuth } from "./auth";
import { ApiError } from "./errors";

export type AccountSession = {
  user: { id: string; email: string; name: string; role: "USER" | "ADMIN"; emailVerified: boolean };
  session: { id: string };
};

type SessionResolver = (request: Request) => Promise<AccountSession | null>;

async function resolveSession(request: Request): Promise<AccountSession | null> {
  const value = await getAuth().api.getSession({
    headers: request.headers,
    query: { disableCookieCache: true },
  });
  if (!value) return null;
  return {
    user: {
      id: value.user.id,
      email: value.user.email,
      name: value.user.name,
      role: value.user.role === "ADMIN" ? "ADMIN" : "USER",
      emailVerified: value.user.emailVerified,
    },
    session: { id: value.session.id },
  };
}

/** Dependency injection is used only by tests; application callers use the DB resolver. */
export function createSessionGuards(resolver: SessionResolver) {
  async function requireUser(request: Request): Promise<AccountSession> {
    const session = await resolver(request);
    if (!session) throw new ApiError(401, "Inicia sesión para continuar.");
    return session;
  }
  async function requireVerifiedUser(request: Request): Promise<AccountSession> {
    const session = await requireUser(request);
    if (!session.user.emailVerified)
      throw new ApiError(403, "Confirma tu correo antes de usar el coach.");
    return session;
  }
  async function requireAdmin(request: Request): Promise<AccountSession> {
    const session = await requireVerifiedUser(request);
    if (session.user.role !== "ADMIN")
      throw new ApiError(403, "Esta acción requiere permisos de administrador.");
    return session;
  }
  return { requireUser, requireVerifiedUser, requireAdmin };
}

export const { requireUser, requireVerifiedUser, requireAdmin } =
  createSessionGuards(resolveSession);
