"use client";

import { useState, type FormEvent } from "react";
import { ArrowRight, Check, Search } from "lucide-react";
import { BrandLogo, Mascot, rankLabel } from "@/components/brand";
import { Button, Spinner } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { Input } from "@/components/ui/field";
import { cn } from "@/components/ui/cn";
import { postJson } from "@/lib/client-api";
import { roleName } from "@/lib/coach-draft";
import type { ProfileRank } from "@/lib/game-profile-client";
import type { RiotProfile } from "@/lib/riot";
import type { Champion, Role } from "@/lib/types";
import { ProfileEditor } from "./profile-editor";

const SERVERS = [
  ["LA1", "LAN"],
  ["LA2", "LAS"],
  ["NA1", "NA"],
  ["BR1", "BR"],
  ["EUW1", "EUW"],
  ["EUN1", "EUNE"],
  ["KR", "KR"],
  ["JP1", "JP"],
  ["OC1", "OCE"],
] as const;

type Step = "connect" | "searching" | "result" | "manual";
export type OnboardingResult = {
  rank: ProfileRank | null;
  positions: Role[];
  favorites: { id: string; role: Role }[];
};

/**
 * Primer inicio de sesión, todo opcional: Riot ID → buscando → resultado editable, o
 * «prefiero elegir a mano», o «saltar». El Riot ID sólo se usa para esta lectura.
 */
