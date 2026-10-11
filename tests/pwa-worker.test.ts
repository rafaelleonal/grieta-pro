import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const origin = "https://coach.example";
const source = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");
const cacheName = "cholo-coach-public-v2";
const publicPaths = [
  "/offline.html",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
];

type WorkerRequest = { url: string; method: string; mode: string };
type FetchInput = Request | WorkerRequest;
type WorkerEvent = {
  request?: WorkerRequest;
  data?: unknown;
  waitUntil: (promise: Promise<unknown>) => void;
  respondWith: (promise: Promise<Response>) => void;
};

function makeWorker() {
  const listeners = new Map<string, (event: WorkerEvent) => void>();
  const buckets = new Map<string, Map<string, Response>>();
  const fetchCalls: { request: FetchInput; init?: RequestInit }[] = [];
  const precacheRequests: Request[] = [];
  const deleted: string[] = [];
  const writes: string[] = [];
  let openCount = 0;
  let claimCount = 0;
  let skipWaitingCount = 0;
  let network: (request: FetchInput, init?: RequestInit) => Promise<Response> = async () =>
    new Response("online");
  const key = (input: string | Request) =>
    new URL(typeof input === "string" ? input : input.url, origin).href;

  const caches = {
    async open(name: string) {
      openCount++;
      let bucket = buckets.get(name);
      if (!bucket) {
        bucket = new Map();
        buckets.set(name, bucket);
      }
      const entries = bucket;
      return {
        async addAll(requests: Request[]) {
          for (const request of requests) {
            precacheRequests.push(request);
            entries.set(
              key(request),
              new Response(
                new URL(request.url).pathname === "/offline.html" ? "offline fallback" : "icon",
              ),
            );
          }
        },
        async match(input: string | Request) {
          return entries.get(key(input))?.clone();
        },
        async put(input: string | Request, response: Response) {
          writes.push(key(input));
          entries.set(key(input), response);
        },
      };
    },
    async keys() {
      return [...buckets.keys()];
    },
    async delete(name: string) {
      deleted.push(name);
      return buckets.delete(name);
    },
  };

  vm.runInNewContext(source, {
    self: {
      location: { origin },
      clients: {
        async claim() {
          claimCount++;
        },
      },
      async skipWaiting() {
        skipWaitingCount++;
      },
      addEventListener(type: string, listener: (event: WorkerEvent) => void) {
        listeners.set(type, listener);
      },
    },
    URL,
    Request,
    Response,
    caches,
    fetch: async (request: FetchInput, init?: RequestInit) => {
      fetchCalls.push({ request, init });
      return network(request, init);
    },
  });

  return {
    buckets,
    fetchCalls,
    precacheRequests,
    deleted,
    writes,
    get openCount() {
      return openCount;
    },
    get claimCount() {
      return claimCount;
    },
    get skipWaitingCount() {
      return skipWaitingCount;
    },
    setNetwork(callback: typeof network) {
      network = callback;
    },
    async emit(type: string, request?: WorkerRequest, data?: unknown) {
      const waits: Promise<unknown>[] = [];
      let response: Promise<Response> | undefined;
      listeners.get(type)?.({
        request,
        data,
        waitUntil: (promise) => {
          waits.push(promise);
        },
        respondWith: (promise) => {
          response = promise;
        },
      });
      await Promise.all(waits);
      return response ? await response : undefined;
    },
  };
}

function request(path: string, options: Partial<WorkerRequest> = {}): WorkerRequest {
  return { url: new URL(path, origin).href, method: "GET", mode: "cors", ...options };
}

test("PWA precaches only exact public files, without credentials or automatic activation", async () => {
  const worker = makeWorker();
  await worker.emit("install");
  assert.deepEqual(
    worker.precacheRequests.map((item) => new URL(item.url).pathname),
    publicPaths,
  );
  for (const item of worker.precacheRequests) {
    assert.equal(new URL(item.url).origin, origin);
    assert.equal(new URL(item.url).search, "");
    assert.equal(item.credentials, "omit");
  }
  assert.deepEqual([...worker.buckets.keys()], [cacheName]);
  assert.equal(worker.skipWaitingCount, 0);
});

test("PWA never handles API reads, navigations, or mutation requests", async () => {
  const worker = makeWorker();
  const cases = [
    request("/api/status"),
    request("/api/catalog"),
    request("/api/riot"),
    request("/api/status", { mode: "navigate" }),
    request("/api/coach", { mode: "navigate" }),
    request("/api", { mode: "navigate" }),
    request("/api/coach", { method: "POST" }),
    request("/api/draft", { method: "POST" }),
    request("/icons/icon-192.png", { method: "POST" }),
  ];
  for (const item of cases) assert.equal(await worker.emit("fetch", item), undefined, item.url);
  assert.equal(worker.openCount, 0);
  assert.equal(worker.fetchCalls.length, 0);
  assert.equal(worker.writes.length, 0);
});

