"use client";

import { CoachFailure } from "@/components/coach-failure";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Crosshair,
  Eye,
  EyeOff,
  Flag,
  Globe,
  History,
  ImagePlus,
  Layers,
  Leaf,
  LoaderCircle,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Search,
  Settings2,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Swords,
  Target,
  Upload,
  Users,
  WandSparkles,
  X,
} from "lucide-react";
import { ChampionSelect } from "@/components/champion-select";
import { useChampionPreferences } from "@/components/use-champion-preferences";
import { CoachingResult } from "@/components/coaching-result";
import { Modal } from "@/components/modal";
import { LegalLinks } from "@/components/legal-links";
import { RiotNotice } from "@/components/riot-notice";
import { OfflineNotice, PwaInstall } from "@/components/pwa-manager";
import {
  AccountAccessNotice,
  AccountBadge,
  AccountHistory,
  AccountModal,
  type HistoryRecord,
} from "@/components/account-controls";
import { readAccount, reconcileAccount, type AccountStatus } from "@/lib/auth-client";
import { GenerationIntents } from "@/lib/generation-intent";
import { demoInput, demoResult } from "@/lib/demo";
import { prepareImage } from "@/lib/image-upload";
import { modelLabel } from "@/lib/model-labels";
import { assertSafeInputText, safeNotesForStorage } from "@/lib/coach-safety";
import type {
  AppStatus,
  Catalog,
  CoachInput,
  GeneratedCoachResult,
  Credentials,
  DraftResult,
  RiotResult,
  SavedCoachResult,
} from "@/lib/types";

const STORAGE_KEY = "cholo-coach:draft:v1";
const roles = [
  { id: "TOP", name: "Top", icon: Shield },
  { id: "JUNGLE", name: "Jungla", icon: Leaf },
  { id: "MID", name: "Mid", icon: Crosshair },
  { id: "ADC", name: "ADC", icon: Swords },
  { id: "SUPPORT", name: "Support", icon: Flag },
] as const;
const ranks = [
  "Sin clasificar",
  "Hierro",
  "Bronce",
  "Plata",
  "Oro",
  "Platino",
  "Esmeralda",
  "Diamante",
  "Master",
  "Grandmaster",
  "Challenger",
];
const emptyInput: CoachInput = {
  champion: "Ahri",
  enemy: "Yasuo",
  role: "MID",
  rank: "Oro",
  allies: [],
  enemies: [],
  notes: "",
  webSearch: false,
};
type Busy = "coach" | "draft" | "riot" | null;

async function api<T>(
  path: string,
  body: unknown,
  signal: AbortSignal,
  idempotencyKey = crypto.randomUUID(),
): Promise<T> {
  if (!navigator.onLine)
    throw new Error(
      "Sin conexión. Conecta internet y vuelve a solicitar el análisis cuando estés listo.",
    );
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(body),
    signal,
    redirect: "error",
  });
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : typeof data?.message === "string"
          ? data.message
          : "No pudimos completar la solicitud. Intenta de nuevo.",
    );
  if (!data) throw new Error("El servidor devolvió una respuesta vacía. Intenta de nuevo.");
  return data as T;
}

function loadDraft(value: string | null): CoachInput | null {
  if (!value) return null;
  try {
    const stored = JSON.parse(value);
    const input = stored.input;
    if (
      stored.version !== 1 ||
      !input ||
      typeof input.champion !== "string" ||
      typeof input.enemy !== "string" ||
      !roles.some((role) => role.id === input.role)
    )
      return null;
    return {
      ...emptyInput,
      champion: input.champion,
      enemy: input.enemy,
      role: input.role,
      rank: ranks.includes(input.rank) ? input.rank : "Oro",
      allies: Array.isArray(input.allies)
        ? input.allies.filter((id: unknown) => typeof id === "string").slice(0, 4)
        : [],
      enemies: Array.isArray(input.enemies)
        ? input.enemies.filter((id: unknown) => typeof id === "string").slice(0, 4)
        : [],
      notes: typeof input.notes === "string" ? input.notes.slice(0, 1500) : "",
      webSearch: typeof input.webSearch === "boolean" ? input.webSearch : true,
    };
  } catch {
    return null;
  }
}

