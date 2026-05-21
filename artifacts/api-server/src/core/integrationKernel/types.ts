/**
 * Universal Integration Kernel — shared types
 *
 * Single source of truth for all integration-related types across
 * the kernel, provider registry, credential vault, and route layer.
 */

export type ProviderCategory =
  | "ai"
  | "pos"
  | "payment"
  | "music"
  | "lighting"
  | "sensor"
  | "crm"
  | "booking"
  | "voice"
  | "analytics"
  | "device"
  | "custom";

export type ProviderHealth = "healthy" | "degraded" | "failed" | "fallback_active" | "unchecked";

export type AuthType = "api_key" | "oauth2" | "basic" | "bearer" | "none" | "custom_header";

export interface ProviderDefinition {
  id:          string;
  name:        string;
  category:    ProviderCategory;
  description: string;
  authType:    AuthType;
  baseUrl?:    string;
  docsUrl?:    string;
  isCustom:    boolean;
  supportsWebhook: boolean;
  supportsHealthCheck: boolean;
}

export interface IntegrationProvider {
  id:                  string;
  venueId:             string;
  providerName:        string;
  providerType:        ProviderCategory;
  displayName:         string;
  endpointUrl:         string | null;
  region:              string | null;
  webhookConfig:       WebhookConfig | null;
  usageLimits:         UsageLimits | null;
  failoverProviderId:  string | null;
  isPrimary:           boolean;
  isActive:            boolean;
  lastTestedAt:        Date | null;
  lastUsedAt:          Date | null;
  lastHealthStatus:    ProviderHealth;
  lastHealthCheckedAt: Date | null;
  errorMessage:        string | null;
  createdBy:           string | null;
  createdAt:           Date;
  updatedAt:           Date;
}

export interface WebhookConfig {
  url:              string;
  secret:           string;
  events:           string[];
  retryMax:         number;
  timeoutMs:        number;
  signatureHeader:  string;
}

export interface UsageLimits {
  dailyRequests:    number | null;
  monthlyRequests:  number | null;
  monthlyTokens:    number | null;
  alertThreshold:   number;
}

export interface HealthCheckResult {
  providerId:  string;
  status:      ProviderHealth;
  latencyMs:   number | null;
  checkedAt:   Date;
  error:       string | null;
}

export interface UsageRecord {
  venueId:      string;
  providerId:   string;
  bucketDate:   string;
  requestCount: number;
  tokenCount:   number;
  costCents:    number;
}

export interface KernelEvent {
  type:      string;
  venueId:   string;
  payload:   Record<string, unknown>;
  timestamp: number;
}
