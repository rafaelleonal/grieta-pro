import assert from "node:assert/strict";
import test from "node:test";
import {
  logProviderFailure,
  parameterErrorCategory,
  providerFailureCategory,
  safeProviderDiagnostic,
} from "../lib/provider-diagnostics";
import { ApiError } from "../lib/errors";
import { DEFAULT_MODEL, extractDraft, generateCoach } from "../lib/openrouter";
import { fixtureCatalog, fixturePlan } from "./coach-fixtures";
import type { CoachInput } from "../lib/types";

const key = "synthetic-private-key-diagnostic-only";
const privateText = "PRIVATE_SYNTHETIC_PROMPT_OR_PROVIDER_DATA_42";
const input: CoachInput = {
  champion: "Ahri",
  enemy: "Yasuo",
  role: "MID",
  rank: "Oro",
  allies: [],
  enemies: [],
  notes: "Mi jungla juega arriba",
  webSearch: false,
  apiKey: key,
  model: DEFAULT_MODEL,
};

async function captureDiagnostics(work: () => Promise<void> | void) {
  const previous = console.warn;
  const lines: string[] = [];
  console.warn = (...args: unknown[]) => {
    assert.equal(args.length, 1, "A diagnostic writes only one serialized safe object");
    assert.equal(typeof args[0], "string");
    lines.push(args[0] as string);
  };
  try {
    await work();
    for (const line of lines) {
      assert.ok(!line.includes(key));
      assert.ok(!line.includes(privateText));
      assert.ok(!line.includes("cholo-lol-policy-v1"));
      assert.ok(!line.includes(input.notes));
    }
    return lines.map((line) => JSON.parse(line) as ReturnType<typeof safeProviderDiagnostic>);
  } finally {
    console.warn = previous;
  }
}

function assertFixedEvent(event: ReturnType<typeof safeProviderDiagnostic>, operation = "COACH") {
  assert.deepEqual(Object.keys(event).sort(), [
    "category",
    "durationMs",
    "event",
    "httpStatus",
    "model",
    "operation",
    "parameterCategory",
    "stage",
    "validationCategory",
    "version",
  ]);
  assert.equal(event.event, "openrouter_failure");
  assert.equal(event.version, 1);
  assert.equal(event.model, DEFAULT_MODEL);
  assert.equal(event.operation, operation);
  assert.ok(
    Number.isInteger(event.durationMs) && event.durationMs >= 0 && event.durationMs <= 300_000,
  );
}

test("safe diagnostic construction accepts only fixed enum fields and bounded numbers", async () => {
  const polluted = {
    stage: privateText,
    category: key,
    schemaName: privateText,
    model: key,
    httpStatus: 1000,
    durationMs: Number.POSITIVE_INFINITY,
    parameterCategory: privateText,
    validationCategory: privateText,
    error: { message: key },
    messages: [{ content: privateText }],
    providerRequestId: `gen-${key}`,
    headers: { Authorization: `Bearer ${key}` },
    userId: privateText,
  };
  const event = safeProviderDiagnostic(polluted);
  assert.deepEqual(event, {
    event: "openrouter_failure",
    version: 1,
    stage: "connection",
    category: "unclassified",
    parameterCategory: null,
    validationCategory: null,
    operation: "UNKNOWN",
    model: "other",
    httpStatus: null,
    durationMs: 0,
  });
  const lines = await captureDiagnostics(() => logProviderFailure(polluted));
  assert.deepEqual(lines, [event]);
  for (const [durationMs, expected] of [
    [-1, 0],
    [1.99, 1],
    [1_000_000, 300_000],
  ] as const)
    assert.equal(safeProviderDiagnostic({ ...polluted, durationMs }).durationMs, expected);
  assert.equal(safeProviderDiagnostic({ ...polluted, model: "toString" }).model, "other");
});

test("typed provider errors take priority and arbitrary metadata cannot become a category", () => {
  for (const category of [
    "authentication",
    "context_length_exceeded",
    "max_tokens_exceeded",
    "payment_required",
    "rate_limit_exceeded",
    "invalid_request",
    "provider_unavailable",
    "content_policy_violation",
    "timeout",
  ]) {
    assert.equal(
      providerFailureCategory(400, {
        message: `Schema is too complex ${privateText} ${key}`,
        metadata: { error_type: category, provider_name: key, raw: privateText },
      }),
      category,
    );
  }
  assert.equal(providerFailureCategory(400, { metadata: { error_type: key } }), "unclassified");
  assert.equal(
    providerFailureCategory(503, { request: { metadata: { error_type: "authentication" } } }),
    "provider_unavailable",
  );
  assert.equal(providerFailureCategory(0), "unclassified");
  assert.equal(providerFailureCategory(401), "authentication");
});

