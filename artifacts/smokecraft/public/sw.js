/**
 * NOVEE OS — Offline Cache Strategy v2
 *
 * Three-cache architecture for kiosk resilience:
 *
 *   novee-shell-v2   App shell (HTML, JS, CSS, fonts) — stale-while-revalidate
 *   novee-assets-v2  Heavy static assets (videos, images, 3D) — cache-first
 *   novee-api-v2     API responses — network-first with 4s timeout + offline fallback
 *
 * Message handlers:
 *   PRECACHE_RESERVE  — pre-warms Reserve Collection asset URLs on demand
 *                       (triggered by PredictivePreLoader on High Confidence detection)
 *   SYNC_EVENTS       — offline queue replay hook (existing)
 *
 * All 3 lounge videos and scene images are pre-cached on install so the
 * kiosk boots instantly with zero network dependency after the first load.
 */

const SHELL_CACHE  = "novee-shell-v2";
const ASSETS_CACHE = "novee-assets-v2";
const API_CACHE    = "novee-api-v2";
const ALL_CACHES   = [SHELL_CACHE, ASSETS_CACHE, API_CACHE];

// ── Install-time precache ──────────────────────────────────────────────────────

const SHELL_PRECACHE = ["/", "/manifest.json", "/favicon.svg"];

const ASSET_PRECACHE = [
  // Lounge ambient videos — all three time-of-day variants
  "/videos/lounge-day.mp4",
  "/videos/lounge-evening.mp4",
  "/videos/lounge-night.mp4",
  // Scene card images (craft hub tiles + experience backgrounds)
  "/images/scenes/smokecraft-card.jpg",
  "/images/scenes/pourcraft-card.jpg",
  "/images/scenes/brewcraft-card.jpg",
  "/images/scenes/vapecraft-card.jpg",
  "/images/scenes/craft-hub.jpg",
  "/images/scenes/bold.jpg",
  "/images/scenes/relaxed.jpg",
  "/images/scenes/reflective.jpg",
  "/images/scenes/social.jpg",
];

// ── Install ───────────────────────────────────────────────────────────────────

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_CACHE).then((c) =>
        c.addAll(SHELL_PRECACHE).catch(() => {}),
      ),
      caches.open(ASSETS_CACHE).then((c) =>
        // Fetch each independently — a single 404 won't abort the whole precache
        Promise.allSettled(
          ASSET_PRECACHE.map((url) =>
            fetch(url, { cache: "no-store" })
              .then((res) => { if (res.ok) c.put(url, res); })
              .catch(() => {}),
          ),
        ),
      ),
    ]),
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      // Evict all caches from previous versions (axiom-os-v1 etc.)
      caches.keys().then((keys) =>
        Promise.all(
          keys.filter((k) => !ALL_CACHES.includes(k)).map((k) => caches.delete(k)),
        ),
      ),
      self.clients.claim(),
    ]),
  );
});

// ── Fetch routing ─────────────────────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;

  // API — network-first with 4s timeout, stale fallback
  if (path.startsWith("/api/")) {
    event.respondWith(networkFirstWithTimeout(request, 4000, API_CACHE));
    return;
  }

  // Heavy assets — cache-first (videos, images, 3D assets, fonts, sounds)
  if (
    path.startsWith("/videos/") ||
    path.startsWith("/images/") ||
    path.startsWith("/sounds/") ||
    path.startsWith("/media/") ||
    /\.(mp4|webm|gltf|glb|ktx2|basis|hdr|jpg|jpeg|png|webp|svg|woff2?)$/.test(path)
  ) {
    event.respondWith(cacheFirst(request, ASSETS_CACHE));
    return;
  }

  // App shell — stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
});

// ── Strategy implementations ──────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    return Response.error();
  }
}

async function networkFirstWithTimeout(request, timeoutMs, cacheName) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(request, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    clearTimeout(timer);
    return (await caches.match(request)) ?? Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request)
    .then((res) => {
      if (res.ok) {
        caches.open(cacheName).then((c) => c.put(request, res.clone()));
      }
      return res;
    })
    .catch(() => null);
  return cached ?? (await fetchPromise) ?? Response.error();
}

// ── Message handlers ──────────────────────────────────────────────────────────

self.addEventListener("message", (event) => {
  // PRECACHE_RESERVE — fired by PredictivePreLoader on High Confidence detection.
  // Silently warms novee-assets-v2 with Reserve Collection URLs.
  // Already-cached items are skipped — idempotent and safe to call repeatedly.
  if (event.data?.type === "PRECACHE_RESERVE") {
    const urls = Array.isArray(event.data.urls) ? event.data.urls : [];
    event.waitUntil(
      caches.open(ASSETS_CACHE).then((cache) =>
        Promise.allSettled(
          urls.map((url) =>
            caches.match(url).then((hit) => {
              if (hit) return; // already cached — skip network round-trip
              return fetch(url, { cache: "no-store" })
                .then((res) => { if (res.ok) cache.put(url, res); })
                .catch(() => {});
            }),
          ),
        ),
      ),
    );
    return;
  }

  // SYNC_EVENTS — offline queue replay (existing hook, preserved)
  if (event.data?.type === "SYNC_EVENTS") {
    event.waitUntil(Promise.resolve());
  }
});
