import { createHash, timingSafeEqual } from "node:crypto";
import { ApiError } from "./errors";

export { ApiError } from "./errors";

export function jsonResponse(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) return jsonResponse({ error: error.message }, error.status);
  return jsonResponse(
    { error: "No pudimos completar la consulta. Inténtalo de nuevo en unos momentos." },
    500,
  );
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const reject = () => {
    throw new ApiError(403, "Abre la consulta desde esta aplicación.");
  };
  try {
    const incoming = new URL(origin);
    if (!["http:", "https:"].includes(incoming.protocol) || incoming.origin !== origin)
      return reject();
    const requestUrl = new URL(request.url);
    const host = request.headers.get("host");
    if (!host) {
      if (incoming.origin !== requestUrl.origin) reject();
      return;
    }
    // Next can normalize Request.url to localhost. Host retains the browser's
    // actual authority; forwarded-host is deliberately never trusted here.
    if (!/^(?:\[[a-fA-F0-9:]+\]|[a-zA-Z0-9.-]+)(?::\d{1,5})?$/.test(host)) return reject();
    const forwardedProtocol = request.headers.get("x-forwarded-proto");
    const protocol =
      forwardedProtocol === "https" || forwardedProtocol === "http"
        ? `${forwardedProtocol}:`
        : requestUrl.protocol;
    const expected = new URL(`${protocol}//${host}`).origin;
    if (incoming.origin !== expected) reject();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    reject();
  }
}

/** Bounded streaming read; Content-Length alone does not protect against oversized uploads. */
export async function readJsonBody(request: Request, maxBytes = 3_600_000): Promise<unknown> {
  if (
    request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase() !==
    "application/json"
  ) {
    throw new ApiError(415, "Envía la consulta en formato JSON.");
  }
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > maxBytes) {
    throw new ApiError(
      413,
      "La imagen optimizada es demasiado grande. Selecciona de nuevo una foto o captura de hasta 30 MB para reducirla antes de enviarla.",
    );
  }
  if (!request.body) throw new ApiError(400, "La consulta está vacía.");
  const reader = request.body.getReader();
  let total = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new ApiError(
          413,
          "La imagen optimizada es demasiado grande. Selecciona de nuevo una foto o captura de hasta 30 MB para reducirla antes de enviarla.",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new ApiError(400, "La consulta no tiene un formato válido.");
  }
}

/** Server-funded calls fail closed on public production deployments. */
export function authorizeServerKey(accessToken?: string): void {
  const expected = process.env.COACH_ACCESS_TOKEN?.trim();
  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      throw new ApiError(
        503,
        "Configura el código de acceso del servidor antes de usar sus conexiones.",
      );
    }
    return;
  }
  const supplied = typeof accessToken === "string" ? accessToken : "";
  const digest = (value: string) => createHash("sha256").update(value).digest();
  if (!timingSafeEqual(digest(expected), digest(supplied))) {
    throw new ApiError(401, "El código de acceso no es correcto. Revísalo en Conexión.");
  }
}
