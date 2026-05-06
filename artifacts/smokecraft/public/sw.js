/**
 * Axiom OS — Service Worker
 *
 * Strategies:
 *   /api/*           → network-first, cache on success (offline fallback)
 *   everything else  → stale-while-revalidate (app shell served instantly)
 *
 * This enables full standalone PWA installation on iPad / Android tablets
 * with cache-first loading after first visit, and offline resilience for
 * the patron-facing kiosk shell.
 */

const CACHE = "axiom-os-v1";

const PRECACHE = ["/", "/manifest.json", "/favicon.svg"];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(PRECACHE).catch(() => {}),
    ),
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
        ),
      self.clients.claim(),
    ]),
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(CACHE);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    return (await caches.match(request)) ?? Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const fetchPromise = fetch(request).then((res) => {
    if (res.ok) {
      caches.open(CACHE).then((c) => c.put(request, res.clone()));
    }
    return res;
  });
  return cached ?? fetchPromise;
}

// ── Message: background sync hook ─────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SYNC_EVENTS") {
    event.waitUntil(Promise.resolve());
  }
});
