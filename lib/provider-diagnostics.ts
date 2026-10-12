import { MODEL_POLICIES } from "./usage";
import { COACH_PLAN_VALIDATION_CATEGORIES } from "./validation";

type RecordValue = Record<string, unknown>;
const objectValue = (value: unknown): value is RecordValue =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

export const PARAMETER_ERROR_MESSAGES = {
  schema_complexity:
    "OpenRouter rechazó el formato de respuesta porque el esquema es demasiado complejo. Tu selección sigue guardada.",
  unsupported_schema_keywords:
    "OpenRouter rechazó una restricción del formato de respuesta. Tu selección sigue guardada.",
  unsupported_schema_regex:
    "OpenRouter rechazó un patrón del formato de respuesta. Tu selección sigue guardada.",
  schema_required:
    "OpenRouter rechazó los campos obligatorios del formato de respuesta. Tu selección sigue guardada.",
  schema_additional_properties:
    "OpenRouter rechazó la configuración de campos adicionales del formato de respuesta. Tu selección sigue guardada.",
  invalid_reasoning:
    "OpenRouter rechazó la configuración de razonamiento de la consulta. Tu selección sigue guardada.",
  invalid_max_tokens:
    "OpenRouter rechazó el límite de tokens de la consulta. Tu selección sigue guardada.",
  context_length:
    "OpenRouter rechazó el tamaño del contexto de la consulta. Tu selección sigue guardada.",
} as const;
export type ParameterErrorCategory = keyof typeof PARAMETER_ERROR_MESSAGES;

