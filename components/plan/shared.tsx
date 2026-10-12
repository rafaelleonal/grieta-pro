import Image from "next/image";
import { ChevronDown, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type {
  Catalog,
  Champion,
  GameItem,
  GameRune,
  RuneStyle,
  SummonerSpell,
  GamePhase,
} from "@/lib/types";

export type Maps = {
  champions: Map<string, Champion>;
  items: Map<string, GameItem>;
  runes: Map<string, GameRune>;
  styles: Map<string, RuneStyle>;
  summoners: Map<string, SummonerSpell>;
};
export const PHASES: { id: GamePhase; label: string }[] = [
  { id: "linea", label: "Inicio" },
  { id: "mid", label: "Mid game" },
  { id: "late", label: "Late game" },
];
export const ROLE_LABELS = {
  TOP: "Top",
  JUNGLE: "Jungla",
  MID: "Mid",
  ADC: "ADC",
  SUPPORT: "Support",
};
export function catalogMaps(catalog: Catalog): Maps {
  return {
    champions: new Map(catalog.champions.map((c) => [c.id, c])),
    items: new Map(catalog.items.map((c) => [c.id, c])),
    runes: new Map(catalog.runes.map((c) => [c.key, c])),
    styles: new Map(catalog.runeStyles.map((c) => [c.key, c])),
    summoners: new Map(catalog.summoners.map((c) => [c.id, c])),
  };
}
export function safeUrl(value: string) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}
export function Portrait({ champion }: { champion?: Champion }) {
  return champion ? (
    <Image
      src={champion.image}
      alt=""
      width={40}
      height={40}
      unoptimized
      className="size-10 shrink-0 rounded-md ring-1 ring-neutral-700"
    />
  ) : null;
}
export function PlanSection({
  title,
  hint,
  children,
  id,
  icon: Icon,
}: {
  title: string;
  hint: string;
  children: ReactNode;
  id?: string;
  icon?: LucideIcon;
}) {
  return (
    <details id={id} className="group rounded-lg border border-divider bg-surface open:pb-6">
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-4 rounded-lg px-5 py-5 hover:bg-neutral-800/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:px-6 [&::-webkit-details-marker]:hidden">
        {Icon ? (
          <span className="grid size-11 shrink-0 place-items-center rounded-md border border-accent-800 bg-accent-900 text-accent-300">
            <Icon size={22} aria-hidden="true" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <h3 className="text-h3 font-semibold">{title}</h3>
          <p className="mt-1 text-small text-neutral-400">{hint}</p>
        </div>
        <ChevronDown aria-hidden="true" size={18} className="shrink-0 group-open:rotate-180" />
      </summary>
      <div className="space-y-6 border-t border-divider px-5 pt-6 md:px-6">{children}</div>
    </details>
  );
}
export function Advice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-md bg-bg p-5">
      <h4 className="text-h3 font-semibold leading-snug text-text">{title}</h4>
      <div className="text-body leading-relaxed text-neutral-300">{children}</div>
    </div>
  );
}

export function DetailHeading({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-accent-900 text-accent-300">
        <Icon size={21} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <h4 className="text-h2 font-semibold text-neutral-100">{title}</h4>
        <p className="mt-2 text-small leading-relaxed text-neutral-400">{description}</p>
      </div>
    </div>
  );
}
