/**
 * platformAdmin — API routes for platform maturity layer management.
 *
 * Exposes:
 *   GET  /api/platform/flags                  — list all feature flags + current values
 *   GET  /api/platform/flags/:key             — single flag with venue resolution
 *   POST /api/platform/flags/:key/global      — set global override
 *   POST /api/platform/flags/:key/venue/:vid  — set venue override
 *   DEL  /api/platform/flags/:key/override    — clear override
 *   POST /api/platform/flags/emergency-disable — kill switch
 *
 *   GET  /api/platform/policies               — list all policies
 *   GET  /api/platform/policies/audit         — audit log for venue
 *   GET  /api/platform/policies/denials       — denial stats
 *   POST /api/platform/policies/:key/disable  — disable a policy
 *
 *   GET  /api/platform/metrics                — live metric snapshot
 *   GET  /api/platform/metrics/:domain        — domain-filtered metrics
 *   GET  /api/platform/traces/:traceId        — span tree for a trace
 *
 *   GET  /api/platform/backpressure           — current queue pressure state
 *   GET  /api/platform/backpressure/throttle/:channel — throttle stats
 *
 *   GET  /api/platform/versioning/report      — event schema compatibility
 *   GET  /api/platform/versioning/schemas     — all registered schemas
 *
 *   GET  /api/platform/retention/policies     — data retention policy list
 *   POST /api/platform/retention/run          — trigger manual retention sweep
 *
 *   GET  /api/platform/workers                — worker health overview
 *   GET  /api/platform/workers/unhealthy      — degraded/stuck/dead workers
 *   GET  /api/platform/queue/dead-letter      — DLQ contents
 *   POST /api/platform/queue/dead-letter/:id/retry — retry a DLQ event
 *
 *   GET  /api/platform/sandboxes              — list sandboxes
 *   POST /api/platform/sandboxes              — create sandbox
 *   POST /api/platform/sandboxes/:id/start    — start simulation
 *   POST /api/platform/sandboxes/:id/pause    — pause simulation
 *   DEL  /api/platform/sandboxes/:id          — destroy sandbox
 *   POST /api/platform/sandboxes/synthetic    — burst-generate synthetic events
 */

import { Router, type Request, type Response } from "express";
import { requireAuth }    from "../middleware/auth";
import { requireRole }    from "../middleware/roles";
import type { AuthRequest } from "../middleware/auth";

import {
  getAllFlags, getFlagsByDomain, getFlag,
} from "../platform/featureFlags/flagRegistry";
import {
  isEnabled, getFlagValue,
  setGlobalOverride, setVenueOverride, clearOverride, emergencyDisableAll,
  loadFlagCache,
} from "../platform/featureFlags/featureFlagEngine";

import {
  getAllPolicies, getPoliciesByDomain,
} from "../platform/policies/policyEngine";
import {
  evaluateAndLog, disablePolicy, enablePolicy, getPolicyAuditLog, getDenialStats,
} from "../platform/policies/policyRegistry";

import { snapshot, getHistogram } from "../platform/observability/metricsCollector";
import { getTrace }               from "../platform/observability/tracer";

import { getPressureState }      from "../platform/backpressure/queuePressure";
import { getThrottleStats }      from "../platform/backpressure/eventThrottle";

import {
  getCompatibilityReport,
} from "../platform/versioning/eventEnvelope";
import { getAllSchemas as getRegisteredSchemas } from "../platform/versioning/schemaRegistry";

import { getAllPolicies as getRetentionPolicies, runAllPolicies } from "../platform/retention/retentionEngine";
import { runArchivalJob }         from "../platform/retention/archivalJob";

import {
  getAllWorkerHealth, getUnhealthyWorkers,
} from "../platform/selfHealing/workerRecovery";
import {
  healQueue, getDeadLetterQueue, retryDeadLetter,
} from "../platform/selfHealing/queueHealer";

import {
  createSandbox, startSandbox, pauseSandbox, destroySandbox, listSandboxes,
  type SandboxConfig,
} from "../platform/simulation/sandboxManager";
import {
  generateBurstEvents, type SyntheticSessionConfig,
} from "../platform/simulation/syntheticTelemetry";

const router = Router();

const superOnly  = [requireAuth, requireRole("super_admin")];
const adminOnly  = [requireAuth, requireRole("super_admin","venue_owner","manager")];
const staffOr    = [requireAuth, requireRole("super_admin","venue_owner","manager","staff")];

