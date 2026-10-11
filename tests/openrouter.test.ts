import { strict as assert } from "node:assert";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { ApiError } from "../lib/http";
import {
  DEFAULT_MODEL,
  extractDraft,
  extractSources,
  generateCoach,
  getAppStatus,
  resolveCredentials,
} from "../lib/openrouter";
import type { Catalog, CoachInput, CoachPlan } from "../lib/types";

const catalog: Catalog = {
  version: "16.20.1",
  source: "live",
  updatedAt: "2026-10-11T00:00:00Z",
  champions: ["Ahri", "Yasuo"].map((id) => ({ id, key: "1", name: id, title: "", image: "" })),
  items: [
    { id: "1056", name: "Anillo de Doran", image: "", description: "Regeneración", gold: 400 },
  ],
};
const input: CoachInput = {
  champion: "Ahri",
  enemy: "Yasuo",
  role: "MID",
  rank: "Oro",
  allies: [],
  enemies: [],
  notes: "Mi jungla juega arriba",
  webSearch: true,
  apiKey: "private-personal-key",
  accessToken: "private-access-token",
};
const plan: CoachPlan = {
  headline: "Castiga el muro",
  difficulty: "Difícil",
  winCondition: "Castiga los cooldowns.",
  levels: ["1", "2", "3-5", "6"].map((level) => ({
    level,
    action: "Conserva espacio para retirarte.",
  })),
  mechanics: [
    { trigger: "Usa el muro", response: "Espera y busca otro ángulo." },
    { trigger: "Se acerca", response: "Retrocede hacia tu torre." },
  ],
  build: {
    label: "Build sugerida",
    starting: ["1056"],
    core: [],
    situational: [],
    runes: ["Electrocutar"],
    summoners: ["Destello", "Ignición"],
    skillOrder: "Q > W > E; R cuando puedas",
  },
  macro: ["Juega alrededor de la visión."],
  avoid: ["No uses E contra su muro."],
};
const citation = {
  type: "url_citation",
  url_citation: { title: "Ahri build", url: "https://u.gg/lol/champions/ahri/build" },
};
const provider = (value: unknown = plan, annotations: unknown = [citation], draft = false) =>
  Response.json({
    model: DEFAULT_MODEL,
    choices: [
      {
        finish_reason: "stop",
        message: {
          content: JSON.stringify(
            draft ? { decision: "draft", draft: value } : { decision: "coach", plan: value },
          ),
          annotations,
        },
      },
    ],
  });
const isStatus = (status: number) => (error: unknown) =>
  error instanceof ApiError && error.status === status;
