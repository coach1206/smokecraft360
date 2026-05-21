/**
 * Integration Health Monitor — Phase 8 (foundational layer)
 *
 * Performs lightweight HTTP health checks against configured providers.
 * Updates health status in the credential vault after each probe.
 * Emits kernel events so the event bus can fan-out to dashboards.
 */

import { logger }             from "../../lib/logger";
import { publish }            from "../../realtime/transport/eventBus";
import { updateHealthStatus, listProviders } from "./credentialVault";
import type { ProviderHealth, IntegrationProvider } from "./types";

const HEALTH_ENDPOINTS: Record<string, string> = {
  openai:      "https://api.openai.com/v1/models",
  anthropic:   "https://api.anthropic.com",
  gemini:      "https://generativelanguage.googleapis.com/$discovery/rest",
  stripe:      "https://api.stripe.com/v1/balance",
  sendgrid:    "https://status.sendgrid.com/api/v2/status.json",
  elevenlabs:  "https://api.elevenlabs.io/v1/voices",
  hubspot:     "https://api.hubapi.com/crm/v3/properties/contacts",
};

export async function checkProviderHealth(
  provider: IntegrationProvider,
): Promise<{ status: ProviderHealth; latencyMs: number | null; error: string | null }> {
  const endpoint = provider.endpointUrl ?? HEALTH_ENDPOINTS[provider.providerName];
  if (!endpoint) {
    return { status: "unchecked", latencyMs: null, error: null };
  }

  const start = Date.now();
  try {
    const res = await fetch(endpoint, {
      method: "GET",
      signal: AbortSignal.timeout(5_000),
      headers: { "User-Agent": "NOVEE-OS/HealthMonitor" },
    });
    const latencyMs = Date.now() - start;

    if (res.ok || res.status === 401 || res.status === 403) {
      return { status: "healthy", latencyMs, error: null };
    }
    if (res.status >= 500) {
      return { status: "failed", latencyMs, error: `HTTP ${res.status}` };
    }
    return { status: "degraded", latencyMs, error: `HTTP ${res.status}` };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const msg = err instanceof Error ? err.message : "unknown error";
    return { status: "failed", latencyMs, error: msg };
  }
}

export async function runHealthSweep(venueId: string): Promise<void> {
  let providers: IntegrationProvider[];
  try {
    providers = await listProviders(venueId);
  } catch (err) {
    logger.warn({ err, venueId }, "healthMonitor: could not load providers for sweep");
    return;
  }

  const active = providers.filter(p => p.isActive);
  if (active.length === 0) return;

  const results = await Promise.allSettled(
    active.map(async (p) => {
      const result = await checkProviderHealth(p);
      await updateHealthStatus(p.id, venueId, result.status, result.error);

      void publish("orchestration", {
        event: "INTEGRATION_HEALTH_UPDATE",
        venueId,
        providerId: p.id,
        providerName: p.providerName,
        status: result.status,
        latencyMs: result.latencyMs,
        error: result.error,
        checkedAt: new Date().toISOString(),
      });

      return { providerId: p.id, providerName: p.providerName, ...result };
    }),
  );

  const summary = results.map(r => r.status === "fulfilled" ? r.value : { error: String(r.reason) });
  logger.info({ venueId, count: active.length, summary }, "healthMonitor: sweep complete");
}
