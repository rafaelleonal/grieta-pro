"use client";

import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: "accepted" | "dismissed" }>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Estado de instalación de la PWA y registro del service worker (sólo producción y HTTPS).
 * El worker cachea únicamente archivos públicos: nunca HTML privado, API ni consultas de IA.
 */
export function usePwaInstall() {
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

  return {
    installed,
    secure,
    canPrompt: Boolean(prompt),
    installing,
    message,
    workerFailed,
    install,
  };
}
