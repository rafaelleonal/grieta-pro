import type { ChampionDetails } from "./catalog";
import type { BuildCoachResult, Catalog, CoachInput } from "./types";
import { ApiError } from "./http";
import {
  BUILD_CONTRACT,
  BUILD_INSTRUCTIONS,
  BUILD_JSON_SCHEMA,
  decodeBuild,
} from "./build-contract";
import { recoverBuildCoachPlan } from "./coach-recovery";
import { RUNE_SHARD_ROWS } from "./rune-shards";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
export const GEMINI_FLASH_MODEL = "google/gemini-3.8-flash";
export const GEMINI_PRO_MODEL = "google/gemini-3.1-pro-preview";

/** Precios máximos por millón de tokens: OpenRouter rechaza un proveedor más caro. */
const MODELS = {
  [GEMINI_FLASH_MODEL]: { prompt: 0.75, completion: 3.75, effort: "low", maxTokens: 6000 },
  [GEMINI_PRO_MODEL]: { prompt: 2, completion: 12, effort: "low", maxTokens: 8000 },
} as const;
type SupportedModel = keyof typeof MODELS;

const TIMEOUT_MS = 45_000;
const MAX_RESPONSE_BYTES = 256_000;
// Long enough to identify completed items and abilities, short enough to keep the
// prompt around 30 KB. Item and rune choices are still checked against the catalog.
const ITEM_DETAIL_GOLD = 2200;
const ITEM_DETAIL_CHARS = 100;
const ABILITY_CHARS = 220;

export function buildModel(): SupportedModel {
  const configured = process.env.OPENROUTER_MODEL?.trim();
  return configured && configured in MODELS ? (configured as SupportedModel) : GEMINI_FLASH_MODEL;
}

/** One row per item name; Data Dragon repeats some items under longer other-mode IDs. */
export function promptItems(catalog: Catalog): Catalog["items"] {
  const byName = new Map<string, Catalog["items"][number]>();
  for (const item of catalog.items) {
    const current = byName.get(item.name);
    if (
      !current ||
      item.id.length < current.id.length ||
      (item.id.length === current.id.length && Number(item.id) < Number(current.id))
    )
      byName.set(item.name, item);
  }
  return [...byName.values()];
}

function abilities(details: ChampionDetails | null) {
  if (!details) return undefined;
  return [
    `P ${details.passive.name}: ${details.passive.description.slice(0, ABILITY_CHARS)}`,
    ...details.spells.map(
      ({ key, name, description, tooltip }) =>
        `${key} ${name}: ${(tooltip || description).slice(0, ABILITY_CHARS)}`,
    ),
  ];
}

/** Opening baskets for roles whose first item is fixed by the game. */
function startingOptions(role: CoachInput["role"], catalog: Catalog): string[][] {
  const prices = new Map(catalog.items.map((item) => [item.id, item.gold]));
  const starters =
    role === "JUNGLE" ? ["1101", "1102", "1103"] : role === "SUPPORT" ? ["3865"] : [];
  const potion = prices.get("2003");
  return starters.flatMap((id) => {
    const gold = prices.get(id);
    if (gold === undefined || gold > 500) return [];
    return potion !== undefined && gold + potion <= 500 ? [[id], [id, "2003"]] : [[id]];
  });
}

export function buildPrompt(
  input: CoachInput,
  catalog: Catalog,
  details: { champion: ChampionDetails | null; enemy: ChampionDetails | null },
) {
  const name = (id: string) => catalog.champions.find((champion) => champion.id === id)?.name || id;
  const options = startingOptions(input.role, catalog);
  const context = {
    champion: {
      id: input.champion,
      name: name(input.champion),
      abilities: abilities(details.champion),
    },
    enemy: { id: input.enemy, name: name(input.enemy), abilities: abilities(details.enemy) },
    role: input.role,
    riotVersion: catalog.version,
    ...(options.length ? { startingOptions: options } : {}),
    summonerSpells: catalog.summoners.map(({ id, name }) => [id, name]),
    runeStyles: catalog.runeStyles.map(({ key, name }) => [key, name]),
    runes: catalog.runes.map(({ key, name, style, slot }) => [key, name, style, slot]),
    statShardRows: RUNE_SHARD_ROWS,
    items: promptItems(catalog).map((item) =>
      item.gold >= ITEM_DETAIL_GOLD
        ? [item.id, item.name, item.gold, item.description.slice(0, ITEM_DETAIL_CHARS)]
        : [item.id, item.name, item.gold],
    ),
  };
  return [
    { role: "system", content: BUILD_INSTRUCTIONS },
    {
      role: "user",
      content: `Build para ${name(input.champion)} (${input.role}) contra ${name(input.enemy)}.\n${JSON.stringify(context)}`,
    },
  ];
}

function providerFailure(status: number): ApiError {
  if (status === 401 || status === 403)
    return new ApiError(503, "El servidor no tiene una clave válida de OpenRouter.");
  if (status === 402)
    return new ApiError(503, "Se agotó el crédito de IA del servidor. Inténtalo más tarde.");
  if (status === 429)
    return new ApiError(503, "El proveedor de IA está saturado. Inténtalo en unos segundos.");
  return new ApiError(502, "El proveedor de IA no respondió bien. Vuelve a intentarlo.");
}

