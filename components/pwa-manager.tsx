"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import { Check, Download, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/feedback";
import { usePwaInstall } from "@/components/hooks/use-pwa-install";

const BENEFITS = [
  "Abre directo en pantalla completa",
  "Toma la foto de la selección más rápido",
  "Sólo guarda archivos públicos, nunca tus planes",
];

/**
 * Botón y hoja «Instalar app». `trigger` permite dibujar el botón según el contexto
 * (sidebar, cuenta); se oculta cuando la app ya está instalada.
 */
export function PwaInstall({ trigger }: { trigger: (open: () => void) => ReactNode }) {
  const pwa = usePwaInstall();
  const [open, setOpen] = useState(false);
  return (
    <>
      {!pwa.installed ? trigger(() => setOpen(true)) : null}
      {open ? (
        <Dialog
          title={pwa.installed ? "App instalada" : "Instala Elociencia"}
          description="Ábrela como una app desde tu pantalla de inicio."
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {pwa.installed ? "Listo" : "Ahora no"}
              </Button>
              {pwa.canPrompt && !pwa.installed ? (
                <Button
                  variant="primary"
                  loading={pwa.installing}
                  loadingLabel="Abriendo instalación…"
                  onClick={() => void pwa.install()}
                >
                  <Download size={16} aria-hidden="true" />
                  Instalar
                </Button>
              ) : null}
            </>
          }
        >
          <div className="flex items-center gap-3">
            <Image
              src="/icons/icon-192.png"
              alt=""
              width={56}
              height={56}
              unoptimized
              className="rounded-control"
            />
            <div className="flex flex-col">
              <strong className="text-h3 font-medium">Elociencia</strong>
              <span className="text-small text-neutral-400">La ciencia de subir de elo</span>
            </div>
          </div>
          <ul className="flex flex-col gap-2.5">
            {BENEFITS.map((benefit) => (
              <li key={benefit} className="flex items-center gap-3 text-control">
                <Check size={17} aria-hidden="true" className="text-success" />
                {benefit}
              </li>
            ))}
          </ul>
          {!pwa.secure ? (
            <Alert tone="warning">Abre la versión HTTPS para instalar la app.</Alert>
          ) : null}
          <div className="rounded-control bg-bg p-3.5 text-small text-neutral-300">
            En iPhone: toca <strong className="text-text">Compartir</strong> y luego{" "}
            <strong className="text-text">Añadir a pantalla de inicio</strong>. En Android o
            computadora: menú del navegador → <strong className="text-text">Instalar app</strong>.
          </div>
          <p className="text-xs text-neutral-400">
            Requiere internet para generar planes. Fotos, claves y planes no se guardan en caché.
          </p>
          {pwa.workerFailed ? (
            <p className="text-xs text-warning-text">
              No se activó el modo sin conexión. Reabre la app con internet.
            </p>
          ) : null}
          {pwa.message ? (
            <p role="status" className="text-small text-success-text">
              {pwa.message}
            </p>
          ) : null}
        </Dialog>
      ) : null}
    </>
  );
}

/** Aviso sin conexión: se puede preparar la selección, pero generar requiere internet. */
export function OfflineNotice() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return offline ? (
    <Alert tone="warning" icon={<WifiOff size={18} />}>
      Sin conexión. Puedes preparar tu selección; generar un plan requiere internet. No hay
      reintentos automáticos.
    </Alert>
  ) : null;
}
