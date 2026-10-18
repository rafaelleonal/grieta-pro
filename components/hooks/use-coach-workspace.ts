"use client";
import type { CoachPreparation } from "@/lib/types";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { assertSafeInputText } from "@/lib/coach-safety";
import { DRAFT_STORAGE_KEY, EMPTY_INPUT, loadDraft, serializeDraft } from "@/lib/coach-draft";
import { postCoachStream } from "@/lib/client-coach-stream";
import { postJson } from "@/lib/client-api";
import { webSearchEnabled } from "@/lib/account-presentation";
import { generationAccess, type GenerationAccess } from "@/lib/generation-access";
import { demoInput, demoResult } from "@/lib/demo";
import type {
  CoachInput,
  Credentials,
  DraftResult,
  HistoryRecord,
  RiotResult,
  SavedCoachResult,
} from "@/lib/types";
import { useAccountSession } from "./use-account-session";
import { useAppData } from "./use-app-data";
import { useCapture } from "./use-capture";
import { useRiotImport } from "./use-riot-import";

function subscribeOnline(notify: () => void) {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
}
const onlineSnapshot = () => navigator.onLine;
const serverOnlineSnapshot = () => true;

export type Busy = "coach" | "draft" | "riot" | null;

/**
 * Estado y acciones del coach. Conserva los invariantes de AGENTS.md: autorización en el
 * servidor, idempotencia por intento, reservas inciertas sin repetir llamadas pagadas y
 * borrador separado por cuenta que se limpia al salir o cambiar de identidad.
 */
