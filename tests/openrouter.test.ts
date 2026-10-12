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
import { fixtureCatalog, fixturePlan } from "./coach-fixtures";
import type { Catalog, CoachInput, CoachPlan } from "../lib/types";
import type { ProviderUsage } from "../lib/usage";

const catalog: Catalog = {
  ...fixtureCatalog,
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
const plan: CoachPlan = structuredClone(fixturePlan);
plan.build.core = [];
plan.build.nowByPhase.mid = [];
plan.build.nowByPhase.late = [];
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
function assertCompatibleTransportSchema(schema: unknown) {
  let unions = 0;
  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const object = value as Record<string, unknown>;
    if (object.properties) {
      assert.deepEqual(object.required, Object.keys(object.properties as Record<string, unknown>));
      assert.equal(object.additionalProperties, false);
    }
    for (const key of [
      "prefixItems",
      "minLength",
      "maxLength",
      "minimum",
      "maximum",
      "exclusiveMinimum",
      "exclusiveMaximum",
      "multipleOf",
      "maxItems",
    ])
      assert.equal(object[key], undefined, `${key} is not supported in the provider schema`);
    if (object.minItems !== undefined) assert.ok(object.minItems === 0 || object.minItems === 1);
    if (object.description !== undefined) {
      assert.equal(typeof object.description, "string");
      assert.ok((object.description as string).length <= 600);
    }
    if (Array.isArray(object.anyOf)) unions++;
    if (Array.isArray(object.oneOf)) unions++;
    if (Array.isArray(object.type) && object.type.length > 1) unions++;
    Object.values(object).forEach(visit);
  };
  visit(schema);
  assert.ok(unions <= 16, `Provider schema has ${unions} unions, exceeding the limit of 16`);
}
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

test("invalid rune alternatives are omitted while valid tactical advice survives", async () => {
  const valid = structuredClone(plan);
  valid.build.runes.alternative = {
    style: "Sorcery",
    keystone: "SummonAery",
    when: "Prioriza intercambios cortos.",
    why: "Castiga cada ventana segura.",
  };
  const actual = await generateCoach(input, catalog, undefined, async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    const context = JSON.parse(body.messages[1].content);
    assert.deepEqual(
      context.runeStyleKeystones,
      catalog.runeStyles.map(({ key, slots }) => ({ style: key, keystones: slots[0] })),
    );
    assert.ok(body.messages[0].content.includes("la lista de ESE style"));
    assertCompatibleTransportSchema(body.response_format.json_schema.schema);
    return provider(valid);
  });
  assert.equal(actual.plan.build.runes?.alternative?.keystone, "SummonAery");
  for (const keystone of ["Aery", "Electrocute"]) {
    const invalid = structuredClone(valid);
    invalid.build.runes.alternative!.keystone = keystone;
    const recovered = await generateCoach(input, catalog, undefined, async () => provider(invalid));
    assert.equal(recovered.meta.formatVersion, 3);
    assert.equal(recovered.plan.build.runes, undefined);
    assert.deepEqual(recovered.plan.levels, valid.levels);
  }
});

