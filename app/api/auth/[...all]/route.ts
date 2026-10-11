import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";
import { ApiError, errorResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function boundedAuthRequest(request: Request): Promise<Request> {
  if (request.method !== "POST" || !request.body) return request;
  const maximumBytes = 16_384;
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes)
    throw new ApiError(413, "El formulario de acceso es demasiado grande.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel();
        throw new ApiError(413, "El formulario de acceso es demasiado grande.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  return new Request(request.url, {
    method: "POST",
    headers,
    body: Buffer.concat(chunks),
    signal: request.signal,
  });
}

async function handler(request: Request): Promise<Response> {
  try {
    const handlers = toNextJsHandler(getAuth());
    const incoming = await boundedAuthRequest(request);
    const response = await (request.method === "GET"
      ? handlers.GET(incoming)
      : handlers.POST(incoming));
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export const GET = handler;
export const POST = handler;
