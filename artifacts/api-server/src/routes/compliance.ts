/**
 * Compliance layer routes — /api/compliance/*
 */

import express, { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireRole }  from "../middleware/roles";
import { recordConsent, getConsentHistory, hasActiveConsent, revokeAllConsent } from "../compliance/consentTracking";
import { getExplanations, persistExplanation } from "../compliance/aiExplainability";
import { checkAccess, anonymizeGuest } from "../compliance/privacyControls";
import { runRetentionCycle, getPolicies } from "../compliance/retentionCompliance";
import { getVenuePolicy, setVenueRegion, REGIONAL_POLICIES } from "../compliance/regionalPolicies";
import { generateExport } from "../compliance/complianceExports";

const router = Router();

// ── Consent ──────────────────────────────────────────────────────────────────

router.post("/consent", requireAuth, async (req, res) => {
  const { entityId, entityType, venueId, type, action, ...opts } = req.body as {
    entityId: string; entityType: "guest" | "user" | "device";
    venueId: string; type: string; action: string;
    version?: string; channel?: string; expiresAt?: string;
  };
  if (!entityId || !venueId || !type || !action) {
    res.status(400).json({ error: "entityId, venueId, type, action required" }); return;
  }
  const record = await recordConsent(
    entityId, entityType ?? "guest", venueId,
    type as Parameters<typeof recordConsent>[3],
    action as Parameters<typeof recordConsent>[4],
    {
      version:   opts.version,
      channel:   opts.channel,
      expiresAt: opts.expiresAt ? new Date(opts.expiresAt) : undefined,
    },
  );
  res.status(201).json(record);
});

router.get("/consent/:entityId", requireAuth, async (req, res) => {
  const { type, limit } = req.query as { type?: string; limit?: string };
  const history = await getConsentHistory(
    req.params.entityId as string,
    type as Parameters<typeof getConsentHistory>[1],
    limit ? parseInt(limit) : 50,
  );
  res.json(history);
});

router.get("/consent/:entityId/check/:type", requireAuth, async (req, res) => {
  const { entityId, type } = req.params as { entityId: string; type: string };
  const active = await hasActiveConsent(entityId, type as Parameters<typeof hasActiveConsent>[1]);
  res.json({ entityId, type, active });
});

router.delete("/consent/:entityId/all", requireAuth, requireRole("admin", "super_admin"), async (req, res) => {
  const { venueId, reason } = req.body as { venueId: string; reason: string };
  if (!venueId) { res.status(400).json({ error: "venueId required" }); return; }
  const count = await revokeAllConsent(req.params.entityId as string, venueId, reason ?? "admin_revoke");
  res.json({ revoked: count });
});

// ── AI Explainability ─────────────────────────────────────────────────────────

router.get("/explanations/:venueId", requireAuth, async (req, res) => {
  const { type, limit } = req.query as { type?: string; limit?: string };
  const explanations = await getExplanations(
    req.params.venueId as string,
    type as Parameters<typeof getExplanations>[1],
    limit ? parseInt(limit) : 20,
  );
  res.json(explanations);
});

// ── Privacy controls ──────────────────────────────────────────────────────────

router.post("/access-check", requireAuth, async (req, res) => {
  const decision = await checkAccess(req.body as Parameters<typeof checkAccess>[0]);
  res.json(decision);
});

router.post("/anonymize/:entityId", requireAuth, requireRole("admin", "super_admin"), async (req, res) => {
  const { venueId } = req.body as { venueId: string };
  if (!venueId) { res.status(400).json({ error: "venueId required" }); return; }
  await anonymizeGuest(req.params.entityId as string, venueId);
  res.json({ ok: true });
});

// ── Retention ─────────────────────────────────────────────────────────────────

router.get("/retention/policies", requireAuth, requireRole("admin", "super_admin"), (req, res) => {
  res.json(getPolicies());
});

router.post("/retention/run", requireAuth, requireRole("super_admin"), async (req, res) => {
  const results = await runRetentionCycle();
  res.json(results);
});

// ── Regional policies ─────────────────────────────────────────────────────────

router.get("/regions", requireAuth, (req, res) => {
  res.json(Object.keys(REGIONAL_POLICIES));
});

router.get("/regions/:venueId", requireAuth, (req, res) => {
  res.json(getVenuePolicy(req.params.venueId as string));
});

router.post("/regions/:venueId", requireAuth, requireRole("admin", "super_admin"), (req, res) => {
  const { region } = req.body as { region: string };
  if (!region) { res.status(400).json({ error: "region required" }); return; }
  setVenueRegion(req.params.venueId as string, region as Parameters<typeof setVenueRegion>[1]);
  res.json({ ok: true, policy: getVenuePolicy(req.params.venueId as string) });
});

// ── Exports ───────────────────────────────────────────────────────────────────

router.post("/export", requireAuth, requireRole("admin", "super_admin"), async (req, res) => {
  const { entityId, type, format } = req.body as { entityId: string; type: string; format?: string };
  if (!entityId || !type) { res.status(400).json({ error: "entityId and type required" }); return; }
  const { manifest, data } = await generateExport(
    entityId,
    type as Parameters<typeof generateExport>[1],
    (format ?? "json") as Parameters<typeof generateExport>[2],
    (req as express.Request & { user?: { id: string } }).user?.id ?? "system",
  );
  if ((format ?? "json") === "csv") {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="export-${manifest.exportId}.csv"`);
    res.send(data);
  } else {
    res.json({ manifest, data: JSON.parse(data) });
  }
});

export default router;