test("PWA leaves third parties, RSC, application files, and queried icons untouched", async () => {
  const worker = makeWorker();
  const paths = [
    "https://ddragon.leagueoflegends.com/cdn/champion.png",
    "https://foreign.example/offline.html",
    "/?_rsc=private-response",
    "/_next/static/app.js",
    "/manifest.webmanifest",
    "/icons/icon-192.png?token=private",
    "/offline.html?key=private",
    "/private.jpg",
  ];
  for (const path of paths)
    assert.equal(await worker.emit("fetch", request(path)), undefined, path);
  assert.equal(worker.openCount, 0);
  assert.equal(worker.fetchCalls.length, 0);
});

test("PWA fetches application navigations once with HTTP caching disabled and never stores them", async () => {
  const worker = makeWorker();
  const navigation = request("/?private=matchup", { mode: "navigate" });
  const response = await worker.emit("fetch", navigation);
  assert.equal(await response?.text(), "online");
  assert.equal(worker.fetchCalls.length, 1);
  assert.equal(worker.fetchCalls[0].request, navigation);
  assert.equal(worker.fetchCalls[0].init?.cache, "no-store");
  assert.equal(worker.openCount, 0);
  assert.equal(worker.writes.length, 0);
});

test("PWA uses the public offline fallback only after a navigation network failure, without retrying", async () => {
  const worker = makeWorker();
  await worker.emit("install");
  worker.setNetwork(async () => {
    throw new TypeError("Network unavailable");
  });
  const response = await worker.emit("fetch", request("/", { mode: "navigate" }));
  assert.equal(await response?.text(), "offline fallback");
  assert.equal(worker.fetchCalls.length, 1);
  assert.equal(worker.writes.length, 0);
  assert.deepEqual(
    [...worker.buckets.get(cacheName)!.keys()].map((url) => new URL(url).pathname),
    publicPaths,
  );
});

test("PWA preserves real authorization and server error responses instead of substituting offline HTML", async () => {
  for (const status of [401, 500]) {
    const worker = makeWorker();
    worker.setNetwork(async () => new Response("actual server error", { status }));
    const response = await worker.emit("fetch", request("/", { mode: "navigate" }));
    assert.equal(response?.status, status);
    assert.equal(await response?.text(), "actual server error");
    assert.equal(worker.fetchCalls.length, 1);
    assert.equal(worker.openCount, 0);
  }
});

test("PWA serves precached public icons offline, and only fills missing public assets without credentials", async () => {
  const worker = makeWorker();
  await worker.emit("install");
  worker.setNetwork(async () => {
    throw new TypeError("Network unavailable");
  });
  assert.equal(await (await worker.emit("fetch", request("/icons/icon-192.png")))?.text(), "icon");
  assert.equal(worker.fetchCalls.length, 0);
  worker.buckets.get(cacheName)!.delete(`${origin}/icons/icon-512.png`);
  worker.setNetwork(async () => new Response("replacement icon"));
  assert.equal(
    await (await worker.emit("fetch", request("/icons/icon-512.png")))?.text(),
    "replacement icon",
  );
  assert.equal(worker.fetchCalls.length, 1);
  const fetchedRequest = worker.fetchCalls[0].request as Request;
  assert.equal(fetchedRequest.credentials, "omit");
  assert.equal(fetchedRequest.cache, "no-store");
  assert.deepEqual(worker.writes, [`${origin}/icons/icon-512.png`]);
});

test("PWA does not cache failed or redirected public asset responses", async () => {
  for (const response of [
    new Response("missing", { status: 404 }),
    Object.defineProperty(new Response("redirected"), "redirected", { value: true }),
  ]) {
    const worker = makeWorker();
    worker.setNetwork(async () => response);
    assert.equal(await worker.emit("fetch", request("/icons/icon-192.png")), response);
    assert.equal(worker.fetchCalls.length, 1);
    assert.equal(worker.writes.length, 0);
  }
});

test("PWA cache cleanup preserves unrelated applications and activation does not skip waiting", async () => {
  const worker = makeWorker();
  worker.buckets.set(cacheName, new Map());
  worker.buckets.set("cholo-coach-public-v0", new Map());
  worker.buckets.set("cholo-coach-public-v1", new Map());
  worker.buckets.set("another-app-v1", new Map());
  await worker.emit("activate");
  assert.deepEqual(worker.deleted, ["cholo-coach-public-v0", "cholo-coach-public-v1"]);
  assert.ok(worker.buckets.has("another-app-v1"));
  assert.ok(worker.buckets.has(cacheName));
  assert.equal(worker.claimCount, 1);
  assert.equal(worker.skipWaitingCount, 0);
  await worker.emit("message", undefined, { type: "SKIP_WAITING" });
  assert.equal(worker.skipWaitingCount, 0);
});

test("PWA fails safely if an offline navigation occurs before fallback installation", async () => {
  const worker = makeWorker();
  worker.setNetwork(async () => {
    throw new TypeError("Network unavailable");
  });
  const response = await worker.emit("fetch", request("/", { mode: "navigate" }));
  assert.equal(response?.status, 503);
  assert.equal(response?.headers.get("Cache-Control"), "no-store");
  assert.ok((await response?.text())?.includes("Sin conexión"));
  assert.equal(worker.fetchCalls.length, 1);
});