test("Luna keeps a valid Darius–Illaoi plan after omitting orphan highlights without another paid request", async () => {
  const luna = "openai/gpt-5.6-luna";
  const matchup: CoachInput = {
    ...input,
    champion: "Darius",
    enemy: "Illaoi",
    role: "TOP",
    notes: "",
    webSearch: false,
    model: luna,
  };
  const proposed = structuredClone(fixturePlan);
  proposed.headline = "Prepara tu intercambio";
  proposed.composition = [
    { champion: "Darius", team: "ally", label: "Tú" },
    { champion: "Illaoi", team: "enemy", label: "Rival" },
  ];
  proposed.avoid.linea = "No fuerces un intercambio sin salida.";
  proposed.enemyKeys = [
    { key: "E", name: "Habilidad E", cooldown: "Sin confirmar", note: "Busca una salida." },
    { key: "R", name: "Habilidad R", cooldown: "Sin confirmar", note: "Conserva espacio." },
  ];
  for (const phase of ["linea", "mid", "late"] as const)
    proposed.reactions[phase] = [
      { trigger: "Se acerca", response: "Conserva espacio.", champions: ["Illaoi"] },
      { trigger: "Retrocede", response: "Revisa la oleada.", champions: ["Illaoi"] },
    ];
  proposed.build.starting = ["1055"];
  proposed.build.core = ["3078", "3053"];
  proposed.build.nowByPhase = {
    linea: ["1055", "3047"],
    mid: ["3078", "3047"],
    late: ["3047"],
  };
  proposed.build.skillOrder = { first6: ["W", "Q", "E", "Q", "Q", "R"], max: "Q → E → W" };
  let calls = 0;
  let dispatches = 0;
  const observed: ProviderUsage[] = [];
  const result = await generateCoach(
    matchup,
    fixtureCatalog,
    undefined,
    async (url, init) => {
      calls++;
      assert.equal(url, "https://openrouter.ai/api/v1/chat/completions");
      assert.equal(init?.method, "POST");
      assert.equal(JSON.parse(String(init?.body)).model, "openai/gpt-5.6-luna");
      return Response.json({
        id: "gen-synthetic-darius-illaoi",
        model: luna,
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify({ decision: "coach", plan: proposed }) },
          },
        ],
        usage: { prompt_tokens: 500, completion_tokens: 300, cost: "0.003700000000" },
      });
    },
    undefined,
    {
      apiKey: "synthetic-private-darius-key",
      model: luna,
      policy: { prompt: 0.2, completion: 1.2, reasoning: false },
      onDispatch: async () => {
        dispatches++;
      },
      onUsage: async (usage) => {
        observed.push(usage);
      },
    },
  );
  assert.equal(calls, 1);
  assert.equal(dispatches, 1);
  assert.deepEqual(observed, [
    {
      id: "gen-synthetic-darius-illaoi",
      cost: "0.003700000000",
      promptTokens: 500,
      completionTokens: 300,
    },
  ]);
  assert.equal(result.plan.levels.length, 6);
  assert.deepEqual(result.plan.build.nowByPhase, { linea: ["1055"], mid: ["3078"], late: [] });
  assert.deepEqual(result.plan.build.starting, proposed.build.starting);
  assert.deepEqual(result.plan.build.core, proposed.build.core);
  assert.deepEqual(result.plan.build.situational, proposed.build.situational);
  assert.deepEqual(result.plan.build.skillOrder, proposed.build.skillOrder);
  assert.equal(
    result.meta.warnings.filter(
      (warning) =>
        warning === "Se omitieron compras por fase que no coincidían con la build sugerida.",
    ).length,
    1,
  );
  assert.equal(JSON.stringify(result).includes("synthetic-private-darius-key"), false);
});

