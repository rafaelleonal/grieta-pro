import { loadEnvConfig } from "@next/env";
import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { z } from "zod";

const mailSchema = z
  .object({
    From: z.object({ Name: z.string().max(200), Email: z.email().max(320) }).strict(),
    To: z
      .array(z.object({ Email: z.email().max(320) }).strict())
      .min(1)
      .max(10),
    Subject: z.string().max(300),
    HTML: z.string().max(32_768),
    Text: z.string().max(32_768),
  })
  .strict();

type LocalMail = {
  id: string;
  to: string[];
  subject: string;
  text: string;
  urls: string[];
};

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  );
}

function localAppOrigin(value: string): string {
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("El buzón requiere un origen local de GrietaPro.");
  return url.origin;
}

function mailLinks(value: string, appOrigin: string): string[] {
  const candidates = value.match(/https?:\/\/[^\s<>"']+/g) || [];
  return [
    ...new Set(
      candidates.flatMap((candidate) => {
        try {
          const url = new URL(candidate.replaceAll("&amp;", "&"));
          if (url.origin !== appOrigin || url.username || url.password) return [];
          return [url.href];
        } catch {
          return [];
        }
      }),
    ),
  ];
}

function mailboxHtml(messages: LocalMail[]): string {
  const cards = [...messages]
    .reverse()
    .map(
      (mail) => `<article>
        <h2>${escapeHtml(mail.subject)}</h2>
        <p class="muted">Para: ${escapeHtml(mail.to.join(", "))}</p>
        <pre>${escapeHtml(mail.text.replace(/https?:\/\/[^\s<>"']+/g, "[enlace debajo]"))}</pre>
        ${mail.urls
          .map(
            (url) =>
              `<a class="action" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Abrir enlace de GrietaPro</a>`,
          )
          .join("")}
      </article>`,
    )
    .join("");
  return `<!doctype html><html lang="es"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <meta http-equiv="refresh" content="5"><title>Buzón local · GrietaPro</title>
    <style>
      :root{color-scheme:dark;font-family:system-ui,sans-serif;background:#10151b;color:#edf2f6}
      *{box-sizing:border-box}body{max-width:760px;margin:0 auto;padding:28px 20px}
      h1{font-size:1.6rem;margin-bottom:10px}h2{font-size:1.1rem;overflow-wrap:anywhere}
      p{line-height:1.55}.muted{color:#aebbc8;font-size:.9rem;overflow-wrap:anywhere}
      article{border:1px solid #314353;border-radius:14px;padding:20px;margin:20px 0;background:#19232d}
      pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;line-height:1.55}
      a{color:#78dcdb}a:focus-visible{outline:3px solid #fff;outline-offset:4px}
      .action{display:inline-block;padding:12px 16px;border-radius:10px;background:#70d4cc;color:#10151b;font-weight:700;text-decoration:none;margin:8px 8px 0 0}
    </style></head><body>
    <h1>Buzón local de GrietaPro</h1>
    <p>Los correos de prueba llegan aquí. No se envían a una cuenta real.</p>
    <p class="muted">Se actualiza cada 5 segundos. Guarda hasta 50 mensajes en memoria; al detenerlo se eliminan.</p>
    <a href="/">Actualizar ahora</a>
    ${cards || "<article><p>Aún no hay correos. Crea tu cuenta en GrietaPro para recibir el enlace de verificación.</p></article>"}
    </body></html>`;
}

async function main() {
  if (process.env.NODE_ENV === "production")
    throw new Error("Buzón sólo disponible en desarrollo.");
  loadEnvConfig(process.cwd(), true, { info: () => undefined, error: () => undefined });
  const port = Number(process.env.LOCAL_MAIL_PORT || "55441");
  if (!Number.isInteger(port) || port < 1024 || port > 65_535)
    throw new Error("LOCAL_MAIL_PORT debe estar entre 1024 y 65535.");
  const appOrigin = localAppOrigin(process.env.BETTER_AUTH_URL?.trim() || "http://127.0.0.1:3000");
  const mailboxOrigin = `http://127.0.0.1:${port}`;
  const messages: LocalMail[] = [];

  async function handle(request: IncomingMessage, response: ServerResponse) {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    response.setHeader(
      "Content-Security-Policy",
      "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    );
    // Bind and validate Host to keep the private mailbox on this machine, including against DNS rebinding.
    if (
      request.headers.host !== `127.0.0.1:${port}` ||
      (request.headers.origin && request.headers.origin !== mailboxOrigin)
    ) {
      response.writeHead(403).end();
      return;
    }
    if (request.method === "GET" && request.url === "/") {
      response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      response.end(mailboxHtml(messages));
      return;
    }
    if (request.method === "GET" && request.url === "/qa/messages") {
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify(messages));
      return;
    }
    if (request.method !== "POST" || request.url !== "/api/v1/send") {
      response.writeHead(404).end();
      return;
    }
    if (
      request.headers["content-type"]?.split(";")[0].trim().toLowerCase() !== "application/json"
    ) {
      response.writeHead(415).end();
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
      const mail = mailSchema.parse(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      const id = randomUUID();
      messages.push({
        id,
        to: mail.To.map((recipient) => recipient.Email),
        subject: mail.Subject,
        text: mail.Text,
        urls: mailLinks(`${mail.HTML} ${mail.Text}`, appOrigin),
      });
      if (messages.length > 50) messages.shift();
      response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ ID: id }));
    } catch {
      response.writeHead(400).end();
    }
  }

  const server = createServer((request, response) => {
    void handle(request, response).catch(() => {
      if (!response.headersSent) response.writeHead(500).end();
      else response.destroy();
    });
  });
  server.requestTimeout = 5_000;
  server.headersTimeout = 5_000;
  server.keepAliveTimeout = 5_000;
  server.maxConnections = 20;
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  let stopping = false;
  function stop() {
    if (stopping) return;
    stopping = true;
    messages.length = 0;
    server.close();
    server.closeAllConnections();
  }
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  console.info(`Buzón de pruebas listo: ${mailboxOrigin}`);
  console.info("Deja esta terminal abierta. Ctrl+C detiene el buzón y elimina sus mensajes.");
}

void main().catch(() => {
  console.error(
    "No pudimos iniciar el buzón local. Revisa que LOCAL_MAIL_PORT esté libre, BETTER_AUTH_URL sea loopback y estés en desarrollo.",
  );
  process.exit(1);
});
