/**
 * IProviderAdapter — canonical integration adapter interface for NOVEE OS.
 *
 * Every provider integration (AI, POS, payment, music, lighting, etc.) must
 * implement this interface. The kernel's AdapterRegistry maps provider IDs to
 * IProviderAdapter instances, enabling uniform lifecycle management, health
 * checks, and request/response tracing across all integration categories.
 */

export type ProviderCategory =
  | "ai" | "pos" | "payment" | "music" | "lighting"
  | "sensor" | "crm" | "booking" | "voice" | "analytics"
  | "device" | "custom";

export type ProviderHealthStatus =
  | "healthy" | "degraded" | "failed" | "fallback_active" | "unchecked";

export interface ProviderCredentials {
  apiKey?:        string;
  apiSecret?:     string;
  oauthToken?:    string;
  oauthRefresh?:  string;
  webhookSecret?: string;
  customHeaders?: Record<string, string>;
  extra?:         Record<string, string>;
}

export interface AdapterRequest<TPayload = unknown> {
  requestId:  string;
  venueId:    string;
  actorId?:   string;
  isDemoMode: boolean;
  payload:    TPayload;
  timeoutMs?: number;
}

export interface AdapterResponse<TResult = unknown> {
  requestId:  string;
  success:    boolean;
  result?:    TResult;
  error?:     string;
  latencyMs:  number;
  tokensUsed?: number;
}

export interface HealthCheckResult {
  status:    ProviderHealthStatus;
  latencyMs: number | null;
  message?:  string;
}

/**
 * Core adapter interface every integration must implement.
 *
 * Lifecycle:
 *   1. `initialize(credentials)` — called once on registration
 *   2. `healthCheck()`           — called by the health sweeper
 *   3. `execute(request)`        — called for each runtime request
 *   4. `teardown()`              — called on deregistration / shutdown
 */
export interface IProviderAdapter<TPayload = unknown, TResult = unknown> {
  /** Unique stable identifier matching the provider registry entry (e.g. "openai"). */
  readonly providerId: string;

  /** Human-readable display name. */
  readonly displayName: string;

  /** Integration category — determines which global control toggle governs this adapter. */
  readonly category: ProviderCategory;

  /** Version string for the adapter implementation. */
  readonly adapterVersion: string;

  /**
   * Called once when the adapter is registered. Should validate credentials
   * and establish any long-lived connections (e.g. WebSocket, SDK client).
   * Must throw if credentials are invalid.
   */
  initialize(credentials: ProviderCredentials): Promise<void>;

  /**
   * Perform a liveness + functional check.
   * Should complete within 5 seconds.
   */
  healthCheck(): Promise<HealthCheckResult>;

  /**
   * Execute a single request against the provider.
   * Must respect `request.isDemoMode` — in demo mode, return synthetic data
   * without calling external APIs.
   */
  execute(request: AdapterRequest<TPayload>): Promise<AdapterResponse<TResult>>;

  /**
   * Release any held resources. Called when the adapter is deregistered
   * or the process is shutting down gracefully.
   */
  teardown(): Promise<void>;
}
