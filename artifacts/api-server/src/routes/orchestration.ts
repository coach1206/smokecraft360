/**
 * /api/orchestration — Rule engine, decision, and safety controls.
 *
 * GET  /api/orchestration/rules/:venueId         — list rules
 * POST /api/orchestration/rules/:venueId         — create rule
 * PUT  /api/orchestration/rules/:venueId/:ruleId — update rule
 * DELETE /api/orchestration/rules/:venueId/:ruleId — delete rule
 * GET  /api/orchestration/decisions/:venueId     — recent decisions
 * POST /api/orchestration/rollback/:decisionId   — rollback a decision
 * POST /api/orchestration/guardrails/:venueId/stop    — emergency stop
 * POST /api/orchestration/guardrails/:venueId/resume  — resume automation
 * GET  /api/orchestration/audit/:venueId         — audit log
 */

import { Router } from "express";
import { z } from "zod";
import { pool } from "@workspace/db";
import { createDefaultRules } from "../intelligence/orchestration/ruleEngine";
import { rollbackDecision } from "../intelligence/orchestration/decisionEngine";
import { emergencyStop, resumeAutomation, seedGuardrails } from "../intelligence/safety/automationGuardrails";

const router = Router();

// ── GET /api/orchestration/rules/:venueId ─────────────────────────────────────
router.get("/rules/:venueId", async (req, res) => {
  const venueId = req.params["venueId"] as string;
  const { rows } = await pool.query(
    `SELECT * FROM orchestration_rules WHERE venue_id = $1 ORDER BY priority DESC`,
    [venueId],
  ).catch(() => ({ rows: [] }));
  return res.json({ rules: rows });
});

// ── POST /api/orchestration/rules/:venueId ────────────────────────────────────
const ruleSchema = z.object({
  name:             z.string().min(1),
  description:      z.string().optional(),
  triggerType:      z.string(),
  conditions:       z.record(z.unknown()).default({}),
  actions:          z.array(z.record(z.unknown())).default([]),
  priority:         z.number().int().min(0).max(100).default(50),
  confidenceMin:    z.number().min(0).max(1).default(0.65),
  cooldownSeconds:  z.number().int().min(0).default(300),
  maxFiresPerHour:  z.number().int().min(0).default(12),
  requiresApproval: z.boolean().default(false),
  isEnabled:        z.boolean().default(true),
});

router.post("/rules/:venueId", async (req, res) => {
  const venueId = req.params["venueId"] as string;
  const parsed  = ruleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const d = parsed.data;
  const { rows } = await pool.query(
    `INSERT INTO orchestration_rules
       (venue_id, name, description, trigger_type, conditions, actions, priority,
        confidence_min, cooldown_seconds, max_fires_per_hour, requires_approval, is_enabled)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING *`,
    [venueId, d.name, d.description ?? null, d.triggerType, JSON.stringify(d.conditions),
     JSON.stringify(d.actions), d.priority, d.confidenceMin, d.cooldownSeconds,
     d.maxFiresPerHour, d.requiresApproval, d.isEnabled],
  ).catch(() => ({ rows: [] }));
  return res.status(201).json({ rule: rows[0] ?? null });
});

// ── POST /api/orchestration/rules/:venueId/seed ───────────────────────────────
router.post("/rules/:venueId/seed", async (req, res) => {
  const venueId = req.params["venueId"] as string;
  await createDefaultRules(venueId);
  return res.json({ ok: true, message: "Default rules seeded" });
});

