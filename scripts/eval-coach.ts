import { readFile } from "node:fs/promises";
import { loadEnvConfig } from "@next/env";
import {
  coachEvaluationSchema,
  evaluationPoints,
  publishCoachEvaluation,
} from "../lib/coach-evaluation";

async function main() {
  // Only this checked-in, reviewed fixture is eligible for publication. No arbitrary user files.
  const evaluation = coachEvaluationSchema.parse(
    JSON.parse(
      await readFile(
        new URL("../tests/fixtures/coach-evaluation-2026-10-12.json", import.meta.url),
        "utf8",
      ),
    ),
  );
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--publish-laminar")) throw new Error("Opción desconocida.");
  const points = evaluationPoints(evaluation);
  console.table(points.map((point) => ({ case: point.data.case, ...point.scores })));
  console.log("Revisión histórica sintética; no ejecuta el coach ni acredita una versión nueva.");
  if (args.includes("--publish-laminar")) {
    loadEnvConfig(process.cwd(), false, { info: () => {}, error: () => {} });
    const apiKey = process.env.LMNR_EVAL_API_KEY?.trim();
    if (!apiKey)
      throw new Error("Configura LMNR_EVAL_API_KEY en el servidor para publicar la evaluación.");
    try {
      const id = await publishCoachEvaluation({ apiKey }, evaluation);
      console.log(`Evaluación publicada: ${id}`);
    } catch {
      // Do not print raw network errors, which may include request diagnostics.
      console.error(
        "No se confirmó la publicación. Revisa Laminar antes de repetir; puede existir una evaluación parcial.",
      );
      process.exitCode = 1;
    }
  }
}

void main().catch(() => {
  console.error(
    "No se completó la evaluación. Comprueba la configuración y el archivo de casos; no se llamó a ningún modelo.",
  );
  process.exitCode = 1;
});