export function useCoachWorkspace() {
  const router = useRouter();
  const online = useSyncExternalStore(subscribeOnline, onlineSnapshot, serverOnlineSnapshot);
  const data = useAppData();
  const capture = useCapture();
  const riotImport = useRiotImport();
  const [input, setInput] = useState<CoachInput>(EMPTY_INPUT);
  const [credentials, setCredentials] = useState<Credentials>({});
  const [storageReady, setStorageReady] = useState(false);
  const [draftOwner, setDraftOwner] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState("");
  const [coachFailure, setCoachFailure] = useState(false);
  const [recoveryChecked, setRecoveryChecked] = useState(false);
  const [notice, setNotice] = useState("");
  const [preparation, setPreparation] = useState<CoachPreparation | null>(null);
  const [result, setResult] = useState<SavedCoachResult | null>(null);
  const [resultInput, setResultInput] = useState<CoachInput | null>(null);
  const [sample, setSample] = useState(false);
  const [editing, setEditing] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const recoveryVersion = useRef(0);

  const { reset: resetCapture } = capture;
  const { reset: resetRiot } = riotImport;
  const resetWorkspace = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    setBusy(null);
    setPreparation(null);
    resetCapture();
    resetRiot();
    setCredentials({});
    setResult(null);
    setEditing(true);
    setResultInput(null);
    setSample(false);
  }, [resetCapture, resetRiot]);

  const clearMessages = useCallback(() => {
    setError("");
    setCoachFailure(false);
    setRecoveryChecked(false);
    setNotice("");
  }, []);

  const clearPrivateStateRef = useRef<() => void>(() => undefined);
  const session = useAccountSession({
    onSessionChanged: () => clearPrivateStateRef.current(),
    onIdentityChange: (previous, next) => {
      // The first anonymous read has nothing private to clear.
      if (previous === undefined && next === null) {
        setDraftOwner(null);
        setStorageReady(true);
        return;
      }
      resetWorkspace();
      resetConsumption(next);
      if (previous !== undefined) {
        clearMessages();
        setSettingsOpen(false);
      }
      let saved: CoachInput | null = null;
      try {
        if (previous) localStorage.removeItem(`${DRAFT_STORAGE_KEY}:${previous}`);
        if (next) saved = loadDraft(localStorage.getItem(`${DRAFT_STORAGE_KEY}:${next}`));
      } catch {
        /* Browser storage is optional. */
      }
      setInput(saved || EMPTY_INPUT);
      setDraftOwner(next);
      setStorageReady(true);
    },
  });
  const { account, owner, identityRef, resetConsumption, refreshAccount } = session;

  const clearPrivateState = useCallback(() => {
    resetWorkspace();
    resetConsumption(identityRef.current || null);
    setInput(EMPTY_INPUT);
    clearMessages();
    setSettingsOpen(false);
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      if (identityRef.current)
        localStorage.removeItem(`${DRAFT_STORAGE_KEY}:${identityRef.current}`);
    } catch {
      /* Private state is cleared in memory even without browser storage. */
    }
  }, [resetWorkspace, resetConsumption, identityRef, clearMessages]);
  useEffect(() => {
    clearPrivateStateRef.current = clearPrivateState;
  }, [clearPrivateState]);

  // Abort any request in flight when the workspace unmounts.
  useEffect(() => () => controller.current?.abort(), []);

  // Persist the draft only for the account that owns it.
  useEffect(() => {
    if (!storageReady || !owner || draftOwner !== owner) return;
    try {
      localStorage.setItem(`${DRAFT_STORAGE_KEY}:${owner}`, serializeDraft(input));
    } catch {
      /* The draft remains available in memory. */
    }
  }, [input, storageReady, owner, draftOwner]);

  const effectiveCredentials = credentials;
  const defaultModel = account?.usage?.defaultModel || data.status?.defaultModel;
  const ready = Boolean(data.status?.configured || effectiveCredentials.apiKey);
  const access = generationAccess({
    account,
    accountError: session.accountError,
    status: data.status,
    statusError: data.statusError,
    credentials: effectiveCredentials,
    requestedWeb: input.webSearch,
    online,
    busy: Boolean(busy || capture.preparingImage || (account && draftOwner !== owner)),
    selectionReady: Boolean(
      data.catalog?.champions.some((entry) => entry.id === input.champion) &&
      data.catalog?.champions.some((entry) => entry.id === input.enemy),
    ),
  });
  const rateLimitedUntil = account?.usage?.rateLimitedUntil;
  useEffect(() => {
    if (!rateLimitedUntil) return;
    const remaining = Date.parse(rateLimitedUntil) - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0) return;
    const timer = setTimeout(() => void refreshAccount(), Math.min(remaining + 100, 2_147_483_647));
    return () => clearTimeout(timer);
  }, [rateLimitedUntil, refreshAccount]);

  function update<K extends keyof CoachInput>(key: K, value: CoachInput[K]) {
    setInput((previous) => ({ ...previous, [key]: value }));
    setNotice("");
  }
  function begin(task: Exclude<Busy, null>) {
    recoveryVersion.current += 1;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setBusy(task);
    setPreparation(null);
    clearMessages();
    return abort;
  }
  function fail(cause: unknown, abort: AbortController) {
    if (!abort.signal.aborted)
      setError(cause instanceof Error ? cause.message : "No pudimos completar la solicitud.");
  }
  function end(abort: AbortController) {
    if (controller.current === abort) {
      controller.current = null;
      setBusy(null);
      setPreparation(null);
    }
  }
  /** Dejar de esperar no prueba que la consulta fuera gratuita: se concilia el consumo. */
  function cancel() {
    controller.current?.abort();
    controller.current = null;
    setBusy(null);
    setPreparation(null);
    setNotice(
      "Espera cancelada. Si la consulta ya se envió, puede consumir cuota. Tu selección sigue aquí.",
    );
    void session.refreshAccount();
    void session.checkConsumption();
  }
  function applyAccess(check: GenerationAccess) {
    if (check.allowed) return true;
    if (check.action === "login") router.push("/login");
    else if (check.action === "verify") router.push("/verify-email");
    else if (check.action === "settings") {
      setSettingsOpen(true);
      setNotice(check.message);
    } else setError(check.message);
    return false;
  }
  function checkAccess(operation: "account" | "coach" | "draft", replay = false) {
    return generationAccess({
      account,
      accountError: session.accountError,
      status: data.status,
      statusError: data.statusError,
      credentials: effectiveCredentials,
      operation,
      requestedWeb: input.webSearch,
      replay,
      online: navigator.onLine,
    });
  }
  function ensureAccount() {
    return applyAccess(checkAccess("account"));
  }
  function ensureCredentials(kind: "coach" | "draft" = "coach", replay = false) {
    return applyAccess(checkAccess(kind, replay));
  }
  function safeContext(text: string) {
    try {
      assertSafeInputText(text);
      setError("");
      setCoachFailure(false);
      setRecoveryChecked(false);
      return true;
    } catch (cause) {
      setNotice("");
      setError(
        cause instanceof Error ? cause.message : "Describe solo tu partida de League of Legends.",
      );
      return false;
    }
  }
  function settle(key: string | undefined) {
    void session.refreshAccount();
    session.pollsRef.current = 0;
    void session.checkConsumption(key);
  }

  async function generate(followup?: string) {
    if (busy || controller.current || capture.preparingImage) return false;
    const notes =
      followup !== undefined && !input.notes.endsWith(followup)
        ? `${input.notes}${input.notes ? "\n" : ""}${followup}`
        : input.notes;
    if (notes.length > 1500) {
      setError("Máximo 1500 caracteres. Acorta tu contexto antes de añadir la pregunta.");
      setEditing(true);
      return false;
    }
    if (!safeContext(notes) || !ensureAccount()) return false;
    const coachInput: CoachInput = {
      ...input,
      notes,
      webSearch: webSearchEnabled(account, input.webSearch),
    };
    setInput(coachInput);
    const abort = begin("coach");
    let key: string | undefined;
    try {
      const body = {
        ...coachInput,
        allies: coachInput.allies.filter(Boolean),
        enemies: coachInput.enemies.filter(Boolean),
        ...effectiveCredentials,
      };
      const intent = await session.intentsRef.current.get(
        owner!,
        "COACH",
        body,
        defaultModel || "",
      );
      if (!intent || abort.signal.aborted) return true;
      key = intent.key;
      if (intent.attempt?.state === "UNKNOWN" && !intent.attempt.hasResponse) {
        setError("Esta solicitud sigue pendiente. Espera antes de volver a generar el mismo plan.");
        return true;
      }
      if (!ensureCredentials("coach", Boolean(intent.attempt?.hasResponse))) return true;
      const next = await postCoachStream(
        body,
        abort.signal,
        key,
        () => undefined,
        (choices) => {
          if (
            !abort.signal.aborted &&
            controller.current === abort &&
            identityRef.current === owner
          )
            setPreparation(choices);
        },
      );
      if (abort.signal.aborted) return true;
      session.intentsRef.current.complete(key);
      setResult(next);
      setEditing(false);
      setResultInput(coachInput);
      setSample(false);
    } catch (cause) {
      if (!abort.signal.aborted && controller.current === abort) setCoachFailure(true);
      fail(cause, abort);
    } finally {
      end(abort);
      settle(key);
    }
    return true;
  }

  async function detectDraft() {
    const { draftText, image } = capture;
    if (busy || controller.current || capture.preparingImage || (!draftText.trim() && !image))
      return;
    if (!safeContext(draftText) || !ensureAccount()) return;
    const abort = begin("draft");
    capture.setDraft(null);
    let key: string | undefined;
    try {
      const body = { text: draftText.trim(), image: image || undefined, ...effectiveCredentials };
      const intent = await session.intentsRef.current.get(
        owner!,
        "DRAFT",
        body,
        defaultModel || "",
      );
      if (!intent || abort.signal.aborted) return;
      key = intent.key;
      if (intent.attempt?.state === "UNKNOWN" && !intent.attempt.hasResponse) {
        setError("Esta captura sigue pendiente. Espera antes de volver a enviarla.");
        return;
      }
      if (!ensureCredentials("draft", Boolean(intent.attempt?.hasResponse))) return;
      const next = await postJson<DraftResult>("/api/draft", body, abort.signal, key);
      if (!abort.signal.aborted) {
        session.intentsRef.current.complete(key);
        capture.setDraft(next);
      }
    } catch (cause) {
      fail(cause, abort);
    } finally {
      end(abort);
      settle(key);
    }
  }

  async function importRiot() {
    const { riotId, platform } = riotImport;
    if (busy || !riotId.trim() || !ensureAccount()) return;
    const abort = begin("riot");
    riotImport.setRiot(null);
    try {
      const next = await postJson<RiotResult>(
        "/api/riot",
        { riotId: riotId.trim(), platform },
        abort.signal,
      );
      if (!abort.signal.aborted) riotImport.setRiot(next);
    } catch (cause) {
      fail(cause, abort);
    } finally {
      end(abort);
      void session.refreshAccount();
    }
  }

  function readImage(file: File | undefined) {
    if (busy) return;
    void capture.readImage(file, {
      onStart: () => {
        setError("");
        setCoachFailure(false);
        setRecoveryChecked(false);
      },
      onError: setError,
    });
  }

  function applyDraft() {
    const draft = capture.draft;
    if (!draft) return;
    setInput((previous) => ({
      ...previous,
      champion: draft.champion || previous.champion,
      enemy: draft.enemy || previous.enemy,
      role: draft.role || previous.role,
      allies: draft.allies.filter((id) => id !== draft.champion).slice(0, 4),
      enemies: draft.enemies.filter((id) => id !== draft.enemy).slice(0, 4),
      allyDuo: undefined,
      enemyDuo: undefined,
      notes: draft.notes
        ? `${previous.notes}${previous.notes ? "\n" : ""}${draft.notes}`.slice(0, 1500)
        : previous.notes,
    }));
    setNotice("Selección aplicada. Revisa campeón, línea y rival.");
    capture.setDraft(null);
  }

  function applyRiot(enemyId: string) {
    const riot = riotImport.riot;
    if (!riot) return;
    setInput((previous) => ({
      ...previous,
      champion: riot.self,
      enemy: enemyId,
      allies: riot.participants
        .filter((entry) => entry.team === "ally" && !entry.isSelf)
        .map((entry) => entry.champion)
        .slice(0, 4),
      enemies: riot.participants
        .filter((entry) => entry.team === "enemy" && entry.champion !== enemyId)
        .map((entry) => entry.champion)
        .slice(0, 4),
      allyDuo: undefined,
      enemyDuo: undefined,
    }));
    riotImport.setRiotOpen(false);
    riotImport.setRiot(null);
    setNotice("Partida importada. Revisa línea y rival.");
  }

  function restoreHistory(record: HistoryRecord) {
    if (busy) cancel();
    capture.clearImage();
    setInput(record.input);
    setResultInput(record.input);
    setResult(record.result);
    setEditing(false);
    setSample(false);
    setNotice("Plan guardado. Revisa fecha, parche y fuentes antes de reutilizarlo.");
  }

  function showExample() {
    setInput({ ...demoInput });
    setResult(demoResult);
    setEditing(false);
    setResultInput({ ...demoInput });
    setSample(true);
    clearMessages();
  }

  function resetSession() {
    if (busy) cancel();
    capture.reset();
    riotImport.setRiot(null);
    setInput(EMPTY_INPUT);
    setResult(null);
    setEditing(true);
    setResultInput(null);
    setSample(false);
    clearMessages();
  }

  function checkRecovery() {
    const current = owner;
    const version = recoveryVersion.current;
    void session.checkConsumption().then(() => {
      if (
        identityRef.current === current &&
        recoveryVersion.current === version &&
        !controller.current
      )
        setRecoveryChecked(true);
    });
  }

  return {
    ...data,
    session,
    capture,
    riotImport,
    input,
    setInput,
    update,
    credentials: effectiveCredentials,
    setCredentials,
    ready,
    generationAccess: access,
    busy,
    error,
    setError,
    coachFailure,
    recoveryChecked,
    notice,
    setNotice,
    result,
    preparation,
    resultInput,
    sample,
    editing,
    setEditing,
    settingsOpen,
    setSettingsOpen,
    switchingAccount: Boolean(account && draftOwner !== owner),
    generate,
    detectDraft,
    importRiot,
    readImage,
    applyDraft,
    applyRiot,
    restoreHistory,
    showExample,
    resetSession,
    cancel,
    clearPrivateState,
    checkRecovery,
    safeContext,
    ensureCredentials,
  };
}

export type CoachWorkspace = ReturnType<typeof useCoachWorkspace>;