// ── PUT /api/orchestration/rules/:venueId/:ruleId ────────────────────────────
router.put("/rules/:venueId/:ruleId", async (req, res) => {
  const venueId = req.params["venueId"] as string;
  const ruleId  = req.params["ruleId"]  as string;
  const { rows } = await pool.query(
    `UPDATE orchestration_rules
     SET is_enabled = COALESCE($1, is_enabled),
         priority   = COALESCE($2, priority),
         conditions = COALESCE($3, conditions),
         actions    = COALESCE($4, actions),
         updated_at = NOW()
     WHERE id = $5 AND venue_id = $6 RETURNING *`,
    [
      req.body.isEnabled ?? null,
      req.body.priority  ?? null,
      req.body.conditions ? JSON.stringify(req.body.conditions) : null,
      req.body.actions    ? JSON.stringify(req.body.actions)    : null,
      ruleId, venueId,
    ],
  ).catch(() => ({ rows: [] }));
  return res.json({ rule: rows[0] ?? null });
});

// ── DELETE /api/orchestration/rules/:venueId/:ruleId ─────────────────────────
router.delete("/rules/:venueId/:ruleId", async (req, res) => {
  const venueId = req.params["venueId"] as string;
  const ruleId  = req.params["ruleId"]  as string;
  await pool.query(
    `DELETE FROM orchestration_rules WHERE id = $1 AND venue_id = $2`,
    [ruleId, venueId],
  ).catch(() => {});
  return res.json({ ok: true });
});

// ── GET /api/orchestration/decisions/:venueId ─────────────────────────────────
router.get("/decisions/:venueId", async (req, res) => {
  const venueId = req.params["venueId"] as string;
  const limit   = Math.min(parseInt(String(req.query["limit"] ?? "50"), 10), 200);
  const { rows } = await pool.query(
    `SELECT * FROM orchestration_decisions
     WHERE venue_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [venueId, limit],
  ).catch(() => ({ rows: [] }));
  return res.json({ decisions: rows });
});

// ── POST /api/orchestration/rollback/:decisionId ─────────────────────────────
router.post("/rollback/:decisionId", async (req, res) => {
  const decisionId = req.params["decisionId"] as string;
  const { venueId, reason, operatorId } = req.body as {
    venueId: string; reason: string; operatorId?: string;
  };
  if (!venueId || !reason) return res.status(400).json({ error: "venueId + reason required" });
  await rollbackDecision(decisionId, venueId, reason, operatorId);
  return res.json({ ok: true });
});

// ── POST /api/orchestration/guardrails/:venueId/stop ─────────────────────────
router.post("/guardrails/:venueId/stop", async (req, res) => {
  const venueId = req.params["venueId"] as string;
  const { operator = "unknown", reason = "manual stop" } = req.body as {
    operator?: string; reason?: string;
  };
  await emergencyStop(venueId, operator, reason);
  return res.json({ ok: true });
});

// ── POST /api/orchestration/guardrails/:venueId/resume ───────────────────────
router.post("/guardrails/:venueId/resume", async (req, res) => {
  const venueId  = req.params["venueId"] as string;
  const { operator = "unknown" } = req.body as { operator?: string };
  await resumeAutomation(venueId, operator);
  return res.json({ ok: true });
});

// ── GET /api/orchestration/guardrails/:venueId ───────────────────────────────
router.get("/guardrails/:venueId", async (req, res) => {
  const venueId = req.params["venueId"] as string;
  const { rows } = await pool.query(
    `SELECT * FROM automation_guardrails WHERE venue_id = $1`,
    [venueId],
  ).catch(() => ({ rows: [] }));
  if (!rows[0]) {
    await seedGuardrails(venueId);
  }
  return res.json({ guardrails: rows[0] ?? null });
});

// ── GET /api/orchestration/audit/:venueId ─────────────────────────────────────
router.get("/audit/:venueId", async (req, res) => {
  const venueId = req.params["venueId"] as string;
  const limit   = Math.min(parseInt(String(req.query["limit"] ?? "100"), 10), 500);
  const { rows } = await pool.query(
    `SELECT * FROM orchestration_audit_logs
     WHERE venue_id = $1 ORDER BY created_at DESC LIMIT $2`,
    [venueId, limit],
  ).catch(() => ({ rows: [] }));
  return res.json({ logs: rows });
});

export default router;
