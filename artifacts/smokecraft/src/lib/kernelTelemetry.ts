/**
 * NOVEE OS Kernel Telemetry — SmokeCraft module bridge.
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
 */

const MODULE_SLUG = "craft-smoke";

let _moduleId: string | null = null;
let _fetchInFlight = false;
let _fetchPromise: Promise<void> | null = null;

async function warmModuleId(): Promise<void> {
  if (_moduleId !== null) return;
  if (_fetchInFlight) { await _fetchPromise; return; }
  _fetchInFlight = true;
  _fetchPromise = fetch("/api/kernel/modules")
    .then((r) => r.ok ? r.json() : Promise.reject())
    .then((d: { modules: { id: string; slug: string }[] }) => {
      const m = d.modules.find((m) => m.slug === MODULE_SLUG);
      _moduleId = m?.id ?? null;
    })
    .catch(() => { _moduleId = null; })
    .finally(() => { _fetchInFlight = false; });
  await _fetchPromise;
}

// Warm the module ID in background at import time
void warmModuleId();

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
): void {
  const venueId = resolveVenueId();
  const body: Record<string, unknown> = { eventType };
  if (_moduleId)  body.moduleId = _moduleId;
  if (venueId)    body.venueId  = venueId;
  if (payload)    body.payload  = payload;

  // best-effort, fire-and-forget — never throws
  fetch("/api/kernel/telemetry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => { /* silent */ });
}
