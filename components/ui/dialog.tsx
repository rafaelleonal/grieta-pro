"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "./cn";

/**
 * Diálogo nativo (`<dialog>` modal): foco atrapado, Escape y clic fuera cierran.
 * En móvil se muestra como hoja inferior; en tablet y escritorio, centrado.
 */
export function Dialog({
  title,
  description,
  children,
  footer,
  onClose,
  size = "md",
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  size?: "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "m-0 mt-auto max-h-[92dvh] w-full max-w-none overflow-y-auto rounded-t-2xl bg-surface p-0 text-text shadow-lg backdrop:bg-black/60",
        "md:m-auto md:rounded-lg",
        size === "lg" ? "md:max-w-3xl" : "md:max-w-lg",
        "open:motion-safe:animate-enter",
      )}
    >
      <div className="flex flex-col gap-5 p-5 pb-[calc(20px+env(safe-area-inset-bottom))] md:p-6">
        <span
          aria-hidden="true"
          className="mx-auto -mt-1 h-1 w-9 rounded-full bg-neutral-700 md:hidden"
        />
        <header className="flex items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 id={titleId} className="text-h2 font-medium">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="text-small text-neutral-400">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="grid size-11 flex-none place-items-center rounded-full bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-text"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        {children}
        {footer ? (
          <footer className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}
