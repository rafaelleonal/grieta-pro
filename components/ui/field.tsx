import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "./cn";

const CONTROL =
  "w-full min-h-11 rounded-md border border-neutral-800 bg-bg px-3.5 text-control text-text transition-colors placeholder:text-neutral-500 focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent-800 aria-invalid:border-danger-border";

export const inputClasses = CONTROL;

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL, className)} {...props} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(CONTROL, "pr-9", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROL, "min-h-24 resize-y py-3", className)} {...props} />;
}

/** Etiqueta, control y ayuda o error, enlazados para lectores de pantalla. */
export function Field({
  id,
  label,
  help,
  error,
  optional,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  help?: ReactNode;
  error?: ReactNode;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-label font-medium text-text">
        {label}
        {optional ? <span className="font-normal text-neutral-500"> · opcional</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger-text">
          {error}
        </p>
      ) : help ? (
        <p id={`${id}-help`} className="text-xs text-neutral-500">
          {help}
        </p>
      ) : null}
    </div>
  );
}
