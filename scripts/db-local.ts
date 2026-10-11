import EmbeddedPostgres from "embedded-postgres";
import { access, mkdir } from "node:fs/promises";
import { join } from "node:path";

// This development database is bound exclusively to the local computer.
// Production must use its own PostgreSQL connection and credentials.
async function main() {
  const port = Number(process.env.LOCAL_POSTGRES_PORT || "55439");
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    throw new Error("LOCAL_POSTGRES_PORT debe ser un puerto entre 1024 y 65535.");
  }
  const databaseDir = join(process.cwd(), ".local", "postgres");
  await mkdir(databaseDir, { recursive: true });
  const postgres = new EmbeddedPostgres({
    databaseDir,
    user: "cholo_local",
    password: "cholo_local_dev",
    port,
    persistent: true,
    createPostgresUser: false,
    authMethod: "scram-sha-256",
    postgresFlags: ["-c", "listen_addresses=127.0.0.1"],
    onLog: () => undefined,
    onError: () => undefined,
  });

  let started = false;
  let stopping = false;
  async function stop() {
    if (stopping) return;
    stopping = true;
    if (started) await postgres.stop();
    process.exit(0);
  }
  process.once("SIGINT", () => void stop());
  process.once("SIGTERM", () => void stop());

  try {
    const initialized = await access(join(databaseDir, "PG_VERSION")).then(
      () => true,
      () => false,
    );
    if (!initialized) await postgres.initialise();
    await postgres.start();
    started = true;
    const client = postgres.getPgClient("postgres", "127.0.0.1");
    await client.connect();
    try {
      const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [
        "cholo_coach",
      ]);
      if (!exists.rowCount) await client.query('CREATE DATABASE "cholo_coach"');
    } finally {
      await client.end();
    }
    console.info("PostgreSQL local listo. Los datos se conservan en .local/postgres.");
    console.info(
      `DATABASE_URL=postgresql://cholo_local:cholo_local_dev@127.0.0.1:${port}/cholo_coach?schema=public`,
    );
    console.info("Copia esta URL a .env.local. Este comando no modifica tus variables existentes.");
    console.info("Deja esta terminal abierta; Ctrl+C detiene la base conservando los datos.");
    await new Promise<void>(() => undefined);
  } catch {
    if (started) await postgres.stop().catch(() => undefined);
    console.error(
      "No pudimos iniciar PostgreSQL local. Revisa que el puerto esté libre y que pnpm permita el script de instalación de embedded-postgres.",
    );
    process.exit(1);
  }
}

void main().catch(() => {
  console.error(
    "No se pudo iniciar la base local. Revisa LOCAL_POSTGRES_PORT y los permisos del directorio.",
  );
  process.exit(1);
});
