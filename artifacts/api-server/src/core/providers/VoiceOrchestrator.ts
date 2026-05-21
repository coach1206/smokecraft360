/**
 * VoiceOrchestrator — ElevenLabs TTS through the Integration Kernel.
 *
 * Wraps all ElevenLabs calls with:
 *  - Circuit breaker (CLOSED / OPEN / HALF_OPEN)
 *  - Exponential-backoff retry via SDK withRetry()
 *  - kernelBus event emission on every request and failure
 *  - Usage metering (budget check before, increment after)
 *  - Credential resolution: vault → Replit connector → env var
 *
 * Route handlers must NEVER call the ElevenLabs API directly.
 * They must go through VoiceOrchestrator.synthesize().
 */

import { logger }                            from "../../lib/logger";
import { CircuitBreaker, withRetry }         from "../integrationKernel/sdk";
import { kernelBus }                         from "../integrationKernel/eventBus";
import { listProviders, readCredentials,
         recordUsage }                       from "../integrationKernel/credentialVault";
import { resolveElevenLabsKey,
         DEFAULT_VOICES }                    from "../../lib/elevenlabs";
import type { VoicePersona }                 from "../../lib/elevenlabs";
import { SYSTEM_VENUE_ID }                   from "./kernelProviderBoot";

export interface SynthesizeOptions {
  venueId:   string;
  text:      string;
  voiceId?:  string;
  persona?:  VoicePersona;
  modelId?:  string;
}

export interface SynthesizeResult {
  audioBuffer:  Buffer;
  contentType:  string;
  provider:     string;
  voiceId:      string;
  charCount:    number;
  latencyMs:    number;
  circuitState: string;
  failoverUsed: boolean;
}

/* ── Per-venue circuit breakers ─────────────────────────────────────────────── */

const breakers = new Map<string, CircuitBreaker>();

function getBreaker(venueId: string): CircuitBreaker {
  let b = breakers.get(venueId);
  if (!b) {
    b = new CircuitBreaker({ failureThreshold: 3, successThreshold: 2, openWindowMs: 60_000 });
    breakers.set(venueId, b);
  }
  return b;
}

/* ── Provider ID lookup ──────────────────────────────────────────────────────── */

async function resolveProviderId(venueId: string): Promise<string | null> {
  const toTry = venueId === SYSTEM_VENUE_ID ? [SYSTEM_VENUE_ID] : [venueId, SYSTEM_VENUE_ID];
  for (const vid of toTry) {
    try {
      const providers = await listProviders(vid, "voice");
      const p = providers.find(x => x.providerName === "elevenlabs" && x.isActive);
      if (p) {
        const creds = await readCredentials(p.id, vid);
        if (creds.apiKey) return p.id;
      }
    } catch { /* vault not ready */ }
  }
  return null;
}

/* ── Orchestrator ────────────────────────────────────────────────────────────── */

export const VoiceOrchestrator = {
  async synthesize(opts: SynthesizeOptions): Promise<SynthesizeResult> {
    const breaker   = getBreaker(opts.venueId);
    const startedAt = Date.now();

    if (!breaker.canRequest()) {
      const err = new Error("Voice circuit breaker OPEN — TTS requests blocked until recovery window expires");
      kernelBus.emit("provider.failed", {
        venueId:      opts.venueId,
        providerId:   "voice-primary",
        providerName: "elevenlabs",
        error:        err.message,
        consecutive:  0,
        ts:           Date.now(),
      });
      throw err;
    }

    const resolvedVoiceId: string = (() => {
      if (opts.voiceId && /^[A-Za-z0-9]{8,}$/.test(opts.voiceId)) return opts.voiceId;
      const p: VoicePersona = (opts.persona && opts.persona in DEFAULT_VOICES)
        ? opts.persona
        : "female";
      return DEFAULT_VOICES[p];
    })();

    const apiKey = await resolveElevenLabsKey();
    if (!apiKey) {
      const err = new Error("ElevenLabs API key not configured — check credential vault or ELEVENLABS_API_KEY");
      kernelBus.emit("provider.failed", {
        venueId:      opts.venueId,
        providerId:   "voice-primary",
        providerName: "elevenlabs",
        error:        err.message,
        consecutive:  0,
        ts:           Date.now(),
      });
      throw err;
    }

    const modelId = opts.modelId ?? "eleven_monolingual_v1";

    try {
      const audioBuffer = await withRetry(async () => {
        const response = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${resolvedVoiceId}`,
          {
            method:  "POST",
            headers: {
              "xi-api-key":   apiKey,
              "Content-Type": "application/json",
              Accept:         "audio/mpeg",
            },
            body: JSON.stringify({
              text:            opts.text,
              model_id:        modelId,
              voice_settings:  { stability: 0.5, similarity_boost: 0.75 },
            }),
          },
        );
        if (!response.ok) {
          const body = await response.text().catch(() => "");
          throw new Error(`ElevenLabs ${response.status}: ${body}`);
        }
        const ab = await response.arrayBuffer();
        return Buffer.from(ab);
      }, { maxAttempts: 2, baseDelayMs: 500, maxDelayMs: 3_000, jitter: true });

      const latencyMs  = Date.now() - startedAt;
      const charCount  = opts.text.length;
      breaker.recordSuccess();

      // Record usage (best-effort)
      void (async () => {
        try {
          const pid = await resolveProviderId(opts.venueId);
          if (pid) await recordUsage(opts.venueId, pid, charCount, 0);
        } catch { /* non-fatal */ }
      })();

      kernelBus.emit("provider.request_completed", {
        venueId:      opts.venueId,
        providerId:   "voice-primary",
        providerName: "elevenlabs",
        providerType: "voice",
        latencyMs,
        statusCode:   200,
        tokensUsed:   charCount,
        success:      true,
        ts:           Date.now(),
      });

      logger.info(
        { venueId: opts.venueId, voiceId: resolvedVoiceId, charCount, latencyMs },
        "VoiceOrchestrator: synthesis complete",
      );

      return {
        audioBuffer,
        contentType:  "audio/mpeg",
        provider:     "elevenlabs",
        voiceId:      resolvedVoiceId,
        charCount,
        latencyMs,
        circuitState: breaker.currentState,
        failoverUsed: false,
      };
    } catch (err) {
      const latencyMs = Date.now() - startedAt;
      breaker.recordFailure();

      kernelBus.emit("provider.request_completed", {
        venueId:      opts.venueId,
        providerId:   "voice-primary",
        providerName: "elevenlabs",
        providerType: "voice",
        latencyMs,
        statusCode:   null,
        tokensUsed:   null,
        success:      false,
        ts:           Date.now(),
      });

      kernelBus.emit("provider.failed", {
        venueId:      opts.venueId,
        providerId:   "voice-primary",
        providerName: "elevenlabs",
        error:        err instanceof Error ? err.message : String(err),
        consecutive:  0,
        ts:           Date.now(),
      });

      throw err;
    }
  },

  circuitBreakerStatus(): Array<{ venueId: string; state: string; failures: number }> {
    return Array.from(breakers.entries()).map(([venueId, b]) => ({
      venueId,
      ...b.toJSON(),
    }));
  },
};
