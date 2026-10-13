import assert from "node:assert/strict";
import test from "node:test";
import baseline from "./fixtures/coach-evaluation-2026-10-12.json";
import {
  coachEvaluationSchema,
  evaluationPoints,
  publishCoachEvaluation,
} from "../lib/coach-evaluation";

test("complete fast outputs with incorrect or unreviewed tactics never pass promotion", () => {
  const evaluation = coachEvaluationSchema.parse(baseline);
  const points = evaluationPoints(evaluation);
  assert.equal(points.filter((p) => p.scores.complete === 1).length, 6);
  assert.equal(points.filter((p) => p.scores.first_useful_under_5s === 1).length, 5);
  assert.equal(points.filter((p) => p.scores.mechanics === 0).length, 3);
  assert.equal(points.filter((p) => p.scores.mechanics === null).length, 3);
  assert.ok(points.every((p) => p.scores.ready === 0 && p.scores.expert_review === null));
  const corrected = structuredClone(evaluation);
  corrected.cases.forEach((row) => {
    row.mechanics = "passed";
    row.context = "passed";
    row.expertReview = "passed";
  });
  assert.equal(evaluationPoints(corrected).filter((p) => p.scores.ready === 1).length, 5);
});

test("archived eval uploads scores via the documented API without executing AI", async () => {
  const requests: string[] = [];
  const id = "00000000-0000-4000-8000-000000000001";
  const result = await publishCoachEvaluation(
    { apiKey: "eval-key" },
    coachEvaluationSchema.parse(baseline),
    async (url, init) => {
      requests.push(String(url));
      const body = String(init?.body);
      assert.doesNotMatch(body, /eval-key|OPENROUTER|apiKey/);
      if (requests.length === 1) return Response.json({ id });
      const payload = JSON.parse(body);
      assert.equal(payload.points.length, 6);
      assert.equal(payload.points[1].scores.mechanics, 0);
      return Response.json(id);
    },
  );
  assert.equal(result, id);
  assert.deepEqual(requests, [
    "https://api.lmnr.ai/v1/evals",
    `https://api.lmnr.ai/v1/evals/${id}/datapoints`,
  ]);
});

test("failed or redirected evaluation uploads stop; never silently retry or imply success", async () => {
  for (const status of [302, 500]) {
    let calls = 0;
    await assert.rejects(
      publishCoachEvaluation({ apiKey: "key" }, coachEvaluationSchema.parse(baseline), async () => {
        calls++;
        return new Response("PRIVATE PROVIDER ERROR", { status });
      }),
      /Laminar rechazó/,
    );
    assert.equal(calls, 1);
  }
});
