import type { NextConfig } from "next";

// Development assets use exact hostnames, including the configured phone origin.
const developmentOrigins = new Set(["127.0.0.1"]);
for (const value of [
  process.env.BETTER_AUTH_URL,
  ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS || "").split(","),
]) {
  try {
    const url = new URL(value?.trim() || "");
    if (
      ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      !/[*%]/.test(url.hostname) &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash
    )
      developmentOrigins.add(url.hostname);
  } catch {
    /* Invalid auth origins remain unavailable. */
  }
}

const nextConfig: NextConfig = {
  output: "standalone",
  // Verification and password reset URLs contain private authentication tokens.
  logging: { incomingRequests: false },
  allowedDevOrigins: [...developmentOrigins],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'; connect-src 'self'",
          },
        ],
      },
      {
        source: "/offline.html",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
          },
        ],
      },
    ];
  },
};
export default nextConfig;
