import type { ReactNode } from "react";
import { cn } from "./cn";

type AlertTone = "warning" | "danger" | "success" | "info";

const ALERT: Record<AlertTone, string> = {
  warning: "bg-warning-bg text-warning-text ring-warning-border",
  danger: "bg-danger-bg text-danger-text ring-danger-border",
  success: "bg-success-bg text-success-text ring-success-border",
  info: "bg-accent-900 text-accent-200 ring-accent-800",
};

export function Alert({
  tone = "warning",
  title,
  icon,
  action,
  children,
  role = "status",
  className,
}: {
  tone?: AlertTone;
  title?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  role?: "status" | "alert";
  className?: string;
}) {
  return (
    <div
      role={role}
      className={cn(
        "flex items-start gap-3.5 rounded-control px-4 py-3.5 text-small ring-1 ring-inset",
        ALERT[tone],
        className,
      )}
    >
      {icon ? <span className="mt-0.5 flex-none">{icon}</span> : null}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 [overflow-wrap:anywhere]">
        {title ? (
          <strong className="text-control font-medium text-neutral-100">{title}</strong>
        ) : null}
        {children}
      </div>
      {action}
    </div>
  );
}

/** Barra de consumo; el ancho es el único valor dinámico en línea. */
export function Meter({
  label,
  value,
  max,
  detail,
}: {
  label: ReactNode;
  value: number;
  max: number;
  detail?: ReactNode;
}) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between gap-3 text-label">
        <span>{label}</span>
        <span className="text-neutral-400">{detail ?? `${value} de ${max}`}</span>
      </div>
      <div
        role="meter"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        className="h-1.5 overflow-hidden rounded-full bg-neutral-800"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-600 ease-out",
            ratio > 0.85 ? "bg-warning" : "bg-accent",
          )}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "block h-3 animate-shimmer rounded-sm bg-linear-90 from-neutral-900 via-neutral-800 to-neutral-900 bg-size-[720px_100%]",
        className,
      )}
    />
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl px-4.5 py-6 text-center ring-1 ring-inset ring-neutral-800">
      {icon ? (
        <span className="grid size-11 place-items-center rounded-full bg-neutral-900 text-neutral-400">
          {icon}
        </span>
      ) : null}
      <strong className="text-sm font-medium">{title}</strong>
      {children ? <p className="m-0 max-w-xs text-xs text-neutral-400">{children}</p> : null}
      {action}
    </div>
  );
}

export function Overline({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("text-overline font-medium uppercase text-neutral-500", className)}>
      {children}
    </span>
  );
}