function vid(req: AuthRequest): string | undefined {
  return req.user?.venueId ?? (req.query["venueId"] as string | undefined);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE FLAGS
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/platform/flags", ...staffOr, async (req: AuthRequest, res: Response) => {
  const flags   = getAllFlags();
  const venueId = vid(req);
  const resolved = flags.map(f => ({
    ...f,
    currentValue: getFlagValue(f.key, venueId),
    isEnabled:    isEnabled(f.key, venueId),
  }));
  res.json({ flags: resolved, venueId: venueId ?? null });
});

router.get("/platform/flags/domain/:domain", ...staffOr, async (req: AuthRequest, res: Response) => {
  const flags   = getFlagsByDomain(req.params["domain"] as Parameters<typeof getFlagsByDomain>[0]);
  const venueId = vid(req);
  res.json({ flags: flags.map(f => ({ ...f, currentValue: getFlagValue(f.key, venueId) })) });
});

router.get("/platform/flags/:key", ...staffOr, async (req: AuthRequest, res: Response) => {
  const key = req.params["key"] as string;
  const def = getFlag(key);
  if (!def) { res.status(404).json({ error:"flag_not_found" }); return; }
  const venueId = vid(req);
  res.json({ ...def, currentValue: getFlagValue(key, venueId), isEnabled: isEnabled(key, venueId) });
});

router.post("/platform/flags/:key/global", ...superOnly, async (req: AuthRequest, res: Response) => {
  const { value, reason } = req.body as { value: unknown; reason?: string };
  await setGlobalOverride(req.params["key"] as string, value as never, req.user!.id, reason ?? "admin override");
  res.json({ ok: true });
});

router.post("/platform/flags/:key/venue/:venueId", ...adminOnly, async (req: AuthRequest, res: Response) => {
  const { value } = req.body as { value: unknown };
  await setVenueOverride(req.params["key"] as string, req.params["venueId"] as string, value as never, req.user!.id);
  res.json({ ok: true });
});

router.delete("/platform/flags/:key/override", ...superOnly, async (req: AuthRequest, res: Response) => {
  const { scope, venueId: venueOverrideId } = req.query as { scope?: string; venueId?: string };
  await clearOverride(req.params["key"] as string, (scope ?? "global") as "global"|"venue", venueOverrideId);
  res.json({ ok: true });
});

router.post("/platform/flags/emergency-disable", ...superOnly, async (req: AuthRequest, res: Response) => {
  const { reason } = req.body as { reason: string };
  await emergencyDisableAll(req.user!.id, reason ?? "emergency");
  res.json({ ok: true, message: "Emergency kill switch activated" });
});

router.post("/platform/flags/reload-cache", ...superOnly, async (_req: Request, res: Response) => {
  await loadFlagCache();
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POLICY ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/platform/policies", ...adminOnly, (_req: Request, res: Response) => {
  const policies = getAllPolicies().map(p => ({ key: p.key, domain: p.domain, description: p.description }));
  res.json({ policies });
});

router.get("/platform/policies/domain/:domain", ...adminOnly, (req: Request, res: Response) => {
  const domain = req.params["domain"] as Parameters<typeof getPoliciesByDomain>[0];
  res.json({ policies: getPoliciesByDomain(domain).map(p => ({ key:p.key, domain:p.domain, description:p.description })) });
});

router.get("/platform/policies/audit", ...adminOnly, async (req: AuthRequest, res: Response) => {
  const venueId = vid(req);
  if (!venueId) { res.status(400).json({ error:"venue_required" }); return; }
  const limit  = Number(req.query["limit"] ?? 100);
  const action = req.query["action"] as string | undefined;
  const log    = await getPolicyAuditLog(venueId, limit, action);
  res.json({ log });
});

router.get("/platform/policies/denials", ...adminOnly, async (req: AuthRequest, res: Response) => {
  const venueId = vid(req);
  if (!venueId) { res.status(400).json({ error:"venue_required" }); return; }
  const stats = await getDenialStats(venueId);
  res.json({ denials: stats });
});

router.post("/platform/policies/:key/evaluate", ...adminOnly, async (req: AuthRequest, res: Response) => {
  const ctx = req.body as Parameters<typeof evaluateAndLog>[0];
  const result = await evaluateAndLog(ctx);
  res.json({ result });
});

router.post("/platform/policies/:key/disable", ...superOnly, async (req: AuthRequest, res: Response) => {
  const { reason } = req.body as { reason: string };
  await disablePolicy(req.params["key"] as string, reason, req.user!.id);
  res.json({ ok: true });
});

