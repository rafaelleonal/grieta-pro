import Image from "next/image";
import { cn } from "./ui/cn";

/** Casilla «1 · El» de la dirección A; `size` en px. Decorativa salvo que se indique `label`. */
export function BrandTile({ size = 36, label }: { size?: number; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="4 4 56 56"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <rect
        x="6"
        y="6"
        width="52"
        height="52"
        rx="9"
        fill="var(--color-brand-tile)"
        stroke="var(--color-brand-lime)"
        strokeWidth="2.4"
      />
      <path
        d="M12 13.4L14.4 11.6V19"
        fill="none"
        stroke="var(--color-brand-lime)"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g
        fill="none"
        stroke="var(--color-brand-ink)"
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M34 26H21V44H34M21 35H31" />
        <path d="M42 22V44" />
      </g>
    </svg>
  );
}

/** Logotipo horizontal: casilla + «elociencia» con «elo» en lima (sólo sobre fondo oscuro). */
export function BrandLogo({ size = 32, compact = false }: { size?: number; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-brand-ink">
      <BrandTile size={size} />
      {compact ? (
        <span className="sr-only">Elociencia</span>
      ) : (
        <span className="text-lg font-semibold tracking-tight text-brand-ink">
          <span className="text-brand-lime">elo</span>ciencia
        </span>
      )}
    </span>
  );
}

/**
 * La mascota es casi negra: siempre va sobre un disco lima o crema, nunca directamente
 * sobre el fondo. No se usa en «En partida».
 */
export function Mascot({
  size = 96,
  tone = "lima",
  alt = "",
}: {
  size?: number;
  tone?: "lima" | "crema";
  alt?: string;
}) {
  const source = size > 160 ? 512 : 256;
  return (
    <span
      className={cn(
        "grid flex-none place-items-center overflow-hidden rounded-full",
        tone === "crema" ? "bg-brand-cream" : "bg-brand-lime",
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={`/brand/mascota-${tone}-${source}.png`}
        alt={alt}
        width={size}
        height={size}
        className="h-[92%] w-[92%] object-contain"
        unoptimized
      />
    </span>
  );
}

const RANK_ELEMENTS: Record<string, { symbol: string; number: string; mass: string }> = {
  Hierro: { symbol: "Fe", number: "26", mass: "55,85" },
  Bronce: { symbol: "Cu", number: "29", mass: "63,55" },
  Plata: { symbol: "Ag", number: "47", mass: "107,87" },
  Oro: { symbol: "Au", number: "79", mass: "196,97" },
  Platino: { symbol: "Pt", number: "78", mass: "195,08" },
  Diamante: { symbol: "C", number: "6", mass: "12,011" },
};
const RANK_NAMES: Record<string, string> = {
  Master: "Maestro",
  Grandmaster: "Gran Maestro",
  "Sin clasificar": "Sin rango",
};

export function rankLabel(rank: string) {
  return RANK_NAMES[rank] || rank;
}

/**
 * Rango como casilla de tabla periódica. Esmeralda, Maestro, Gran Maestro, Challenger y
 * «sin clasificar» no son elementos: llevan una casilla sin símbolo químico.
 */
export function RankTile({
  rank,
  size = 96,
  compact = false,
  active = false,
}: {
  rank: string;
  size?: number;
  compact?: boolean;
  active?: boolean;
}) {
  const element = RANK_ELEMENTS[rank];
  const name = rankLabel(rank);
  return (
    <span
      className={cn("rank-tile", compact && "rank-tile--compact", active && "rank-tile--active")}
      data-rank={rank}
      style={{ width: size, fontSize: compact ? undefined : Math.max(9, size / 8.5) }}
      aria-hidden="true"
      title={name}
    >
      <span className="rank-tile-meta">
        <span>{element?.number || "·"}</span>
        {!compact && element ? <span>{element.mass}</span> : null}
      </span>
      <span className="rank-tile-symbol">{element?.symbol || name.slice(0, 2)}</span>
      <span className="rank-tile-name">{name}</span>
    </span>
  );
}