export function OnboardingScreen({
  catalog,
  riotConfigured,
  saving,
  saveError,
  onFinish,
  onSkip,
  initial,
}: {
  initial?: { rank: ProfileRank | null; positions: Role[] };
  catalog: Champion[];
  riotConfigured: boolean;
  saving: boolean;
  saveError: string;
  onFinish: (result: OnboardingResult) => void;
  onSkip: () => void;
}) {
  const [step, setStep] = useState<Step>(riotConfigured && !initial ? "connect" : "manual");
  const [server, setServer] = useState("LA1");
  const [riotId, setRiotId] = useState("");
  const [error, setError] = useState("");
  const [found, setFound] = useState<RiotProfile | null>(null);
  const [rank, setRank] = useState<ProfileRank | null>(initial?.rank ?? null);
  const [positions, setPositions] = useState<Role[]>(initial?.positions ?? []);
  const [selected, setSelected] = useState<string[]>([]);
  const serverLabel = SERVERS.find(([value]) => value === server)?.[1] || server;

  async function search(event: FormEvent) {
    event.preventDefault();
    if (!riotId.trim()) return;
    setStep("searching");
    setError("");
    try {
      const profile = await postJson<RiotProfile>(
        "/api/profile/riot",
        { riotId: riotId.trim(), platform: server },
        AbortSignal.timeout(30_000),
      );
      setFound(profile);
      setRank(profile.rank);
      setPositions(profile.positions);
      setSelected(profile.champions.slice(0, 5).map((entry) => entry.id));
      setStep("result");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : `No encontramos esa cuenta en ${serverLabel}. Revisa el #TAG o prueba otro servidor.`,
      );
      setStep("connect");
    }
  }

  function finish() {
    const roleFor = (id: string) => {
      const role = found?.champions.find((entry) => entry.id === id)?.role;
      return role && positions.includes(role) ? role : role || positions[0] || null;
    };
    onFinish({
      rank,
      positions,
      favorites: selected
        .map((id) => ({ id, role: roleFor(id) }))
        .filter((entry): entry is { id: string; role: Role } => Boolean(entry.role)),
    });
  }

  const summary = [
    ["Riot ID", found?.riotId],
    ["Rango", rank ? rankLabel(rank) : undefined],
    ["Posiciones", positions.length ? positions.map(roleName).join(" / ") : undefined],
    ["Favoritos", selected.length ? `${selected.length} campeones` : undefined],
  ] as const;

  return (
    <div className="grid min-h-dvh bg-bg text-text lg:grid-cols-[440px_minmax(0,1fr)]">
      <aside className="relative hidden flex-col gap-6 overflow-hidden border-r border-divider p-10 lg:flex">
        <BrandLogo size={36} />
        <div className="flex flex-col gap-3">
          <span className="text-overline font-medium uppercase text-accent-300">— Bienvenida</span>
          <h1 className="text-h1 font-medium">Conecta tu cuenta y nosotros llenamos el resto.</h1>
          <p className="text-small text-neutral-300">
            Con tu Riot ID leemos tu rango y tus campeones. Todo es opcional y puedes cambiarlo en
            tu perfil.
          </p>
        </div>
        <Mascot size={168} />
        <dl className="flex flex-col gap-3 rounded-lg bg-surface p-5">
          <dt className="text-overline font-medium uppercase text-neutral-500">
            Tu perfil de juego
          </dt>
          {summary.map(([label, value]) => (
            <div key={label} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-8 place-items-center rounded-md",
                  value ? "bg-success-bg text-success-text" : "bg-neutral-900",
                )}
              >
                {value ? <Check size={15} /> : null}
              </span>
              <span className="flex flex-col">
                <span className="text-xs text-neutral-400">{label}</span>
                <span className={cn("text-sm", value ? "text-text" : "text-neutral-500")}>
                  {value || "Pendiente"}
                </span>
              </span>
            </div>
          ))}
        </dl>
        <p className="mt-auto text-xs text-neutral-400">
          Sólo leemos datos públicos de tu cuenta. Elociencia no está avalado por Riot Games.
        </p>
      </aside>

      <main className="flex min-w-0 flex-col gap-6 px-4 py-6 md:px-12 md:py-10">
        <div className="flex items-center gap-4">
          <span className="lg:hidden">
            <BrandLogo size={30} compact />
          </span>
          <ol aria-label="Progreso" className="grid flex-1 grid-cols-2 gap-3">
            {["Conectar cuenta", "Revisar y empezar"].map((label, index) => {
              const active = index === 0 ? true : step === "result" || step === "manual";
              return (
                <li key={label} className="flex flex-col gap-2">
                  <span
                    className={cn("h-1 rounded-full", active ? "bg-accent" : "bg-neutral-800")}
                  />
                  <span
                    className={cn(
                      "hidden text-xs md:block",
                      active ? "text-text" : "text-neutral-500",
                    )}
                  >
                    {index + 1} · {label}
                  </span>
                </li>
              );
            })}
          </ol>
          <Button variant="ghost" onClick={onSkip} disabled={saving} className="lg:hidden">
            Saltar
          </Button>
        </div>

        {step === "connect" ? (
          <form onSubmit={(event) => void search(event)} className="flex max-w-2xl flex-col gap-5">
            <header className="flex flex-col gap-1">
              <h2 className="text-h1 font-medium">¿Cuál es tu Riot ID?</h2>
              <p className="text-small text-neutral-300">
                Lo encuentras en el cliente, junto a tu icono. Formato <strong>Nombre#TAG</strong>.
              </p>
            </header>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-label font-medium">Servidor</legend>
              <div className="flex flex-wrap gap-2">
                {SERVERS.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={server === value}
                    onClick={() => {
                      setServer(value);
                      setError("");
                    }}
                    className="min-h-11 min-w-15 rounded-full px-3.5 text-small text-neutral-300 ring-1 ring-inset ring-neutral-800 transition-colors aria-pressed:bg-accent-900 aria-pressed:text-accent-200 aria-pressed:ring-accent"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="flex flex-col gap-2">
              <label htmlFor="riot-id" className="text-label font-medium">
                Riot ID
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="riot-id"
                  value={riotId}
                  onChange={(event) => setRiotId(event.target.value)}
                  placeholder="TuNombre#TAG"
                  maxLength={80}
                  autoComplete="off"
                  aria-describedby="riot-id-help"
                  aria-invalid={Boolean(error) || undefined}
                />
                <Button type="submit" variant="primary" disabled={!riotId.includes("#")}>
                  <Search size={16} aria-hidden="true" />
                  Buscar mi cuenta
                </Button>
              </div>
              <p id="riot-id-help" className="text-xs text-neutral-400">
                Leemos tu rango y tus campeones con más maestría. No pedimos tu contraseña de Riot
                ni guardamos tu Riot ID.
              </p>
            </div>
            {error ? (
              <Alert tone="danger" role="alert">
                {error}
              </Alert>
            ) : null}
          </form>
        ) : step === "searching" ? (
          <section aria-live="polite" className="flex max-w-xl flex-col gap-4">
            <h2 className="text-h1 font-medium">Buscando {riotId}…</h2>
            <p className="text-small text-neutral-400">
              En {serverLabel} · suele tardar unos segundos
            </p>
            <ul className="flex flex-col gap-2">
              {["Cuenta", "Rango clasificatorio", "Campeones con más maestría"].map((label) => (
                <li
                  key={label}
                  className="flex min-h-12 items-center gap-3 rounded-control bg-accent-900/60 px-4 text-control"
                >
                  <Spinner className="size-4" />
                  {label}
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section className="flex flex-col gap-6">
            <header className="flex flex-wrap items-end gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h2 className="text-h1 font-medium">
                  {step === "result" ? "¡Te encontramos!" : "Cuéntanos lo básico"}
                </h2>
                <p className="text-small text-neutral-300">
                  {step === "result" && found
                    ? `${found.riotId} · ${serverLabel} · revisa y ajusta lo que quieras`
                    : "Todo opcional. Si lo dejas en blanco, te preguntamos el rango al preparar."}
                </p>
              </div>
              {step === "result" ? (
                <Button variant="ghost" onClick={() => setStep("connect")}>
                  No es mi cuenta
                </Button>
              ) : null}
            </header>
            {step === "result" && found?.rank && found.rank !== "Sin clasificar" ? (
              <p className="text-small text-neutral-300">
                {found.queue === "SOLO" ? "Clasificatoria solo/dúo" : "Clasificatoria flexible"}:{" "}
                <strong>
                  {rankLabel(found.rank)}
                  {found.division ? ` ${found.division}` : ""}
                </strong>
                {found.leaguePoints !== null ? ` · ${found.leaguePoints} LP` : ""}. Usamos el tier
                para el tono del plan; la división es sólo informativa.
              </p>
            ) : null}
            <ProfileEditor
              rank={rank}
              positions={positions}
              champions={step === "result" ? found?.champions || [] : []}
              selectedChampions={selected}
              catalog={catalog}
              onRank={setRank}
              onPositions={setPositions}
              onToggleChampion={(id) =>
                setSelected((previous) =>
                  previous.includes(id)
                    ? previous.filter((entry) => entry !== id)
                    : [...previous, id],
                )
              }
            />
            {saveError ? (
              <Alert tone="danger" role="alert">
                {saveError}
              </Alert>
            ) : null}
          </section>
        )}

        <footer className="mt-auto flex flex-col-reverse gap-2 border-t border-divider pt-4 sm:flex-row sm:items-center">
          {step === "manual" && riotConfigured ? (
            <Button variant="ghost" onClick={() => setStep("connect")}>
              Usar mi Riot ID
            </Button>
          ) : step !== "manual" && step !== "result" ? (
            <Button variant="ghost" onClick={() => setStep("manual")}>
              Prefiero elegir a mano
            </Button>
          ) : null}
          <Button
            variant="ghost"
            onClick={onSkip}
            disabled={saving}
            className="hidden lg:inline-flex sm:ml-auto"
          >
            Saltar por ahora
          </Button>
          {step === "result" || step === "manual" ? (
            <Button
              variant="primary"
              onClick={finish}
              loading={saving}
              loadingLabel="Guardando…"
              className="sm:ml-2"
            >
              {rank || positions.length || selected.length ? "Guardar y empezar" : "Empezar"}
              <ArrowRight size={16} aria-hidden="true" />
            </Button>
          ) : null}
        </footer>
      </main>
    </div>
  );
}
