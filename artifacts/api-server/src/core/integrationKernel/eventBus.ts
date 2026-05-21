/**
 * Phase 6 — Integration Kernel Event Bus
 *
 * Typed in-process pub/sub. All kernel subsystems emit and subscribe
 * through this single bus — zero external infrastructure required.
 */

import { EventEmitter } from "events";

/* ── Event payload types ───────────────────────────────────────────────────── */

export interface ProviderHealthChangedEvent {
  venueId:      string;
  providerId:   string;
  providerName: string;
  prevStatus:   string;
  newStatus:    string;
  latencyMs:    number | null;
  error:        string | null;
  ts:           number;
}

export interface ProviderRequestCompletedEvent {
  venueId:      string;
  providerId:   string;
  providerName: string;
  providerType: string;
  latencyMs:    number;
  statusCode:   number | null;
  tokensUsed:   number | null;
  success:      boolean;
  ts:           number;
}

export interface ProviderFailedEvent {
  venueId:      string;
  providerId:   string;
  providerName: string;
  error:        string;
  consecutive:  number;
  ts:           number;
}

export interface CredentialRotatedEvent {
  venueId:    string;
  providerId: string;
  actorId:    string | null;
  ts:         number;
}

export interface UsageThresholdExceededEvent {
  venueId:      string;
  providerId:   string;
  providerName: string;
  metric:       "dailyRequests" | "monthlyRequests" | "monthlyTokens";
  current:      number;
  limit:        number;
  pct:          number;
  ts:           number;
}

export interface WebhookDeliveredEvent {
  venueId:        string;
  deliveryId:     string;
  providerName:   string;
  targetUrl:      string;
  statusCode:     number;
  attempt:        number;
  ts:             number;
}

export interface WebhookFailedEvent {
  venueId:      string;
  deliveryId:   string;
  providerName: string;
  targetUrl:    string;
  error:        string;
  attempt:      number;
  willRetry:    boolean;
  ts:           number;
}

export interface DeviceStatusChangedEvent {
  venueId:    string;
  deviceId:   string;
  deviceName: string;
  prevStatus: string;
  newStatus:  string;
  ts:         number;
}

export interface AuditEntryWrittenEvent {
  venueId:      string;
  auditId:      string;
  action:       string;
  resourceType: string;
  resourceId:   string | null;
  actorId:      string | null;
  ts:           number;
}

/* ── Event map ─────────────────────────────────────────────────────────────── */

export interface KernelEventMap {
  "provider.health_changed":     ProviderHealthChangedEvent;
  "provider.request_completed":  ProviderRequestCompletedEvent;
  "provider.failed":             ProviderFailedEvent;
  "credential.rotated":          CredentialRotatedEvent;
  "usage.threshold_exceeded":    UsageThresholdExceededEvent;
  "webhook.delivered":           WebhookDeliveredEvent;
  "webhook.failed":              WebhookFailedEvent;
  "device.status_changed":       DeviceStatusChangedEvent;
  "audit.entry_written":         AuditEntryWrittenEvent;
}

export type KernelEventName = keyof KernelEventMap;

/* ── Typed wrapper around Node EventEmitter ────────────────────────────────── */

class KernelEventBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    this.emitter.setMaxListeners(64);
  }

  emit<E extends KernelEventName>(event: E, payload: KernelEventMap[E]): void {
    this.emitter.emit(event, payload);
  }

  on<E extends KernelEventName>(
    event: E,
    listener: (payload: KernelEventMap[E]) => void,
  ): () => void {
    this.emitter.on(event, listener as (p: unknown) => void);
    return () => this.emitter.off(event, listener as (p: unknown) => void);
  }

  once<E extends KernelEventName>(
    event: E,
    listener: (payload: KernelEventMap[E]) => void,
  ): void {
    this.emitter.once(event, listener as (p: unknown) => void);
  }

  off<E extends KernelEventName>(
    event: E,
    listener: (payload: KernelEventMap[E]) => void,
  ): void {
    this.emitter.off(event, listener as (p: unknown) => void);
  }

  listenerCount(event: KernelEventName): number {
    return this.emitter.listenerCount(event);
  }
}

/** Singleton bus — import and use directly */
export const kernelBus = new KernelEventBus();
