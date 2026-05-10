/**
 * Sovereign Events — Persistent override audit log
 * POST /api/sovereign-events
 *
 * Appends every authorized SOVEREIGN_GLOBAL_DISRUPTION to a persistent
 * sovereign_events table with originDevice and timestamp metadata.
 * Guest-accessible (command originates from authenticated super-admin pill,
 * not a browser form), so no auth middleware required here — origin is
 * recorded in the payload itself.
 */

import { Router } from "express";
import { z }      from "zod";
import { pool }   from "@workspace/db";

const router = Router();

// ── Ensure table exists (idempotent) ───────────────────────────────────────

const BOOTSTRAP = `
  CREATE TABLE IF NOT EXISTS sovereign_events (
    id            SERIAL PRIMARY KEY,
    type          TEXT        NOT NULL,
    origin_device TEXT        NOT NULL DEFAULT 'SUPER_ADMIN_MOBILE',
    region        TEXT        NOT NULL DEFAULT 'GLOBAL',
    mode          TEXT        NOT NULL DEFAULT 'ABSOLUTE',
    ts            BIGINT      NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

pool.query(BOOTSTRAP).catch(() => {});

// ── Schema ─────────────────────────────────────────────────────────────────

const SovereignEventSchema = z.object({
  type:         z.enum(["BLACKOUT", "API_LOCK", "PURGE"]),
  originDevice: z.string().max(80).default("SUPER_ADMIN_MOBILE"),
  region:       z.string().max(20).default("GLOBAL"),
  mode:         z.string().max(40).default("ABSOLUTE"),
  timestamp:    z.number().int().positive(),
});

// ── POST /api/sovereign-events ─────────────────────────────────────────────

router.post("/sovereign-events", async (req, res) => {
  const parsed = SovereignEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid event payload", details: parsed.error.flatten() });
    return;
  }

  const { type, originDevice, region, mode, timestamp } = parsed.data;

  try {
    const result = await pool.query<{ id: number }>(
      `INSERT INTO sovereign_events (type, origin_device, region, mode, ts)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [type, originDevice, region, mode, timestamp],
    );
    res.json({ success: true, id: result.rows[0]?.id });
  } catch (err) {
    res.status(500).json({ error: "Failed to log sovereign event" });
  }
});

// ── GET /api/sovereign-events — recent log (last 50) ──────────────────────

router.get("/sovereign-events", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, type, origin_device, region, mode, ts, created_at
       FROM sovereign_events
       ORDER BY created_at DESC
       LIMIT 50`,
    );
    res.json({ events: result.rows });
  } catch {
    res.json({ events: [] });
  }
});

export default router;
