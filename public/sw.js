/* Nexaa Music service worker v3 — background audio + media session */
const CACHE = "nexaa-v6-home";
const SHELL = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;

  // JANGAN cache hot-reload
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

  // Proxy gambar internal (/api/img) — cache agresif
  if (url.pathname.startsWith("/api/img")) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone)).catch(() => {});
          }
          return res;
        });
      })
    );
    return;
  }

  // Navigasi & API lainnya: network-first
  if (url.origin === self.location.origin) {
    if (e.request.mode === "navigate" || url.pathname.startsWith("/api/")) {
      e.respondWith(
        fetch(e.request)
          .then((res) => {
            if (res && res.status === 200) {
              const clone = res.clone();
              caches.open(CACHE).then((c) => c.put(e.request, clone)).catch(() => {});
            }
            return res;
          })
          .catch(() => caches.match(e.request))
      );
      return;
    }

    // Aset statis: cache-first
    if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
      e.respondWith(
        caches.match(e.request).then(
          (cached) =>
            cached ||
            fetch(e.request).then((res) => {
              if (res && res.status === 200) {
                const clone = res.clone();
                caches.open(CACHE).then((c) => c.put(e.request, clone)).catch(() => {});
              }
              return res;
            })
        )
      );
      return;
    }
  }
});

/* Service worker intentionally does not poll or self-fetch to keep audio alive.
   Browsers may terminate workers regardless; playback continuity must come from
   the media element/player and, for guaranteed native playback, a native service. */
self.addEventListener("message", (e) => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting();
});
