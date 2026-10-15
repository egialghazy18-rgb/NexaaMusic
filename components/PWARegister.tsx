"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    __nexaaInstallPrompt?: any;
  }
}

export default function PWARegister() {
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      window.__nexaaInstallPrompt = e;
      window.dispatchEvent(new Event("nexaa:can-install"));
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    if ("serviceWorker" in navigator) {
      // Selalu register SW — tidak peduli NODE_ENV.
      // Di Vercel/Netlify production, NODE_ENV bisa tidak terbaca dengan benar
      // sehingga kondisi "!== production" menyebabkan SW tidak pernah terdaftar di PWA.
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          // Langsung activate SW baru tanpa tunggu tab ditutup
          if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
          reg.addEventListener("updatefound", () => {
            const newSW = reg.installing;
            if (!newSW) return;
            newSW.addEventListener("statechange", () => {
              if (newSW.state === "installed" && navigator.serviceWorker.controller) {
                newSW.postMessage({ type: "SKIP_WAITING" });
              }
            });
          });
        })
        .catch(() => {});
    }

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  return null;
}