async function readBody(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (text.length > MAX_RESPONSE_BYTES) throw new Error("Oversized provider body");
  const body: unknown = JSON.parse(text);
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Invalid body");
  return body as Record<string, unknown>;
}

function reportedCost(usage: unknown): string | null {
  const cost = usage && typeof usage === "object" ? (usage as { cost?: unknown }).cost : undefined;
  if (typeof cost === "number" && Number.isFinite(cost) && cost >= 0 && cost < 1000)
    return cost.toFixed(8);
  return null;
}

export type GeneratedBuild = {
  result: BuildCoachResult;
  /** Only complete, fully validated builds with live Riot data are shared through the cache. */
  complete: boolean;
};

/** A single paid call; never retried here. Throws ApiError with a user-facing message. */
export async function generateBuild(
  input: CoachInput,
  catalog: Catalog,
  details: { champion: ChampionDetails | null; enemy: ChampionDetails | null },
  options: {
    apiKey: string;
    model?: SupportedModel;
    fetcher?: typeof fetch;
    signal?: AbortSignal;
    /** Called once after the request is sent, with the reported cost or null. */
    onCost?: (cost: string | null) => void;
  },
): Promise<GeneratedBuild> {
  const model = options.model || buildModel();
  const policy = MODELS[model];
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const signal = options.signal ? AbortSignal.any([timeout, options.signal]) : timeout;
  let response: Response;
  try {
    response = await (options.fetcher || fetch)(ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json",
        "X-OpenRouter-Title": "Elociencia",
      },
      signal,
      cache: "no-store",
      redirect: "error",
      body: JSON.stringify({
        model,
        messages: buildPrompt(input, catalog, details),
        max_completion_tokens: policy.maxTokens,
        reasoning: { enabled: true, effort: policy.effort, exclude: true },
        response_format: {
          type: "json_schema",
          json_schema: { name: "league_build", strict: true, schema: BUILD_JSON_SCHEMA },
        },
        provider: {
          require_parameters: true,
          allow_fallbacks: false,
          max_price: { prompt: policy.prompt, completion: policy.completion, request: 0 },
        },
      }),
    });
  } catch {
    options.onCost?.(null);
    if (timeout.aborted)
      throw new ApiError(504, "La IA tardó demasiado. Vuelve a intentarlo en un momento.");
    if (options.signal?.aborted) throw new ApiError(499, "Consulta cancelada.");
    throw new ApiError(503, "No pudimos conectar con el proveedor de IA. Vuelve a intentarlo.");
  }
  let data: Record<string, unknown>;
  try {
    data = await readBody(response);
  } catch {
    options.onCost?.(null);
    if (!response.ok) throw providerFailure(response.status);
    throw new ApiError(502, "La IA devolvió una respuesta ilegible. Vuelve a intentarlo.");
  }
  const cost = reportedCost(data.usage);
  options.onCost?.(cost);
  if (!response.ok || data.error) throw providerFailure(response.ok ? 502 : response.status);
  const choice = Array.isArray(data.choices)
    ? (data.choices[0] as { message?: { content?: unknown }; finish_reason?: unknown } | undefined)
    : undefined;
  if (choice?.finish_reason !== "stop" || typeof choice.message?.content !== "string")
    throw new ApiError(502, "La IA no completó la build. Vuelve a intentarlo.");
  let json: unknown;
  try {
    json = JSON.parse(choice.message.content);
  } catch {
    throw new ApiError(502, "La IA devolvió un formato inesperado. Vuelve a intentarlo.");
  }
  const decoded = decodeBuild(json);
  const recovered = recoverBuildCoachPlan(decoded, catalog, input, true);
  // A section that fails validation is omitted, never repaired; with nothing left to
  // show, the response counts as failed and the player can ask again.
  if (
    !recovered.plan.build.runes &&
    !recovered.plan.build.summoners &&
    !recovered.plan.build.core.length
  )
    throw new ApiError(502, "La IA devolvió una build incoherente. Vuelve a intentarlo.");
  const complete = !recovered.invalid.length && !recovered.missing.length;
  const warnings: string[] = [];
  if (!complete)
    warnings.push("Parte de la respuesta no superó la validación; se muestran sólo datos válidos.");
  if (catalog.source === "snapshot")
    warnings.push(`Riot no respondió: se usó el catálogo guardado ${catalog.version}.`);
  if (!details.champion || !details.enemy)
    warnings.push("No pudimos confirmar las habilidades con Riot; la build es orientativa.");
  return {
    complete: complete && catalog.source === "live" && Boolean(details.champion && details.enemy),
    result: {
      plan: recovered.plan,
      meta: {
        version: catalog.version,
        catalogSource: catalog.source,
        model,
        webSearchRequested: false,
        sources: [],
        generatedAt: new Date().toISOString(),
        warnings,
        formatVersion: 4,
        ...(complete
          ? {}
          : {
              partial: {
                missing: recovered.missing,
                invalid: recovered.invalid,
                categories: recovered.categories,
                reason: "validation" as const,
              },
            }),
      },
    },
  };
}

export { BUILD_CONTRACT };
