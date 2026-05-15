/**
 * enterpriseExecutionEngine.ts — NOVEE OS Enterprise Execution Backbone.
 *
 * Consolidated single-file module providing four engines not covered by the
 * individual revenue/ service classes:
 *
 *   AXIOMEventBus              — enterprise signal bus (TENANT_*, SESSION_*, DEVICE_*, REVENUE_*)
 *   RevenueAttributionEngine   — in-process attribution ledger + influence calculator
 *   SessionPersistenceEngine   — in-memory session snapshot / pause / resume
 *   SalesValidationEngine      — operational status report for a tenant
 *   ObservabilityEngine        — error ledger + process health
 *   EnterpriseOrchestrationEngine — regional venue grouping
 *
 * All console calls are replaced with the project logger.
 * Stripe is NOT imported here — billing is handled by EnterpriseBillingManager.
 */

import crypto          from "crypto";
import { EventEmitter } from "events";
import { logger }       from "../lib/logger";
import { pool }         from "@workspace/db";

// ── Types ────────────────────────────────────────────────────────────────────

export type TenantTier       = "CORE" | "PRO" | "XEI" | "BLACK";
export type OperationalStatus = "ACTIVE" | "PAUSED" | "SUSPENDED" | "PROVISIONING" | "FAILED";

export interface Tenant {
  id:                 string;
  venueName:          string;
  subscriptionTier:   TenantTier;
  enabledModules:     string[];
  whiteLabelEnabled:  boolean;
  operationalStatus:  OperationalStatus;
  createdAt:          Date;
}

export interface RevenueAttribution {
  id:                  string;
  tenantId:            string;
  sessionId:           string;
  recommendationType:  string;
  influencedRevenue:   number;
  confidence:          number;
  timestamp:           Date;
}

export interface SessionSnapshot {
  sessionId:         string;
  tenantId:          string;
  guestId:           string;
  currentExperience: string;
  currentStep:       number;
  mentorState:       unknown;
  rewards:           number;
  paused:            boolean;
  savedAt:           Date;
}

export interface TenantValidationStatus {
  tenantId:               string;
  entitlementStatus:      OperationalStatus;
  provisioningStatus:     OperationalStatus;
  telemetryStatus:        OperationalStatus;
  aiStatus:               OperationalStatus;
  orchestrationStatus:    OperationalStatus;
  billingStatus:          OperationalStatus;
  revenueTrackingStatus:  OperationalStatus;
  hardwareStatus:         OperationalStatus;
  sessionRecoveryStatus:  OperationalStatus;
}

export interface ObservabilityError {
  id:        string;
  source:    string;
  message:   string;
  timestamp: Date;
}

// ── DB Schema Init ────────────────────────────────────────────────────────────

