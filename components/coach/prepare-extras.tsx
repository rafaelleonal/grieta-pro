"use client";

import Image from "next/image";
import { ArrowRight, Globe, Search } from "lucide-react";
import { ChampionSelect } from "@/components/champion-select";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/tag";
import { Input, Select, Textarea } from "@/components/ui/field";
import { cn } from "@/components/ui/cn";
import { usesPlanAccess, webSearchEnabled } from "@/lib/account-presentation";
import type { AccountStatus } from "@/lib/auth-client";
import type { AppStatus, Champion, CoachInput } from "@/lib/types";
import type { RiotImport } from "@/components/hooks/use-riot-import";

export type ExtraPanel = "teams" | "note" | "riot";

const PLATFORMS = [
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

export function TeamsPanel({
  input,
  champions,
  onTeamChange,
}: {
  input: CoachInput;
  champions: Champion[];
  onTeamChange: (team: "allies" | "enemies", index: number, value: string) => void;
}) {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {(
        [
          ["allies", "Aliados", "bg-success"],
          ["enemies", "Rivales", "bg-danger"],
        ] as const
      ).map(([team, label, dot]) => (
        <fieldset key={team} className="flex flex-col gap-2">
          <legend className="mb-2 flex items-center gap-2 text-label font-medium">
            <span aria-hidden="true" className={cn("size-1.5 rounded-full", dot)} />
            {label}
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((index) => (
              <ChampionSelect
                key={`${team}-${index}`}
                champions={champions}
                value={input[team][index] || ""}
                onChange={(value) => onTeamChange(team, index, value)}
                label={`${team === "allies" ? "Aliado" : "Enemigo"} ${index + 1}`}
                compact
                optional
              />
            ))}
          </div>
        </fieldset>
      ))}
      <p className="text-xs text-neutral-400 md:col-span-2">
        Opcional. Añade sólo los campeones que faltan.
      </p>
    </div>
  );
}

export function NotePanel({
  notes,
  onChange,
}: {
  notes: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="coach-notes" className="text-label font-medium">
        Contexto <span className="font-normal text-neutral-500">· opcional</span>
      </label>
      <Textarea
        id="coach-notes"
        value={notes}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ej. Quiero jugar seguro hasta nivel 6."
        maxLength={1500}
        aria-describedby="coach-notes-count"
      />
      <span id="coach-notes-count" className="self-end text-xs text-neutral-500">
        {notes.length} / 1500
      </span>
    </div>
  );
}

export function RiotPanel({
  riot,
  status,
  champions,
  busy,
  onSearch,
  onApply,
}: {
  riot: RiotImport;
  status: AppStatus | null;
  champions: Champion[];
  busy: string | null;
  onSearch: () => void;
  onApply: (enemyId: string) => void;
}) {
  const enabled = Boolean(status?.riotConfigured) && !busy;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-small text-neutral-300">
        {status?.riotConfigured
          ? "Importa una partida en curso. Para selección de campeones, usa una captura."
          : "Riot no está disponible. Elige a mano o usa una captura."}
      </p>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_auto]">
        <Input
          value={riot.riotId}
          onChange={(event) => riot.setRiotId(event.target.value)}
          aria-label="Riot ID"
          placeholder="TuNombre#TAG"
          maxLength={80}
          disabled={!enabled}
        />
        <Select
          value={riot.platform}
          onChange={(event) => riot.setPlatform(event.target.value)}
          aria-label="Servidor de Riot"
          disabled={!enabled}
        >
          {PLATFORMS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Button
          onClick={onSearch}
          disabled={!enabled || !riot.riotId.trim()}
          loading={busy === "riot"}
          loadingLabel="Buscando…"
        >
          <Search size={15} aria-hidden="true" />
          Buscar partida
        </Button>
      </div>
      {riot.riot ? (
        <div className="flex flex-col gap-2">
          <p className="text-small text-neutral-300">Elige tu rival y revisa tu línea.</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {riot.riot.participants
              .filter((entry) => entry.team === "enemy")
              .map((entry) => {
                const champion = champions.find((value) => value.id === entry.champion);
                return (
                  <li key={`${entry.champion}-${entry.name}`}>
                    <button
                      type="button"
                      onClick={() => onApply(entry.champion)}
                      className="flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-left ring-1 ring-inset ring-neutral-800 hover:ring-neutral-600"
                    >
                      {champion ? (
                        <Image
                          src={champion.image}
                          alt=""
                          width={32}
                          height={32}
                          unoptimized
                          className="rounded-md"
                        />
                      ) : null}
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-sm">{champion?.name || entry.champion}</span>
                        <span className="truncate text-xs text-neutral-400">{entry.name}</span>
                      </span>
                      <ArrowRight size={14} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/** Fuentes actuales según la disponibilidad y las búsquedas restantes. */
export function webSearchState(account: AccountStatus | null, requested: boolean) {
  const allowed = webSearchEnabled(account, true);
  return { allowed, on: requested && allowed, remaining: account?.usage?.webRemaining ?? 0 };
}

export function WebSearchControl({
  account,
  requested,
  onChange,
}: {
  account: AccountStatus | null;
  requested: boolean;
  onChange: (next: boolean) => void;
}) {
  if (!usesPlanAccess(account)) return null;
  const web = webSearchState(account, requested);
  return (
    <Chip
      pressed={web.on}
      disabled={!web.allowed}
      onClick={() => onChange(!requested)}
      className="flex-none disabled:cursor-not-allowed disabled:opacity-70"
      title={
        web.allowed
          ? `Buscar referencias · ${web.remaining} disponibles`
          : "Fuentes web no disponibles por ahora"
      }
    >
      <Globe size={15} aria-hidden="true" />
      Fuentes web
    </Chip>
  );
}
