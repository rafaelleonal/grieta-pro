import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "icon";

const BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent px-4 text-sm font-medium leading-tight transition-colors disabled:cursor-not-allowed disabled:border-neutral-800 disabled:bg-transparent disabled:text-neutral-500";

const VARIANTS: Record<ButtonVariant, string> = {
  // Contorno de acento sobre --a900: nunca relleno sólido (ADR 0003).
  primary:
    "min-h-12 rounded-control border-accent bg-accent-900 px-4.5 text-control text-accent-200 enabled:hover:bg-accent-800 enabled:hover:text-accent-100",
  secondary:
    "border-neutral-700 text-text enabled:hover:border-neutral-500 enabled:hover:bg-neutral-800/40",
  ghost:
    "px-3.5 text-neutral-300 enabled:hover:bg-neutral-900 enabled:hover:text-text disabled:border-transparent",
  danger: "border-danger-border bg-danger-bg text-danger-text enabled:hover:border-danger",
  icon: "size-11 rounded-full bg-neutral-800 p-0 text-neutral-300 enabled:hover:bg-neutral-700 enabled:hover:text-text",
};

/** Clases de botón para usar también en enlaces (`<a>`, `<Link>`). */
export function buttonClasses(variant: ButtonVariant = "secondary", block = false) {
  return cn(BASE, VARIANTS[variant], block && "w-full justify-between");
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-4 flex-none animate-spin rounded-full border-2 border-accent-800 border-t-accent-300",
        className,
      )}
    />
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  block?: boolean;
  loading?: boolean;
  loadingLabel?: ReactNode;
};

export function Button({
  variant = "secondary",
  block = false,
  loading = false,
  loadingLabel,
  className,
  children,
  type = "button",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonClasses(variant, block), className)}
      disabled={disabled}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          <Spinner />
          {loadingLabel ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
