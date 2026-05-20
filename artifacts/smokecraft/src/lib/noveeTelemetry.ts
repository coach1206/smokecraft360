/**
 * Kernel telemetry client — fire-and-forget helper.
 * Used by SmokeCraft and future modules to emit events to POST /api/kernel/telemetry.
 * No PII. Silent on failure (non-blocking).
 */

const SMOKE_MODULE_SLUG = "craft-smoke";

let resolvedModuleId: string | null = null;

async function resolveModuleId(): Promise<string | null> {
  if (resolvedModuleId !== null) return resolvedModuleId;
  try {
    const base = import.meta.env.BASE_URL ?? "/";
    const apiBase = base.startsWith("/novee") ? "" : "";
    const res = await fetch(`${apiBase}/api/kernel/modules`);
    if (!res.ok) return null;
    const { modules } = await res.json() as { modules: { id: string; slug: string }[] };
    const m = modules.find((m) => m.slug === SMOKE_MODULE_SLUG);
    resolvedModuleId = m?.id ?? null;
    return resolvedModuleId;
  } catch {
    return null;
  }
}

export async function emitTelemetry(
  eventType: string,
  payload?: Record<string, unknown>,
  venueId?: string,
): Promise<void> {
  try {
    const moduleId = await resolveModuleId();
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
    // silent — telemetry must never break the UX
  }
}
