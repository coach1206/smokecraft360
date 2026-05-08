/**
 * axiomCore.ts — Unified /api/axiom/* router.
 *
 * Single-surface entry point for all enterprise core operations.
 * Delegates to the typed engines in enterpriseExecutionEngine.ts.
 *
 * POST /api/axiom/tenant/provision
 * POST /api/axiom/session/save
 * GET  /api/axiom/session/:id
 * POST /api/axiom/session/:id/pause
 * POST /api/axiom/session/:id/resume
 * POST /api/axiom/revenue/track
 * GET  /api/axiom/revenue/:tenantId/impact
 * POST /api/axiom/telemetry
 * GET  /api/axiom/telemetry/stats
 * GET  /api/axiom/telemetry/recent
 * GET  /api/axiom/telemetry/:tenantId
 * GET  /api/axiom/sales/validate/:tenantId
 * POST /api/axiom/sales/validate
 * GET  /api/axiom/health
 * GET  /api/axiom/observability/errors
 * POST /api/axiom/enterprise/assign
 * GET  /api/axiom/enterprise/regions
 * GET  /api/axiom/enterprise/:enterpriseId/venues
 * POST /api/axiom/hardware/lease
 * GET  /api/axiom/hardware/:venueId
 */

import crypto                              from "crypto";
import { Router }                          from "express";
import { z }                               from "zod";
import {
  RevenueAttributionEngine,
  SessionPersistenceEngine,
  SalesValidationEngine,
  ObservabilityEngine,
  EnterpriseOrchestrationEngine,
  TelemetryEngine,
  type Tenant,
  type TenantTier,
  type OperationalStatus,
}                                          from "../services/enterpriseExecutionEngine";
import { HardwareLeaseManager }            from "../services/revenue/HardwareLeaseManager";
import { RuntimeActivationService }        from "../services/runtimeActivation";

const router = Router();

// ── Tenant provisioning ───────────────────────────────────────────────────────

const tenantSchema = z.object({
  venueName:         z.string().min(1),
  subscriptionTier:  z.enum(["CORE", "PRO", "XEI", "BLACK"]),
  enabledModules:    z.array(z.string()).default([]),
  whiteLabelEnabled: z.boolean().default(false),
  operationalStatus: z.enum(["ACTIVE","PAUSED","SUSPENDED","PROVISIONING","FAILED"]).default("ACTIVE"),
});

router.post("/tenant/provision", async (req, res) => {
  const parsed = tenantSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues }); return; }
  const tenant: Tenant = {
    id:                crypto.randomUUID(),
    venueName:         parsed.data.venueName,
    subscriptionTier:  parsed.data.subscriptionTier as TenantTier,
    enabledModules:    parsed.data.enabledModules,
    whiteLabelEnabled: parsed.data.whiteLabelEnabled,
    operationalStatus: parsed.data.operationalStatus as OperationalStatus,
    createdAt:         new Date(),
  };
  res.status(201).json({ success: true, tenant });
});

// ── Session continuity ────────────────────────────────────────────────────────

const sessionSchema = z.object({
  sessionId:         z.string(),
  tenantId:          z.string(),
  guestId:           z.string(),
  currentExperience: z.string(),
  currentStep:       z.number().int().min(0),
  mentorState:       z.unknown().optional(),
  rewards:           z.number().default(0),
  paused:            z.boolean().default(false),
});

router.post("/session/save", async (req, res) => {
  const parsed = sessionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues }); return; }
  SessionPersistenceEngine.saveSession({ ...parsed.data, mentorState: parsed.data.mentorState ?? null, savedAt: new Date() });
  res.status(201).json({ success: true, sessionId: parsed.data.sessionId });
});

router.get("/session/:id", async (req, res) => {
  const session = await SessionPersistenceEngine.recoverSession(req.params["id"]!);
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  res.json(session);
});

router.post("/session/:id/pause", async (req, res) => {
  const ok = SessionPersistenceEngine.pauseSession(req.params["id"]!);
  if (!ok) { res.status(404).json({ error: "Session not found" }); return; }
  res.json({ paused: true, sessionId: req.params["id"] });
});

router.post("/session/:id/resume", async (req, res) => {
  const session = SessionPersistenceEngine.resumeSession(req.params["id"]!);
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  res.json(session);
});

// ── Revenue attribution ───────────────────────────────────────────────────────

router.post("/revenue/track", async (req, res) => {
  const schema = z.object({
    tenantId:           z.string(),
    sessionId:          z.string(),
    recommendationType: z.string(),
    revenue:            z.number().min(0),
    confidence:         z.number().min(0).max(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues }); return; }
  const event = RevenueAttributionEngine.trackInfluence(parsed.data);
  res.status(201).json(event);
});

router.get("/revenue/:tenantId/impact", async (req, res) => {
  const impact = RevenueAttributionEngine.calculateRevenueImpact(req.params["tenantId"]!);
  res.json({ tenantId: req.params["tenantId"], influencedRevenue: impact });
});

// ── Telemetry ─────────────────────────────────────────────────────────────────

