/* NOVEE OS — Service Worker v3 */
const SHELL_CACHE  = "novee-shell-v3";
const ASSETS_CACHE = "novee-assets-v3";
const API_CACHE    = "novee-api-v3";
const ALL_CACHES   = [SHELL_CACHE, ASSETS_CACHE, API_CACHE];

const SHELL_URLS = [
  "/novee/",
  "/novee/index.html",
  "/novee/manifest.webmanifest",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then((c) => c.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !ALL_CACHES.includes(k)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

const NETWORK_TIMEOUT = 3000;

function networkFirstWithTimeout(request, cacheName) {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        caches.match(request).then((cached) => resolve(cached || new Response("offline", { status: 503 })));
      }
    }, NETWORK_TIMEOUT);

    fetch(request).then((res) => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        if (res && res.status === 200 && res.type !== "opaque") {
          const clone = res.clone();
          caches.open(cacheName).then((c) => c.put(request, clone));
        }
        resolve(res);
      }
    }).catch(() => {
      clearTimeout(timer);
      if (!settled) {
        settled = true;
        caches.match(request).then((cached) => resolve(cached || new Response("offline", { status: 503 })));
      }
    });
  });
}

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  if (url.pathname.startsWith("/api/")) {
    e.respondWith(fetch(e.request).catch(() => new Response("offline", { status: 503 })));
    return;
  }

  const isShell = SHELL_URLS.some((u) => url.pathname === u || url.pathname === "/novee/index.html");
  if (isShell) {
    e.respondWith(networkFirstWithTimeout(e.request, SHELL_CACHE));
    return;
  }

  const isAsset = url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|webp|woff2?|ttf|ico|json)$/i);
  if (isAsset) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          if (res && res.status === 200 && res.type !== "opaque") {
            const clone = res.clone();
            caches.open(ASSETS_CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        }).catch(() => new Response("offline", { status: 503 }));
      })
    );
    return;
  }

  e.respondWith(networkFirstWithTimeout(e.request, SHELL_CACHE));
});
