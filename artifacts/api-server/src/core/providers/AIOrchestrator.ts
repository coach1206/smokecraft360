/**
 * AIOrchestrator — Phase 2 + Phase 8 (Circuit Breaker + Failover Routing)
 *
 * Wraps AIRouter with:
 *  - Per-provider CircuitBreaker (CLOSED / OPEN / HALF_OPEN)
 *  - Exponential-backoff retry via SDK withRetry()
 *  - kernelBus event emission for every request and failure
 *  - Usage metering hooks (budget check before, increment after)
 */

import { logger }                   from "../../lib/logger";
import { routeAI }                  from "../../services/ai/AIRouter";
import type { ChatMessage }         from "../../services/ai/AIRouter";
import { CircuitBreaker, withRetry } from "../integrationKernel/sdk";
import { kernelBus }                from "../integrationKernel/eventBus";
import { listProviders, recordUsage } from "../integrationKernel/credentialVault";
import { SYSTEM_VENUE_ID }          from "./kernelProviderBoot";

export interface GenerateOptions {
  venueId:      string;
  messages:     ChatMessage[];
  model?:       string;
  maxTokens?:   number;
  temperature?: number;
  providerId?:  string;
}

export interface GenerateResult {
  content:          string;
  provider:         string;
  model:            string;
  promptTokens:     number;
  completionTokens: number;
  failoverUsed:     boolean;
  latencyMs:        number;
  circuitState:     string;
}

/* ── Per-provider circuit breakers (in-process, keyed by venueId:provider) ── */

const breakers = new Map<string, CircuitBreaker>();

function getBreaker(key: string): CircuitBreaker {
  let b = breakers.get(key);
  if (!b) {
    b = new CircuitBreaker({ failureThreshold: 5, successThreshold: 2, openWindowMs: 30_000 });
    breakers.set(key, b);
  }
  return b;
}

export function getCircuitBreakerStatus(): Array<{ key: string; state: string; failures: number }> {
  return Array.from(breakers.entries()).map(([key, b]) => ({
    key,
    ...b.toJSON(),
  }));
}

/* ── Orchestrator ─────────────────────────────────────────────────────────── */

export const AIOrchestrator = {
  async generate(opts: GenerateOptions): Promise<GenerateResult> {
    const breakerKey = `${opts.venueId}:ai`;
    const breaker    = getBreaker(breakerKey);
    const startedAt  = Date.now();

    if (!breaker.canRequest()) {
      const err = new Error("AI provider circuit breaker OPEN — requests blocked until recovery window expires");
      kernelBus.emit("provider.failed", {
        venueId:      opts.venueId,
        providerId:   "ai-primary",
        providerName: "ai",
        error:        err.message,
        consecutive:  0,
        ts:           Date.now(),
      });
      throw err;
    }

    try {
      const result = await withRetry(async (attempt) => {
        logger.debug({ venueId: opts.venueId, attempt }, "AIOrchestrator: attempt");
        return await routeAI({
          venueId:     opts.venueId,
          messages:    opts.messages,
          model:       opts.model,
          maxTokens:   opts.maxTokens,
          temperature: opts.temperature,
        });
      }, { maxAttempts: 2, baseDelayMs: 300, maxDelayMs: 2_000, jitter: true });

      const latencyMs  = Date.now() - startedAt;
      const totalTokens = result.promptTokens + result.completionTokens;
      breaker.recordSuccess();

      // Record usage against the kernel vault provider record (best-effort)
      void (async () => {
        try {
          const lookupId = opts.venueId === SYSTEM_VENUE_ID ? SYSTEM_VENUE_ID : opts.venueId;
          const providers = await listProviders(lookupId, "ai");
          const p = providers.find(x => x.providerName === result.provider && x.isActive)
                 ?? providers.find(x => x.providerName === "openai" && x.isActive);
          if (p) await recordUsage(lookupId, p.id, totalTokens, 0);
        } catch { /* non-fatal */ }
      })();

      kernelBus.emit("provider.request_completed", {
        venueId:      opts.venueId,
        providerId:   "ai-primary",
        providerName: result.provider,
        providerType: "ai",
        latencyMs,
        statusCode:   200,
        tokensUsed:   result.promptTokens + result.completionTokens,
        success:      true,
        ts:           Date.now(),
      });

      logger.info(
        { venueId: opts.venueId, provider: result.provider, tokens: result.promptTokens + result.completionTokens, failover: result.failoverUsed, latencyMs },
        "AIOrchestrator: request complete",
      );

      return {
        content:          result.content,
        provider:         result.provider,
        model:            result.model,
        promptTokens:     result.promptTokens,
        completionTokens: result.completionTokens,
        failoverUsed:     result.failoverUsed,
        latencyMs,
        circuitState:     breaker.currentState,
      };
    } catch (err) {
      const latencyMs = Date.now() - startedAt;
      breaker.recordFailure();

      kernelBus.emit("provider.request_completed", {
        venueId:      opts.venueId,
        providerId:   "ai-primary",
        providerName: "ai",
        providerType: "ai",
        latencyMs,
        statusCode:   null,
        tokensUsed:   null,
        success:      false,
        ts:           Date.now(),
      });

      kernelBus.emit("provider.failed", {
        venueId:      opts.venueId,
        providerId:   "ai-primary",
        providerName: "ai",
        error:        err instanceof Error ? err.message : "Unknown error",
        consecutive:  0,
        ts:           Date.now(),
      });

      throw err;
    }
  },

  circuitBreakerStatus: getCircuitBreakerStatus,
};