/** Inspect only bounded diagnostic message fields, never arbitrary echoed inputs. */
export function parameterErrorCategory(error: unknown): ParameterErrorCategory | undefined {
  if (!objectValue(error)) return;
  const texts: string[] = [];
  const addMessage = (value: unknown) => {
    if (typeof value === "string") texts.push(value.slice(0, 2048));
  };
  const addRawMessages = (raw: unknown) => {
    if (!objectValue(raw)) return;
    addMessage(raw.message);
    if (objectValue(raw.error)) addMessage(raw.error.message);
  };
  addMessage(error.message);
  const raw = objectValue(error.metadata) ? error.metadata.raw : undefined;
  if (typeof raw === "string") {
    if (/^\s*(?:\[|{)/.test(raw)) {
      if (raw.length <= 8192) {
        try {
          addRawMessages(JSON.parse(raw));
        } catch {
          /* Malformed diagnostics use only the safe generic category. */
        }
      }
    } else addMessage(raw);
  } else addRawMessages(raw);
  const categories: [ParameterErrorCategory, RegExp][] = [
    [
      "schema_complexity",
      /\bschema (?:is )?too complex\b|\b(?:too many|exceeds?|maximum).{0,80}\bunion(?:s| types)?\b/i,
    ],
    [
      "unsupported_schema_regex",
      /\b(?:regex|regular expression|pattern)\b.{0,100}\b(?:unsupported|not supported|invalid|not allowed)\b|\b(?:unsupported|invalid|not supported|not allowed)\b.{0,100}\b(?:regex|regular expression|pattern)\b/i,
    ],
    [
      "unsupported_schema_keywords",
      /\b(?:unsupported|not supported|does not support)\b.{0,100}\b(?:json schema|schema keyword|schema constraint|minLength|maxLength|minItems|maxItems|minimum|maximum|multipleOf|prefixItems)\b|\b(?:json schema|schema keyword|schema constraint|minLength|maxLength|minItems|maxItems|minimum|maximum|multipleOf|prefixItems)\b.{0,100}\b(?:unsupported|not supported|not allowed)\b/i,
    ],
    [
      "schema_additional_properties",
      /\badditionalProperties\b.{0,100}\b(?:must|should|invalid|required|false|not allowed)\b|\b(?:missing|required|invalid)\b.{0,100}\badditionalProperties\b/i,
    ],
    [
      "schema_required",
      /\brequired\b.{0,100}\barray\b.{0,100}\b(?:properties|property)\b|\b(?:schema|response_format)\b.{0,100}\brequired\b.{0,100}\b(?:must|should|invalid|missing|supplied|array|property|properties)\b/i,
    ],
    [
      "invalid_reasoning",
      /\b(?:reasoning|thinking|budget_tokens)\b.{0,100}\b(?:invalid|unsupported|not supported|not allowed|must|cannot)\b|\b(?:invalid|unsupported|not supported|not allowed)\b.{0,100}\b(?:reasoning|thinking|budget_tokens)\b|\bmax_tokens must be greater than (?:thinking\.)?budget_tokens\b/i,
    ],
    [
      "context_length",
      /\b(?:context (?:length|window)|context_length_exceeded)\b.{0,100}\b(?:exceed|exceeds|exceeded|limit|maximum|too long)\b|\b(?:exceed|exceeds|exceeded|too long)\b.{0,100}\bcontext (?:length|window)\b/i,
    ],
    [
      "invalid_max_tokens",
      /\b(?:max_tokens|max_completion_tokens)\b.{0,100}\b(?:invalid|unsupported|not supported|must|cannot|maximum|exceed|exceeds|exceeded)\b|\b(?:invalid|unsupported|not supported)\b.{0,100}\b(?:max_tokens|max_completion_tokens)\b/i,
    ],
  ];
  return categories.find(([, pattern]) => texts.some((text) => pattern.test(text)))?.[0];
}

// OpenRouter's stable Chat Completions vocabulary, never provider-authored free text.
// https://openrouter.ai/docs/api_reference/errors-and-debugging#typed-error-codes
const ERROR_TYPES = [
  "context_length_exceeded",
  "max_tokens_exceeded",
  "token_limit_exceeded",
  "string_too_long",
  "authentication",
  "permission_denied",
  "payment_required",
  "rate_limit_exceeded",
  "provider_overloaded",
  "provider_unavailable",
  "invalid_request",
  "invalid_prompt",
  "not_found",
  "precondition_failed",
  "payload_too_large",
  "unprocessable",
  "content_policy_violation",
  "refusal",
  "invalid_image",
  "image_too_large",
  "image_too_small",
  "unsupported_image_format",
  "image_not_found",
  "image_download_failed",
  "server",
  "timeout",
  "unmapped",
] as const;
const LOCAL_CATEGORIES = [
  "unclassified",
  "connection_error",
  "request_cancelled",
  "unreadable_response",
  "incomplete_completion",
  "unexpected_tool_call",
  "invalid_completion_json",
  "protected_output",
  "output_validation",
] as const;
const STAGES = [
  "connection",
  "timeout",
  "body_invalid",
  "http_error",
  "embedded_error",
  "refusal",
  "incomplete",
  "invalid_json",
  "output_rejected",
] as const;
export type ProviderDiagnosticStage = (typeof STAGES)[number];
export type ProviderDiagnosticCategory =
  (typeof ERROR_TYPES)[number] | (typeof LOCAL_CATEGORIES)[number] | ParameterErrorCategory;
const ALLOWED_CATEGORIES = new Set<string>([
  ...ERROR_TYPES,
  ...LOCAL_CATEGORIES,
  ...Object.keys(PARAMETER_ERROR_MESSAGES),
]);
const errorTypes = new Set<string>(ERROR_TYPES);
const stages = new Set<string>(STAGES);
const validationCategories = new Set<string>(COACH_PLAN_VALIDATION_CATEGORIES);

export function providerFailureCategory(
  status: number,
  error?: unknown,
): ProviderDiagnosticCategory {
  const type =
    objectValue(error) && objectValue(error.metadata) ? error.metadata.error_type : undefined;
  if (typeof type === "string")
    return errorTypes.has(type) ? (type as (typeof ERROR_TYPES)[number]) : "unclassified";
  if (status === 400 || status === 422) return parameterErrorCategory(error) || "invalid_request";
  const statuses: Record<number, ProviderDiagnosticCategory> = {
    401: "authentication",
    402: "payment_required",
    403: "permission_denied",
    404: "not_found",
    408: "timeout",
    429: "rate_limit_exceeded",
    502: "provider_unavailable",
    503: "provider_unavailable",
    504: "timeout",
    524: "timeout",
    500: "server",
  };
  return statuses[status] || "unclassified";
}

export interface ProviderDiagnosticInput {
  stage: unknown;
  category: unknown;
  schemaName: unknown;
  model: unknown;
  httpStatus?: unknown;
  durationMs: unknown;
  parameterCategory?: unknown;
  validationCategory?: unknown;
}

/** Construct a fresh fixed-field event. Keys, prompts, errors and metadata are never serialized. */
export function safeProviderDiagnostic(input: ProviderDiagnosticInput) {
  return {
    event: "openrouter_failure" as const,
    version: 1 as const,
    stage: typeof input.stage === "string" && stages.has(input.stage) ? input.stage : "connection",
    category:
      typeof input.category === "string" && ALLOWED_CATEGORIES.has(input.category)
        ? input.category
        : "unclassified",
    parameterCategory:
      typeof input.parameterCategory === "string" &&
      Object.hasOwn(PARAMETER_ERROR_MESSAGES, input.parameterCategory)
        ? input.parameterCategory
        : null,
    validationCategory:
      input.category === "output_validation" &&
      typeof input.validationCategory === "string" &&
      validationCategories.has(input.validationCategory)
        ? input.validationCategory
        : null,
    operation:
      input.schemaName === "league_coach_plan"
        ? "COACH"
        : input.schemaName === "league_draft_extraction"
          ? "DRAFT"
          : "UNKNOWN",
    model:
      typeof input.model === "string" && Object.hasOwn(MODEL_POLICIES, input.model)
        ? input.model
        : "other",
    httpStatus:
      typeof input.httpStatus === "number" &&
      Number.isInteger(input.httpStatus) &&
      input.httpStatus >= 100 &&
      input.httpStatus <= 599
        ? input.httpStatus
        : null,
    durationMs:
      typeof input.durationMs === "number" && Number.isFinite(input.durationMs)
        ? Math.max(0, Math.min(300_000, Math.floor(input.durationMs)))
        : 0,
  };
}

export function logProviderFailure(input: ProviderDiagnosticInput): void {
  try {
    console.warn(JSON.stringify(safeProviderDiagnostic(input)));
  } catch {
    // Observability must never turn a completed paid call into another failure.
  }
}
