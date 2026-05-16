/**
 * /api/master-blender — Pairing Intelligence API for the Master Blender ritual.
 *
 * POST /resolve
 *   Body: { leaf, wrapper, vitola, cut, wrapperLabel?, vitolaLabel?, venueId?, guestId? }
 *   Returns: PairingResult (flavor vector, spirit/beer pairings, staff nudge, mentor lines)
 *
 * GET /nightly-average
 *   Returns: { avg: number; count: number }  — today's blender session score average
 *   Queries audit_log WHERE action = 'blend_completed' AND date = today
 *   Safe: returns { avg: 0, count: 0 } when no entries exist
 */

import { Router } from "express";
import { z }      from "zod";
import { db }     from "@workspace/db";
import { sql }    from "drizzle-orm";
import { resolvePairing } from "../services/PairingIntelligenceEngine";

const router = Router();

// ── POST /resolve ─────────────────────────────────────────────────────────
const resolveSchema = z.object({
  leaf:          z.string().min(1),
  wrapper:       z.string().min(1),
  vitola:        z.string().min(1),
  cut:           z.string().min(1),
  wrapperLabel:  z.string().optional(),
  vitolaLabel:   z.string().optional(),
  venueId:       z.string().uuid().optional(),
  guestId:       z.string().uuid().optional(),
});

router.post("/resolve", async (req, res) => {
  const parsed = resolveSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid selection data", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await resolvePairing(parsed.data);
    res.json(result);
  } catch (err) {
    req.log?.error({ err }, "master-blender resolve failed");
    res.status(500).json({ error: "Pairing engine error" });
  }
});

// ── GET /nightly-average ─────────────────────────────────────────────────
// Aggregates blender session scores from today's audit_log entries.
// Uses supply_verification_ledger as primary source (action = 'blend_completed'),
// falls back to craft_builds scores when no ledger entries exist.
router.get("/nightly-average", async (req, res) => {
  try {
    // Primary: supply_verification_ledger entries logged today
    const ledgerResult = await db.execute(sql`
      SELECT
        COALESCE(AVG((metadata->>'finalScore')::numeric), 0)::float AS avg,
        COUNT(*)::int AS count
      FROM supply_verification_ledger
      WHERE
        metadata->>'action' = 'blend_completed'
        AND broadcasted_at >= CURRENT_DATE
        AND broadcasted_at <  CURRENT_DATE + INTERVAL '1 day'
    `);

    const row = (ledgerResult.rows as Array<{ avg: number; count: number }>)[0];

    if (row && row.count > 0) {
      res.json({ avg: Number(row.avg), count: Number(row.count) });
      return;
    }

    // Fallback: audit_log entries with action = 'blend_completed'
    const auditResult = await db.execute(sql`
      SELECT
        COALESCE(AVG((metadata->>'finalScore')::numeric), 0)::float AS avg,
        COUNT(*)::int AS count
      FROM audit_log
      WHERE
        action = 'blend_completed'
        AND created_at >= CURRENT_DATE
        AND created_at <  CURRENT_DATE + INTERVAL '1 day'
    `);

    const aRow = (auditResult.rows as Array<{ avg: number; count: number }>)[0];
    res.json({ avg: Number(aRow?.avg ?? 0), count: Number(aRow?.count ?? 0) });
  } catch (err) {
    req.log?.error({ err }, "master-blender nightly-average failed");
    // Graceful: return zeros so frontend handles empty state cleanly
    res.json({ avg: 0, count: 0 });
  }
});

export default router;
