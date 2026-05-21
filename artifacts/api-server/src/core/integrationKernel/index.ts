/**
 * Universal Integration Kernel — public API (Phases 1–16)
 *
 * This is THE central nervous system for all integrations in NOVEE OS.
 * Import from here — never import sub-modules directly from application code.
 */

export * from "./types";
export * from "./providerRegistry";

export {
  ensureVaultSchema,
  upsertProvider,
  listProviders,
  getProviderById,
  readCredentials,
  updateHealthStatus,
  markLastUsed,
  markTested,
  deleteProvider,
  setPrimary,
  recordUsage,
  getUsage,
} from "./credentialVault";
export type { UpsertProviderInput, CredentialPack } from "./credentialVault";

export { checkProviderHealth, runHealthSweep } from "./healthMonitor";

// Phase 6 — Event Bus
export { kernelBus } from "./eventBus";
export type {
  KernelEventName,
  KernelEventMap,
  ProviderHealthChangedEvent,
  ProviderRequestCompletedEvent,
  ProviderFailedEvent,
  UsageThresholdExceededEvent,
  WebhookDeliveredEvent,
  WebhookFailedEvent,
  DeviceStatusChangedEvent,
  AuditEntryWrittenEvent,
} from "./eventBus";

// Phase 7 — Observability / Metrics
export {
  ensureMetricsSchema,
  recordMetric,
  getProviderMetrics,
  getHourlyTrend,
  wireMetricsToEventBus,
} from "./metrics";
export type { MetricPoint, ProviderMetricSummary, HourlyBucket } from "./metrics";

// Phase 9 — Usage Metering
export {
  checkBudget,
  incrementUsage,
  getUsageSummary,
  UsageLimitError,
} from "./usageMeter";
export type { UsageSummary } from "./usageMeter";

// Phase 11 — Device Orchestration
export {
  ensureDeviceSchema,
  registerDevice,
  listDevices,
  getDeviceById,
  updateDevice,
  deleteDevice,
  recordHeartbeat,
  markStaleDevicesOffline,
} from "./deviceOrchestrator";
export type { Device, DeviceType, DeviceStatus, RegisterDeviceInput } from "./deviceOrchestrator";

// Phase 12 — Webhook Infrastructure
export {
  ensureWebhookSchema,
  receiveWebhook,
  listInboundEvents,
  queueDelivery,
  processDelivery,
  listDeliveries,
} from "./webhookEngine";
export type { WebhookEvent, WebhookDelivery, QueueDeliveryOptions } from "./webhookEngine";

// Phase 13 — SDK Helpers
export {
  buildAuthHeaders,
  withRetry,
  makeRequestContext,
  CircuitBreaker,
  verifyWebhookSignature,
} from "./sdk";
export type { RetryOptions, RequestContext, CircuitState, CircuitBreakerConfig } from "./sdk";

// Phase 14 — Tenant Guard
export {
  ensureTenantSchema,
  checkRateLimit,
  rateLimitTenant,
  enforceTenantIsolation,
  getTenantConfig,
  setTenantConfig,
  purgeExpiredRateLimitBuckets,
} from "./tenantGuard";
export type { TenantConfig, RateLimitResult } from "./tenantGuard";

// Phase 16 — Audit Trail
export {
  ensureAuditSchema,
  auditKernelAction,
  getAuditLog,
  verifyAuditChain,
} from "./auditTrail";
export type { AuditEntry, TamperCheckResult } from "./auditTrail";
