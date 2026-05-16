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
 *
 * Deduplication:
 *   swipe_add and swipe_skip are debounced with a 300 ms coalesce window
 *   (keyed by eventType + moduleSlug). Rapid-fire swipes collapse into a
 *   single POST; the last payload wins. swipe_start, build_complete, and
 *   all other events are never debounced.
 */

const DEFAULT_SLUG = "craft-smoke";

/** Events that are debounced to reduce high-frequency noise. */
const DEBOUNCED_EVENTS = new Set(["swipe_add", "swipe_skip"]);

/** Configurable coalesce window in ms. Exported for test overrides. */
export let DEBOUNCE_WINDOW_MS = 300;

/** Per-slug resolved module ID cache. null = resolved but not found. */
const _moduleIdCache = new Map<string, string | null>();
/** Per-slug in-flight fetch promises to deduplicate concurrent calls. */
const _fetchPromises  = new Map<string, Promise<void>>();

/** Pending debounce timer handles keyed by "eventType:moduleSlug". */
const _debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
/** Coalesced payload for each pending debounced key — last write wins. */
const _debouncedPayloads = new Map<string, Record<string, unknown> | undefined>();

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

/** Internal: resolve module ID then POST the telemetry event. */
async function fireEvent(
  eventType: string,
  payload: Record<string, unknown> | undefined,
  moduleSlug: string,
  venueId: string | null,
): Promise<void> {
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

  if (DEBOUNCED_EVENTS.has(eventType)) {
    const key = `${eventType}:${moduleSlug}`;
    const existing = _debounceTimers.get(key);
    if (existing !== undefined) clearTimeout(existing);
    _debouncedPayloads.set(key, payload);
    const timer = setTimeout(() => {
      _debounceTimers.delete(key);
      const coalesced = _debouncedPayloads.get(key);
      _debouncedPayloads.delete(key);
      void fireEvent(eventType, coalesced, moduleSlug, venueId);
    }, DEBOUNCE_WINDOW_MS);
    _debounceTimers.set(key, timer);
    return;
  }

  void fireEvent(eventType, payload, moduleSlug, venueId);
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
