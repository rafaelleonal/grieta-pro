"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { RankTile } from "@/components/brand";
import { cn } from "@/components/ui/cn";
import { ROLES } from "@/lib/coach-draft";
import { PROFILE_RANKS, type ProfileRank } from "@/lib/game-profile-client";
import type { Champion, Role } from "@/lib/types";

/** Rango como casillas de elemento, hasta 2 posiciones y favoritos por maestría. */
export function ProfileEditor({
  rank,
  positions,
  champions,
  selectedChampions,
  catalog,
  onRank,
  onPositions,
  onToggleChampion,
}: {
  rank: ProfileRank | null;
  positions: Role[];
  champions: { id: string; role: Role | null }[];
  selectedChampions: string[];
  catalog: Champion[];
  onRank: (rank: ProfileRank | null) => void;
  onPositions: (positions: Role[]) => void;
  onToggleChampion: (id: string) => void;
}) {
  function togglePosition(role: Role) {
    if (positions.includes(role)) onPositions(positions.filter((entry) => entry !== role));
    else onPositions(positions.length < 2 ? [...positions, role] : [positions[0], role]);
  }
  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-label font-medium">
          Rango <span className="font-normal text-neutral-500">· opcional</span>
        </legend>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-11">
          {PROFILE_RANKS.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={rank === option}
              aria-label={option}
              onClick={() => onRank(rank === option ? null : option)}
              className="rounded-control p-0.5 ring-accent transition-shadow aria-pressed:ring-2"
            >
              <RankTile rank={option} size={64} active={rank === option} />
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-label font-medium">
          Hasta 2 posiciones{" "}
          <span className="font-normal text-neutral-500">· toca para cambiar</span>
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {ROLES.map((role) => {
            const index = positions.indexOf(role.id);
            return (
              <button
                key={role.id}
                type="button"
                aria-pressed={index !== -1}
                onClick={() => togglePosition(role.id)}
                className="relative flex min-h-14 items-center justify-center gap-2 rounded-control text-sm text-neutral-300 ring-1 ring-inset ring-neutral-700 hover:ring-neutral-500 aria-pressed:bg-accent-900 aria-pressed:text-accent-200 aria-pressed:ring-accent"
              >
                {role.name}
                {index !== -1 ? (
                  <span className="absolute top-1.5 right-1.5 rounded-sm bg-accent-800 px-1.5 text-overline font-semibold tracking-normal text-accent-200">
                    {index === 0 ? "1ª" : "2ª"}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </fieldset>

      {champions.length ? (
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-label font-medium">
            Tus campeones{" "}
            <span className="font-normal text-neutral-500">
              · por maestría · toca para quitar o añadir
            </span>
          </legend>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-2">
            {champions.map(({ id, role }) => {
              const champion = catalog.find((entry) => entry.id === id);
              const selected = selectedChampions.includes(id);
              return (
                <li key={id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onToggleChampion(id)}
                    className={cn(
                      "relative flex w-full flex-col items-center gap-1 rounded-control p-2 text-center ring-1 ring-inset ring-neutral-800 transition-colors",
                      "aria-pressed:bg-accent-900 aria-pressed:ring-accent",
                    )}
                  >
                    {champion ? (
                      <Image
                        src={champion.image}
                        alt=""
                        width={44}
                        height={44}
                        unoptimized
                        className="rounded-md"
                      />
                    ) : null}
                    <span className="w-full truncate text-xs font-medium">
                      {champion?.name || id}
                    </span>
                    <span className="text-overline tracking-normal text-neutral-400">
                      {ROLES.find((entry) => entry.id === role)?.name || "Flexible"}
                    </span>
                    {selected ? (
                      <Check
                        size={14}
                        aria-hidden="true"
                        className="absolute top-1.5 right-1.5 text-accent-300"
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ) : null}
    </div>
  );
}
