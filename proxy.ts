import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { browserSecurityPolicy } from "./lib/browser-security";

export function proxy(request: NextRequest) {
  const nonce = randomBytes(24).toString("base64");
  const production = process.env.NODE_ENV === "production";
  const secure =
    request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  const policy = browserSecurityPolicy(nonce, production, secure);
  const headers = new Headers(request.headers);
  // Never accept a nonce or policy supplied by a client.
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Cache-Control", "private, no-store");
  if (production && secure) response.headers.set("Strict-Transport-Security", "max-age=31536000");
  return response;
}

export const config = {
  matcher: [
    "/((?!api(?:/|$)|_next(?:/|$)|icons(?:/|$)|sw\\.js$|offline\\.html$|icon\\.svg$|manifest\\.webmanifest$|favicon\\.ico$).*)",
  ],
};
