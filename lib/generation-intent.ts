import { safeNotesForStorage } from "./coach-safety";
import type { CoachInput, DraftInput } from "./types";

export type GenerationAttempt = {
  state: "RESERVED" | "DISPATCHED" | "UNKNOWN" | "SETTLED" | "VOID";
  hasResponse: boolean;
};

type Intent = { key: string; fingerprint: string; attempt?: GenerationAttempt };

async function digest(value: unknown): Promise<string> {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Only digests and request keys are retained, for the currently open account. */
export class GenerationIntents {
  private owner: string | null = null;
  private version = 0;
  private intents = new Map<string, Intent>();
  private latestKey: string | undefined;

  setOwner(owner: string | null) {
    if (this.owner === owner) return;
    this.clear();
    this.owner = owner;
  }

  clear() {
    this.version += 1;
    this.owner = null;
    this.intents.clear();
    this.latestKey = undefined;
  }

  latest() {
    return this.latestKey;
  }

  async get(
    owner: string,
    operation: "COACH" | "DRAFT",
    input: CoachInput | DraftInput,
    defaultModel: string,
  ): Promise<Intent | null> {
    if (owner !== this.owner) return null;
    const version = this.version;
    const context =
      operation === "COACH"
        ? {
            champion: (input as CoachInput).champion,
            enemy: (input as CoachInput).enemy,
            role: (input as CoachInput).role,
            rank: (input as CoachInput).rank,
            allies: (input as CoachInput).allies.filter(Boolean),
            enemies: (input as CoachInput).enemies.filter(Boolean),
            notes: safeNotesForStorage((input as CoachInput).notes.trim()),
            webSearch: (input as CoachInput).webSearch,
          }
        : {
            text: (input as DraftInput).text?.trim() || "",
            imageHash: (input as DraftInput).image
              ? await digest((input as DraftInput).image)
              : null,
          };
    const fingerprint = await digest({
      operation,
      model: input.model?.trim() || defaultModel,
      byok: Boolean(input.apiKey?.trim()),
      context,
    });
    if (version !== this.version || owner !== this.owner) return null;
    let intent = this.intents.get(fingerprint);
    if (!intent) {
      intent = { key: crypto.randomUUID(), fingerprint };
      this.intents.set(fingerprint, intent);
    }
    this.latestKey = intent.key;
    return intent;
  }

  resolve(key: string, attempt: GenerationAttempt | null | undefined) {
    if (!attempt) return;
    for (const [fingerprint, intent] of this.intents) {
      if (intent.key !== key) continue;
      if ((attempt.state === "SETTLED" || attempt.state === "VOID") && !attempt.hasResponse) {
        this.intents.delete(fingerprint);
        if (this.latestKey === key) this.latestKey = undefined;
      } else intent.attempt = attempt;
      return;
    }
  }

  complete(key: string) {
    for (const [fingerprint, intent] of this.intents) {
      if (intent.key !== key) continue;
      this.intents.delete(fingerprint);
      if (this.latestKey === key) this.latestKey = undefined;
      return;
    }
  }
}