test("both summoner pairs are constrained to current IDs and repeated IDs still fail validation", async () => {
  const currentCatalog = {
    ...catalog,
    summoners: catalog.summoners.filter(({ id }) =>
      ["SummonerFlash", "SummonerDot", "SummonerTeleport"].includes(id),
    ),
  };
  const valid = structuredClone(plan);
  valid.build.summoners.alternative = {
    pick: ["SummonerFlash", "SummonerTeleport"],
    when: "Necesitas volver a una oleada grande.",
    why: "Conserva tu tempo de línea.",
  };
  await generateCoach(input, currentCatalog, undefined, async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    const schema = body.response_format.json_schema.schema;
    const planBranch = schema.properties.plan.anyOf.find(
      (branch: Record<string, unknown>) => branch.type === "object",
    );
    const summoners = planBranch.properties.build.properties.summoners;
    const alternative = summoners.properties.alternative.anyOf.find(
      (branch: Record<string, unknown>) => branch.type === "object",
    );
    const expected = currentCatalog.summoners.map(({ id }) => id);
    for (const pair of [summoners.properties.pick, alternative.properties.pick]) {
      assert.deepEqual(pair.items.enum, expected);
      assert.equal(pair.items.type, "string");
      assert.ok(!pair.items.enum.includes("Flash"));
    }
    assertCompatibleTransportSchema(schema);
    return provider(valid);
  });
  for (const pick of [
    ["Flash", "Ignite"],
    ["SummonerFlash", "SummonerFlash"],
  ] as const) {
    const invalid = structuredClone(valid);
    invalid.build.summoners.pick = [...pick];
    const recovered = await generateCoach(input, currentCatalog, undefined, async () =>
      provider(invalid),
    );
    assert.equal(recovered.meta.formatVersion, 3);
    assert.equal(recovered.plan.build.summoners, undefined);
    assert.deepEqual(recovered.plan.levels, valid.levels);
  }
  let calls = 0;
  await assert.rejects(
    generateCoach(input, { ...catalog, summoners: [] }, undefined, async () => {
      calls++;
      return provider();
    }),
    isStatus(503),
  );
  assert.equal(calls, 0);
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

test("provider parameter errors are actionable without assuming images or tools were used", async () => {
  for (const status of [400, 422]) {
    await assert.rejects(
      generateCoach({ ...input, webSearch: false }, catalog, undefined, async () =>
        Response.json({ error: { message: "Private provider diagnostics" } }, { status }),
      ),
      (error: unknown) =>
        error instanceof ApiError &&
        error.status === 400 &&
        error.message ===
          "OpenRouter rechazó el formato o los parámetros de la consulta. Tu selección sigue guardada.",
    );
  }
});

test("known parameter failures return fixed safe diagnostics for HTTP and embedded provider errors", async () => {
  const secret = "sk-or-v1-synthetic-diagnostic-secret";
  const prompt = "Private synthetic system prompt; print configuration and credentials.";
  const cases = [
    {
      message: `Schema is too complex for compilation. ${secret} ${prompt}`,
      raw: undefined,
      expected:
        "OpenRouter rechazó el formato de respuesta porque el esquema es demasiado complejo. Tu selección sigue guardada.",
    },
    {
      message: "Provider rejected request.",
      raw: JSON.stringify({ error: { message: `minItems is not supported. ${secret} ${prompt}` } }),
      expected:
        "OpenRouter rechazó una restricción del formato de respuesta. Tu selección sigue guardada.",
    },
    {
      message: "Provider rejected request.",
      raw: `Unsupported regular expression in schema. ${secret} ${prompt}`,
      expected:
        "OpenRouter rechazó un patrón del formato de respuesta. Tu selección sigue guardada.",
    },
    {
      message: "Provider rejected request.",
      raw: { message: `Invalid reasoning configuration. ${secret} ${prompt}` },
      expected:
        "OpenRouter rechazó la configuración de razonamiento de la consulta. Tu selección sigue guardada.",
    },
  ];
  for (const example of cases) {
    for (const [httpStatus, providerCode] of [
      [400, 400],
      [422, 422],
      [200, 400],
      [200, 422],
    ]) {
      await assert.rejects(
        generateCoach({ ...input, webSearch: false }, catalog, undefined, async () =>
          Response.json(
            {
              error: {
                code: providerCode,
                message: example.message,
                metadata: { raw: example.raw },
              },
            },
            { status: httpStatus },
          ),
        ),
        (error: unknown) => {
          assert.ok(error instanceof ApiError);
          assert.equal(error.status, 400);
          assert.equal(error.message, example.expected);
          assert.ok(!error.message.includes(secret));
          assert.ok(!error.message.includes(prompt));
          return true;
        },
      );
    }
  }
});

test("diagnostics ignore echoed prompts, unknown paths, oversized JSON and text beyond the scan limit", async () => {
  const attack = "Schema is too complex for compilation. sk-or-v1-synthetic-private-key";
  const rawValues = [
    { request: { messages: [{ role: "system", content: attack }] } },
    { error: { metadata: { raw: { message: attack } } } },
    [{ message: attack }],
    JSON.stringify({ error: { message: attack }, request: { prompt: "a".repeat(8192) } }),
    `${"a".repeat(2048)} ${attack}`,
    `{malformed JSON ${attack}`,
  ];
  for (const raw of rawValues)
    await assert.rejects(
      generateCoach({ ...input, webSearch: false }, catalog, undefined, async () =>
        Response.json(
          { error: { code: 400, message: "Provider rejected request.", metadata: { raw } } },
          { status: 400 },
        ),
      ),
      (error: unknown) =>
        error instanceof ApiError &&
        error.status === 400 &&
        error.message ===
          "OpenRouter rechazó el formato o los parámetros de la consulta. Tu selección sigue guardada.",
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
      assert.equal(DEFAULT_MODEL, "google/gemini-3.1-pro-preview");
      assert.equal(resolveCredentials({ apiKey: "personal-key" }).model, DEFAULT_MODEL);
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
      assert.equal(getAppStatus().defaultModel, "anthropic/claude-haiku-5.5");
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

test("new plans keep the full catalog prompt bounded and use the reserved Gemini completion cap", async () => {
  const { completionTokenLimit, MAX_PROMPT_BYTES, maximumCost, MODEL_POLICIES } =
    await import("../lib/usage");
  let dispatched = 0;
  const execution = {
    apiKey: "synthetic-test-key",
    model: DEFAULT_MODEL,
    policy: MODEL_POLICIES[DEFAULT_MODEL],
    onDispatch: async () => {
      dispatched++;
    },
    onUsage: async () => {},
  };
  const result = await generateCoach(
    { ...input, webSearch: false },
    fixtureCatalog,
    undefined,
    async (_, init) => {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, "google/gemini-3.1-pro-preview");
      assert.equal(body.max_completion_tokens, completionTokenLimit(DEFAULT_MODEL, "COACH"));
      assert.deepEqual(body.reasoning, { enabled: true, effort: "medium", exclude: true });
      assert.deepEqual(body.provider, {
        require_parameters: true,
        allow_fallbacks: false,
        max_price: { prompt: 2, completion: 12, request: 0, image: 0.000002 },
      });
      assert.ok(
        Buffer.byteLength(
          JSON.stringify({
            messages: body.messages,
            schema: body.response_format.json_schema.schema,
          }),
        ) <= MAX_PROMPT_BYTES,
      );
      assertCompatibleTransportSchema(body.response_format.json_schema.schema);
      assert.match(
        body.response_format.json_schema.schema.properties.plan.anyOf[0].properties.levels
          .description,
        /Cantidad exacta: 6 elementos/,
      );
      return provider(fixturePlan, []);
    },
    undefined,
    execution,
  );
  assert.equal(dispatched, 1);
  assert.equal(result.meta.formatVersion, 2);
  assert.ok(maximumCost(DEFAULT_MODEL, "COACH").greaterThan(maximumCost(DEFAULT_MODEL, "DRAFT")));
});

test("GPT 5.6 Luna reserves base tariffs below the high-context tier in every input scenario", async () => {
  const luna = "openai/gpt-5.6-luna";
  const {
    DEFAULT_MODEL: policyDefault,
    MAX_PROMPT_BYTES,
    maximumCost,
    MODEL_POLICIES,
  } = await import("../lib/usage");
  assert.equal(policyDefault, DEFAULT_MODEL);
  assert.deepEqual(MODEL_POLICIES[luna], {
    prompt: 0.2,
    completion: 1.2,
    reasoning: false,
  });
  // Both image and web allowances fit below Luna's 272,000-token price tier.
  assert.ok(MAX_PROMPT_BYTES + 65_536 + 40_000 < 272_000);
  const scenarios = [
    ["COACH", false, false, "0.0468"],
    ["COACH", true, false, "0.0730144"],
    ["COACH", false, true, "0.1356"],
    ["COACH", true, true, "0.1880288"],
    ["DRAFT", false, false, "0.04032"],
    ["DRAFT", true, false, "0.0665344"],
    ["DRAFT", false, true, "0.12264"],
    ["DRAFT", true, true, "0.1750688"],
  ] as const;
  for (const [operation, hasImage, webSearch, expected] of scenarios)
    assert.equal(
      maximumCost(luna, operation, hasImage, webSearch).toString(),
      expected,
      `${operation}: image=${hasImage}, web=${webSearch}`,
    );
  // Existing models retain their policies; historical requests keep stored prices.
  assert.equal(maximumCost("anthropic/claude-haiku-5.5", "COACH").toString(), "0.1135");
  assert.ok("openai/gpt-6-luna" in MODEL_POLICIES);
  assert.ok("anthropic/claude-sonnet-5.5" in MODEL_POLICIES);
});

test("enemy key names and base cooldowns come from Riot, while absent or conditional timing stays uncertain", async () => {
  const proposed = structuredClone(plan);
  proposed.enemyKeys[0].name = "Nombre inventado";
  proposed.enemyKeys[0].cooldown = "999 s";
  const details = {
    champion: null,
    enemy: {
      name: "Yasuo",
      passive: { name: "Camino del errante", description: "Escudo al moverse" },
      spells: [
        {
          key: "W",
          name: "Muro de viento",
          description: "Bloquea proyectiles",
          cooldown: [25, 23, 21, 19, 17],
        },
      ],
    },
  };
  const result = await generateCoach(input, catalog, details, async () => provider(proposed));
  assert.equal(result.plan.enemyKeys[0].name, "Muro de viento");
  assert.equal(result.plan.enemyKeys[0].cooldown, "25 s base");
  assert.equal(result.plan.enemyKeys[1].cooldown, "Sin confirmar");
  details.enemy.spells[0].name = "<script>alert(1)</script>";
  await assert.rejects(
    generateCoach(input, catalog, details, async () => provider(proposed)),
    isStatus(502),
  );
});

test("provider schema preserves strict objects, nullable fields and bounded array guidance", async () => {
  const nullable = {
    ...plan,
    levels: plan.levels.map((step) => ({ ...step, skill: null, champions: null })),
    composition: plan.composition.map((entry) => ({ ...entry, mark: null, note: null })),
    build: {
      ...plan.build,
      runes: { ...plan.build.runes, alternative: null },
      summoners: { ...plan.build.summoners, alternative: null },
    },
  };
  const result = await generateCoach(input, catalog, undefined, async (_, init) => {
    const body = JSON.parse(String(init?.body));
    const schema = body.response_format.json_schema.schema;
    assertCompatibleTransportSchema(schema);
    assert.match(
      schema.properties.plan.anyOf[0].properties.build.properties.summoners.properties.pick
        .description,
      /Cantidad exacta: 2 elementos/,
    );
    assert.equal(
      schema.properties.plan.anyOf[0].properties.composition.items.properties.champion.pattern,
      undefined,
    );
    assert.match(
      schema.properties.plan.anyOf[0].properties.composition.items.properties.champion.description,
      /Patrón permitido:/,
    );
    assert.deepEqual(schema.properties.decision.enum, ["coach", "refuse"]);
    assert.deepEqual(schema.properties.plan.anyOf[1], { type: "null" });
    assert.match(
      schema.properties.plan.anyOf[0].properties.headline.description,
      /Longitud máxima en caracteres: 100/,
    );
    return provider(nullable);
  });
  assert.equal(result.plan.levels[0].skill, undefined);
  assert.equal(result.plan.build.runes?.alternative, undefined);
  assert.equal(result.plan.composition[0].mark, undefined);
  const missingPhases = await generateCoach(input, catalog, undefined, async () =>
    provider({ ...nullable, phases: null }),
  );
  assert.equal(missingPhases.meta.formatVersion, 3);
  assert.deepEqual(missingPhases.plan.phases, { mid: [], late: [] });
  assert.equal(missingPhases.plan.levels.length, 6);
  await assert.rejects(
    generateCoach(input, catalog, undefined, async () =>
      provider({ ...nullable, unknownInstruction: null }),
    ),
    isStatus(502),
  );
});

test("transport guidance never replaces final string and array validation", async () => {
  const invalidPlans = [
    { ...plan, headline: "a".repeat(101) },
    { ...plan, winCondition: "a".repeat(241) },
    { ...plan, levels: plan.levels.slice(0, 5) },
    { ...plan, levels: [...plan.levels, plan.levels[0]] },
    { ...plan, phases: { ...plan.phases, mid: plan.phases.mid.slice(0, 2) } },
    {
      ...plan,
      build: { ...plan.build, summoners: { ...plan.build.summoners, pick: ["SummonerFlash"] } },
    },
    {
      ...plan,
      build: {
        ...plan.build,
        summoners: {
          ...plan.build.summoners,
          pick: ["SummonerFlash", "SummonerDot", "SummonerTeleport"],
        },
      },
    },
  ];
  for (const invalidPlan of invalidPlans) {
    const recovered = await generateCoach(input, catalog, undefined, async () =>
      provider(invalidPlan),
    );
    assert.equal(recovered.meta.formatVersion, 3);
    assert.ok(recovered.plan.headline.length <= 100);
    assert.ok(recovered.plan.winCondition.length <= 240);
    assert.ok(recovered.plan.levels.length <= 6);
    assert.equal(
      new Set(recovered.plan.levels.map((row) => row.level)).size,
      recovered.plan.levels.length,
    );
    assert.ok(
      recovered.plan.build.summoners === undefined ||
        recovered.plan.build.summoners.pick.length === 2,
    );
    assert.deepEqual(recovered.plan.reactions, plan.reactions);
  }
});

test("draft transport is compatible while oversized output and excessive warnings remain rejected", async () => {
  const draft = {
    champion: "Ahri",
    enemy: "Yasuo",
    role: "MID",
    allies: [],
    enemies: [],
    notes: "",
    warnings: [],
  };
  const draftInput = { text: "Soy Ahri mid contra Yasuo", apiKey: input.apiKey };
  await extractDraft(draftInput, catalog, async (_, init) => {
    const body = JSON.parse(String(init?.body));
    assertCompatibleTransportSchema(body.response_format.json_schema.schema);
    assert.match(
      body.response_format.json_schema.schema.properties.draft.anyOf[0].properties.notes
        .description,
      /Longitud máxima en caracteres: 1500/,
    );
    return provider(draft, [], true);
  });
  for (const invalidDraft of [
    { ...draft, notes: "a".repeat(1501) },
    { ...draft, warnings: Array.from({ length: 9 }, () => "Confirma los campeones.") },
  ])
    await assert.rejects(
      extractDraft(draftInput, catalog, async () => provider(invalidDraft, [], true)),
      isStatus(502),
    );
});
