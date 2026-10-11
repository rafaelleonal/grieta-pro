"use client";

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
  Zap,
} from "lucide-react";
import { ChampionSelect } from "@/components/champion-select";
import { CoachingResult } from "@/components/coaching-result";
import { Modal } from "@/components/modal";
import { OfflineNotice, PwaInstall } from "@/components/pwa-manager";
import {
  AccountAccessNotice,
  AccountBadge,
  AccountHistory,
  AccountModal,
  type HistoryRecord,
} from "@/components/account-controls";
import { readAccount, type AccountStatus } from "@/lib/auth-client";
import { demoResult } from "@/lib/demo";
import { prepareImage } from "@/lib/image-upload";
import { assertSafeInputText, safeNotesForStorage } from "@/lib/coach-safety";
import type {
  AppStatus,
  Catalog,
  CoachInput,
  CoachResult,
  Credentials,
  DraftResult,
  RiotResult,
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

async function api<T>(path: string, body: unknown, signal: AbortSignal): Promise<T> {
  if (!navigator.onLine)
    throw new Error(
      "Sin conexión. Conecta internet y vuelve a solicitar el análisis cuando estés listo.",
    );
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify(body),
    signal,
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
            <option key={model} value={model}>
              {model}
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
  const [mode, setMode] = useState<"manual" | "capture">("manual");
  const [teamOpen, setTeamOpen] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [catalogError, setCatalogError] = useState("");
  const [result, setResult] = useState<CoachResult | null>(null);
  const [resultInput, setResultInput] = useState<CoachInput | null>(null);
  const [sample, setSample] = useState(false);
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
  const accountOwner = account?.authenticated ? account.user?.id || null : null;
  const champions = catalog?.champions || [];
  const ready = Boolean(status?.configured || credentials.apiKey);
  const champion = champions.find((entry) => entry.id === input.champion);
  const enemy = champions.find((entry) => entry.id === input.enemy);
  const planChampion = champions.find((entry) => entry.id === resultInput?.champion);
  const planEnemy = champions.find((entry) => entry.id === resultInput?.enemy);
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
      fetch("/api/catalog", { signal: abort.signal }).then(async (response) => {
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

  const clearPrivateState = useCallback(() => {
    controller.current?.abort();
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
    setResultInput(null);
    setSample(false);
    setDraftText("");
    setRiot(null);
    setRiotId("");
    setError("");
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
      void refreshAccount();
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
    setResultInput(null);
    setSample(false);
    setRiot(null);
    setRiotId("");
    if (previousOwner !== undefined) {
      setModal(null);
      setError("");
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

  function restoreHistory(record: HistoryRecord) {
    if (busy) cancel();
    clearImage();
    setInput(record.input);
    setResultInput(record.input);
    setResult(record.result);
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
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setBusy(task);
    setError("");
    setNotice("");
    return abort;
  }
  function fail(cause: unknown, abort: AbortController) {
    if (!abort.signal.aborted)
      setError(cause instanceof Error ? cause.message : "No pudimos completar la solicitud.");
  }
  function end(abort: AbortController) {
    if (controller.current === abort) setBusy(null);
  }
  function cancel() {
    controller.current?.abort();
    setBusy(null);
    setNotice(
      "Dejamos de esperar el análisis. Si ya se envió al proveedor, puede consumir tu cuota. Tu selección sigue aquí.",
    );
    void refreshAccount();
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
  function ensureCredentials(kind: "coach" | "draft" = "coach") {
    if (!ensureAccount()) return false;
    const remaining =
      kind === "coach" ? account?.usage?.coachRemaining : account?.usage?.draftRemaining;
    if (remaining !== undefined && remaining <= 0) {
      setError(
        kind === "coach"
          ? "Ya usaste tus planes de este periodo. Puedes consultar los anteriores en Mis sesiones."
          : "Ya usaste tus lecturas de este periodo. Puedes elegir los campeones manualmente.",
      );
      return false;
    }
    if (account?.usage?.pending) {
      setError("Ya tienes una generación en curso. Espera a que termine antes de comenzar otra.");
      return false;
    }
    if (!ready) {
      setModal("settings");
      setNotice("Añade tu clave de OpenRouter para generar un plan real.");
      return false;
    }
    return true;
  }
  function safeContext(text: string) {
    try {
      assertSafeInputText(text);
      setError("");
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
    if (busy || preparingImage) return;
    const combinedNotes =
      notes !== undefined ? `${input.notes}${input.notes ? "\n" : ""}${notes}` : input.notes;
    if (combinedNotes.length > 1500) {
      setError(
        "Tu contexto supera 1500 caracteres. Acorta las notas de la composición antes de agregar esta pregunta.",
      );
      setTeamOpen(true);
      return;
    }
    if (!safeContext(combinedNotes) || !ensureCredentials()) return;
    const coachInput = {
      ...input,
      notes: combinedNotes,
      webSearch: Boolean(
        input.webSearch && account?.usage?.webAllowed && account.usage.webRemaining > 0,
      ),
    };
    setInput(coachInput);
    const abort = begin("coach");
    try {
      const next = await api<CoachResult>(
        "/api/coach",
        {
          ...coachInput,
          allies: coachInput.allies.filter(Boolean),
          enemies: coachInput.enemies.filter(Boolean),
          ...credentials,
        },
        abort.signal,
      );
      if (abort.signal.aborted) return;
      setResult(next);
      setResultInput(coachInput);
      setSample(false);
      if (window.innerWidth < 651)
        resultElement.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (cause) {
      fail(cause, abort);
    } finally {
      end(abort);
      void refreshAccount();
    }
  }

  function showExample() {
    const next = { ...emptyInput, webSearch: input.webSearch };
    setInput(next);
    setResult(demoResult);
    setResultInput(next);
    setSample(true);
    setError("");
    setNotice(
      "Ejemplo de Ahri vs. Yasuo: escrito localmente, sin IA y sin verificar el parche actual.",
    );
    if (window.innerWidth < 651)
      resultElement.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function readImage(file: File | undefined) {
    if (!file || busy) return;
    const request = ++imageRequest.current;
    setError("");
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
    if (busy || preparingImage || (!draftText.trim() && !image)) return;
    if (!safeContext(draftText) || !ensureCredentials("draft")) return;
    const abort = begin("draft");
    setDraft(null);
    try {
      const next = await api<DraftResult>(
        "/api/draft",
        { text: draftText.trim(), image: image || undefined, ...credentials },
        abort.signal,
      );
      if (!abort.signal.aborted) setDraft(next);
    } catch (cause) {
      fail(cause, abort);
    } finally {
      end(abort);
      void refreshAccount();
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
    setResultInput(null);
    setSample(false);
    setError("");
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
    <div className="workspace">
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
        <div className="sidebar-tip">
          <Target size={20} className="tip-icon" />
          <strong>Cada decisión cuenta.</strong>
          <p>Un buen plan no gana la partida por ti. Te ayuda a tomar la siguiente decisión.</p>
        </div>
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
          />
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span style={{ width: 13, height: 2, background: "#85a6ff" }} />
                PREPARA. ENTIENDE. MEJORA.
              </div>
              <h1>Entra a la Grieta con un plan.</h1>
              <p>Tu matchup, tus primeros niveles y las decisiones que importan.</p>
            </div>
            <button
              className="model-chip"
              onClick={() => setModal("settings")}
              title="Cambiar modelo"
            >
              <Sparkles size={12} />
              <span>{credentials.model || status?.defaultModel || "Modelo de OpenRouter"}</span>
              <ChevronDown size={11} />
            </button>
          </div>
          <div className="coach-grid">
            <section className="panel setup-panel" aria-label="Preparación de la partida">
              <div className="panel-heading">
                <h2>
                  <SlidersHorizontal size={15} />
                  Tu partida
                </h2>
                <span className="step-tag">01 / CONTEXTO</span>
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
                    <label className="field-label">Tu campeón</label>
                    <ChampionSelect
                      champions={champions}
                      value={input.champion}
                      onChange={(value) => update("champion", value)}
                      label="Tu campeón"
                    />
                    <div className="versus-divider">VS</div>
                    <label className="field-label">Tu rival de línea</label>
                    <ChampionSelect
                      champions={champions}
                      value={input.enemy}
                      onChange={(value) => update("enemy", value)}
                      label="Tu rival de línea"
                    />
                  </div>
                  <div className="field">
                    <span className="field-label" id="role-label">
                      ¿Dónde juegas?
                    </span>
                    <div className="roles" role="group" aria-labelledby="role-label">
                      {roles.map((role) => (
                        <button
                          key={role.id}
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
                    <span>Composición y contexto</span>
                    <span className="end">Opcional</span>
                    <ChevronDown
                      size={13}
                      style={{ transform: teamOpen ? "rotate(180deg)" : "" }}
                    />
                  </button>
                  {teamOpen ? (
                    <div id="team-context" className="team-context">
                      <p>
                        Tu campeón y tu rival ya están incluidos. Completa los demás para ajustar el
                        plan a la partida.
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
              >
                <Sparkles size={15} />
                {busy === "coach" ? "Preparando tu plan..." : "Generar plan de partida"}
                <ArrowRight size={14} style={{ marginLeft: "auto" }} />
              </button>
              <p className="form-footnote">Conciso. Específico. Hecho para tu siguiente partida.</p>
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
              {catalogError || error ? (
                <div className="error-alert" role="alert">
                  <AlertCircle size={14} />
                  <span>{catalogError || error}</span>
                </div>
              ) : null}
              {notice ? (
                <div className="notice-alert" role="status">
                  <CircleHelp size={14} />
                  <span>{notice}</span>
                </div>
              ) : null}
            </section>
            <div className="right-column" ref={resultElement}>
              {result && resultInput && busy !== "coach" ? (
                <div
                  className="plan-matchup"
                  aria-label={`Plan para ${planChampion?.name || resultInput.champion} contra ${planEnemy?.name || resultInput.enemy}`}
                >
                  <div className="plan-matchup-picks">
                    {planChampion ? (
                      <Image src={planChampion.image} alt="" width={32} height={32} unoptimized />
                    ) : null}
                    <strong>{planChampion?.name || resultInput.champion}</strong>
                    <span>vs.</span>
                    {planEnemy ? (
                      <Image src={planEnemy.image} alt="" width={32} height={32} unoptimized />
                    ) : null}
                    <strong>{planEnemy?.name || resultInput.enemy}</strong>
                  </div>
                  <span className="plan-matchup-role">
                    {roles.find((role) => role.id === resultInput.role)?.name} · {resultInput.rank}
                  </span>
                </div>
              ) : (
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
                      ENFOQUE CHALLENGER
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
              )}
              {hasChanged && !busy ? (
                <div className="notice-alert" style={{ marginTop: 0 }}>
                  <AlertCircle size={14} />
                  <span>
                    La selección cambió. El plan visible corresponde a {resultInput?.champion} vs.{" "}
                    {resultInput?.enemy}; genera uno nuevo para actualizarlo.
                  </span>
                </div>
              ) : null}
              {busy === "coach" ? (
                <section className="panel result-panel loading-result" aria-live="polite">
                  <div className="loading-orb">
                    <Sparkles className="spin" size={21} />
                  </div>
                  <h2>Tu coach está leyendo la partida.</h2>
                  <p>
                    Analizando el matchup, las ventanas de los primeros niveles y tus opciones de
                    build.
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
              ) : result ? (
                <CoachingResult
                  key={`${result.meta.generatedAt}-${sample}`}
                  result={result}
                  items={catalog?.items || []}
                  sample={sample}
                  busy={Boolean(busy) || preparingImage}
                  onFollowup={(message) => {
                    if (busy || preparingImage) return false;
                    if (`${input.notes}${input.notes ? "\n" : ""}${message}`.length > 1500) {
                      setError(
                        "Tu contexto supera 1500 caracteres. Acorta las notas de la composición antes de agregar esta pregunta.",
                      );
                      setTeamOpen(true);
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
              ) : (
                <section className="panel result-panel empty-result">
                  <div className="empty-kicker">
                    <Sparkles size={13} />
                    TU VENTAJA EMPIEZA AQUÍ
                  </div>
                  <h2>Menos improvisación. Más intención.</h2>
                  <p>
                    Elige tu campeón y tu rival. Tu coach convierte el matchup en un plan que puedes
                    aplicar desde el primer súbdito.
                  </p>
                  <div className="preview-grid">
                    <div className="preview-card">
                      <div className="preview-icon">
                        <Layers size={16} />
                      </div>
                      <strong>Del nivel 1 al 6</strong>
                      <p>Qué hacer y cuándo buscar tu ventana.</p>
                    </div>
                    <div className="preview-card">
                      <div className="preview-icon">
                        <Crosshair size={16} />
                      </div>
                      <strong>Respuestas mecánicas</strong>
                      <p>Reacciona a sus habilidades clave.</p>
                    </div>
                    <div className="preview-card">
                      <div className="preview-icon">
                        <Swords size={16} />
                      </div>
                      <strong>Build y plan de mapa</strong>
                      <p>Adapta tus compras y tus decisiones.</p>
                    </div>
                  </div>
                  <div className="empty-footer">
                    <span>
                      <Shield size={11} />
                      Consejos concretos, sin ruido.
                    </span>
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
            <span>
              <Zap size={10} />
              HECHO PARA JUGAR CON INTENCIÓN
            </span>
            <div className="coach-credit">
              <span>GrietaPro no está avalado por Riot Games.</span>
              <span>League of Legends y sus recursos pertenecen a Riot Games.</span>
            </div>
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
        />
      ) : null}
    </div>
  );
}
