import { startQaMailpit, startQaPostgres } from "./qa-support";

async function main() {
  const database = await startQaPostgres();
  const mail = await startQaMailpit();
  let stopping = false;
  async function stop() {
    if (stopping) return;
    stopping = true;
    await mail.stop();
    await database.stop();
    process.exit(0);
  }
  process.once("SIGINT", () => void stop());
  process.once("SIGTERM", () => void stop());
  console.info(`QA_DATABASE_URL=${database.url}`);
  console.info(`QA_MAILPIT_URL=${mail.url}`);
  console.info("QA aislada lista. Ctrl+C elimina su base temporal y los correos en memoria.");
  await new Promise<void>(() => undefined);
}

void main().catch(() => {
  console.error("No se pudieron iniciar los servicios aislados de QA.");
  process.exit(1);
});
