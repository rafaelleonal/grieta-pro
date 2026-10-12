import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

type TagTone = "neutral" | "accent" | "outline" | "pro" | "warning" | "success";

const TONES: Record<TagTone, string> = {
  neutral: "bg-neutral-800 text-neutral-300",
  accent: "bg-accent-900 text-accent-200 ring-1 ring-inset ring-accent",
  outline: "bg-bg/70 text-neutral-300 ring-1 ring-inset ring-neutral-700",
  pro: "bg-accent-800 text-accent-200 font-semibold tracking-normal",
  warning: "bg-warning-bg text-warning-text ring-1 ring-inset ring-warning-border",
  success: "bg-success-bg text-success-text ring-1 ring-inset ring-success-border",
};

export function Tag({
  tone = "neutral",
  children,
  className,
}: {
  tone?: TagTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-overline font-medium uppercase tracking-tag",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Chip conmutable: discontinuo en reposo, contorno de acento cuando está activo. */
export function Chip({
  pressed,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { pressed?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "inline-flex min-h-11 items-center gap-2 rounded-full border border-dashed border-neutral-700 px-3.5 text-small text-neutral-300 transition-colors hover:border-neutral-500",
        "aria-pressed:border-solid aria-pressed:border-accent aria-pressed:bg-accent-900 aria-pressed:text-accent-200",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** Estado del catálogo de Riot: verde en vivo, ámbar con respaldo. */
export function StatusPill({ live, children }: { live: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-micro font-medium tracking-status ring-1 ring-inset",
        live
          ? "text-success-text ring-success-border"
          : "bg-warning-bg text-warning-text ring-warning-border",
      )}
    >
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", live ? "bg-success" : "bg-warning")}
      />
      {children}
    </span>
  );
}