test("validation diagnostics contain only a known rule and no response values", () => {
  const base = {
    stage: "output_rejected",
    category: "output_validation",
    schemaName: "league_coach_plan",
    model: DEFAULT_MODEL,
    durationMs: 12,
  };
  for (const validationCategory of ["phase_items", "primary_runes", "skill_order"])
    assert.equal(
      safeProviderDiagnostic({ ...base, validationCategory }).validationCategory,
      validationCategory,
    );
  for (const validationCategory of [key, privateText, "toString", null, {}]) {
    const event = safeProviderDiagnostic({ ...base, validationCategory });
    assert.equal(event.validationCategory, null);
    assert.ok(!JSON.stringify(event).includes(key));
    assert.ok(!JSON.stringify(event).includes(privateText));
  }
  assert.equal(
    safeProviderDiagnostic({
      ...base,
      category: "connection_error",
      validationCategory: "phase_items",
    }).validationCategory,
    null,
  );
});

test("known schema and token diagnostics become fixed categories without arbitrary parameter paths", () => {
  const cases = [
    [
      "'required' is required to be supplied and to be an array including every key in properties",
      "schema_required",
    ],
    [
      "additionalProperties is required to be supplied and to be false",
      "schema_additional_properties",
    ],
    ["max_completion_tokens must be less than the model maximum", "invalid_max_tokens"],
    ["The maximum context length is exceeded by this request", "context_length"],
    ["max_tokens must be greater than thinking.budget_tokens", "invalid_reasoning"],
  ] as const;
  for (const [message, category] of cases) {
    assert.equal(
      parameterErrorCategory({
        metadata: { raw: { error: { message: `${message}; ${key} ${privateText}` } } },
      }),
      category,
    );
    assert.equal(providerFailureCategory(400, { message }), category);
  }
  assert.equal(
    parameterErrorCategory({ request: { messages: [{ content: cases[0][0] }] } }),
    undefined,
  );
  assert.equal(
    parameterErrorCategory({ message: "A private arbitrary field was rejected" }),
    undefined,
  );
  assert.equal(parameterErrorCategory({ message: "Missing required model parameter" }), undefined);
  assert.equal(
    parameterErrorCategory({ message: "API key is required for authentication" }),
    undefined,
  );
});

test("HTTP and embedded errors each log once, keep actual HTTP status and never log upstream content", async () => {
  for (const [httpStatus, upstreamCode] of [
    [400, 400],
    [422, 422],
    [200, 400],
    [200, 422],
  ] as const) {
    const events = await captureDiagnostics(async () => {
      await assert.rejects(
        generateCoach(input, fixtureCatalog, undefined, async () =>
          Response.json(
            {
              id: `gen-${key}`,
              model: privateText,
              error: {
                code: upstreamCode,
                message: `${key} ${privateText}`,
                metadata: {
                  error_type: "invalid_request",
                  provider_name: key,
                  raw: {
                    error: { message: `additionalProperties must be false ${key}` },
                    request: { messages: [{ content: privateText }] },
                  },
                },
              },
            },
            { status: httpStatus, headers: { "x-request-id": privateText } },
          ),
        ),
        (error: unknown) => error instanceof ApiError && error.status === 400,
      );
    });
    assert.equal(events.length, 1);
    assertFixedEvent(events[0]);
    assert.equal(events[0].httpStatus, httpStatus);
    assert.equal(events[0].stage, httpStatus === 200 ? "embedded_error" : "http_error");
    assert.equal(events[0].category, "invalid_request");
    assert.equal(events[0].parameterCategory, "schema_additional_properties");
  }
});

