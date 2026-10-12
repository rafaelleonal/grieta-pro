"use client";
import { useId, useRef, useState } from "react";
import { Copy, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PlanActions({
  text,
  busy,
  error,
  onFollowup,
}: {
  text: () => string;
  busy: boolean;
  error?: string;
  onFollowup: (message: string) => boolean;
}) {
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const askButton = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const helpId = useId();
  async function copy() {
    try {
      await navigator.clipboard.writeText(text());
      setStatus("Plan copiado.");
    } catch {
      setStatus("No pudimos copiar. Selecciona el texto del plan para copiarlo.");
    }
  }
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          ref={askButton}
          type="button"
          disabled={busy}
          aria-haspopup="dialog"
          className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-small text-neutral-300 hover:bg-surface disabled:opacity-50"
          onClick={() => {
            dialog.current?.showModal();
            field.current?.focus();
          }}
        >
          <MessageCircle size={17} aria-hidden="true" />
          Preguntar
        </button>
        <Button variant="ghost" onClick={() => void copy()}>
          <Copy size={17} aria-hidden="true" />
          Copiar plan
        </Button>
        <span role="status" className="text-small text-neutral-400">
          {status}
        </span>
      </div>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        aria-describedby={helpId}
        onClose={() => askButton.current?.focus()}
        className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto overscroll-contain rounded-lg border border-divider bg-surface p-5 text-text shadow-lg backdrop:bg-black/70"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy && message.trim() && onFollowup(message.trim())) {
              setMessage("");
              dialog.current?.close();
            }
          }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 id={titleId} className="text-h2">
              ¿Algo cambia en tu partida?
            </h2>
            <Button
              variant="ghost"
              aria-label="Cerrar pregunta"
              onClick={() => dialog.current?.close()}
            >
              <X size={20} aria-hidden="true" />
            </Button>
          </div>
          <label htmlFor={`${titleId}-input`} className="block text-small">
            Tu pregunta sobre este plan
          </label>
          <textarea
            ref={field}
            id={`${titleId}-input`}
            name="followup"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={1000}
            rows={3}
            disabled={busy}
            placeholder="Por ejemplo: ¿qué hago si me campean?"
            className="w-full rounded-md border border-neutral-700 bg-bg p-3 text-body"
          />
          <p id={helpId} className="text-small text-neutral-400">
            Cada pregunta genera un nuevo análisis y consume cuota. Esc para cerrar.
          </p>
          {error ? (
            <p role="alert" className="text-small text-danger-text">
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="primary" disabled={busy || !message.trim()}>
            {busy ? "Analizando…" : "Generar nuevo análisis"}
          </Button>
        </form>
      </dialog>
    </>
  );
}
