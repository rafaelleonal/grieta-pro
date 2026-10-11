import EmbeddedPostgres from "embedded-postgres";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer, type Server, type IncomingMessage, type ServerResponse } from "node:http";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

async function availablePort() {
  const probe = createServer();
  const port = await new Promise<number>((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      if (!address || typeof address === "string") {
        reject(new Error("Missing QA port"));
        return;
      }
      resolve(address.port);
    });
  });
  await new Promise<void>((resolve, reject) =>
    probe.close((error) => (error ? reject(error) : resolve())),
  );
  return port;
}

/** Real isolated PostgreSQL, never an existing DATABASE_URL or hosted database. */
export async function startQaPostgres(port = 55440) {
  const selectedPort = port || (await availablePort());
  const databaseDir = await mkdtemp(join(tmpdir(), "cholo-coach-qa-pg-"));
  const postgres = new EmbeddedPostgres({
    databaseDir,
    user: "cholo_qa",
    password: "cholo_qa_only",
    port: selectedPort,
    persistent: false,
    createPostgresUser: false,
    authMethod: "scram-sha-256",
    postgresFlags: ["-c", "listen_addresses=127.0.0.1"],
    onLog: () => undefined,
    onError: () => undefined,
  });
  try {
    await postgres.initialise();
    await postgres.start();
    const client = postgres.getPgClient("postgres", "127.0.0.1");
    await client.connect();
    try {
      await client.query('CREATE DATABASE "cholo_qa"');
    } finally {
      await client.end();
    }
    return {
      url: `postgresql://cholo_qa:cholo_qa_only@127.0.0.1:${selectedPort}/cholo_qa?schema=public`,
      postgres,
      async stop() {
        await postgres.stop();
        await rm(databaseDir, { recursive: true, force: true });
      },
    };
  } catch (error) {
    // Embedded Postgres can wait for a second exit event when startup failed.
    // Bound cleanup so a port collision cannot silently end an unfinished test.
    await Promise.race([
      postgres.stop().catch(() => undefined),
      new Promise<void>((resolve) => setTimeout(resolve, 1_000)),
    ]);
    await rm(databaseDir, { recursive: true, force: true });
    throw error instanceof Error ? error : new Error("No se pudo iniciar PostgreSQL de QA.");
  }
}

export interface QaMail {
  id: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
  urls: string[];
}

/** Local-only Mailpit HTTP sink. Test tokens stay in memory and are never logged. */
export async function startQaMailpit(port = 55441) {
  const messages: QaMail[] = [];
  async function receiveMail(request: IncomingMessage, response: ServerResponse) {
    if (request.method === "GET" && request.url === "/qa/messages") {
      response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      response.end(JSON.stringify(messages));
      return;
    }
    if (request.method !== "POST" || request.url !== "/api/v1/send") {
      response.writeHead(404).end();
      return;
    }
    const chunks: Buffer[] = [];
    let bytes = 0;
    try {
      for await (const chunk of request) {
        bytes += Buffer.byteLength(chunk);
        if (bytes > 65_536) {
          response.writeHead(413).end();
          return;
        }
        chunks.push(Buffer.from(chunk));
      }
      const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      if (!body || typeof body !== "object" || Array.isArray(body))
        throw new Error("Mail JSON required");
      const mail = body as Record<string, unknown>;
      const to = Array.isArray(mail.To)
        ? mail.To.map((entry) => {
            if (typeof entry === "string") return entry;
            if (
              entry &&
              typeof entry === "object" &&
              "Email" in entry &&
              typeof entry.Email === "string"
            )
              return entry.Email;
            throw new Error("Mail recipient required");
          })
        : [];
      if (!to.length) throw new Error("Mail recipient required");
      const html = typeof mail.HTML === "string" ? mail.HTML : "";
      const text = typeof mail.Text === "string" ? mail.Text : "";
      const urls = [
        ...new Set(
          (`${html} ${text}`.match(/https?:\/\/[^\s<>"']+/g) || []).map((url) =>
            url.replaceAll("&amp;", "&"),
          ),
        ),
      ];
      const id = randomUUID();
      messages.push({
        id,
        to,
        subject: typeof mail.Subject === "string" ? mail.Subject : "",
        text,
        html,
        urls,
      });
      if (messages.length > 50) messages.shift();
      response.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      response.end(JSON.stringify({ ID: id }));
    } catch {
      response.writeHead(400).end();
    }
  }
  const server: Server = createServer((request, response) => {
    void receiveMail(request, response).catch(() => {
      if (!response.headersSent) response.writeHead(500).end();
      else response.destroy();
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing local mailbox address");
  return {
    url: `http://127.0.0.1:${address.port}`,
    messages,
    async stop() {
      messages.length = 0;
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}
