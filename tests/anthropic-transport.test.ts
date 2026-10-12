import assert from "node:assert/strict";
import test from "node:test";
import { anthropicCoachRequest, anthropicCoachResponse } from "../lib/anthropic-transport";
import { extractSources } from "../lib/openrouter";

test("native task budgets preserve price, provider and search bounds without a second call", () => {
  const provider = {
    allow_fallbacks: false,
    require_parameters: true,
    order: ["anthropic"],
    max_price: { prompt: 0.5, completion: 2.5 },
  };
  const tools = [
    {
      type: "openrouter:web_search",
      parameters: { max_uses: 1, max_results: 3, max_total_results: 3, max_characters: 2000 },
    },
  ];
  const request = anthropicCoachRequest(
    {
      model: "anthropic/claude-haiku-5.5",
      messages: [
        { role: "system", content: "Safety" },
        { role: "user", content: "Game data" },
        { role: "system", content: "Contract" },
      ],
      max_completion_tokens: 46000,
      provider,
      tools,
    },
    40000,
  );
  assert.equal(request.system, "Safety\nContract");
  assert.deepEqual(request.messages, [{ role: "user", content: "Game data" }]);
  assert.equal(request.max_tokens, 46000);
  assert.deepEqual(request.output_config, {
    effort: "max",
    task_budget: { type: "tokens", total: 40000 },
  });
  assert.deepEqual(request.provider, provider);
  assert.deepEqual(request.tools, tools);
  assert.deepEqual(request.stop_server_tools_when, [{ type: "step_count_is", step_count: 1 }]);
});

test("native usage retains the reconciliation id, cost and cached tokens but excludes thinking", () => {
  const response = anthropicCoachResponse(
    {
      id: "msg-native",
      stop_reason: "end_turn",
      content: [
        { type: "thinking", thinking: "private thinking" },
        {
          type: "text",
          text: "{}",
          citations: [
            {
              type: "web_search_result_location",
              title: "Riot",
              url: "https://www.leagueoflegends.com/en-us/news/",
              cited_text: "ignored text",
            },
          ],
        },
      ],
      usage: {
        cost: 0.015,
        input_tokens: 100,
        cache_creation_input_tokens: 20,
        cache_read_input_tokens: 30,
        output_tokens: 200,
      },
    },
    "gen-native-123",
    true,
  );
  assert.equal(response.id, "gen-native-123");
  assert.deepEqual(response.usage, { cost: 0.015, prompt_tokens: 150, completion_tokens: 200 });
  assert.ok(!JSON.stringify(response).includes("private thinking"));
  assert.ok(!JSON.stringify(response).includes("ignored text"));
  const choice = (
    response.choices as {
      finish_reason: string;
      message: { content: string; annotations: unknown };
    }[]
  )[0];
  assert.equal(choice.finish_reason, "stop");
  assert.equal(choice.message.content, "{}");
  assert.equal(extractSources(choice.message.annotations).length, 1);
});

test("native refusal, truncation and unexpected tool blocks cannot masquerade as complete text", () => {
  for (const [stop, expected] of [
    ["refusal", "content_filter"],
    ["max_tokens", "length"],
    ["pause_turn", "pause_turn"],
  ]) {
    const response = anthropicCoachResponse(
      { stop_reason: stop, content: [{ type: "thinking", thinking: "hidden" }] },
      null,
      false,
    );
    const choice = (
      response.choices as { finish_reason: string; message: { content: unknown } }[]
    )[0];
    assert.equal(choice.finish_reason, expected);
    assert.equal(choice.message.content, null);
  }
  for (const type of ["tool_use", "server_tool_use", "unknown"]) {
    const response = anthropicCoachResponse(
      {
        stop_reason: "end_turn",
        content: [
          { type, input: { private: "hidden" } },
          { type: "text", text: "{}" },
        ],
      },
      null,
      false,
    );
    assert.ok(JSON.stringify(response).includes('"tool_calls"'));
    assert.ok(!JSON.stringify(response).includes("hidden"));
  }
});
