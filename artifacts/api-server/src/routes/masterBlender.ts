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

// ── GET /humidor-suggestions?country=Nicaragua ────────────────────────────
// Returns real products from the DB (category=cigar) that mention the country
// in their name or flavor_notes, plus the hardcoded sensory matrix fallback.
const SENSORY_FALLBACK: Record<string, { cigar: string; spirit: string; spiritStyle: string; descriptors: string[] }> = {
  "Dominican Republic": { cigar: "Arturo Fuente Opus X",   spirit: "Highland Single Malt Scotch", spiritStyle: "12yr+ Aged",      descriptors: ["Smooth","Cedar","Cocoa"] },
  "Nicaragua":          { cigar: "Padrón 1926 Series",      spirit: "Barrel-Proof Bourbon",        spiritStyle: "Cask Strength",   descriptors: ["Bold","Espresso","Spice"] },
  "Ecuador":            { cigar: "Davidoff Nicaragua",       spirit: "Japanese Whisky",             spiritStyle: "Single Malt",     descriptors: ["Creamy","Aromatic","Shade-grown"] },
  "Cuba":               { cigar: "Cohiba Behike 52",         spirit: "Ron Zacapa 23 Rum",           spiritStyle: "Sistema Solera",  descriptors: ["Earthy","Floral","Honey"] },
  "Honduras":           { cigar: "Alec Bradley Prensado",   spirit: "Añejo Tequila",               spiritStyle: "Extra Añejo",     descriptors: ["Pepper","Leather","Earth"] },
  "Brazil":             { cigar: "CAO Brazilia Gol!",        spirit: "Armagnac",                    spiritStyle: "XO Reserve",      descriptors: ["Sweet","Woody","Rich"] },
};

router.get("/humidor-suggestions", async (req, res) => {
  const country = typeof req.query.country === "string" ? req.query.country.trim() : "";
  const fallback = SENSORY_FALLBACK[country] ?? SENSORY_FALLBACK["Dominican Republic"];

  try {
    // Try to find real inventory items for this origin
    const result = await db.execute(sql`
      SELECT id, name, image_url, flavor_notes, tier
      FROM products
      WHERE
        category = 'cigar'
        AND active = true
        AND (
          name ILIKE ${"%" + country + "%"}
          OR flavor_notes::text ILIKE ${"%" + country + "%"}
        )
      ORDER BY tier DESC, boost_level DESC
      LIMIT 3
    `);

    const liveItems = (result.rows as Array<{ id: string; name: string; image_url: string | null; flavor_notes: string[]; tier: string }>);

    res.json({
      country,
      liveItems,
      fallback,
    });
  } catch (err) {
    req.log?.error({ err }, "master-blender humidor-suggestions failed");
    res.json({ country, liveItems: [], fallback });
  }
});

export default router;
