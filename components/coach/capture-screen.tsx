"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import Image from "next/image";
import { Camera, ImagePlus, Lock, Trash2, Upload, WandSparkles } from "lucide-react";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Textarea } from "@/components/ui/field";
import { cn } from "@/components/ui/cn";
import { roleName } from "@/lib/coach-draft";
import type { Champion } from "@/lib/types";
import type { CoachWorkspace } from "@/components/hooks/use-coach-workspace";

/**
 * Foto, captura o texto: el original puede pesar hasta 30 MB y se optimiza en el
 * dispositivo antes de subirlo. Lo detectado sólo se aplica cuando el jugador confirma.
 */
export function CaptureScreen({ ws, onManual }: { ws: CoachWorkspace; onManual: () => void }) {
  const { capture, busy } = ws;
  const gallery = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const champions = ws.catalog?.champions || [];
  const disabled = Boolean(busy);

  // Pegar una imagen con Ctrl/⌘ + V mientras esta pantalla está abierta.
  const onPaste = useEffectEvent((event: ClipboardEvent) => {
    const file = [...(event.clipboardData?.files || [])].find((entry) =>
      entry.type.startsWith("image/"),
    );
    if (file && !disabled) {
      event.preventDefault();
      ws.readImage(file);
    }
  });
  useEffect(() => {
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-5 px-4 py-5 md:px-7 md:py-7">
      <header className="flex flex-col gap-1">
        <span className="text-overline font-medium uppercase text-accent-300">
          — Desde una captura
        </span>
        <h1 className="text-h1 font-medium md:text-display">
          Sube la selección y revisamos los campeones.
        </h1>
        <p className="text-small text-neutral-400 md:text-body">
          Foto de la pantalla, captura o texto pegado del cliente. Tú confirmas antes de generar.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <section
          aria-label="Foto, captura o texto"
          className="flex flex-col gap-4 rounded-lg bg-surface p-4 md:p-5"
        >
          <Segmented
            label="Modo de entrada"
            value="capture"
            onChange={(value) => value === "manual" && onManual()}
            options={[
              { value: "manual", label: "Selección manual" },
              {
                value: "capture",
                label: "Foto o texto",
                icon: <Camera size={15} aria-hidden="true" />,
              },
            ]}
          />
          <div
            aria-busy={capture.preparingImage}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (!disabled) ws.readImage(event.dataTransfer.files[0]);
            }}
            className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-neutral-700 px-4 py-6 text-center"
          >
            {capture.preparingImage ? (
              <div role="status" className="flex flex-col items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-6 animate-spin rounded-full border-2 border-accent-800 border-t-accent-300"
                />
                <strong className="text-sm font-medium">Preparando tu foto…</strong>
                <span className="text-xs text-neutral-400">{capture.pendingImageName}</span>
              </div>
            ) : (
              <>
                <span
                  aria-hidden="true"
                  className="grid size-11 place-items-center rounded-control bg-accent-900 text-accent-200"
                >
                  <Upload size={19} />
                </span>
                <strong className="text-sm font-medium">
                  <span className="hidden md:inline">Arrastra una imagen o pégala con Ctrl V</span>
                  <span className="md:hidden">Elige una foto o tómala</span>
                </strong>
                <p id="upload-limit" className="text-xs text-neutral-400">
                  PNG, JPG o WebP · hasta 30 MB · la optimizamos antes de subir
                </p>
              </>
            )}
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => gallery.current?.click()} disabled={disabled}>
                <ImagePlus size={16} aria-hidden="true" />
                Elegir foto o captura
              </Button>
              <Button
                onClick={() => camera.current?.click()}
                disabled={disabled}
                className="md:hidden"
              >
                <Camera size={16} aria-hidden="true" />
                Tomar foto
              </Button>
            </div>
            <input
              ref={gallery}
              hidden
              type="file"
              accept="image/*"
              aria-label="Elegir foto o captura"
              aria-describedby="upload-limit"
              disabled={disabled}
              onChange={(event) => {
                ws.readImage(event.currentTarget.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
            <input
              ref={camera}
              hidden
              type="file"
              accept="image/*"
              capture="environment"
              aria-label="Tomar foto"
              aria-describedby="upload-limit"
              disabled={disabled}
              onChange={(event) => {
                ws.readImage(event.currentTarget.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
          </div>

          {capture.image && capture.imageDetails ? (
            <div className="flex items-center gap-3 rounded-lg p-2 ring-1 ring-inset ring-neutral-800">
              <Image
                src={capture.image}
                alt="Foto o captura que se enviará al coach"
                width={72}
                height={48}
                unoptimized
                className="h-12 w-18 rounded-md object-cover"
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <strong className="truncate text-sm font-medium">{capture.imageName}</strong>
                <span className="text-xs text-success-text">
                  {(capture.imageDetails.originalBytes / 1_000_000).toLocaleString("es-MX", {
                    maximumFractionDigits: 1,
                  })}{" "}
                  MB ·{" "}
                  {capture.imageDetails.wasCompressed
                    ? "optimizada para enviar"
                    : "lista para enviar"}
                </span>
              </span>
              <button
                type="button"
                onClick={capture.clearImage}
                disabled={disabled}
                aria-label="Quitar foto o captura"
                className="grid size-11 place-items-center rounded-full text-neutral-400 hover:bg-neutral-900 hover:text-danger-text"
              >
                <Trash2 size={17} aria-hidden="true" />
              </button>
            </div>
          ) : capture.preparingImage ? (
            <Button variant="ghost" onClick={capture.cancelImagePreparation}>
              Cancelar preparación de foto
            </Button>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="draft-text"
              className="text-overline font-medium uppercase text-neutral-500"
            >
              O pega texto
            </label>
            <Textarea
              id="draft-text"
              value={capture.draftText}
              onChange={(event) => {
                capture.setDraftText(event.target.value);
                capture.setDraft(null);
              }}
              placeholder="Pega el chat de la selección o escribe: «Yo Darius top contra Illaoi; mi jungla es Lee Sin…»"
              maxLength={2000}
              disabled={disabled}
            />
            <span className="self-end text-xs text-neutral-500">
              {capture.draftText.length} / 2000
            </span>
          </div>
          <Button
            onClick={() => void ws.detectDraft()}
            disabled={
              disabled || capture.preparingImage || (!capture.image && !capture.draftText.trim())
            }
            loading={busy === "draft"}
            loadingLabel="Identificando campeones…"
          >
            <WandSparkles size={16} aria-hidden="true" />
            Identificar y revisar
          </Button>
          <p className="flex items-start gap-2 text-xs text-neutral-400">
            <Lock size={14} aria-hidden="true" className="mt-0.5 flex-none" />
            La foto se envía a OpenRouter para leerla. No guardamos la imagen original; sólo usamos
            los campeones que confirmes.
          </p>
        </section>

        <DraftReview ws={ws} champions={champions} onManual={onManual} />
      </div>
    </div>
  );
}

function DraftReview({
  ws,
  champions,
  onManual,
}: {
  ws: CoachWorkspace;
  champions: Champion[];
  onManual: () => void;
}) {
  const draft = ws.capture.draft;
  const name = (id: string | null) => champions.find((entry) => entry.id === id)?.name || id;
  if (!draft)
    return (
      <section className="flex flex-col items-center justify-center gap-2 rounded-lg bg-surface p-6 text-center">
        <strong className="text-h3 font-medium">Revisa lo que detectamos</strong>
        <p className="max-w-sm text-small text-neutral-400">
          Cuando identifiquemos la selección, aquí verás tu equipo y los rivales para confirmar o
          corregir antes de preparar el plan.
        </p>
      </section>
    );
  const missing = [!draft.champion, !draft.enemy, !draft.role].filter(Boolean).length;
  return (
    <section
      aria-label="Revisa lo que detectamos"
      className="flex flex-col gap-4 rounded-lg bg-surface p-4 md:p-6"
    >
      <h2 className="text-h2 font-medium">Revisa lo que detectamos</h2>
      {[
        [
          "Tu equipo",
          [draft.champion, ...draft.allies.filter((id) => id !== draft.champion)],
          draft.champion,
          "Tú",
        ],
        [
          "Rivales",
          [draft.enemy, ...draft.enemies.filter((id) => id !== draft.enemy)],
          draft.enemy,
          "Tu rival",
        ],
      ].map(([label, ids, lead, leadLabel]) => (
        <div key={label as string} className="flex flex-col gap-2">
          <span className="text-overline font-medium uppercase text-neutral-500">
            {label as string}
          </span>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {(ids as (string | null)[]).slice(0, 5).map((id, index) => {
              const champion = champions.find((entry) => entry.id === id);
              const isLead = Boolean(id) && id === lead;
              return (
                <li
                  key={`${id}-${index}`}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-control p-2 text-center ring-1 ring-inset",
                    id ? "ring-neutral-800" : "bg-warning-bg text-warning-text ring-warning-border",
                    isLead && "bg-accent-900 ring-accent",
                  )}
                >
                  {champion ? (
                    <Image
                      src={champion.image}
                      alt=""
                      width={40}
                      height={40}
                      unoptimized
                      className="rounded-md"
                    />
                  ) : null}
                  <span className="text-xs font-medium">{id ? name(id) : "Sin leer"}</span>
                  {isLead ? (
                    <span className="text-overline font-semibold uppercase text-accent-200">
                      {leadLabel as string}
                      {draft.role ? ` · ${roleName(draft.role)}` : ""}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {draft.notes ? <p className="text-small text-neutral-300">{draft.notes}</p> : null}
      {draft.warnings.length || missing ? (
        <Alert
          tone="warning"
          title={missing ? "Faltan datos por confirmar" : "Revisa estos avisos"}
        >
          {draft.warnings.join(" ")}
          {missing ? " Los datos que no se identificaron conservarán tu selección manual." : ""}
        </Alert>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          variant="primary"
          block
          onClick={() => {
            ws.applyDraft();
            onManual();
          }}
        >
          Usar esta selección
        </Button>
        <Button onClick={() => ws.capture.setDraft(null)}>Descartar</Button>
        <Button variant="ghost" onClick={onManual}>
          Editar a mano
        </Button>
      </div>
    </section>
  );
}
