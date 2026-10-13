import { z } from "zod";
import { laminarPost, type LaminarConfig } from "./laminar";

export const coachEvaluationSchema = z
  .object({
    name: z.string().max(100),
    model: z.string().max(100),
    catalog: z.string().max(30),
    evidenceDate: z.string().date(),
    cases: z
      .array(
        z
          .object({
            id: z.string().max(80),
            role: z.enum(["TOP", "MID", "ADC", "JUNGLE", "SUPPORT"]),
            firstUsefulMs: z.number().int().nonnegative(),
            totalMs: z.number().int().nonnegative(),
            complete: z.boolean(),
            mechanics: z.enum(["failed", "unreviewed", "passed"]),
            context: z.enum(["failed", "unreviewed", "passed"]),
            expertReview: z.enum(["failed", "unreviewed", "passed"]),
            findings: z.array(z.string().max(500)).max(10),
            references: z.array(z.string().url()).max(5),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();
export type CoachEvaluation = z.infer<typeof coachEvaluationSchema>;

const score = (verdict: "failed" | "unreviewed" | "passed") =>
  verdict === "unreviewed" ? null : verdict === "passed" ? 1 : 0;

/** Unknown quality stays null. Structure/latency can never substitute for tactical review. */
export function evaluationPoints(evaluation: CoachEvaluation) {
  return evaluation.cases.map((row, index) => ({
    index,
    data: { case: row.id, role: row.role, model: evaluation.model, catalog: evaluation.catalog },
    target: {
      firstUsefulMsMax: 5_000,
      mechanics: "passed",
      context: "passed",
      expertReview: "passed",
    },
    executorOutput: {
      findings: row.findings,
      firstUsefulMs: row.firstUsefulMs,
      totalMs: row.totalMs,
    },
    metadata: {
      references: row.references,
      evidenceDate: evaluation.evidenceDate,
      evidence: "archived_synthetic_review",
    },
    scores: {
      complete: Number(row.complete),
      first_useful_under_5s: Number(row.firstUsefulMs <= 5_000),
      mechanics: score(row.mechanics),
      context: score(row.context),
      expert_review: score(row.expertReview),
      ready: Number(
        row.complete &&
          row.firstUsefulMs <= 5_000 &&
          row.mechanics === "passed" &&
          row.context === "passed" &&
          row.expertReview === "passed",
      ),
    },
  }));
}

/** Explicit publication of a reviewed synthetic dataset only; never calls a model or judge. */
export async function publishCoachEvaluation(
  config: LaminarConfig,
  evaluation: CoachEvaluation,
  fetcher: typeof fetch = fetch,
) {
  const run = await laminarPost(
    config,
    "/v1/evals",
    {
      name: evaluation.name,
      groupName: "elociencia-coach",
      metadata: {
        model: evaluation.model,
        catalog: evaluation.catalog,
        evidenceDate: evaluation.evidenceDate,
        source: "archived_synthetic_review",
      },
    },
    fetcher,
  );
  const { id } = z.object({ id: z.string().uuid() }).parse(await run.json());
  try {
    const response = await laminarPost(
      config,
      `/v1/evals/${id}/datapoints`,
      {
        groupName: "elociencia-coach",
        points: evaluationPoints(evaluation),
      },
      fetcher,
    );
    await response.body?.cancel();
  } catch {
    throw new Error(
      `No se confirmaron los resultados de Laminar (${id}). Revisa esa evaluación antes de repetir el envío.`,
    );
  }
  return id;
}