test("connection, cancellation, unreadable body, refusal, incomplete and invalid JSON use fixed safe events", async () => {
  const cancelled = new AbortController();
  cancelled.abort(new Error(`${key} ${privateText}`));
  const cases: {
    stage: string;
    category: string;
    httpStatus: number | null;
    fetcher: typeof fetch;
    signal?: AbortSignal;
  }[] = [
    {
      stage: "connection",
      category: "connection_error",
      httpStatus: null,
      fetcher: async () => {
        throw new Error(`${key} ${privateText}`);
      },
    },
    {
      stage: "timeout",
      category: "request_cancelled",
      httpStatus: null,
      signal: cancelled.signal,
      fetcher: async () => {
        throw cancelled.signal.reason;
      },
    },
    {
      stage: "body_invalid",
      category: "unreadable_response",
      httpStatus: 200,
      fetcher: async () => new Response(`${key} ${privateText}`),
    },
    {
      stage: "refusal",
      category: "refusal",
      httpStatus: 200,
      fetcher: async () =>
        Response.json({
          choices: [
            { finish_reason: "content_filter", message: { refusal: `${key} ${privateText}` } },
          ],
        }),
    },
    {
      stage: "incomplete",
      category: "max_tokens_exceeded",
      httpStatus: 200,
      fetcher: async () =>
        Response.json({
          choices: [{ finish_reason: "length", message: { content: `${key} ${privateText}` } }],
        }),
    },
    {
      stage: "incomplete",
      category: "unexpected_tool_call",
      httpStatus: 200,
      fetcher: async () =>
        Response.json({
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: "{}",
                tool_calls: [{ function: { name: privateText, arguments: key } }],
              },
            },
          ],
        }),
    },
    {
      stage: "invalid_json",
      category: "invalid_completion_json",
      httpStatus: 200,
      fetcher: async () =>
        Response.json({
          choices: [{ finish_reason: "stop", message: { content: `${key} ${privateText}` } }],
        }),
    },
    {
      stage: "output_rejected",
      category: "protected_output",
      httpStatus: 200,
      fetcher: async () =>
        Response.json({
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: JSON.stringify({
                  decision: "coach",
                  plan: { ...fixturePlan, headline: key },
                }),
              },
            },
          ],
        }),
    },
    {
      stage: "refusal",
      category: "refusal",
      httpStatus: 200,
      fetcher: async () =>
        Response.json({
          choices: [
            {
              finish_reason: "stop",
              message: { content: JSON.stringify({ decision: "refuse", plan: null }) },
            },
          ],
        }),
    },
  ];
  for (const example of cases) {
    const events = await captureDiagnostics(async () => {
      await assert.rejects(
        generateCoach(input, fixtureCatalog, undefined, example.fetcher, example.signal),
        ApiError,
      );
    });
    assert.equal(events.length, 1);
    assertFixedEvent(events[0]);
    assert.equal(events[0].stage, example.stage);
    assert.equal(events[0].category, example.category);
    assert.equal(events[0].httpStatus, example.httpStatus);
  }
});

test("draft failures identify DRAFT and arbitrary allowed-looking model IDs are hidden", async () => {
  const events = await captureDiagnostics(async () => {
    await assert.rejects(
      extractDraft(
        { apiKey: key, model: `custom/${privateText}`, text: "Soy Ahri mid contra Yasuo" },
        fixtureCatalog,
        async () =>
          Response.json(
            { error: { code: 400, message: `${key} ${privateText}` } },
            { status: 400 },
          ),
      ),
      ApiError,
    );
  });
  assert.equal(events.length, 1);
  assert.equal(events[0].operation, "DRAFT");
  assert.equal(events[0].model, "other");
});

test("schema and catalog output rejection each emit one fixed validation diagnostic", async () => {
  for (const plan of [
    { ...fixturePlan, unknownField: privateText },
    { ...fixturePlan, build: { ...fixturePlan.build, starting: ["99999999"] } },
  ]) {
    const events = await captureDiagnostics(async () => {
      const work = generateCoach(input, fixtureCatalog, undefined, async () =>
        Response.json({
          choices: [
            {
              finish_reason: "stop",
              message: { content: JSON.stringify({ decision: "coach", plan }) },
            },
          ],
        }),
      );
      if ("unknownField" in plan) await assert.rejects(work, ApiError);
      else {
        const recovered = await work;
        assert.equal(recovered.meta.formatVersion, 3);
        assert.deepEqual(recovered.plan.build.starting, []);
        assert.deepEqual(recovered.plan.levels, fixturePlan.levels);
      }
    });
    assert.equal(events.length, 1);
    assertFixedEvent(events[0]);
    assert.equal(events[0].category, "output_validation");
  }
  for (const draft of [
    {
      champion: "Ahri",
      enemy: "Yasuo",
      role: "MID",
      allies: [],
      enemies: [],
      notes: "",
      warnings: [],
      unknownField: privateText,
    },
    {
      champion: "Ahri",
      enemy: "Ahri",
      role: "MID",
      allies: [],
      enemies: [],
      notes: "",
      warnings: [],
    },
  ]) {
    const events = await captureDiagnostics(async () => {
      await assert.rejects(
        extractDraft(
          { apiKey: key, model: DEFAULT_MODEL, text: "Soy Ahri mid contra Yasuo" },
          fixtureCatalog,
          async () =>
            Response.json({
              choices: [
                {
                  finish_reason: "stop",
                  message: { content: JSON.stringify({ decision: "draft", draft }) },
                },
              ],
            }),
        ),
        ApiError,
      );
    });
    assert.equal(events.length, 1);
    assertFixedEvent(events[0], "DRAFT");
    assert.equal(events[0].category, "output_validation");
  }
});