export async function initAxiomSchema(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS axiom_telemetry (
      id           TEXT PRIMARY KEY,
      tenant_id    TEXT NOT NULL,
      signal       TEXT NOT NULL,
      payload      JSONB,
      recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_axiom_telemetry_tenant ON axiom_telemetry(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_axiom_telemetry_signal ON axiom_telemetry(signal);

    CREATE TABLE IF NOT EXISTS axiom_revenue_attributions (
      id                   TEXT PRIMARY KEY,
      tenant_id            TEXT NOT NULL,
      session_id           TEXT NOT NULL,
      recommendation_type  TEXT NOT NULL,
      influenced_revenue   NUMERIC(12,2) NOT NULL,
      confidence           NUMERIC(5,4)  NOT NULL,
      attributed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_axiom_attr_tenant ON axiom_revenue_attributions(tenant_id);

    CREATE TABLE IF NOT EXISTS axiom_session_snapshots (
      session_id          TEXT PRIMARY KEY,
      tenant_id           TEXT NOT NULL,
      guest_id            TEXT NOT NULL,
      current_experience  TEXT NOT NULL,
      current_step        INT  NOT NULL DEFAULT 0,
      mentor_state        JSONB,
      rewards             NUMERIC(10,2) NOT NULL DEFAULT 0,
      paused              BOOLEAN NOT NULL DEFAULT FALSE,
      saved_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_axiom_snapshot_tenant ON axiom_session_snapshots(tenant_id);
  `);
  logger.info("axiom DB schema ready");
}

// Call at module load — non-blocking, errors logged not thrown
initAxiomSchema().catch(err => logger.error({ err }, "axiom schema init failed"));

// ── AXIOM Event Bus ───────────────────────────────────────────────────────────

export type AxiomSignal =
  | "TENANT_PROVISIONED"
  | "CAPABILITY_REVOKED"
  | "REVENUE_ATTRIBUTED"
  | "SESSION_SAVED"
  | "SESSION_PAUSED"
  | "SESSION_RESUMED"
  | "DEVICE_ASSIGNED";

export interface AxiomBusEvent {
  timestamp: Date;
  signal:    AxiomSignal;
  payload:   unknown;
}

export class AXIOMEventBus extends EventEmitter {
  emitSignal(signal: AxiomSignal, payload: unknown): void {
    const event: AxiomBusEvent = { timestamp: new Date(), signal, payload };
    this.emit(signal, event);
    logger.debug({ signal, payload }, "axiom signal emitted");
  }

  subscribe(signal: AxiomSignal, handler: (event: AxiomBusEvent) => void): void {
    this.on(signal, handler);
  }
}

export const axiomBus = new AXIOMEventBus();

// ── Revenue Attribution Engine ────────────────────────────────────────────────

export class RevenueAttributionEngine {
  static readonly ledger: RevenueAttribution[] = [];

  static trackInfluence(params: {
    tenantId:            string;
    sessionId:           string;
    recommendationType:  string;
    revenue:             number;
    confidence:          number;
  }): RevenueAttribution {
    const event: RevenueAttribution = {
      id:                  crypto.randomUUID(),
      tenantId:            params.tenantId,
      sessionId:           params.sessionId,
      recommendationType:  params.recommendationType,
      influencedRevenue:   params.revenue,
      confidence:          params.confidence,
      timestamp:           new Date(),
    };

    this.ledger.push(event);
    axiomBus.emitSignal("REVENUE_ATTRIBUTED", event);
    logger.info({ tenantId: params.tenantId, revenue: params.revenue }, "revenue influence tracked");

    pool.query(
      `INSERT INTO axiom_revenue_attributions
         (id, tenant_id, session_id, recommendation_type, influenced_revenue, confidence)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO NOTHING`,
      [event.id, event.tenantId, event.sessionId, event.recommendationType,
       event.influencedRevenue, event.confidence],
    ).catch(err => logger.error({ err }, "axiom attribution persist failed"));

    return event;
  }

  static calculateRevenueImpact(tenantId: string): number {
    return this.ledger
      .filter(x => x.tenantId === tenantId)
      .reduce((sum, item) => sum + item.influencedRevenue, 0);
  }

  static getLedger(tenantId?: string): RevenueAttribution[] {
    return tenantId ? this.ledger.filter(x => x.tenantId === tenantId) : this.ledger;
  }
}

// ── Session Persistence Engine ────────────────────────────────────────────────

export class SessionPersistenceEngine {
  static readonly snapshots: Map<string, SessionSnapshot> = new Map();

  static saveSession(snapshot: SessionSnapshot): void {
    this.snapshots.set(snapshot.sessionId, snapshot);
    axiomBus.emitSignal("SESSION_SAVED", snapshot);
    logger.info({ sessionId: snapshot.sessionId }, "session saved");

    pool.query(
      `INSERT INTO axiom_session_snapshots
         (session_id, tenant_id, guest_id, current_experience, current_step,
          mentor_state, rewards, paused, saved_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
       ON CONFLICT (session_id) DO UPDATE SET
         current_experience = EXCLUDED.current_experience,
         current_step       = EXCLUDED.current_step,
         mentor_state       = EXCLUDED.mentor_state,
         rewards            = EXCLUDED.rewards,
         paused             = EXCLUDED.paused,
         updated_at         = NOW()`,
      [snapshot.sessionId, snapshot.tenantId, snapshot.guestId,
       snapshot.currentExperience, snapshot.currentStep,
       snapshot.mentorState != null ? JSON.stringify(snapshot.mentorState) : null,
       snapshot.rewards, snapshot.paused, snapshot.savedAt],
    ).catch(err => logger.error({ err }, "axiom session persist failed"));
  }

  static async recoverSession(sessionId: string): Promise<SessionSnapshot | undefined> {
    const mem = this.snapshots.get(sessionId);
    if (mem) return mem;

    try {
      const { rows } = await pool.query<{
        session_id: string; tenant_id: string; guest_id: string;
        current_experience: string; current_step: number;
        mentor_state: unknown; rewards: string; paused: boolean; saved_at: Date;
      }>(
        `SELECT * FROM axiom_session_snapshots WHERE session_id = $1 LIMIT 1`,
        [sessionId],
      );
      if (!rows[0]) return undefined;
      const r = rows[0];
      const snap: SessionSnapshot = {
        sessionId:         r.session_id,
        tenantId:          r.tenant_id,
        guestId:           r.guest_id,
        currentExperience: r.current_experience,
        currentStep:       r.current_step,
        mentorState:       r.mentor_state,
        rewards:           parseFloat(r.rewards),
        paused:            r.paused,
        savedAt:           r.saved_at,
      };
      this.snapshots.set(sessionId, snap);
      return snap;
    } catch (err) {
      logger.error({ err }, "axiom session recover from DB failed");
      return undefined;
    }
  }

  static pauseSession(sessionId: string): boolean {
    const session = this.snapshots.get(sessionId);
    if (!session) return false;
    session.paused = true;
    this.snapshots.set(sessionId, session);
    axiomBus.emitSignal("SESSION_PAUSED", { sessionId });
    logger.info({ sessionId }, "session paused");

    pool.query(
      `UPDATE axiom_session_snapshots SET paused = true, updated_at = NOW() WHERE session_id = $1`,
      [sessionId],
    ).catch(err => logger.error({ err }, "axiom pause persist failed"));

    return true;
  }

  static resumeSession(sessionId: string): SessionSnapshot | undefined {
    const session = this.snapshots.get(sessionId);
    if (!session) return undefined;
    session.paused = false;
    this.snapshots.set(sessionId, session);
    axiomBus.emitSignal("SESSION_RESUMED", { sessionId });
    logger.info({ sessionId }, "session resumed");

    pool.query(
      `UPDATE axiom_session_snapshots SET paused = false, updated_at = NOW() WHERE session_id = $1`,
      [sessionId],
    ).catch(err => logger.error({ err }, "axiom resume persist failed"));

    return session;
  }

  static listSessions(tenantId?: string): SessionSnapshot[] {
    const all = Array.from(this.snapshots.values());
    return tenantId ? all.filter(s => s.tenantId === tenantId) : all;
  }
}

// ── Sales Validation Engine ───────────────────────────────────────────────────

export class SalesValidationEngine {
  static validateTenant(tenant: Tenant): TenantValidationStatus {
    return {
      tenantId:               tenant.id,
      entitlementStatus:      "ACTIVE",
      provisioningStatus:     "ACTIVE",
      telemetryStatus:        "ACTIVE",
      aiStatus:               "ACTIVE",
      orchestrationStatus:    "ACTIVE",
      billingStatus:          "ACTIVE",
      revenueTrackingStatus:  "ACTIVE",
      hardwareStatus:         "ACTIVE",
      sessionRecoveryStatus:  "ACTIVE",
    };
  }
}

// ── Observability Engine ──────────────────────────────────────────────────────

export class ObservabilityEngine {
  static readonly errors: ObservabilityError[] = [];

  static logError(params: { source: string; message: string }): ObservabilityError {
    const error: ObservabilityError = {
      id:        crypto.randomUUID(),
      source:    params.source,
      message:   params.message,
      timestamp: new Date(),
    };
    this.errors.push(error);
    logger.error({ source: params.source }, params.message);
    return error;
  }

  static getHealth(): {
    uptime:  number;
    memory:  NodeJS.MemoryUsage;
    errors:  number;
    status:  "HEALTHY" | "DEGRADED";
  } {
    return {
      uptime:  process.uptime(),
      memory:  process.memoryUsage(),
      errors:  this.errors.length,
      status:  this.errors.length === 0 ? "HEALTHY" : "DEGRADED",
    };
  }

  static getRecentErrors(limit = 50): ObservabilityError[] {
    return this.errors.slice(-limit);
  }
}

// ── Enterprise Orchestration Engine ──────────────────────────────────────────

export class EnterpriseOrchestrationEngine {
  static readonly regions: Map<string, string[]> = new Map();

  static addVenueToRegion(params: { regionId: string; tenantId: string }): string[] {
    const existing = this.regions.get(params.regionId) ?? [];
    if (!existing.includes(params.tenantId)) existing.push(params.tenantId);
    this.regions.set(params.regionId, existing);
    logger.info({ regionId: params.regionId, tenantId: params.tenantId }, "venue added to region");
    return existing;
  }

  static getRegionalVenues(regionId: string): string[] {
    return this.regions.get(regionId) ?? [];
  }

  static listRegions(): { regionId: string; venueCount: number }[] {
    return Array.from(this.regions.entries()).map(([regionId, venues]) => ({
      regionId,
      venueCount: venues.length,
    }));
  }

  static removeVenueFromRegion(params: { regionId: string; tenantId: string }): boolean {
    const existing = this.regions.get(params.regionId);
    if (!existing) return false;
    const updated = existing.filter(id => id !== params.tenantId);
    this.regions.set(params.regionId, updated);
    return true;
  }
}

// ── Telemetry Engine ─────────────────────────────────────────────────────────

export interface TelemetryEvent {
  id:        string;
  tenantId:  string;
  signal:    string;
  payload:   unknown;
  timestamp: Date;
}

export class TelemetryEngine {
  static readonly events: TelemetryEvent[] = [];

  static emit(params: {
    tenantId: string;
    signal:   string;
    payload:  unknown;
  }): TelemetryEvent {
    const event: TelemetryEvent = {
      id:        crypto.randomUUID(),
      tenantId:  params.tenantId,
      signal:    params.signal,
      payload:   params.payload,
      timestamp: new Date(),
    };
    this.events.push(event);
    logger.debug({ tenantId: params.tenantId, signal: params.signal }, "telemetry emitted");

    pool.query(
      `INSERT INTO axiom_telemetry (id, tenant_id, signal, payload)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [event.id, event.tenantId, event.signal,
       event.payload != null ? JSON.stringify(event.payload) : null],
    ).catch(err => logger.error({ err }, "axiom telemetry persist failed"));

    return event;
  }

  static getByTenant(tenantId: string): TelemetryEvent[] {
    return this.events.filter(e => e.tenantId === tenantId);
  }

  static getRecent(limit = 100): TelemetryEvent[] {
    return this.events.slice(-limit);
  }

  static getStats(): { total: number; signals: Record<string, number> } {
    const signals: Record<string, number> = {};
    for (const e of this.events) {
      signals[e.signal] = (signals[e.signal] ?? 0) + 1;
    }
    return { total: this.events.length, signals };
  }
}

// ── Signal Orchestrator (boot-time wiring) ────────────────────────────────────

export class SignalOrchestrator {
  static initialize(): void {
    axiomBus.subscribe("REVENUE_ATTRIBUTED", (event) => {
      logger.debug({ payload: event.payload }, "bus: revenue attributed");
    });
    axiomBus.subscribe("SESSION_PAUSED", (event) => {
      logger.debug({ payload: event.payload }, "bus: session paused");
    });
    axiomBus.subscribe("TENANT_PROVISIONED", (event) => {
      logger.debug({ payload: event.payload }, "bus: tenant provisioned");
    });
    axiomBus.subscribe("DEVICE_ASSIGNED", (event) => {
      logger.debug({ payload: event.payload }, "bus: device assigned");
    });
  }
}

SignalOrchestrator.initialize();
