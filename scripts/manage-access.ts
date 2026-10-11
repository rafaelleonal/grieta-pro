import { randomBytes } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { hashInvitationCode } from "../lib/auth";
import { getDb } from "../lib/db";
import { seedPlans } from "./seed-plans";

loadEnvConfig(process.cwd());

function argumentsMap(argv: string[]) {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || !value || value.startsWith("--") || values.has(key))
      throw new Error("Argumentos inválidos.");
    values.set(key.slice(2), value);
  }
  return values;
}

function emailValue(value: string | undefined) {
  const email = value?.trim().toLowerCase();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Escribe un correo válido con --email.");
  return email;
}

function optionalExpiration(value: string | undefined, fallback?: number) {
  if (!value && fallback === undefined) return null;
  const days = value ? Number(value) : fallback!;
  if (!Number.isInteger(days) || days < 1 || days > 365)
    throw new Error("--days debe ser un número entre 1 y 365.");
  return new Date(Date.now() + days * 86_400_000);
}

async function main() {
  const [command, ...argv] = process.argv.slice(2);
  const args = argumentsMap(argv);
  const allowed = new Set(["email", "plan", "days", "actor-email", "id"]);
  for (const key of args.keys())
    if (!allowed.has(key)) throw new Error(`Argumento desconocido: --${key}.`);
  if (
    !["bootstrap-admin", "invite", "grant-pro", "revoke-grant", "revoke-invite"].includes(
      command || "",
    )
  ) {
    throw new Error("Usa bootstrap-admin, invite, grant-pro, revoke-grant o revoke-invite.");
  }
  const db = getDb();
  await seedPlans();
  if (command === "bootstrap-admin") {
    const email = emailValue(args.get("email"));
    await db.$transaction(
      async (transaction) => {
        const administrators = await transaction.user.count({ where: { role: "ADMIN" } });
        if (administrators !== 0)
          throw new Error("Ya existe un administrador. El bootstrap solo se ejecuta una vez.");
        const user = await transaction.user.findUnique({ where: { email } });
        if (!user?.emailVerified)
          throw new Error(
            "Registra esta cuenta y confirma su correo antes de convertirla en administradora.",
          );
        await transaction.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
      },
      { isolationLevel: "Serializable" },
    );
    console.info("La cuenta verificada ahora administra la aplicación; su cuota de IA no cambia.");
    return;
  }
  let actor = null;
  const actorEmail = args.get("actor-email");
  if (actorEmail) actor = await db.user.findUnique({ where: { email: emailValue(actorEmail) } });
  const isAdmin = actor?.role === "ADMIN" && actor.emailVerified;
  if (command === "invite") {
    const email = emailValue(args.get("email"));
    const code = args.get("plan") || "FREE";
    if (code !== "FREE" && code !== "PRO") throw new Error("--plan debe ser FREE o PRO.");
    // The first invitation is the only operation available before an admin exists.
    if (
      !isAdmin &&
      (actorEmail || code !== "FREE" || (await db.user.count({ where: { role: "ADMIN" } })) !== 0)
    ) {
      throw new Error("Indica un administrador verificado con --actor-email.");
    }
    if (await db.user.findUnique({ where: { email } }))
      throw new Error("La cuenta ya existe. Concede Pro con grant-pro si corresponde.");
    const plan = await db.plan.findUniqueOrThrow({ where: { code } });
    const invitationCode = randomBytes(32).toString("base64url");
    const invitation = await db.invitation.create({
      data: {
        email,
        tokenHash: hashInvitationCode(invitationCode),
        planId: plan.id,
        expiresAt: optionalExpiration(args.get("days"), 7)!,
        createdById: isAdmin ? actor!.id : null,
      },
    });
    console.info(
      `Invitación ${invitation.id} creada. Comparte este código solo con la persona invitada: ${invitationCode}`,
    );
    return;
  }
  if (!isAdmin) throw new Error("Indica un administrador verificado con --actor-email.");
  if (command === "grant-pro") {
    const email = emailValue(args.get("email"));
    const user = await db.user.findUnique({ where: { email } });
    if (!user) throw new Error("La cuenta todavía no existe.");
    const plan = await db.plan.findUniqueOrThrow({ where: { code: "PRO" } });
    const grant = await db.accessGrant.create({
      data: {
        userId: user.id,
        planId: plan.id,
        source: "COMPLIMENTARY",
        grantedById: actor!.id,
        expiresAt: optionalExpiration(args.get("days")),
      },
    });
    console.info(
      `Acceso Pro de cortesía concedido: ${grant.id}. No se cambiaron permisos de administrador.`,
    );
    return;
  }
  const id = args.get("id");
  if (!id || id.length > 128) throw new Error("Indica un identificador válido con --id.");
  const result =
    command === "revoke-grant"
      ? await db.accessGrant.updateMany({
          where: { id, revokedAt: null },
          data: { revokedAt: new Date() },
        })
      : await db.invitation.updateMany({
          where: { id, revokedAt: null, usedAt: null },
          data: { revokedAt: new Date() },
        });
  if (result.count === 0)
    throw new Error("No encontramos un acceso vigente con ese identificador.");
  console.info(command === "revoke-grant" ? "Acceso revocado." : "Invitación revocada.");
}

main()
  .catch((error: unknown) => {
    const message =
      error instanceof Error &&
      !error.message.includes("prisma") &&
      !error.message.includes("postgres")
        ? error.message
        : "No pudimos completar la operación. Revisa la conexión y las migraciones.";
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await getDb().$disconnect();
    } catch {
      /* Startup can fail before a database client exists. */
    }
  });