async function withEnv(
  values: Record<string, string | undefined>,
  work: () => void | Promise<void>,
) {
  const env = process.env as Record<string, string | undefined>;
  const old = Object.fromEntries(Object.keys(values).map((key) => [key, env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
  try {
    await work();
  } finally {
    for (const [key, value] of Object.entries(old)) {
      if (value === undefined) delete env[key];
      else env[key] = value;
    }
  }
}

test("builds one bounded structured request with current context and credentials excluded from prompts", async () => {
  let calls = 0;
  const fakeFetch: typeof fetch = async (url, init) => {
    calls++;
    assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
    assert.equal(new Headers(init?.headers).get("authorization"), "Bearer private-personal-key");
    assert.ok(init?.signal);
    assert.equal(init?.redirect, "error");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.model, DEFAULT_MODEL);
    assert.equal(body.stream, false);
    assert.equal(body.provider.require_parameters, true);
    assert.equal(body.provider.allow_fallbacks, false);
    assert.equal(body.response_format.type, "json_schema");
    assert.equal(body.response_format.json_schema.strict, true);
    assert.equal(body.tools[0].type, "openrouter:web_search");
    assert.equal(body.tools[0].parameters.max_uses, 1);
    assert.equal(body.tools[0].parameters.max_total_results, 3);
    assert.equal(body.max_tool_calls, 1);
    assert.equal(body.plugins, undefined);
    const messages = JSON.stringify(body.messages);
    assert.ok(messages.includes("16.20.1"));
    assert.ok(messages.includes("numeración puede diferir"));
    assert.ok(messages.includes("Mi jungla juega arriba"));
    assert.ok(!messages.includes("private-personal-key"));
    assert.ok(!messages.includes("private-access-token"));
    return provider();
  };
  const actual = await generateCoach(input, catalog, undefined, fakeFetch);
  assert.equal(calls, 1);
  assert.equal(actual.plan.headline, plan.headline);
  assert.equal(actual.meta.sources[0].url, citation.url_citation.url);
  assert.ok(actual.meta.warnings.some((warning) => warning.includes("no se verificaron")));
  assert.ok(!JSON.stringify(actual).includes("private-personal-key"));
});

test("rejects provider errors without retries or exposing upstream secrets", async () => {
  for (const [status, expected] of [
    [401, 401],
    [402, 402],
    [429, 429],
    [404, 400],
    [500, 503],
    [524, 504],
  ]) {
    let calls = 0;
    const fakeFetch: typeof fetch = async () => {
      calls++;
      return Response.json({ error: { message: "provider-private-secret" } }, { status });
    };
    await assert.rejects(generateCoach(input, catalog, undefined, fakeFetch), (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, expected);
      assert.ok(!error.message.includes("provider-private-secret"));
      return true;
    });
    assert.equal(calls, 1);
  }
});

test("307 and 308 redirects never resend a provider POST or its game context", async () => {
  const requests: string[] = [];
  let redirectStatus = 307;
  const server = createServer((request, response) => {
    requests.push(request.url || "");
    request.resume();
    if (request.url === "/completion") {
      response.writeHead(redirectStatus, { Location: "/redirected" });
      response.end();
    } else {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(
        JSON.stringify({
          choices: [
            {
              finish_reason: "stop",
              message: { content: JSON.stringify({ decision: "coach", plan }) },
            },
          ],
        }),
      );
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  try {
    const address = server.address() as AddressInfo;
    const localCompletion = `http://127.0.0.1:${address.port}/completion`;
    // Keep the real Fetch redirect behavior, mapping only the fixed provider URL
    // to an isolated loopback fixture. No external API or real key is contacted.
    const fetcher: typeof fetch = async (url, init) => {
      assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
      return fetch(localCompletion, init);
    };
    for (const status of [307, 308]) {
      redirectStatus = status;
      await assert.rejects(generateCoach(input, catalog, undefined, fetcher), isStatus(503));
    }
    assert.deepEqual(
      requests,
      ["/completion", "/completion"],
      "Neither redirect receives a second POST",
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("handles HTTP-200 provider errors, malformed JSON, truncation and network failure", async () => {
  await assert.rejects(
    generateCoach(input, catalog, undefined, async () => Response.json({ error: { code: 402 } })),
    isStatus(402),
  );
  await assert.rejects(
    generateCoach(input, catalog, undefined, async () =>
      Response.json({ choices: [{ message: { content: "not json" } }] }),
    ),
    isStatus(502),
  );
  await assert.rejects(
    generateCoach(input, catalog, undefined, async () =>
      Response.json({
        choices: [{ finish_reason: "length", message: { content: JSON.stringify(plan) } }],
      }),
    ),
    isStatus(502),
  );
  await assert.rejects(
    generateCoach(input, catalog, undefined, async () => provider({ headline: "Missing plan" })),
    isStatus(502),
  );
  await assert.rejects(
    generateCoach(input, catalog, undefined, async () => {
      throw new Error("secret connection detail");
    }),
    isStatus(503),
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    generateCoach(
      input,
      catalog,
      undefined,
      async () => {
        throw new Error("aborted");
      },
      controller.signal,
    ),
    isStatus(504),
  );
});

test("search disabled omits tool costs and never labels a source-free build verified", async () => {
  const actual = await generateCoach(
    { ...input, webSearch: false },
    { ...catalog, source: "snapshot" },
    undefined,
    async (_, init) => {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.tools, undefined);
      assert.equal(body.max_tool_calls, undefined);
      return provider();
    },
  );
  assert.deepEqual(actual.meta.sources, []);
  assert.ok(actual.meta.warnings.some((warning) => warning.includes("orientativa")));
  assert.ok(actual.meta.warnings.some((warning) => warning.includes("guardado Data Dragon")));
  const noSources = await generateCoach(input, catalog, undefined, async () => provider(plan, []));
  assert.ok(noSources.meta.warnings.some((warning) => warning.includes("no devolvió fuentes")));
});

test("provider responses are bounded even with chunked bodies and errors never echo oversized content", async () => {
  for (const declared of [false, true]) {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("provider-private-secret".repeat(7000)));
      },
      cancel() {
        cancelled = true;
      },
    });
    await assert.rejects(
      generateCoach(
        input,
        catalog,
        undefined,
        async () =>
          new Response(body, {
            headers: {
              "Content-Type": "application/json",
              ...(declared ? { "Content-Length": "200000" } : {}),
            },
          }),
      ),
      (error: unknown) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.status, 502);
        assert.ok(!error.message.includes("provider-private-secret"));
        return true;
      },
    );
    assert.equal(cancelled, true);
  }
});

test("unexpected tool calls or unfinished completions never become a plan; empty tool metadata is allowed", async () => {
  const content = JSON.stringify({ decision: "coach", plan });
  for (const message of [
    { content, tool_calls: [{ function: { name: "read_secrets" } }] },
    { content, function_call: { name: "read_secrets" } },
  ]) {
    await assert.rejects(
      generateCoach(input, catalog, undefined, async () =>
        Response.json({ choices: [{ finish_reason: "stop", message }] }),
      ),
      isStatus(502),
    );
  }
  for (const finish_reason of ["tool_calls", "error", undefined]) {
    await assert.rejects(
      generateCoach(input, catalog, undefined, async () =>
        Response.json({ choices: [{ finish_reason, message: { content } }] }),
      ),
      isStatus(502),
    );
  }
  const valid = await generateCoach(input, catalog, undefined, async () =>
    Response.json({
      choices: [
        { finish_reason: "stop", message: { content, tool_calls: [], function_call: null } },
      ],
    }),
  );
  assert.equal(valid.plan.headline, plan.headline);
});

test("accepts only safe actual annotations and never fabricated JSON sources", async () => {
  assert.deepEqual(
    extractSources([
      citation,
      citation,
      { type: "url_citation", url_citation: { url: "javascript:alert(1)" } },
      { type: "url_citation", url_citation: { url: "https://u.gg.evil.example/build" } },
      { type: "url_citation", url_citation: { url: "https://user:secret@u.gg/build" } },
      { type: "url_citation", url_citation: { url: "https://op.gg/lol/champions/ahri" } },
      { type: "something_else", url_citation: { url: "https://u.gg/build" } },
    ]),
    [
      { title: "u.gg", url: citation.url_citation.url },
      { title: "op.gg", url: "https://op.gg/lol/champions/ahri" },
    ],
  );
  await assert.rejects(
    generateCoach(input, catalog, undefined, async () =>
      provider({ ...plan, sources: [{ url: "https://u.gg/invented" }] }),
    ),
    isStatus(502),
  );
});

test("draft extraction uses image understanding, leaves ambiguous picks null and never searches", async () => {
  const image =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  const actual = await extractDraft(
    { apiKey: "private-personal-key", text: "Equipo azul", image },
    catalog,
    async (_, init) => {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.tools, undefined);
      const content = body.messages[1].content;
      assert.equal(content[1].type, "image_url");
      assert.equal(content[1].image_url.url, image);
      assert.ok(body.messages[0].content.includes("Una selección resaltada no demuestra"));
      return provider(
        {
          champion: null,
          enemy: null,
          role: null,
          allies: ["Ahri"],
          enemies: ["Yasuo"],
          notes: "Equipos visibles",
          warnings: [],
        },
        [],
        true,
      );
    },
  );
  assert.equal(actual.champion, null);
  assert.equal(actual.enemy, null);
  assert.equal(actual.role, null);
  assert.ok(actual.warnings.length >= 3);
});