test("semantic plan rejection logs its finite rule once while preserving observed usage", async () => {
  let calls = 0;
  let observed = 0;
  const plan = structuredClone(fixturePlan);
  plan.build.skillOrder.first6 = ["Q", "R", "E", "W", "Q", "R"];
  const events = await captureDiagnostics(async () => {
    const recovered = await generateCoach(
      input,
      fixtureCatalog,
      undefined,
      async () => {
        calls++;
        return Response.json({
          choices: [
            {
              finish_reason: "stop",
              message: {
                content: JSON.stringify({ decision: "coach", plan }),
              },
            },
          ],
          usage: { prompt_tokens: 500, completion_tokens: 300, cost: 0.001 },
        });
      },
      undefined,
      {
        apiKey: key,
        model: DEFAULT_MODEL,
        policy: { prompt: 0.2, completion: 1.2, reasoning: false },
        onDispatch: async () => {},
        onUsage: async () => {
          observed++;
        },
      },
    );
    assert.equal(recovered.meta.formatVersion, 3);
    assert.equal(recovered.plan.build.skillOrder, undefined);
    assert.deepEqual(recovered.plan.levels, fixturePlan.levels);
  });
  assert.equal(calls, 1);
  assert.equal(observed, 1);
  assert.equal(events.length, 1);
  assertFixedEvent(events[0]);
  assert.equal(events[0].category, "output_validation");
  assert.equal(events[0].validationCategory, "skill_order");
});

test("upstream rejection is diagnosed before a database usage-observation failure", async () => {
  const databaseFailure = new Error("Synthetic usage store failed");
  let observed = 0;
  let calls = 0;
  const events = await captureDiagnostics(async () => {
    await assert.rejects(
      generateCoach(
        input,
        fixtureCatalog,
        undefined,
        async () => {
          calls++;
          return Response.json(
            {
              error: {
                code: 400,
                message: privateText,
                metadata: { error_type: "invalid_request" },
              },
            },
            { status: 400 },
          );
        },
        undefined,
        {
          apiKey: key,
          model: DEFAULT_MODEL,
          policy: { prompt: 0.2, completion: 1.2, reasoning: false },
          onDispatch: async () => {},
          onUsage: async () => {
            observed++;
            throw databaseFailure;
          },
        },
      ),
      (error) => error === databaseFailure,
    );
  });
  assert.equal(events.length, 1);
  assertFixedEvent(events[0]);
  assert.equal(events[0].stage, "http_error");
  assert.equal(events[0].category, "invalid_request");
  assert.equal(calls, 1);
  assert.equal(observed, 1);
});

test("valid completions emit no error events and a failing diagnostic sink never changes provider accounting", async () => {
  const events = await captureDiagnostics(async () => {
    const result = await generateCoach(input, fixtureCatalog, undefined, async () =>
      Response.json({
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify({ decision: "coach", plan: fixturePlan }) },
          },
        ],
      }),
    );
    assert.equal(result.plan.headline, fixturePlan.headline);
  });
  assert.deepEqual(events, []);
  const previous = console.warn;
  console.warn = () => {
    throw new Error("Synthetic unavailable log sink");
  };
  let calls = 0;
  let observed = 0;
  try {
    await assert.rejects(
      generateCoach(
        input,
        fixtureCatalog,
        undefined,
        async () => {
          calls++;
          return Response.json(
            { error: { code: 400, message: privateText }, usage: { cost: 0.004 } },
            { status: 400 },
          );
        },
        undefined,
        {
          apiKey: key,
          model: DEFAULT_MODEL,
          policy: { prompt: 0.2, completion: 1.2, reasoning: false },
          onDispatch: async () => {},
          onUsage: async (usage) => {
            observed++;
            assert.equal(usage.cost, "0.004000000000");
          },
        },
      ),
      (error: unknown) => error instanceof ApiError && error.status === 400,
    );
    assert.equal(calls, 1);
    assert.equal(observed, 1);
  } finally {
    console.warn = previous;
  }
});
