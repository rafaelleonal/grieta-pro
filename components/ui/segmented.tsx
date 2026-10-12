import type { ReactNode } from "react";
import { cn } from "./cn";

/** Control segmentado accesible como grupo de botones conmutables. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: { value: T; label: ReactNode; icon?: ReactNode }[];
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("grid auto-cols-fr grid-flow-col gap-1 rounded-control bg-bg p-1", className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md text-small text-neutral-400 transition-colors aria-pressed:bg-surface aria-pressed:text-accent-200 aria-pressed:ring-1 aria-pressed:ring-inset aria-pressed:ring-accent"
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}
