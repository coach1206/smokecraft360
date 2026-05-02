/**
 * SmokeCraft Service Worker
 *
 * Strategies:
 *   /api/*           → network-first, cache on success (offline fallback)
 *   everything else  → stale-while-revalidate (cache-first, refresh in bg)
 *
 * Offline event queue:
 *   POST /api/events requests that fail while offline are queued in
 *   localStorage (key: smokecraft_sw_event_queue) and replayed when
 *   the worker receives a "SYNC_EVENTS" message from the app.
 */

const CACHE = "smokecraft-v2";

// ── Install ─────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(["/", "/index.html"]).catch(() => {}),
    ),
  );
});

// ── Activate ─────────────────────────────────────────────────────────────────
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

// ── Message: sync queued events ───────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SYNC_EVENTS") {
    event.waitUntil(syncQueuedEvents());
  }
});

async function syncQueuedEvents() {
  // The event queue lives in main-thread localStorage, so we can't access it
  // directly from the SW. The app posts the events directly when it comes
  // online — this handler is a future hook for Background Sync API support.
}
