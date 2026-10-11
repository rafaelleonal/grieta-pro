"use strict";

const CACHE_PREFIX = "cholo-coach-public-";
const CACHE_NAME = `${CACHE_PREFIX}v2`;
const OFFLINE_URL = "/offline.html";
const PUBLIC_ASSETS = [
  OFFLINE_URL,
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(
        PUBLIC_ASSETS.map(
          (path) =>
            new Request(new URL(path, self.location.origin), {
              credentials: "omit",
              cache: "reload",
            }),
        ),
      ),
    ),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Let the browser handle private requests directly, without caching or retries.
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname === "/api" ||
    url.pathname.startsWith("/api/")
  )
    return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request, { cache: "no-store" });
        } catch {
          const cache = await caches.open(CACHE_NAME);
          return (
            (await cache.match(OFFLINE_URL)) ||
            new Response("Sin conexión. Conéctate a internet y vuelve a abrir GrietaPro.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
            })
          );
        }
      })(),
    );
    return;
  }

  // Exact URLs only: never cache a URL that contains credentials in its query.
  if (url.search || !PUBLIC_ASSETS.includes(url.pathname)) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(url.pathname);
      if (cached) return cached;
      const response = await fetch(new Request(url, { credentials: "omit", cache: "no-store" }));
      if (response.ok && !response.redirected) await cache.put(url.pathname, response.clone());
      return response;
    })(),
  );
});