router.post("/platform/policies/:key/enable", ...superOnly, async (req: AuthRequest, res: Response) => {
  await enablePolicy(req.params["key"] as string, req.user!.id);
  res.json({ ok: true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// OBSERVABILITY
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/platform/metrics", ...staffOr, (_req: Request, res: Response) => {
  res.json({ metrics: snapshot(), ts: Date.now() });
});

router.get("/platform/metrics/:domain", ...staffOr, (req: Request, res: Response) => {
  res.json({ metrics: snapshot(req.params["domain"] as string), ts: Date.now() });
});

router.get("/platform/metrics/histogram/:domain/:name", ...staffOr, (req: Request, res: Response) => {
  const hist = getHistogram(req.params["domain"] as string, req.params["name"] as string);
  res.json({ histogram: hist });
});

router.get("/platform/traces/:traceId", ...adminOnly, async (req: Request, res: Response) => {
  const spans = await getTrace(req.params["traceId"] as string);
  res.json({ traceId: req.params["traceId"], spans, count: spans.length });
});

// ═══════════════════════════════════════════════════════════════════════════════
// BACKPRESSURE
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/platform/backpressure", ...staffOr, (_req: Request, res: Response) => {
  res.json({ pressure: getPressureState() });
});

router.get("/platform/backpressure/throttle/:channel", ...staffOr, (req: AuthRequest, res: Response) => {
  const stats = getThrottleStats(req.params["channel"] as string, vid(req));
  res.json({ channel: req.params["channel"], venueId: vid(req) ?? null, stats });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT VERSIONING
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/platform/versioning/report", ...staffOr, (_req: Request, res: Response) => {
  res.json(getCompatibilityReport());
});

router.get("/platform/versioning/schemas", ...staffOr, (_req: Request, res: Response) => {
  const schemas = getRegisteredSchemas().map(s => ({
    eventType:   s.eventType,
    version:     s.version,
    description: s.description,
    changelog:   s.changelog,
  }));
  res.json({ schemas, count: schemas.length });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DATA RETENTION
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/platform/retention/policies", ...adminOnly, (_req: Request, res: Response) => {
  res.json({ policies: getRetentionPolicies() });
});

router.post("/platform/retention/run", ...superOnly, async (_req: Request, res: Response) => {
  const results = await runAllPolicies();
  res.json({ results, count: results.length });
});

router.post("/platform/retention/archival/run", ...superOnly, async (_req: Request, res: Response) => {
  const result = await runArchivalJob();
  res.json({ result });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SELF-HEALING
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/platform/workers", ...staffOr, (_req: Request, res: Response) => {
  res.json({ workers: getAllWorkerHealth() });
});

router.get("/platform/workers/unhealthy", ...staffOr, (_req: Request, res: Response) => {
  res.json({ workers: getUnhealthyWorkers() });
});

router.post("/platform/queue/heal", ...superOnly, async (_req: Request, res: Response) => {
  const result = await healQueue();
  res.json({ result });
});

router.get("/platform/queue/dead-letter", ...adminOnly, async (req: Request, res: Response) => {
  const limit = Number(req.query["limit"] ?? 50);
  const items = await getDeadLetterQueue(limit);
  res.json({ items, count: items.length });
});

router.post("/platform/queue/dead-letter/:id/retry", ...superOnly, async (req: Request, res: Response) => {
  const ok = await retryDeadLetter(req.params["id"] as string);
  res.json({ ok });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULATION / SANDBOX
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/platform/sandboxes", ...adminOnly, (_req: Request, res: Response) => {
  res.json({ sandboxes: listSandboxes() });
});

router.post("/platform/sandboxes", ...superOnly, async (req: Request, res: Response) => {
  const config = req.body as SandboxConfig;
  const sandbox = await createSandbox(config);
  res.status(201).json({ sandbox });
});

router.post("/platform/sandboxes/:id/start", ...superOnly, async (req: Request, res: Response) => {
  await startSandbox(req.params["id"] as string);
  res.json({ ok: true });
});

router.post("/platform/sandboxes/:id/pause", ...superOnly, async (req: Request, res: Response) => {
  await pauseSandbox(req.params["id"] as string);
  res.json({ ok: true });
});

router.delete("/platform/sandboxes/:id", ...superOnly, async (req: Request, res: Response) => {
  await destroySandbox(req.params["id"] as string);
  res.json({ ok: true });
});

router.post("/platform/sandboxes/synthetic/burst", ...superOnly, (req: Request, res: Response) => {
  const { config, tickCount = 10 } = req.body as { config: SyntheticSessionConfig; tickCount?: number };
  const events = generateBurstEvents(config, Math.min(tickCount, 1000));
  res.json({ events: events.slice(0, 200), total: events.length });
});

export { router as platformAdminRouter };