router.post("/telemetry", async (req, res) => {
  const schema = z.object({
    tenantId: z.string(),
    signal:   z.string(),
    payload:  z.unknown().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues }); return; }
  const event = TelemetryEngine.emit({ ...parsed.data, payload: parsed.data.payload ?? {} });
  res.status(201).json(event);
});

router.get("/telemetry/stats", async (_req, res) => {
  res.json(TelemetryEngine.getStats());
});

router.get("/telemetry/recent", async (req, res) => {
  const limit = typeof req.query["limit"] === "string" ? parseInt(req.query["limit"], 10) : 100;
  res.json({ events: TelemetryEngine.getRecent(limit) });
});

router.get("/telemetry/:tenantId", async (req, res) => {
  res.json({ events: TelemetryEngine.getByTenant(req.params["tenantId"]!), tenantId: req.params["tenantId"] });
});

// ── Sales validation ──────────────────────────────────────────────────────────

router.get("/sales/validate/:tenantId", async (req, res) => {
  const tenant: Tenant = {
    id:                req.params["tenantId"]!,
    venueName:         "Unknown",
    subscriptionTier:  "CORE",
    enabledModules:    [],
    whiteLabelEnabled: false,
    operationalStatus: "ACTIVE",
    createdAt:         new Date(),
  };
  res.json(SalesValidationEngine.validateTenant(tenant));
});

router.post("/sales/validate", async (req, res) => {
  const schema = z.object({
    id:                z.string(),
    venueName:         z.string().default("Unknown"),
    subscriptionTier:  z.enum(["CORE", "PRO", "XEI", "BLACK"]),
    enabledModules:    z.array(z.string()).default([]),
    whiteLabelEnabled: z.boolean().default(false),
    operationalStatus: z.enum(["ACTIVE","PAUSED","SUSPENDED","PROVISIONING","FAILED"]).default("ACTIVE"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues }); return; }
  const result = SalesValidationEngine.validateTenant({ ...parsed.data, createdAt: new Date() });
  res.json(result);
});

// ── Observability / health ────────────────────────────────────────────────────

router.get("/health", async (_req, res) => {
  res.json({
    ...ObservabilityEngine.getHealth(),
    telemetryEvents:    TelemetryEngine.events.length,
    attributionEvents:  RevenueAttributionEngine.ledger.length,
    sessionCount:       SessionPersistenceEngine.snapshots.size,
  });
});

router.get("/observability/errors", async (req, res) => {
  const limit = typeof req.query["limit"] === "string" ? parseInt(req.query["limit"], 10) : 50;
  res.json({ errors: ObservabilityEngine.getRecentErrors(limit) });
});

// ── Enterprise orchestration ──────────────────────────────────────────────────

router.post("/enterprise/assign", async (req, res) => {
  const schema = z.object({ enterpriseId: z.string(), tenantId: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload" }); return; }
  const venues = EnterpriseOrchestrationEngine.addVenueToRegion({
    regionId: parsed.data.enterpriseId,
    tenantId: parsed.data.tenantId,
  });
  res.status(201).json({ enterpriseId: parsed.data.enterpriseId, venues });
});

router.get("/enterprise/regions", async (_req, res) => {
  res.json({ regions: EnterpriseOrchestrationEngine.listRegions() });
});

router.get("/enterprise/:enterpriseId/venues", async (req, res) => {
  const venues = EnterpriseOrchestrationEngine.getRegionalVenues(req.params["enterpriseId"]!);
  res.json({ enterpriseId: req.params["enterpriseId"], venues, count: venues.length });
});

// ── Hardware ──────────────────────────────────────────────────────────────────

router.post("/hardware/lease", async (req, res) => {
  const schema = z.object({
    venueId:          z.string(),
    deviceType:       z.string(),
    serialNumber:     z.string().optional(),
    monthlyCents:     z.number().int().min(0),
    setupFeeCents:    z.number().int().min(0).default(0),
    status:           z.enum(["active","paused","terminated","completed"]).default("active"),
    ownershipStatus:  z.enum(["axiom_owned","financed","byod"]).default("axiom_owned"),
    leaseStart:       z.string().optional(),
    financingTerms:   z.record(z.unknown()).default({}),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues }); return; }
  const lease = await HardwareLeaseManager.createLease({
    ...parsed.data,
    leaseStart: parsed.data.leaseStart ?? new Date().toISOString(),
  });
  res.status(201).json(lease);
});

router.get("/hardware/:venueId", async (req, res) => {
  const result = await HardwareLeaseManager.listByVenue(req.params["venueId"]!);
  res.json({ venueId: req.params["venueId"], ...result });
});

// ── Runtime Activation Status ─────────────────────────────────────────────────

router.get("/activation/status", async (_req, res) => {
  if (!RuntimeActivationService.report) {
    res.status(503).json({ error: "Activation not yet complete" });
    return;
  }
  res.json(RuntimeActivationService.report);
});

router.post("/activation/refresh", async (_req, res) => {
  const report = await RuntimeActivationService.run();
  res.json(report);
});

export default router;
