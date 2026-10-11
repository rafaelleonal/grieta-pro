export function browserSecurityPolicy(nonce: string, production: boolean, secure: boolean) {
  if (!/^[a-zA-Z0-9+/]{24,}={0,2}$/.test(nonce)) throw new Error("Invalid CSP nonce");
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${production ? "" : " 'unsafe-eval'"}`,
    // Existing React style attributes require inline CSS; scripts remain nonce-only.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://ddragon.leagueoflegends.com",
    "font-src 'self'",
    `connect-src 'self'${production ? "" : " ws: wss:"}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(production && secure ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}