function ApiSettings({
  credentials,
  status,
  account,
  onSave,
  onClose,
}: {
  credentials: Credentials;
  status: AppStatus | null;
  account: AccountStatus | null;
  onSave: (value: Credentials) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Credentials>(credentials);
  const [visible, setVisible] = useState(false);
  const models = account?.usage?.allowedModels || [];
  function save(event: FormEvent) {
    event.preventDefault();
    onSave({
      apiKey: draft.apiKey?.trim() || undefined,
      model: models.includes(draft.model || "") ? draft.model : undefined,
    });
    onClose();
  }
  return (
    <Modal title="Conecta tu coach" onClose={onClose}>
      <p className="modal-intro">
        Tu plan habilita los modelos disponibles. Puedes añadir tu propia clave de OpenRouter; tu
        cuenta y sus límites siguen siendo necesarios.
      </p>
      <form onSubmit={save}>
        <label htmlFor="api-key">
          Clave API de OpenRouter {status?.configured ? "· opcional" : ""}
        </label>
        <div className="secret-wrap">
          <input
            id="api-key"
            type={visible ? "text" : "password"}
            value={draft.apiKey || ""}
            onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })}
            placeholder={
              status?.configured ? "Hay una clave configurada en el servidor" : "sk-or-v1-..."
            }
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            aria-label={visible ? "Ocultar clave" : "Mostrar clave"}
          >
            {visible ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <p className="field-help">
          Obtén tu clave en{" "}
          <a href="https://openrouter.ai/settings/keys" target="_blank" rel="noopener noreferrer">
            OpenRouter <ArrowRight size={9} style={{ display: "inline" }} />
          </a>
          . Cada análisis puede consumir crédito de tu cuenta.
        </p>
        <label htmlFor="model">Modelo</label>
        <select
          id="model"
          className="rank-select"
          value={models.includes(draft.model || "") ? draft.model : ""}
          onChange={(event) => setDraft({ ...draft, model: event.target.value || undefined })}
        >
          <option value="">Modelo recomendado</option>
          {models.map((model) => (
            <option key={model} value={model} title={model}>
              {modelLabel(model)}
            </option>
          ))}
        </select>
        <p className="field-help">
          Solo se pueden usar los modelos habilitados para tu plan. El servidor comprueba esta
          elección antes de cada consulta.
        </p>
        <div className="privacy-note">
          <Shield size={15} />
          <span>
            Las claves permanecen en memoria. Al recargar, tendrás que ingresarlas de nuevo. Las
            selecciones se guardan por cuenta en este navegador. Al cerrar sesión, se limpia el
            borrador abierto.
          </span>
        </div>
        <div className="modal-footer">
          <button className="secondary-button" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="primary-button" type="submit">
            <Check size={14} />
            Guardar conexión
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Home() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [status, setStatus] = useState<AppStatus | null>(null);
  const [input, setInput] = useState<CoachInput>(emptyInput);
  const [credentials, setCredentials] = useState<Credentials>({});
  const [storageReady, setStorageReady] = useState(false);
  const [draftOwner, setDraftOwner] = useState<string | null | undefined>(undefined);
  const [account, setAccount] = useState<AccountStatus | null>(null);
  const [accountError, setAccountError] = useState("");
  const [checkingConsumption, setCheckingConsumption] = useState(false);
  const [consumptionError, setConsumptionError] = useState("");
  const [mode, setMode] = useState<"manual" | "capture">("manual");
  const [teamOpen, setTeamOpen] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState("");
  const [coachFailure, setCoachFailure] = useState(false);
  const [recoveryChecked, setRecoveryChecked] = useState(false);
  const [notice, setNotice] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [result, setResult] = useState<SavedCoachResult | null>(null);
  const [resultInput, setResultInput] = useState<CoachInput | null>(null);
  const [sample, setSample] = useState(false);
  const [formOpen, setFormOpen] = useState(true);
  const [modal, setModal] = useState<"settings" | "help" | "history" | "account" | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [image, setImage] = useState("");
  const [imageName, setImageName] = useState("");
  const [pendingImageName, setPendingImageName] = useState("");
  const [imageDetails, setImageDetails] = useState<{
    originalBytes: number;
    wasCompressed: boolean;
  } | null>(null);
  const [preparingImage, setPreparingImage] = useState(false);
  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [riotOpen, setRiotOpen] = useState(false);
  const [riotId, setRiotId] = useState("");
  const [platform, setPlatform] = useState("LA1");
  const [riot, setRiot] = useState<RiotResult | null>(null);
  const controller = useRef<AbortController | null>(null);
  const imageRequest = useRef(0);
  const galleryInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const resultElement = useRef<HTMLDivElement>(null);
  const accountIdentity = useRef<string | null | undefined>(undefined);
  const accountRequest = useRef(0);
  const generationIntents = useRef(new GenerationIntents());
  const reconciliation = useRef<{
    owner: string;
    abort: AbortController;
    promise: Promise<void>;
  } | null>(null);
  const reconciliationPolls = useRef(0);
  const recoveryVersion = useRef(0);
  const accountOwner = account?.authenticated ? account.user?.id || null : null;
  const verifiedOwner = account?.user?.emailVerified ? accountOwner : null;
  const hasReservedRequests = Boolean(account?.usage?.pending || account?.usage?.uncertain);
  const championPreferences = useChampionPreferences(verifiedOwner);
  const champions = catalog?.champions || [];
  const ready = Boolean(status?.configured || credentials.apiKey);
  const selectedModelId = credentials.model || status?.defaultModel;
  const champion = champions.find((entry) => entry.id === input.champion);
  const enemy = champions.find((entry) => entry.id === input.enemy);
  const currentRole = roles.find((entry) => entry.id === input.role)!;
  const hasChanged = Boolean(resultInput && JSON.stringify(resultInput) !== JSON.stringify(input));

  useEffect(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* Storage may be unavailable. */
    }
    const abort = new AbortController();
    void Promise.allSettled([
      fetch("/api/catalog?format=2", { signal: abort.signal }).then(async (response) => {
        if (!response.ok) throw new Error();
        const data: Catalog = await response.json();
        setCatalog(data);
      }),
      fetch("/api/status", { signal: abort.signal }).then(async (response) => {
        if (!response.ok) throw new Error();
        const data: AppStatus = await response.json();
        setStatus(data);
      }),
    ]).then((outcomes) => {
      if (abort.signal.aborted) return;
      if (outcomes[0].status === "rejected")
        setCatalogError(
          "No pudimos cargar el catálogo de Riot. Recarga la página para volver a intentar.",
        );
      if (outcomes[1].status === "rejected")
        setNotice(
          "No pudimos verificar la configuración del servidor. Puedes ingresar tu clave en Conexión.",
        );
    });
    return () => {
      abort.abort();
      controller.current?.abort();
      reconciliation.current?.abort.abort();
      imageRequest.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!storageReady || !accountOwner || draftOwner !== accountOwner) return;
    try {
      localStorage.setItem(
        `${STORAGE_KEY}:${accountOwner}`,
        JSON.stringify({
          version: 1,
          input: {
            champion: input.champion,
            enemy: input.enemy,
            role: input.role,
            rank: input.rank,
            allies: input.allies,
            enemies: input.enemies,
            notes: safeNotesForStorage(input.notes),
            webSearch: input.webSearch,
          },
        }),
      );
    } catch {
      /* The draft remains available in memory. */
    }
  }, [input, storageReady, accountOwner, draftOwner]);

  const refreshAccount = useCallback(async () => {
    const request = ++accountRequest.current;
    try {
      const next = await readAccount();
      if (request !== accountRequest.current) return;
      setAccount(next);
      setAccountError("");
      setCredentials((previous) =>
        previous.model && next.usage && !next.usage.allowedModels.includes(previous.model)
          ? { ...previous, model: undefined }
          : previous,
      );
    } catch {
      if (request === accountRequest.current)
        setAccountError(
          "No pudimos comprobar tu cuenta. Las consultas siguen protegidas en el servidor.",
        );
    }
  }, []);

  const checkConsumption = useCallback(
    async (idempotencyKey?: string) => {
      const owner = accountIdentity.current;
      if (
        !owner ||
        owner !== verifiedOwner ||
        document.visibilityState !== "visible" ||
        !navigator.onLine
      )
        return;
      if (reconciliation.current?.owner === owner) return reconciliation.current.promise;
      const abort = new AbortController();
      const key = idempotencyKey || generationIntents.current.latest();
      setCheckingConsumption(true);
      setConsumptionError("");
      const promise = (async () => {
        try {
          const outcome = await reconcileAccount(key, abort.signal);
          if (abort.signal.aborted || accountIdentity.current !== owner) return;
          if (key) generationIntents.current.resolve(key, outcome.attempt);
          setAccount((previous) =>
            previous?.authenticated && previous.user?.id === owner
              ? { ...previous, usage: outcome.usage }
              : previous,
          );
        } catch {
          if (!abort.signal.aborted && accountIdentity.current === owner)
            setConsumptionError(
              "No pudimos confirmar el consumo todavía. Conservamos la reserva y no iniciamos otro análisis.",
            );
        } finally {
          if (reconciliation.current?.abort === abort) {
            reconciliation.current = null;
            setCheckingConsumption(false);
          }
        }
      })();
      reconciliation.current = { owner, abort, promise };
      return promise;
    },
    [verifiedOwner],
  );

  const clearPrivateState = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    reconciliation.current?.abort.abort();
    reconciliation.current = null;
    generationIntents.current.clear();
    generationIntents.current.setOwner(accountIdentity.current || null);
    reconciliationPolls.current = 0;
    setCheckingConsumption(false);
    setConsumptionError("");
    setBusy(null);
    imageRequest.current += 1;
    setImage("");
    setImageName("");
    setPendingImageName("");
    setImageDetails(null);
    setPreparingImage(false);
    setDraft(null);
    setInput(emptyInput);
    setCredentials({});
    setResult(null);
    setFormOpen(true);
    setResultInput(null);
    setSample(false);
    setDraftText("");
    setRiot(null);
    setRiotId("");
    setError("");
    setCoachFailure(false);
    setRecoveryChecked(false);
    setNotice("");
    try {
      localStorage.removeItem(STORAGE_KEY);
      if (accountIdentity.current)
        localStorage.removeItem(`${STORAGE_KEY}:${accountIdentity.current}`);
    } catch {
      /* Private state is cleared in memory even without browser storage. */
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetches the verified server session; state updates happen after the network response.
    void refreshAccount();
    const focus = () => {
      if (document.visibilityState === "visible") void refreshAccount();
    };
    const visibility = () => {
      if (document.visibilityState === "visible") void refreshAccount();
    };
    // A completed login clears any retained client page before reading the new server session.
    const sessionChanged = () => {
      clearPrivateState();
      setAccount(null);
      setModal(null);
      void refreshAccount();
    };
    window.addEventListener("focus", focus);
    window.addEventListener("cholo-coach:session-changed", sessionChanged);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      accountRequest.current += 1;
      window.removeEventListener("focus", focus);
      window.removeEventListener("cholo-coach:session-changed", sessionChanged);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [refreshAccount, clearPrivateState]);

  useEffect(() => {
    if (!account) return;
    const owner = account.authenticated ? account.user?.id || null : null;
    if (accountIdentity.current === owner) return;
    const previousOwner = accountIdentity.current;
    if (previousOwner === undefined && owner === null) {
      accountIdentity.current = null;
      setDraftOwner(null);
      setStorageReady(true);
      return;
    }
    controller.current?.abort();
    controller.current = null;
    reconciliation.current?.abort.abort();
    reconciliation.current = null;
    generationIntents.current.setOwner(owner);
    reconciliationPolls.current = 0;
    setCheckingConsumption(false);
    setConsumptionError("");
    setBusy(null);
    imageRequest.current += 1;
    setImage("");
    setImageName("");
    setPendingImageName("");
    setImageDetails(null);
    setPreparingImage(false);
    setDraft(null);
    setDraftText("");
    setCredentials({});
    setResult(null);
    setFormOpen(true);
    setResultInput(null);
    setSample(false);
    setRiot(null);
    setRiotId("");
    if (previousOwner !== undefined) {
      setModal(null);
      setError("");
      setCoachFailure(false);
      setRecoveryChecked(false);
      setNotice("");
    }
    let saved: CoachInput | null = null;
    try {
      if (previousOwner) localStorage.removeItem(`${STORAGE_KEY}:${previousOwner}`);
      if (owner) saved = loadDraft(localStorage.getItem(`${STORAGE_KEY}:${owner}`));
    } catch {
      /* Browser storage is optional. */
    }
    accountIdentity.current = owner;
    setInput(saved || emptyInput);
    setDraftOwner(owner);
    setStorageReady(true);
  }, [account]);

  useEffect(() => {
    if (!verifiedOwner) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      if (
        disposed ||
        document.visibilityState !== "visible" ||
        !hasReservedRequests ||
        reconciliationPolls.current >= 10
      )
        return;
      timer = setTimeout(() => {
        reconciliationPolls.current += 1;
        void checkConsumption().finally(schedule);
      }, 30_000);
    };
    const checkAndSchedule = () => {
      if (timer) clearTimeout(timer);
      if (document.visibilityState === "visible") void checkConsumption().finally(schedule);
    };
    const visibility = () => {
      if (timer) clearTimeout(timer);
      if (document.visibilityState === "visible") checkAndSchedule();
      else reconciliation.current?.abort.abort();
    };
    checkAndSchedule();
    window.addEventListener("focus", checkAndSchedule);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener("focus", checkAndSchedule);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [verifiedOwner, hasReservedRequests, checkConsumption]);

  function restoreHistory(record: HistoryRecord) {
    if (busy) cancel();
    clearImage();
    setInput(record.input);
    setResultInput(record.input);
    setResult(record.result);
    setFormOpen(false);
    setSample(false);
    setModal(null);
    setNotice(
      "Plan recuperado de tu cuenta. Revisa su fecha, parche y fuentes antes de volver a usarlo.",
    );
  }

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
    setError("");
    setCoachFailure(false);
    setRecoveryChecked(false);
    setNotice("");
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
    }
  }
  function cancel() {
    controller.current?.abort();
    controller.current = null;
    setBusy(null);
    setNotice(
      "Dejamos de esperar el análisis. Si ya se envió al proveedor, puede consumir tu cuota. Tu selección sigue aquí.",
    );
    void refreshAccount();
    void checkConsumption();
  }
  function ensureConnection() {
    if (!navigator.onLine) {
      setError(
        "Sin conexión. Conecta internet y vuelve a solicitar el análisis cuando estés listo.",
      );
      return false;
    }
    return true;
  }
  function ensureAccount() {
    if (!ensureConnection()) return false;
    if (!account?.configured) {
      setError(
        "Las cuentas todavía necesitan configurarse en esta instalación. Puedes explorar el ejemplo local.",
      );
      return false;
    }
    if (!account.authenticated) {
      router.push("/login");
      return false;
    }
    if (!account.user?.emailVerified) {
      setError("Verifica tu correo para activar tus consultas al coach.");
      return false;
    }
    return true;
  }
  function ensureCredentials(kind: "coach" | "draft" = "coach", replay = false) {
    if (!ensureAccount()) return false;
    const remaining =
      kind === "coach" ? account?.usage?.coachRemaining : account?.usage?.draftRemaining;
    if (!replay && remaining !== undefined && remaining <= 0) {
      setError(
        kind === "coach"
          ? "Ya usaste tus planes de este periodo. Puedes consultar los anteriores en Mis sesiones."
          : "Ya usaste tus lecturas de este periodo. Puedes elegir los campeones manualmente.",
      );
      return false;
    }
    if (!replay && account?.usage?.pending) {
      setError(
        "Tienes una consulta en curso. Comprobamos su estado automáticamente; tu selección sigue guardada.",
      );
      return false;
    }
    if (!ready) {
      setModal("settings");
      setNotice("Añade tu clave de OpenRouter para generar un plan real.");
      return false;
    }
    if (!credentials.model && !status?.defaultModel) {
      setModal("settings");
      setNotice("Espera la configuración del modelo o elige uno en Conexión antes de generar.");
      return false;
    }
    return true;
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

  async function generate(notes?: string) {
    if (busy || controller.current || preparingImage) return;
    const combinedNotes =
      notes !== undefined && !input.notes.endsWith(notes)
        ? `${input.notes}${input.notes ? "\n" : ""}${notes}`
        : input.notes;
    if (combinedNotes.length > 1500) {
      setError(
        "Tu contexto supera 1500 caracteres. Acorta las notas de la composición antes de agregar esta pregunta.",
      );
      setTeamOpen(true);
      setFormOpen(true);
      return;
    }
    if (!safeContext(combinedNotes) || !ensureAccount()) return;
    const coachInput = {
      ...input,
      notes: combinedNotes,
      webSearch: Boolean(
        input.webSearch && account?.usage?.webAllowed && account.usage.webRemaining > 0,
      ),
    };
    setInput(coachInput);
    const abort = begin("coach");
    let key: string | undefined;
    try {
      const body = {
        ...coachInput,
        allies: coachInput.allies.filter(Boolean),
        enemies: coachInput.enemies.filter(Boolean),
        ...credentials,
      };
      const intent = await generationIntents.current.get(
        accountOwner!,
        "COACH",
        body,
        status?.defaultModel || "",
      );
      if (!intent || abort.signal.aborted) return;
      key = intent.key;
      if (intent.attempt?.state === "UNKNOWN" && !intent.attempt.hasResponse) {
        setError(
          "Este intento conserva una reserva incierta. Usa Comprobar estado; puedes preparar otro análisis si te queda cuota.",
        );
        return;
      }
      if (!ensureCredentials("coach", Boolean(intent.attempt?.hasResponse))) return;
      const next = await api<GeneratedCoachResult>("/api/coach", body, abort.signal, key);
      if (abort.signal.aborted) return;
      generationIntents.current.complete(key);
      setResult(next);
      setFormOpen(false);
      setResultInput(coachInput);
      setSample(false);
      if (window.innerWidth < 651)
        resultElement.current?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "instant"
            : "smooth",
          block: "start",
        });
    } catch (cause) {
      if (!abort.signal.aborted && controller.current === abort) setCoachFailure(true);
      fail(cause, abort);
    } finally {
      end(abort);
      void refreshAccount();
      reconciliationPolls.current = 0;
      void checkConsumption(key);
    }
  }

  function showExample() {
    const next = { ...demoInput };
    setInput(next);
    setResult(demoResult);
    setFormOpen(false);
    setResultInput(next);
    setSample(true);
    setError("");
    setCoachFailure(false);
    setRecoveryChecked(false);
    setNotice("");
    if (window.innerWidth < 651)
      resultElement.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
  }

  async function readImage(file: File | undefined) {
    if (!file || busy) return;
    const request = ++imageRequest.current;
    setError("");
    setCoachFailure(false);
    setRecoveryChecked(false);
    setDraft(null);
    setPendingImageName(file.name);
    setPreparingImage(true);
    try {
      const prepared = await prepareImage(file);
      if (imageRequest.current !== request) return;
      setImage(prepared.dataUrl);
      setImageName(file.name);
      setImageDetails({
        originalBytes: prepared.originalBytes,
        wasCompressed: prepared.wasCompressed,
      });
    } catch (cause) {
      if (imageRequest.current !== request) return;
      setError(
        cause instanceof Error
          ? cause.message
          : "No pudimos leer la imagen. Vuelve a seleccionarla.",
      );
    } finally {
      if (imageRequest.current === request) {
        setPreparingImage(false);
        setPendingImageName("");
      }
    }
  }

  function clearImage() {
    imageRequest.current += 1;
    setImage("");
    setImageName("");
    setPendingImageName("");
    setImageDetails(null);
    setPreparingImage(false);
    setDraft(null);
  }

  function cancelImagePreparation() {
    imageRequest.current += 1;
    setPreparingImage(false);
    setPendingImageName("");
    setDraft(null);
  }

  async function detectDraft() {
    if (busy || controller.current || preparingImage || (!draftText.trim() && !image)) return;
    if (!safeContext(draftText) || !ensureAccount()) return;
    const abort = begin("draft");
    setDraft(null);
    let key: string | undefined;
    try {
      const body = { text: draftText.trim(), image: image || undefined, ...credentials };
      const intent = await generationIntents.current.get(
        accountOwner!,
        "DRAFT",
        body,
        status?.defaultModel || "",
      );
      if (!intent || abort.signal.aborted) return;
      key = intent.key;
      if (intent.attempt?.state === "UNKNOWN" && !intent.attempt.hasResponse) {
        setError(
          "Esta lectura conserva una reserva incierta. Usa Comprobar estado antes de repetirla.",
        );
        return;
      }
      if (!ensureCredentials("draft", Boolean(intent.attempt?.hasResponse))) return;
      const next = await api<DraftResult>("/api/draft", body, abort.signal, key);
      if (!abort.signal.aborted) {
        generationIntents.current.complete(key);
        setDraft(next);
      }
    } catch (cause) {
      fail(cause, abort);
    } finally {
      end(abort);
      void refreshAccount();
      reconciliationPolls.current = 0;
      void checkConsumption(key);
    }
  }

  function applyDraft() {
    if (!draft) return;
    setInput((previous) => ({
      ...previous,
      champion: draft.champion || previous.champion,
      enemy: draft.enemy || previous.enemy,
      role: draft.role || previous.role,
      allies: draft.allies.filter((id) => id !== draft.champion).slice(0, 4),
      enemies: draft.enemies.filter((id) => id !== draft.enemy).slice(0, 4),
      notes: draft.notes
        ? `${previous.notes}${previous.notes ? "\n" : ""}${draft.notes}`.slice(0, 1500)
        : previous.notes,
    }));
    setTeamOpen(Boolean(draft.allies.length || draft.enemies.length || draft.notes));
    setMode("manual");
    setNotice(
      "Selección aplicada. Revisa tu campeón, tu línea y tu rival antes de generar el plan.",
    );
    setDraft(null);
  }

  async function importRiot() {
    if (busy || !riotId.trim()) return;
    if (!ensureAccount()) return;
    const abort = begin("riot");
    setRiot(null);
    try {
      const next = await api<RiotResult>(
        "/api/riot",
        { riotId: riotId.trim(), platform },
        abort.signal,
      );
      if (!abort.signal.aborted) setRiot(next);
    } catch (cause) {
      fail(cause, abort);
    } finally {
      end(abort);
      void refreshAccount();
    }
  }

  function applyRiot(enemyId: string) {
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
    }));
    setTeamOpen(true);
    setRiotOpen(false);
    setRiot(null);
    setNotice("Partida importada. Elige tu línea y confirma el rival para preparar el plan.");
  }

  function setTeam(key: "allies" | "enemies", index: number, value: string) {
    const team = [...input[key]];
    team[index] = value;
    update(key, team);
  }
  function resetSession() {
    if (busy) cancel();
    clearImage();
    setInput(emptyInput);
    setResult(null);
    setFormOpen(true);
    setResultInput(null);
    setSample(false);
    setError("");
    setCoachFailure(false);
    setRecoveryChecked(false);
    setNotice("");
    setMode("manual");
    setDraftText("");
    setTeamOpen(false);
    setRiot(null);
    setSidebarOpen(false);
  }

  if (account && draftOwner !== accountOwner)
    return (
      <main className="account-page" role="status">
        Actualizando tu cuenta...
      </main>
    );

  return (
    <div
      className={`workspace ${result ? `has-plan ${formOpen ? "form-open" : "form-collapsed"}` : ""}`}
    >
      <button
        className={`sidebar-dismiss ${sidebarOpen ? "visible" : ""}`}
        aria-label="Cerrar menú"
        onClick={() => setSidebarOpen(false)}
      />
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`} aria-label="Navegación principal">
        <a
          href="#"
          className="brand"
          aria-label="GrietaPro, inicio"
          onClick={(event) => {
            event.preventDefault();
            setSidebarOpen(false);
          }}
        >
          <div className="brand-mark">
            <Swords size={21} strokeWidth={2.5} />
          </div>
          <div className="brand-name">
            Grieta<span>Pro</span>
          </div>
        </a>
        <p className="sidebar-kicker">TU ESPACIO DE JUEGO</p>
        <nav className="navigation">
          <button
            className="nav-item active"
            aria-label="Coach de partida"
            onClick={() => {
              setModal(null);
              setSidebarOpen(false);
            }}
          >
            <Crosshair size={17} />
            <span>Coach de partida</span>
            <i className="nav-dot" />
          </button>
          <button
            className="nav-item"
            aria-label="Mis sesiones"
            onClick={() => {
              setModal("history");
              setSidebarOpen(false);
            }}
          >
            <History size={17} />
            <span>Mis sesiones</span>
          </button>
          <button
            className="nav-item"
            aria-label="Cómo funciona"
            onClick={() => {
              setModal("help");
              setSidebarOpen(false);
            }}
          >
            <BookOpen size={17} />
            <span>Cómo funciona</span>
          </button>
          <button className="nav-item" aria-label="Nueva preparación" onClick={resetSession}>
            <Plus size={17} />
            <span>Nueva preparación</span>
          </button>
          <PwaInstall
            onOpen={() => {
              setModal(null);
              setSidebarOpen(false);
            }}
          />
        </nav>
        <div className="sidebar-bottom">
          <div className="connection">
            <i className={`status-dot ${ready ? "live" : ""}`} />
            {ready ? "OpenRouter · clave disponible" : "OpenRouter · sin configurar"}
          </div>
          <button
            type="button"
            className="account-profile-button"
            aria-label={account?.authenticated ? "Mi cuenta" : "Entrar a mi cuenta"}
            onClick={() => {
              setSidebarOpen(false);
              if (account?.authenticated) setModal("account");
              else router.push("/login");
            }}
          >
            <div className="profile-avatar">
              {account?.user?.name.slice(0, 2).toUpperCase() || "GG"}
            </div>
            <div className="profile-info">
              <strong>{account?.user?.name || "Tu espacio personal"}</strong>
              <span>
                {account?.authenticated
                  ? account.user?.plan === "PRO"
                    ? "Plan Pro"
                    : "Plan Free"
                  : "Entrar o crear cuenta"}
              </span>
            </div>
            <ChevronRight size={15} />
          </button>
        </div>
      </aside>
      <div className="shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Abrir menú"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={16} />
            </button>
            <span className="root-crumb">Tu espacio</span>
            <ChevronRight className="crumb-slash" size={11} />
            <span className="current">League of Legends</span>
          </div>
          <div className="topbar-actions">
            <button
              className="model-chip"
              onClick={() => setModal("settings")}
              title={
                selectedModelId
                  ? `Cambiar modelo · ${modelLabel(selectedModelId)} (${selectedModelId})`
                  : "Cambiar modelo"
              }
            >
              <Sparkles size={12} />
              <span>{selectedModelId ? modelLabel(selectedModelId) : "Modelo de OpenRouter"}</span>
              <ChevronDown size={11} />
            </button>
            <AccountBadge account={account} onOpen={() => setModal("account")} />
            {catalog ? (
              <span className="live-tag">
                <i className={`status-dot ${catalog.source === "live" ? "live" : ""}`} />
                RIOT {catalog.version}
                {catalog.source === "snapshot" ? " · RESPALDO" : ""}
              </span>
            ) : (
              <span className="live-tag">CARGANDO DATOS</span>
            )}
            <button
              className="icon-button"
              aria-label="Conexión y modelo"
              onClick={() => setModal("settings")}
            >
              <Settings2 size={16} />
            </button>
          </div>
        </header>
        <main className="main">
          <OfflineNotice />
          <AccountAccessNotice
            account={account}
            error={accountError}
            onRetry={() => void refreshAccount()}
            onCheck={() => void checkConsumption()}
            checking={checkingConsumption}
            consumptionError={consumptionError}
          />
          {!result ? (
            <div className="page-heading">
              <div>
                <div className="eyebrow">
                  <span style={{ width: 13, height: 2, background: "var(--color-accent)" }} />
                  PREPARA. ENTIENDE. MEJORA.
                </div>
                <h1>Entra a la Grieta con un plan.</h1>
                <p>Tu matchup, tus primeros niveles y las decisiones que importan.</p>
              </div>
            </div>
          ) : null}
          {catalogError || (error && !coachFailure) ? (
            <div className="error-alert workspace-alert" role="alert">
              <AlertCircle size={20} aria-hidden="true" />
              <div className="workspace-error-copy">
                <strong>
                  {catalogError
                    ? "No pudimos cargar los campeones"
                    : "No pudimos completar el plan"}
                </strong>
                <p>{catalogError || error}</p>
              </div>
            </div>
          ) : null}
          {notice ? (
            <div className="notice-alert workspace-alert" role="status">
              <CircleHelp size={14} />
              <span>{notice}</span>
            </div>
          ) : null}
          <div className="coach-grid">
            {result && !formOpen ? (
              <aside className="setup-rail" aria-label="Resumen de tu selección">
                <button
                  className="icon-button"
                  type="button"
                  aria-label="Expandir preparación"
                  aria-expanded={false}
                  aria-controls="match-setup"
                  onClick={() => setFormOpen(true)}
                >
                  <PanelLeftOpen size={18} />
                </button>
                <div className="rail-matchup">
                  {champion ? (
                    <Image
                      src={champion.image}
                      alt={champion.name}
                      width={36}
                      height={36}
                      unoptimized
                    />
                  ) : null}
                  <span>vs.</span>
                  {enemy ? (
                    <Image src={enemy.image} alt={enemy.name} width={36} height={36} unoptimized />
                  ) : null}
                </div>
                <div className="rail-role" title={`${currentRole.name} · ${input.rank}`}>
                  <currentRole.icon size={18} aria-label={currentRole.name} />
                  <span>{input.rank}</span>
                </div>
                <div className="rail-team" title="Otros campeones elegidos en la composición">
                  <Users size={16} />
                  <span>
                    {input.allies.filter(Boolean).length + input.enemies.filter(Boolean).length}
                  </span>
                </div>
                <button
                  className="icon-button rail-edit"
                  type="button"
                  aria-label="Editar partida"
                  onClick={() => setFormOpen(true)}
                >
                  <Pencil size={16} />
                </button>
              </aside>
            ) : null}
            <section
              id="match-setup"
              className="panel setup-panel"
              hidden={Boolean(result) && !formOpen}
              aria-label="Preparación de la partida"
            >
              <div className="panel-heading">
                <h2>
                  <SlidersHorizontal size={15} />
                  Tu partida
                </h2>
                {result ? (
                  <button
                    className="icon-button"
                    type="button"
                    aria-label="Contraer preparación"
                    aria-expanded={true}
                    aria-controls="match-setup"
                    onClick={() => setFormOpen(false)}
                  >
                    <PanelLeftClose size={18} />
                  </button>
                ) : (
                  <span className="step-tag">01 / CONTEXTO</span>
                )}
              </div>
              <div className="input-tabs" aria-label="Modo de entrada">
                <button
                  className={mode === "manual" ? "active" : ""}
                  aria-pressed={mode === "manual"}
                  onClick={() => setMode("manual")}
                >
                  <Swords size={12} />
                  <span>Selección manual</span>
                </button>
                <button
                  className={mode === "capture" ? "active" : ""}
                  aria-pressed={mode === "capture"}
                  onClick={() => setMode("capture")}
                >
                  <ImagePlus size={13} />
                  <span>Foto, captura o texto</span>
                </button>
              </div>
              {mode === "capture" ? (
                <>
                  <div
                    className="upload-box"
                    aria-busy={preparingImage}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (!busy) void readImage(event.dataTransfer.files[0]);
                    }}
                  >
                    {preparingImage ? (
                      <div className="upload-progress" role="status">
                        <LoaderCircle className="spin" size={23} />
                        <strong>Preparando tu foto...</strong>
                        <small>{pendingImageName}</small>
                      </div>
                    ) : image ? (
                      <>
                        <div
                          style={{
                            position: "relative",
                            width: "100%",
                            height: 180,
                            marginBottom: 12,
                          }}
                        >
                          <Image
                            className="upload-preview"
                            src={image}
                            alt="Foto o captura que se enviará al coach"
                            fill
                            sizes="(max-width: 650px) 100vw, 300px"
                            unoptimized
                            style={{ marginBottom: 0 }}
                          />
                        </div>
                        <strong>{imageName}</strong>
                        <small>
                          Original:{" "}
                          {(imageDetails!.originalBytes / 1_000_000).toLocaleString("es-MX", {
                            maximumFractionDigits: 1,
                          })}{" "}
                          MB
                          {imageDetails?.wasCompressed
                            ? " · Optimizada para enviar"
                            : " · Lista para enviar"}
                        </small>
                      </>
                    ) : (
                      <>
                        <Upload size={23} />
                        <strong>Tu selección de campeones</strong>
                        <small>Elige una imagen o toma una foto de tu pantalla.</small>
                      </>
                    )}
                    <div className="upload-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => galleryInput.current?.click()}
                        disabled={Boolean(busy)}
                      >
                        <ImagePlus size={16} />
                        Elegir foto o captura
                      </button>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => cameraInput.current?.click()}
                        disabled={Boolean(busy)}
                      >
                        <Camera size={16} />
                        Tomar foto
                      </button>
                    </div>
                    <input
                      ref={galleryInput}
                      hidden
                      type="file"
                      accept="image/*"
                      aria-label="Elegir foto o captura"
                      aria-describedby="upload-limit"
                      disabled={Boolean(busy)}
                      onChange={(event) => {
                        void readImage(event.currentTarget.files?.[0]);
                        event.currentTarget.value = "";
                      }}
                    />
                    <input
                      ref={cameraInput}
                      hidden
                      type="file"
                      accept="image/*"
                      capture="environment"
                      aria-label="Tomar foto"
                      aria-describedby="upload-limit"
                      disabled={Boolean(busy)}
                      onChange={(event) => {
                        void readImage(event.currentTarget.files?.[0]);
                        event.currentTarget.value = "";
                      }}
                    />
                    <p id="upload-limit" className="upload-help">
                      Hasta 30 MB por imagen. La optimizamos antes de enviarla.
                      <span className="desktop-upload-help">También puedes arrastrarla aquí.</span>
                    </p>
                  </div>
                  {image || preparingImage ? (
                    <button
                      type="button"
                      className="text-button remove-image"
                      onClick={preparingImage ? cancelImagePreparation : clearImage}
                      disabled={Boolean(busy)}
                    >
                      <X size={14} />
                      {preparingImage ? "Cancelar preparación de foto" : "Quitar foto o captura"}
                    </button>
                  ) : null}
                  <label className="field-label" htmlFor="draft-text" style={{ marginTop: 18 }}>
                    O describe la partida<span className="optional">· texto</span>
                  </label>
                  <textarea
                    id="draft-text"
                    className="draft-text"
                    value={draftText}
                    onChange={(event) => {
                      setDraftText(event.target.value);
                      setDraft(null);
                    }}
                    placeholder="Soy Ahri mid contra Yasuo. Mi jungla es Vi y el suyo Lee Sin..."
                    maxLength={2000}
                    disabled={Boolean(busy)}
                  />
                  <button
                    className="secondary-button"
                    style={{ width: "100%" }}
                    disabled={Boolean(busy) || preparingImage || (!image && !draftText.trim())}
                    onClick={() => {
                      void detectDraft();
                    }}
                  >
                    {busy === "draft" || preparingImage ? (
                      <LoaderCircle className="spin" size={13} />
                    ) : (
                      <WandSparkles size={13} />
                    )}
                    {busy === "draft"
                      ? "Identificando campeones..."
                      : preparingImage
                        ? "Preparando imagen..."
                        : "Identificar y revisar"}
                  </button>
                  <p className="form-footnote">
                    La foto o captura se envía a OpenRouter. Revisa siempre la selección detectada.
                  </p>
                  {draft ? (
                    <div className="draft-review">
                      <strong>Confirma lo que detectamos</strong>
                      <dl>
                        <dt>Tu campeón</dt>
                        <dd>
                          {champions.find((entry) => entry.id === draft.champion)?.name ||
                            draft.champion ||
                            "No identificado"}
                        </dd>
                        <dt>Rival</dt>
                        <dd>
                          {champions.find((entry) => entry.id === draft.enemy)?.name ||
                            draft.enemy ||
                            "No identificado"}
                        </dd>
                        <dt>Línea</dt>
                        <dd>
                          {roles.find((entry) => entry.id === draft.role)?.name ||
                            "No identificada"}
                        </dd>
                        <dt>Aliados</dt>
                        <dd>{draft.allies.join(", ") || "Sin información"}</dd>
                        <dt>Enemigos</dt>
                        <dd>{draft.enemies.join(", ") || "Sin información"}</dd>
                      </dl>
                      {draft.notes ? <p>{draft.notes}</p> : null}
                      {draft.warnings.length ? <p>{draft.warnings.join(" ")}</p> : null}
                      {!draft.champion || !draft.enemy || !draft.role ? (
                        <p>Los datos que no se identificaron conservarán tu selección manual.</p>
                      ) : null}
                      <div className="draft-review-actions">
                        <button className="primary-button" onClick={applyDraft}>
                          Usar esta selección
                        </button>
                        <button className="secondary-button" onClick={() => setDraft(null)}>
                          Descartar
                        </button>
                      </div>
                    </div>
                  ) : null}
                  <div className="divider" />
                </>
              ) : null}
              {mode === "manual" ? (
                <>
                  <div className="field">
                    <span className="field-label" id="role-label">
                      Primero, ¿dónde juegas?
                    </span>
                    <div className="roles" role="group" aria-labelledby="role-label">
                      {roles.map((role) => (
                        <button
                          key={role.id}
                          type="button"
                          className={`role-button ${input.role === role.id ? "active" : ""}`}
                          aria-pressed={input.role === role.id}
                          onClick={() => update("role", role.id)}
                        >
                          <role.icon size={17} strokeWidth={1.7} />
                          {role.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="field">
                    <label className="field-label">Tu campeón</label>
                    <ChampionSelect
                      champions={champions}
                      value={input.champion}
                      onChange={(value) => update("champion", value)}
                      label="Tu campeón"
                      role={input.role}
                      favorites={championPreferences.favorites[input.role]}
                      onFavoritesChange={(ordered) =>
                        void championPreferences.save(input.role, ordered)
                      }
                      canPersonalize={Boolean(verifiedOwner)}
                      preferencesReady={championPreferences.ready}
                      preferencesLoading={championPreferences.loading}
                      preferencesSaving={championPreferences.saving}
                      preferencesError={championPreferences.error}
                      onPreferencesRetry={championPreferences.refresh}
                    />
                    <div className="versus-divider">VS</div>
                    <label className="field-label">Tu rival de línea</label>
                    <ChampionSelect
                      champions={champions}
                      value={input.enemy}
                      onChange={(value) => update("enemy", value)}
                      label="Tu rival de línea"
                      role={input.role}
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label className="field-label" htmlFor="rank">
                      Tu rango
                    </label>
                    <select
                      id="rank"
                      className="rank-select"
                      value={input.rank}
                      onChange={(event) => update("rank", event.target.value)}
                    >
                      {ranks.map((rank) => (
                        <option key={rank}>{rank}</option>
                      ))}
                    </select>
                  </div>
                  <div className="divider" />
                  <button
                    className="section-toggle"
                    onClick={() => setTeamOpen(!teamOpen)}
                    aria-expanded={teamOpen}
                    aria-controls="team-context"
                  >
                    <Users size={14} />
                    <span>Equipos y notas</span>
                    <span className="end">Opcional</span>
                    <ChevronDown
                      size={13}
                      style={{ transform: teamOpen ? "rotate(180deg)" : "" }}
                    />
                  </button>
                  {teamOpen ? (
                    <div id="team-context" className="team-context">
                      <p>
                        Añade los demás campeones para adaptar las compras y el plan de mapa. Tu
                        campeón y tu rival ya están incluidos.
                      </p>
                      <div className="team-label">
                        <i className="status-dot live" />
                        Tus otros aliados
                      </div>
                      <div className="team-slots">
                        {[0, 1, 2, 3].map((index) => (
                          <ChampionSelect
                            key={`ally-${index}`}
                            champions={champions}
                            value={input.allies[index] || ""}
                            onChange={(value) => setTeam("allies", index, value)}
                            label={`Aliado ${index + 1}`}
                            compact
                            optional
                          />
                        ))}
                      </div>
                      <div className="team-label">
                        <i className="status-dot" style={{ background: "#cb9693" }} />
                        Los otros rivales
                      </div>
                      <div className="team-slots">
                        {[0, 1, 2, 3].map((index) => (
                          <ChampionSelect
                            key={`enemy-${index}`}
                            champions={champions}
                            value={input.enemies[index] || ""}
                            onChange={(value) => setTeam("enemies", index, value)}
                            label={`Enemigo ${index + 1}`}
                            compact
                            optional
                          />
                        ))}
                      </div>
                      <label className="field-label" htmlFor="notes" style={{ marginTop: 16 }}>
                        Algo más que deba saber
                      </label>
                      <textarea
                        id="notes"
                        className="context-notes"
                        value={input.notes}
                        onChange={(event) => update("notes", event.target.value)}
                        placeholder="Ej. Me cuesta esquivar su Q. Quiero jugar seguro hasta nivel 6."
                        maxLength={1500}
                      />
                    </div>
                  ) : null}
                  <div className="divider" />
                  <button
                    className="section-toggle"
                    onClick={() => setRiotOpen(!riotOpen)}
                    aria-expanded={riotOpen}
                    aria-controls="riot-import"
                  >
                    <ArrowDownToLine size={14} />
                    <span>Importar partida con Riot ID</span>
                    <ChevronDown
                      className="end"
                      size={13}
                      style={{ transform: riotOpen ? "rotate(180deg)" : "" }}
                    />
                  </button>
                  {riotOpen ? (
                    <div id="riot-import" className="riot-form">
                      <p className="riot-note">
                        {status?.riotConfigured
                          ? "Importa una partida activa de la Grieta. La selección de campeones previa a la partida se puede leer con una captura."
                          : "Esta instalación necesita una clave de Riot en el servidor. Mientras tanto, usa la selección manual o una captura."}
                      </p>
                      <div className="field-row">
                        <input
                          value={riotId}
                          onChange={(event) => setRiotId(event.target.value)}
                          aria-label="Riot ID"
                          placeholder="TuNombre#TAG"
                          maxLength={80}
                          disabled={!status?.riotConfigured || Boolean(busy)}
                        />
                        <select
                          value={platform}
                          onChange={(event) => setPlatform(event.target.value)}
                          aria-label="Servidor de Riot"
                          disabled={!status?.riotConfigured || Boolean(busy)}
                        >
                          <option value="LA1">LAN</option>
                          <option value="LA2">LAS</option>
                          <option value="NA1">NA</option>
                          <option value="EUW1">EUW</option>
                          <option value="EUN1">EUNE</option>
                          <option value="BR1">BR</option>
                          <option value="KR">KR</option>
                          <option value="JP1">JP</option>
                          <option value="OC1">OCE</option>
                        </select>
                      </div>
                      <button
                        className="secondary-button"
                        style={{ width: "100%", marginTop: 10 }}
                        onClick={() => {
                          void importRiot();
                        }}
                        disabled={!status?.riotConfigured || !riotId.trim() || Boolean(busy)}
                      >
                        {busy === "riot" ? (
                          <LoaderCircle className="spin" size={12} />
                        ) : (
                          <Search size={12} />
                        )}
                        {busy === "riot" ? "Buscando partida..." : "Buscar partida activa"}
                      </button>
                      {riot ? (
                        <div className="participant-list">
                          <p className="riot-note">
                            Selecciona tu rival de línea y revisa después tu rol.
                          </p>
                          {riot.participants
                            .filter((entry) => entry.team === "enemy")
                            .map((entry, index) => {
                              const participant = champions.find(
                                (value) => value.id === entry.champion,
                              );
                              return (
                                <button
                                  className="participant-button"
                                  key={index}
                                  onClick={() => applyRiot(entry.champion)}
                                >
                                  {participant ? (
                                    <Image
                                      src={participant.image}
                                      alt=""
                                      width={28}
                                      height={28}
                                      unoptimized
                                    />
                                  ) : null}
                                  <span>
                                    {participant?.name || entry.champion}
                                    <small>{entry.name}</small>
                                  </span>
                                  <ArrowRight size={12} />
                                </button>
                              );
                            })}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </>
              ) : null}
              <div className="search-toggle">
                <span className="search-toggle-label">
                  <Globe size={14} />
                  <span>
                    Consultar fuentes actuales
                    <small>
                      {account?.usage?.webAllowed
                        ? `Buscar referencias · ${account.usage.webRemaining} disponibles`
                        : "Las fuentes dependen de tu plan"}
                    </small>
                  </span>
                </span>
                <button
                  role="switch"
                  aria-checked={Boolean(
                    input.webSearch && account?.usage?.webAllowed && account.usage.webRemaining > 0,
                  )}
                  aria-label="Consultar fuentes actuales"
                  className={`switch ${input.webSearch && account?.usage?.webAllowed && account.usage.webRemaining > 0 ? "on" : ""}`}
                  disabled={!account?.usage?.webAllowed || account.usage.webRemaining <= 0}
                  onClick={() => update("webSearch", !input.webSearch)}
                >
                  <span />
                </button>
              </div>
              <button
                className="primary-button full"
                onClick={() => {
                  void generate();
                }}
                disabled={Boolean(busy) || preparingImage || !catalog || mode !== "manual"}
                aria-busy={busy === "coach"}
              >
                {busy === "coach" ? (
                  <LoaderCircle size={18} className="spin" aria-hidden="true" />
                ) : (
                  <Sparkles size={15} aria-hidden="true" />
                )}
                {busy === "coach" ? "Preparando tu plan..." : "Generar plan de partida"}
                {busy !== "coach" ? (
                  <ArrowRight size={14} style={{ marginLeft: "auto" }} aria-hidden="true" />
                ) : null}
              </button>
              {busy ? (
                <button
                  className="text-button"
                  style={{ width: "100%", marginTop: 8 }}
                  onClick={cancel}
                >
                  <X size={12} />
                  Cancelar solicitud
                </button>
              ) : null}
            </section>
            <div className="right-column" ref={resultElement}>
              {!result ? (
                <section
                  className="matchup-hero"
                  aria-label={`${champion?.name || input.champion} contra ${enemy?.name || input.enemy}`}
                >
                  <div
                    className="splash you"
                    style={{
                      backgroundImage: `url(https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${encodeURIComponent(input.champion)}_0.jpg)`,
                    }}
                  />
                  <div
                    className="splash enemy"
                    style={{
                      backgroundImage: `url(https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${encodeURIComponent(input.enemy)}_0.jpg)`,
                    }}
                  />
                  <div className="hero-shade" />
                  <div className="hero-divider" />
                  <div className="hero-topline">
                    <span className="hero-tag">
                      <Crosshair size={11} />
                      {currentRole.name.toUpperCase()} · {input.rank.toUpperCase()}
                    </span>
                    <span className="hero-tag accent">
                      <Target size={11} />
                      PLAN CON CONTEXTO
                    </span>
                  </div>
                  <div className="hero-vs">VS</div>
                  <div className="hero-bottom">
                    <div className="hero-champ">
                      <span>TU CAMPEÓN</span>
                      <strong>{champion?.name || input.champion}</strong>
                      <p>{champion?.title || "Tu lado de la Grieta"}</p>
                    </div>
                    <div className="hero-champ enemy-name">
                      <span>TU MATCHUP</span>
                      <strong>{enemy?.name || input.enemy}</strong>
                      <p>{enemy?.title || "Entiende a tu rival"}</p>
                    </div>
                  </div>
                </section>
              ) : null}
              {hasChanged && !busy ? (
                <div className="notice-alert" style={{ marginTop: 0 }}>
                  <AlertCircle size={14} />
                  <span>
                    La selección cambió. El plan visible corresponde a {resultInput?.champion} vs.{" "}
                    {resultInput?.enemy}; genera uno nuevo para actualizarlo.
                  </span>
                </div>
              ) : null}
              {coachFailure && error && !busy ? (
                <CoachFailure
                  checking={checkingConsumption}
                  checked={recoveryChecked}
                  uncertain={hasReservedRequests}
                  error={error}
                  checkError={consumptionError}
                  previousPlan={Boolean(result)}
                  onCheck={() => {
                    const owner = accountOwner;
                    const version = recoveryVersion.current;
                    void checkConsumption().then(() => {
                      if (
                        accountIdentity.current === owner &&
                        recoveryVersion.current === version &&
                        !controller.current
                      )
                        setRecoveryChecked(true);
                    });
                  }}
                  onHistory={() => setModal("history")}
                />
              ) : null}
              {busy === "coach" ? (
                <section className="panel result-panel loading-result" aria-live="polite">
                  <div className="loading-orb">
                    <Sparkles className="spin" size={21} />
                  </div>
                  <h2>Preparando tus consejos…</h2>
                  <p>
                    Tu prioridad, una ventana para actuar y qué evitar. Los detalles aparecerán si
                    están disponibles.
                  </p>
                  <div className="skeleton-lines">
                    <span />
                    <span />
                    <span />
                  </div>
                  <button className="secondary-button" onClick={cancel}>
                    <X size={12} />
                    Cancelar análisis
                  </button>
                </section>
              ) : result && resultInput && catalog ? (
                <CoachingResult
                  key={`${result.meta.generatedAt}-${sample}`}
                  result={result}
                  catalog={catalog}
                  input={resultInput}
                  formOpen={formOpen}
                  ownerId={accountOwner || undefined}
                  followupError={error}
                  sample={sample}
                  busy={Boolean(busy) || preparingImage}
                  onFollowup={(message) => {
                    if (busy || preparingImage) return false;
                    if (`${input.notes}${input.notes ? "\n" : ""}${message}`.length > 1500) {
                      setError(
                        "Tu contexto supera 1500 caracteres. Acorta las notas de la composición antes de agregar esta pregunta.",
                      );
                      setTeamOpen(true);
                      setFormOpen(true);
                      return false;
                    }
                    if (
                      !safeContext(`${input.notes}${input.notes ? "\n" : ""}${message}`) ||
                      !ensureCredentials()
                    )
                      return false;
                    void generate(message);
                    return true;
                  }}
                />
              ) : coachFailure ? null : (
                <section className="panel result-panel empty-result">
                  <h2>Tu plan de partida</h2>
                  <p>Genera una guía para este matchup.</p>
                  <div className="preview-grid">
                    <div className="preview-card">
                      <div className="preview-icon">
                        <Layers size={16} />
                      </div>
                      <strong>Niveles 1–6</strong>
                      <p>Cuándo pelear.</p>
                    </div>
                    <div className="preview-card">
                      <div className="preview-icon">
                        <Crosshair size={16} />
                      </div>
                      <strong>Mecánicas</strong>
                      <p>Cómo reaccionar.</p>
                    </div>
                    <div className="preview-card">
                      <div className="preview-icon">
                        <Swords size={16} />
                      </div>
                      <strong>Compras y mapa</strong>
                      <p>Qué comprar y dónde jugar.</p>
                    </div>
                  </div>
                  <div className="empty-footer">
                    <button className="text-button" onClick={showExample} disabled={Boolean(busy)}>
                      Ver ejemplo de Ahri
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </section>
              )}
            </div>
          </div>
          <footer className="workspace-footer">
            <LegalLinks openInNewTab />
            <RiotNotice />
          </footer>
        </main>
      </div>
      {modal === "settings" ? (
        <ApiSettings
          credentials={credentials}
          status={status}
          account={account}
          onSave={setCredentials}
          onClose={() => setModal(null)}
        />
      ) : null}
      {modal === "help" ? (
        <Modal title="Un plan antes del primer súbdito" onClose={() => setModal(null)}>
          <p className="modal-intro">
            GrietaPro es un coach con IA para preparar tu partida con un enfoque de alto nivel. Usa
            cada consejo como una decisión que debes adaptar a lo que sucede en la Grieta.
          </p>
          <div className="help-steps">
            <div className="help-step">
              <span className="level-number">1</span>
              <div>
                <h3>Define el matchup</h3>
                <p>
                  Elige tu campeón, rival, línea y rango. Puedes aportar una captura o texto y
                  revisar la selección detectada antes de aplicarla.
                </p>
              </div>
            </div>
            <div className="help-step">
              <span className="level-number">2</span>
              <div>
                <h3>Añade el contexto que importa</h3>
                <p>
                  Incluye aliados, enemigos o una dificultad concreta. Para jungla o support, elige
                  el rival cuyo impacto quieres analizar.
                </p>
              </div>
            </div>
            <div className="help-step">
              <span className="level-number">3</span>
              <div>
                <h3>Conecta OpenRouter y genera tu plan</h3>
                <p>
                  Recibirás niveles 1–6, respuestas mecánicas, build y macro. Las fuentes actuales
                  pueden mejorar el contexto; comprueba las referencias y advertencias de cada plan.
                </p>
              </div>
            </div>
            <div className="help-step">
              <span className="level-number">4</span>
              <div>
                <h3>Haz una pregunta más específica</h3>
                <p>
                  Escribe debajo del resultado para actualizar el plan con más contexto. Cada
                  actualización hace una nueva consulta a tu modelo.
                </p>
              </div>
            </div>
          </div>
          <div className="privacy-note">
            <CircleHelp size={15} />
            <span>
              El catálogo de Riot puede llegar después del parche del juego. Una build sin fuentes
              verificadas es una recomendación de la IA, no una prueba de que sea la óptima actual.
            </span>
          </div>
          <div className="modal-footer">
            <button className="primary-button" onClick={() => setModal(null)}>
              Listo, a la Grieta
              <ArrowRight size={13} />
            </button>
          </div>
        </Modal>
      ) : null}
      {modal === "history" ? (
        <AccountHistory
          key={accountOwner || "guest"}
          account={account}
          champions={champions}
          onClose={() => setModal(null)}
          onSelect={restoreHistory}
        />
      ) : null}
      {modal === "account" && account?.authenticated ? (
        <AccountModal
          key={accountOwner}
          account={account}
          onClose={() => setModal(null)}
          onClear={clearPrivateState}
          onLoggedOut={() =>
            setAccount((previous) =>
              previous
                ? { ...previous, authenticated: false, user: undefined, usage: undefined }
                : previous,
            )
          }
          onRefresh={refreshAccount}
          onCheck={() => void checkConsumption()}
          checking={checkingConsumption}
          consumptionError={consumptionError}
        />
      ) : null}
    </div>
  );
}
