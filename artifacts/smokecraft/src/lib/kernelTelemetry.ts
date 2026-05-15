/**
 * NOVEE OS Kernel Telemetry — multi-craft module bridge.
 *
 * Fire-and-forget helper that emits telemetry events to
 * POST /api/kernel/telemetry. All calls are silent on failure
 * so they can never break the SmokeCraft UX.
 *
 * Event taxonomy (kernel-canonical):
 *   swipe_start      — guest begins a swipe deck
 *   swipe_add        — guest swipes right / taps ADD on a card
 *   swipe_skip       — guest swipes left / taps SKIP on a card
 *   build_complete   — recommendations are loaded on RevealPage
 *   add_to_order     — guest submits an order via OrderModal
 *
 * moduleSlug defaults to "craft-smoke" for backwards compatibility.
 * Pass a craft-specific slug (e.g. "craft-pour") to attribute events
 * to the correct module in the E.A.T. Engine dashboard.
 */

const DEFAULT_SLUG = "craft-smoke";

/** Per-slug resolved module ID cache. null = resolved but not found. */
const _moduleIdCache = new Map<string, string | null>();
/** Per-slug in-flight fetch promises to deduplicate concurrent calls. */
const _fetchPromises  = new Map<string, Promise<void>>();

function ensureModuleId(slug: string): Promise<void> {
  if (_moduleIdCache.has(slug)) return Promise.resolve();
  const existing = _fetchPromises.get(slug);
  if (existing) return existing;

  const promise = fetch("/api/kernel/modules")
    .then((r) => r.ok ? r.json() : Promise.reject())
    .then((d: { modules: { id: string; slug: string }[] }) => {
      const m = d.modules.find((m) => m.slug === slug);
      _moduleIdCache.set(slug, m ? m.id : null);
    })
    .catch(() => {
      /* leave entry absent so the next call retries */
      _fetchPromises.delete(slug);
    })
    .finally(() => {
      _fetchPromises.delete(slug);
    });

  _fetchPromises.set(slug, promise);
  return promise;
}

// Warm the default module ID in background at import time
void ensureModuleId(DEFAULT_SLUG);

/**
 * Resolve the current venueId from localStorage (set by VenueContext).
 * Returns null when running without a venue (demo / default).
 */
function resolveVenueId(): string | null {
  try {
    const raw = localStorage.getItem("smokecraft_venue");
    // "default" is the sentinel used when no real venue is loaded
    if (!raw || raw === "default") return null;
    return raw;
  } catch {
    return null;
  }
}

export function emitKernelEvent(
  eventType: string,
  payload?: Record<string, unknown>,
  moduleSlug: string = DEFAULT_SLUG,
): void {
  const venueId = resolveVenueId();

  // Warm up any non-default slug so subsequent events resolve faster
  if (moduleSlug !== DEFAULT_SLUG && !_moduleIdCache.has(moduleSlug)) {
    void ensureModuleId(moduleSlug);
  }

  // Internally async so we can await the module ID, but callers are never blocked.
  void (async () => {
    try {
      await ensureModuleId(moduleSlug);
      const moduleId = _moduleIdCache.get(moduleSlug) ?? null;
      const body: Record<string, unknown> = { eventType };
      if (moduleId) body.moduleId = moduleId;
      if (venueId)  body.venueId  = venueId;
      if (payload)  body.payload  = payload;
      await fetch("/api/kernel/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      /* silent — telemetry must never interrupt the guest experience */
    }
  })();
}

/**
 * Map a craft type string to its kernel module slug.
 * Centralises the slug derivation so all callers stay consistent.
 */
export function craftToModuleSlug(craftType: string): string {
  switch (craftType) {
    case "pour":  return "craft-pour";
    case "brew":  return "craft-brew";
    case "vape":  return "craft-vape";
    case "smoke":
    default:      return "craft-smoke";
  }
}
