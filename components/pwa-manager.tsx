"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Check, Download, Shield, Smartphone, WifiOff } from "lucide-react";
import { Modal } from "@/components/modal";

interface InstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: "accepted" | "dismissed" }>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstall({ onOpen }: { onOpen: () => void }) {
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [secure, setSecure] = useState(true);
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [message, setMessage] = useState("");
  const [workerFailed, setWorkerFailed] = useState(false);

  useEffect(() => {
    let disposed = false;
    const standalone = window.matchMedia("(display-mode: standalone)");
    const isInstalled = () =>
      standalone.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize the initial browser display mode before subscribing to installation events.
    setInstalled(isInstalled());
    setSecure(window.isSecureContext);
    const displayChanged = () => setInstalled(isInstalled());
    const available = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };
    const completed = () => {
      setInstalled(true);
      setPrompt(null);
      setMessage("App instalada.");
    };
    standalone.addEventListener("change", displayChanged);
    window.addEventListener("beforeinstallprompt", available);
    window.addEventListener("appinstalled", completed);
    if (
      process.env.NODE_ENV === "production" &&
      window.isSecureContext &&
      "serviceWorker" in navigator
    ) {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          if (!disposed) setWorkerFailed(true);
        });
    }
    return () => {
      disposed = true;
      standalone.removeEventListener("change", displayChanged);
      window.removeEventListener("beforeinstallprompt", available);
      window.removeEventListener("appinstalled", completed);
    };
  }, []);

  async function install() {
    if (!prompt || installing) return;
    setInstalling(true);
    setMessage("");
    try {
      // Keep the browser prompt directly attached to the user's click.
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setMessage(
        choice.outcome === "accepted"
          ? "Sigue los pasos del navegador."
          : "Puedes instalarla después desde el navegador.",
      );
    } catch {
      setMessage("Menú del navegador → Instalar app o Añadir a pantalla de inicio.");
    } finally {
      setPrompt(null);
      setInstalling(false);
    }
  }

  return (
    <>
      {!installed ? (
        <button
          className="nav-item"
          type="button"
          aria-label="Instalar app"
          onClick={() => {
            onOpen();
            setOpen(true);
          }}
        >
          <Download size={17} />
          <span>Instalar app</span>
        </button>
      ) : null}
      {open
        ? createPortal(
            <Modal
              title={installed ? "App instalada" : "Instalar Elociencia"}
              onClose={() => setOpen(false)}
            >
              <div className="pwa-app-preview">
                <Image src="/icons/icon-192.png" alt="" width={58} height={58} unoptimized />
                <div>
                  <strong>Elociencia</strong>
                  <span>La ciencia de subir de elo</span>
                </div>
                <Smartphone size={23} />
              </div>
              <p className="modal-intro">Abre Elociencia desde tu pantalla de inicio.</p>
              {!secure ? (
                <p className="notice-alert pwa-note">Abre la versión HTTPS para instalar la app.</p>
              ) : null}
              <div className="help-steps pwa-instructions">
                <div className="help-step">
                  <span className="level-number">1</span>
                  <div>
                    <h3>iPhone o iPad</h3>
                    <p>Safari → Compartir → Añadir a pantalla de inicio.</p>
                  </div>
                </div>
                <div className="help-step">
                  <span className="level-number">2</span>
                  <div>
                    <h3>Android o computadora</h3>
                    <p>Chrome o Edge → Menú → Instalar app o Añadir a pantalla de inicio.</p>
                  </div>
                </div>
              </div>
              <div className="privacy-note">
                <Shield size={15} />
                <span>Requiere internet. Fotos, claves y planes no se guardan en caché.</span>
              </div>
              {workerFailed ? (
                <p className="field-help">
                  No se activó el modo sin conexión. Reabre la app con internet.
                </p>
              ) : null}
              {message ? (
                <p className="pwa-install-message" role="status">
                  {message}
                </p>
              ) : null}
              <div className="modal-footer">
                <button className="secondary-button" type="button" onClick={() => setOpen(false)}>
                  Listo
                </button>
                {prompt && !installed ? (
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => void install()}
                    disabled={installing}
                  >
                    <Download size={14} />
                    {installing ? "Abriendo instalación…" : "Instalar Elociencia"}
                  </button>
                ) : installed ? (
                  <span className="pwa-installed">
                    <Check size={14} />
                    App instalada
                  </span>
                ) : null}
              </div>
            </Modal>,
            document.body,
          )
        : null}
    </>
  );
}

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
    <div className="notice-alert pwa-offline-notice" role="status">
      <WifiOff size={16} />
      <span>
        Sin conexión. Puedes preparar tu selección; analizar requiere internet. No hay reintentos
        automáticos.
      </span>
    </div>
  ) : null;
}