test("server-funded resolution fails closed in production; personal keys remain independent", async () => {
  await withEnv(
    {
      NODE_ENV: "production",
      OPENROUTER_API_KEY: "server-private-key",
      COACH_ACCESS_TOKEN: undefined,
      RIOT_API_KEY: "riot-private-key",
      OPENROUTER_MODEL: undefined,
    },
    async () => {
      assert.throws(() => resolveCredentials({}), isStatus(503));
      assert.equal(resolveCredentials({ apiKey: "personal-key" }).apiKey, "personal-key");
      const status = getAppStatus();
      assert.equal(status.configured, false);
      assert.equal(status.riotConfigured, false);
      assert.equal(status.accessRequired, true);
      assert.equal(status.defaultModel, DEFAULT_MODEL);
      assert.deepEqual(Object.keys(status).sort(), [
        "accessRequired",
        "configured",
        "defaultModel",
        "riotConfigured",
      ]);
      assert.ok(!JSON.stringify(status).includes("private-key"));
    },
  );
  await withEnv(
    {
      NODE_ENV: "production",
      OPENROUTER_API_KEY: "server-private-key",
      COACH_ACCESS_TOKEN: "good-token",
      OPENROUTER_MODEL: "anthropic/claude-haiku-5.5",
    },
    async () => {
      assert.throws(() => resolveCredentials({ accessToken: "bad-token" }), isStatus(401));
      assert.equal(resolveCredentials({ accessToken: "good-token" }).apiKey, "server-private-key");
      assert.equal(getAppStatus().configured, true);
    },
  );
  await withEnv(
    {
      OPENROUTER_API_KEY: undefined,
      COACH_ACCESS_TOKEN: undefined,
      OPENROUTER_MODEL: "bad model\r\nheader",
    },
    async () => {
      assert.throws(() => resolveCredentials({}), isStatus(401));
      assert.equal(getAppStatus().defaultModel, DEFAULT_MODEL);
    },
  );
});
