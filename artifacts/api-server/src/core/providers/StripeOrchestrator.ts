/**
 * StripeOrchestrator — Integration Kernel wrapper for Stripe.
 *
 * Key resolution order (per-request, not cached):
 *   1. Venue-specific credential vault record
 *   2. System venue credential vault record  (00000000-… fallback)
 *   3. STRIPE_SECRET_KEY environment variable
 *
 * Every resolved call is wrapped with:
 *   - Per-venue CircuitBreaker (CLOSED / OPEN / HALF_OPEN)
 *   - kernelBus metrics emission on success and failure
 *   - integration_usage increment on success
 *
 * Usage pattern in route handlers:
 *
 *   const ctx  = await getStripeContext(venueId);
 *   const t0   = Date.now();
 *   try {
 *     const stripe = new Stripe(ctx.key, { apiVersion: "2024-04-10" });
 *     const result = await stripe.paymentIntents.create(…);
 *     recordStripeSuccess(ctx, Date.now() - t0);
 *     return result;
 *   } catch (err) {
 *     recordStripeFailure(ctx, Date.now() - t0, null, String(err));
 *     throw err;
 *   }
 */

import { logger }          from "../../lib/logger";
import { CircuitBreaker }  from "../integrationKernel/sdk";
import { kernelBus }       from "../integrationKernel/eventBus";
import {
  listProviders,
  readCredentials,
  recordUsage,
}                          from "../integrationKernel/credentialVault";
import { SYSTEM_VENUE_ID } from "./kernelProviderBoot";

/* ── Per-venue circuit breakers ──────────────────────────────────────────── */

const breakers = new Map<string, CircuitBreaker>();

function getBreaker(venueId: string): CircuitBreaker {
  let b = breakers.get(venueId);
  if (!b) {
    b = new CircuitBreaker({ failureThreshold: 5, successThreshold: 2, openWindowMs: 30_000 });
    breakers.set(venueId, b);
  }
  return b;
}

/* ── Key resolution ──────────────────────────────────────────────────────── */

async function resolveStripeKey(
  venueId: string,
): Promise<{ key: string; providerId: string | null }> {
  const venuesToTry = venueId === SYSTEM_VENUE_ID
    ? [SYSTEM_VENUE_ID]
    : [venueId, SYSTEM_VENUE_ID];

  for (const vid of venuesToTry) {
    try {
      const providers = await listProviders(vid, "payment");
      const p = providers.find(x => x.providerName === "stripe" && x.isActive);
      if (p) {
        const creds = await readCredentials(p.id, vid);
        if (creds.apiKey) return { key: creds.apiKey, providerId: p.id };
      }
    } catch {
      /* vault not ready or no record — continue to next source */
    }
  }

  const envKey = process.env["STRIPE_SECRET_KEY"];
  if (envKey && envKey.length > 0 && !envKey.startsWith("<")) {
    return { key: envKey, providerId: null };
  }

  throw new Error(
    "Stripe: no API key available (vault empty and STRIPE_SECRET_KEY not configured)",
  );
}

/* ── Public API ──────────────────────────────────────────────────────────── */

export interface StripeContext {
  key:        string;
  venueId:    string;
  providerId: string | null;
}

/**
 * Resolves the Stripe API key for a venue through the kernel.
 * Throws if the circuit breaker is OPEN or no key is available.
 */
export async function getStripeContext(venueId: string): Promise<StripeContext> {
  const breaker = getBreaker(venueId);

  if (!breaker.canRequest()) {
    throw new Error(
      "Stripe circuit breaker OPEN — payment requests blocked until recovery window expires",
    );
  }

  const { key, providerId } = await resolveStripeKey(venueId);
  return { key, venueId, providerId };
}

/**
 * Call after a successful Stripe API response.
 * Records success in the circuit breaker, emits bus event, increments usage.
 */
export function recordStripeSuccess(ctx: StripeContext, latencyMs: number): void {
  getBreaker(ctx.venueId).recordSuccess();

  kernelBus.emit("provider.request_completed", {
    venueId:      ctx.venueId,
    providerId:   ctx.providerId ?? "stripe-env",
    providerName: "stripe",
    providerType: "payment",
    latencyMs,
    statusCode:   200,
    tokensUsed:   null,
    success:      true,
    ts:           Date.now(),
  });

  if (ctx.providerId) {
    recordUsage(ctx.venueId, ctx.providerId, 0, 0).catch(() => undefined);
  }
}

/**
 * Call after a failed Stripe API request.
 * Records failure in the circuit breaker and emits bus events.
 */
export function recordStripeFailure(
  ctx:        StripeContext,
  latencyMs:  number,
  statusCode: number | null,
  error:      string,
): void {
  getBreaker(ctx.venueId).recordFailure();

  kernelBus.emit("provider.request_completed", {
    venueId:      ctx.venueId,
    providerId:   ctx.providerId ?? "stripe-env",
    providerName: "stripe",
    providerType: "payment",
    latencyMs,
    statusCode,
    tokensUsed:   null,
    success:      false,
    ts:           Date.now(),
  });

  kernelBus.emit("provider.failed", {
    venueId:      ctx.venueId,
    providerId:   ctx.providerId ?? "stripe-env",
    providerName: "stripe",
    error,
    consecutive:  0,
    ts:           Date.now(),
  });

  logger.warn({ venueId: ctx.venueId, statusCode, error }, "StripeOrchestrator: request failed");
}

/**
 * Convenience: resolve key string only, without circuit-breaker enforcement.
 * Use this only in legacy route handlers that manage their own error handling.
 * Prefer getStripeContext() for new code.
 */
export async function resolveStripeKeyLegacy(venueId = SYSTEM_VENUE_ID): Promise<string> {
  const { key } = await resolveStripeKey(venueId);
  return key;
}

/**
 * StripeOrchestrator namespace — groups all Stripe kernel functions into a single
 * importable object matching the pattern of VoiceOrchestrator, BookingOrchestrator, etc.
 */
export const StripeOrchestrator = {
  getContext:       getStripeContext,
  recordSuccess:    recordStripeSuccess,
  recordFailure:    recordStripeFailure,
  resolveKeyLegacy: resolveStripeKeyLegacy,

  circuitBreakerStatus(): Array<{ venueId: string; state: string; failures: number }> {
    return Array.from(breakers.entries()).map(([venueId, b]) => ({
      venueId,
      ...b.toJSON(),
    }));
  },

  /** Convenience: resolve context, run the provided action, and record success/failure automatically. */
  async withStripe<T>(
    venueId: string,
    action: (ctx: StripeContext) => Promise<T>,
  ): Promise<T> {
    const t0  = Date.now();
    const ctx = await getStripeContext(venueId);
    try {
      const result = await action(ctx);
      recordStripeSuccess(ctx, Date.now() - t0);
      return result;
    } catch (err) {
      recordStripeFailure(ctx, Date.now() - t0, null, err instanceof Error ? err.message : String(err));
      throw err;
    }
  },
};
