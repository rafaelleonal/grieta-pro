import test from "node:test";
import assert from "node:assert/strict";
import { GenerationIntents } from "../lib/generation-intent";
import type { CoachInput, DraftInput } from "../lib/types";

const input: CoachInput = {
  champion: "Ahri",
  enemy: "Yasuo",
  role: "MID",
  rank: "Oro",
  allies: [],
  enemies: [],
  notes: "Juego sin teleport.",
  webSearch: false,
};
const model = "openai/gpt-5.6-luna";

test("an identical retry reuses its request key until a response is recovered", async () => {
  const intents = new GenerationIntents();
  intents.setOwner("first-account");
  const first = await intents.get("first-account", "COACH", input, model);
  assert.ok(first);
  assert.equal((await intents.get("first-account", "COACH", input, model))?.key, first.key);
  intents.resolve(first.key, { state: "SETTLED", hasResponse: true });
  assert.equal((await intents.get("first-account", "COACH", input, model))?.key, first.key);
  intents.complete(first.key);
  assert.notEqual((await intents.get("first-account", "COACH", input, model))?.key, first.key);
});

test("uncertain reservations retain their key and allow distinct inputs or models", async () => {
  const intents = new GenerationIntents();
  intents.setOwner("first-account");
  const first = await intents.get("first-account", "COACH", input, model);
  assert.ok(first);
  intents.resolve(first.key, { state: "UNKNOWN", hasResponse: false });
  assert.deepEqual((await intents.get("first-account", "COACH", input, model))?.attempt, {
    state: "UNKNOWN",
    hasResponse: false,
  });
  assert.notEqual(
    (await intents.get("first-account", "COACH", { ...input, enemy: "Zed" }, model))?.key,
    first.key,
  );
  assert.notEqual(
    (await intents.get("first-account", "COACH", { ...input, model: "another/model" }, model))?.key,
    first.key,
  );
  assert.equal((await intents.get("first-account", "COACH", input, model))?.key, first.key);
});

test("a saved response with uncertain cost retains its replay key without releasing the reservation", async () => {
  const intents = new GenerationIntents();
  intents.setOwner("first-account");
  const first = await intents.get("first-account", "COACH", input, model);
  assert.ok(first);
  intents.resolve(first.key, { state: "UNKNOWN", hasResponse: true });
  const replay = await intents.get("first-account", "COACH", input, model);
  assert.equal(replay?.key, first.key);
  assert.deepEqual(replay?.attempt, { state: "UNKNOWN", hasResponse: true });
});

test("only a terminal attempt without a response releases its key for an explicit new request", async () => {
  for (const state of ["RESERVED", "DISPATCHED", "UNKNOWN", "SETTLED", "VOID"] as const) {
    const intents = new GenerationIntents();
    intents.setOwner("first-account");
    const first = await intents.get("first-account", "COACH", input, model);
    assert.ok(first);
    intents.resolve(first.key, { state, hasResponse: false });
    const retry = await intents.get("first-account", "COACH", input, model);
    if (state === "SETTLED" || state === "VOID") assert.notEqual(retry?.key, first.key);
    else assert.equal(retry?.key, first.key);
  }
});

test("sign-out and identity changes discard old intents and in-flight hashing", async () => {
  const intents = new GenerationIntents();
  intents.setOwner("first-account");
  const first = await intents.get("first-account", "COACH", input, model);
  const hashing = intents.get("first-account", "COACH", input, model);
  intents.setOwner("second-account");
  assert.equal(await hashing, null);
  assert.equal(await intents.get("first-account", "COACH", input, model), null);
  const second = await intents.get("second-account", "COACH", input, model);
  assert.ok(second);
  assert.notEqual(second.key, first?.key);
  intents.resolve(first!.key, { state: "SETTLED", hasResponse: false });
  assert.equal(intents.latest(), second.key);
  intents.clear();
  assert.equal(intents.latest(), undefined);
  assert.equal(await intents.get("second-account", "COACH", input, model), null);
});

test("credentials never enter the retained intent and only funding mode affects its identity", async () => {
  const intents = new GenerationIntents();
  intents.setOwner("first-account");
  const first = await intents.get(
    "first-account",
    "COACH",
    { ...input, apiKey: "synthetic-key-one", accessToken: "synthetic-token-one" },
    model,
  );
  const retry = await intents.get(
    "first-account",
    "COACH",
    { ...input, apiKey: "synthetic-key-two", accessToken: "synthetic-token-two" },
    model,
  );
  assert.equal(first?.key, retry?.key);
  assert.notEqual((await intents.get("first-account", "COACH", input, model))?.key, first?.key);
  const retained = JSON.stringify(Array.from(Reflect.get(intents, "intents").values()));
  for (const privateText of ["synthetic-key", "synthetic-token", input.notes])
    assert.equal(retained.includes(privateText), false);
});

test("image identity is hashed in memory and repeated draft detection remains idempotent", async () => {
  const intents = new GenerationIntents();
  intents.setOwner("first-account");
  const draft: DraftInput = { text: "Ahri contra Yasuo", image: "data:image/png;base64,synthetic" };
  const first = await intents.get("first-account", "DRAFT", draft, model);
  assert.equal((await intents.get("first-account", "DRAFT", draft, model))?.key, first?.key);
  assert.notEqual(
    (
      await intents.get(
        "first-account",
        "DRAFT",
        { ...draft, image: `${draft.image}changed` },
        model,
      )
    )?.key,
    first?.key,
  );
  const retained = JSON.stringify(Array.from(Reflect.get(intents, "intents").values()));
  assert.equal(retained.includes(draft.image!), false);
  assert.equal(retained.includes(draft.text!), false);
});

test("parallel preparation deduplicates the same intent", async () => {
  const intents = new GenerationIntents();
  intents.setOwner("first-account");
  const [first, second] = await Promise.all([
    intents.get("first-account", "COACH", input, model),
    intents.get("first-account", "COACH", input, model),
  ]);
  assert.equal(first?.key, second?.key);
});
