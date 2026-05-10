/**
 * Sovereign Hardware Labs — Biometric Node Registry
 * 360 Enterprises Services LLC · Johnie Manuel Lee Collins
 *
 * POST /api/biometric/authenticate  — verify a hardware_id against authorized registry
 * POST /api/biometric/sync          — ingest a Bio-Puck human-state payload
 * GET  /api/biometric/nodes         — list all registered biometric nodes (sovereign only)
 * POST /api/biometric/nodes         — add a new authorized node
 * DELETE /api/biometric/nodes/:id   — revoke a node
 */

import { Router }      from "express";
import { z }           from "zod";
import { pool }        from "@workspace/db";
import { logger }      from "../lib/logger";

const router = Router();

// ── Bootstrap table ──────────────────────────────────────────────────────────

pool.query(`
  CREATE TABLE IF NOT EXISTS sovereign_hardware_nodes (
    id           SERIAL PRIMARY KEY,
    hardware_id  TEXT        NOT NULL UNIQUE,
    node_type    TEXT        NOT NULL DEFAULT 'UNKNOWN',
    label        TEXT,
    authorized   BOOLEAN     NOT NULL DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ,
    last_sync_payload JSONB,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  INSERT INTO sovereign_hardware_nodes (hardware_id, node_type, label, authorized)
  VALUES
    ('SOV_RING_01',  'RING',  'Sovereign Ring — JC Primary',    TRUE),
    ('SOV_WATCH_01', 'WATCH', 'Sovereign Watch — JC Primary',   TRUE),
    ('SOV_BAND_01',  'BAND',  'Sovereign Band — JC Secondary',  TRUE)
  ON CONFLICT (hardware_id) DO NOTHING;
`).catch(() => {});

// ── Schemas ───────────────────────────────────────────────────────────────────

const AuthSchema = z.object({
  hardware_id: z.string().min(1).max(80),
});

const SyncSchema = z.object({
  node_id:     z.string().min(1).max(80),
  heart_rate:  z.number().int().min(20).max(220).optional(),
  temperature: z.number().min(30).max(45).optional(),
  stress_index:z.number().min(0).max(100).optional(),
  signal_db:   z.number().optional(),
  timestamp:   z.string().optional(),
  meta:        z.record(z.unknown()).optional(),
});

const AddNodeSchema = z.object({
  hardware_id: z.string().min(2).max(80),
  node_type:   z.enum(["RING", "WATCH", "BAND", "PUCK", "OTHER"]),
  label:       z.string().max(120).optional(),
});

// ── POST /api/biometric/authenticate ────────────────────────────────────────

router.post("/biometric/authenticate", async (req, res) => {
  const parsed = AuthSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload" }); return; }

  const { hardware_id } = parsed.data;
  try {
    const { rows } = await pool.query<{ authorized: boolean; node_type: string; label: string }>(
      `SELECT authorized, node_type, label FROM sovereign_hardware_nodes WHERE hardware_id = $1`,
      [hardware_id],
    );
    if (rows.length === 0) {
      logger.warn({ hardware_id }, "Biometric auth — unknown node");
      res.json({ authenticated: false, reason: "UNKNOWN_NODE" });
      return;
    }
    const node = rows[0];
    if (!node.authorized) {
      logger.warn({ hardware_id }, "Biometric auth — node revoked");
      res.json({ authenticated: false, reason: "NODE_REVOKED" });
      return;
    }
    logger.info({ hardware_id, node_type: node.node_type }, "Biometric auth — PASS");
    res.json({ authenticated: true, node_type: node.node_type, label: node.label });
  } catch (err) {
    logger.error({ err }, "biometric/authenticate error");
    res.status(500).json({ error: "Internal error" });
  }
});

// ── POST /api/biometric/sync ─────────────────────────────────────────────────

router.post("/biometric/sync", async (req, res) => {
  const parsed = SyncSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid sync payload" }); return; }

  const { node_id, ...payload } = parsed.data;
  try {
    const { rowCount } = await pool.query(
      `UPDATE sovereign_hardware_nodes
       SET last_sync_at = NOW(), last_sync_payload = $1
       WHERE hardware_id = $2 AND authorized = TRUE`,
      [JSON.stringify(payload), node_id],
    );
    if ((rowCount ?? 0) === 0) {
      res.status(403).json({ ok: false, reason: "Node not authorized or not found" });
      return;
    }
    logger.info({ node_id, payload }, "SYNCING HUMAN STATE TO TITAN V");
    res.json({ ok: true, synced_at: new Date().toISOString() });
  } catch (err) {
    logger.error({ err }, "biometric/sync error");
    res.status(500).json({ error: "Sync failed" });
  }
});

// ── GET /api/biometric/nodes ─────────────────────────────────────────────────

router.get("/biometric/nodes", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, hardware_id, node_type, label, authorized, last_sync_at, last_sync_payload, registered_at
       FROM sovereign_hardware_nodes
       ORDER BY registered_at DESC`,
    );
    res.json({ nodes: rows });
  } catch (err) {
    logger.error({ err }, "GET /biometric/nodes error");
    res.status(500).json({ error: "Failed to fetch nodes" });
  }
});

// ── POST /api/biometric/nodes ────────────────────────────────────────────────

router.post("/biometric/nodes", async (req, res) => {
  const parsed = AddNodeSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() }); return; }

  const { hardware_id, node_type, label } = parsed.data;
  try {
    const { rows } = await pool.query<{ id: number }>(
      `INSERT INTO sovereign_hardware_nodes (hardware_id, node_type, label)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [hardware_id, node_type, label ?? null],
    );
    logger.info({ hardware_id, node_type }, "Biometric node registered");
    res.json({ ok: true, id: rows[0].id, hardware_id, node_type });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("unique")) {
      res.status(409).json({ error: "hardware_id already exists" });
    } else {
      logger.error({ err }, "POST /biometric/nodes error");
      res.status(500).json({ error: "Failed to add node" });
    }
  }
});

// ── DELETE /api/biometric/nodes/:id ─────────────────────────────────────────

router.delete("/biometric/nodes/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    await pool.query(
      `UPDATE sovereign_hardware_nodes SET authorized = FALSE WHERE id = $1`,
      [id],
    );
    logger.info({ id }, "Biometric node revoked");
    res.json({ ok: true, revoked: id });
  } catch (err) {
    logger.error({ err }, "DELETE /biometric/nodes error");
    res.status(500).json({ error: "Failed to revoke node" });
  }
});

export default router;
