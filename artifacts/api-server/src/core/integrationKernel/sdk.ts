/**
 * Phase 13 — Integration Kernel SDK Helpers
 *
 * Typed utility layer consumed by orchestrators and route handlers.
 * Never called directly from the frontend — all requests route through
 * the orchestrator layer or API endpoints.
 */

import type { AuthType } from "./types";
import type { CredentialPack } from "./credentialVault";

/* ── Auth header builder ────────────────────────────────────────────────────── */

export function buildAuthHeaders(
  creds: CredentialPack,
  authType: AuthType,
): Record<string, string> {
  const headers: Record<string, string> = {};

  switch (authType) {
    case "api_key":
      if (creds.apiKey) headers["Authorization"] = `Bearer ${creds.apiKey}`;
      break;
    case "bearer":
      if (creds.oauthToken) headers["Authorization"] = `Bearer ${creds.oauthToken}`;
      break;
    case "basic": {
      const b64 = Buffer.from(`${creds.apiKey ?? ""}:${creds.apiSecret ?? ""}`).toString("base64");
      headers["Authorization"] = `Basic ${b64}`;
      break;
    }
    case "custom_header":
      if (creds.customHeaders) Object.assign(headers, creds.customHeaders);
      break;
    case "oauth2":
      if (creds.oauthToken) headers["Authorization"] = `Bearer ${creds.oauthToken}`;
      break;
    case "none":
    default:
      break;
  }

  return headers;
}

/* ── Retry with exponential back-off ────────────────────────────────────────── */

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs:  number;
  jitter:      boolean;
}

const DEFAULT_RETRY: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 200,
  maxDelayMs:  5_000,
  jitter:      true,
};

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  opts: Partial<RetryOptions> = {},
): Promise<T> {
  const o = { ...DEFAULT_RETRY, ...opts };
  let lastErr: unknown;

  for (let attempt = 1; attempt <= o.maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastErr = err;
      if (attempt === o.maxAttempts) break;

      let delay = Math.min(o.baseDelayMs * Math.pow(2, attempt - 1), o.maxDelayMs);
      if (o.jitter) delay = delay * (0.5 + Math.random() * 0.5);
      await new Promise(res => setTimeout(res, delay));
    }
  }
  throw lastErr;
}

/* ── Request context carrier ─────────────────────────────────────────────────── */

export interface RequestContext {
  venueId:      string;
  providerId:   string;
  providerName: string;
  providerType: string;
  requestId:    string;
  startedAt:    number;
}

export function makeRequestContext(
  venueId:      string,
  providerId:   string,
  providerName: string,
  providerType: string,
): RequestContext {
  return {
    venueId,
    providerId,
    providerName,
    providerType,
    requestId: `${venueId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    startedAt: Date.now(),
  };
}

/* ── Circuit breaker state ────────────────────────────────────────────────────── */

export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerConfig {
  failureThreshold:  number;
  successThreshold:  number;
  openWindowMs:      number;
}

export class CircuitBreaker {
  private state:       CircuitState = "CLOSED";
  private failures:    number       = 0;
  private successes:   number       = 0;
  private openedAt:    number | null = null;
  private readonly cfg: CircuitBreakerConfig;

  constructor(cfg: Partial<CircuitBreakerConfig> = {}) {
    this.cfg = {
      failureThreshold: cfg.failureThreshold ?? 5,
      successThreshold: cfg.successThreshold ?? 2,
      openWindowMs:     cfg.openWindowMs     ?? 30_000,
    };
  }

  get currentState(): CircuitState { return this.state; }

  canRequest(): boolean {
    if (this.state === "CLOSED")    return true;
    if (this.state === "HALF_OPEN") return true;
    if (this.state === "OPEN") {
      if (this.openedAt && Date.now() - this.openedAt >= this.cfg.openWindowMs) {
        this.state = "HALF_OPEN";
        this.successes = 0;
        return true;
      }
      return false;
    }
    return false;
  }

  recordSuccess(): void {
    this.failures = 0;
    if (this.state === "HALF_OPEN") {
      this.successes++;
      if (this.successes >= this.cfg.successThreshold) {
        this.state    = "CLOSED";
        this.openedAt = null;
      }
    }
  }

  recordFailure(): void {
    this.failures++;
    this.successes = 0;
    if (this.state === "CLOSED" && this.failures >= this.cfg.failureThreshold) {
      this.state    = "OPEN";
      this.openedAt = Date.now();
    } else if (this.state === "HALF_OPEN") {
      this.state    = "OPEN";
      this.openedAt = Date.now();
    }
  }

  reset(): void {
    this.state     = "CLOSED";
    this.failures  = 0;
    this.successes = 0;
    this.openedAt  = null;
  }

  toJSON() {
    return {
      state:     this.state,
      failures:  this.failures,
      successes: this.successes,
      openedAt:  this.openedAt,
    };
  }
}

/* ── Provider signature verification (for inbound webhooks) ─────────────────── */

import { createHmac, timingSafeEqual } from "crypto";

export function verifyWebhookSignature(
  payload:   string | Buffer,
  signature: string,
  secret:    string,
  algorithm: "sha256" | "sha1" = "sha256",
): boolean {
  const expected = createHmac(algorithm, secret)
    .update(typeof payload === "string" ? payload : payload)
    .digest("hex");

  const cleanSig = signature.replace(/^(sha256=|sha1=)/, "");

  try {
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(cleanSig, "hex"),
    );
  } catch {
    return false;
  }
}
