/**
 * /api/scoring — Mentor-aware mastery scoring endpoint.
 *
 * Base formula (per-item taste match):
 *   score = (flavor × 0.4) + (strength × 0.3) + (pairing × 0.3)  → 0–10
 *
 * Neural Bridge extensions (session-level modifiers):
 *   hasConflict=true → deducts tier-scaled conflict penalty from sessionModifier
 *   isSponsored=true → adds +10 Mastery Boost (Distributor Shadow Product reward)
 *
 * Tier conflict penalties (AxiomBridge spec):
 *   EXPLORER    −2    (low stakes, forgiving)
 *   APPRENTICE  −5
 *   CRAFTSMAN   −12
 *   SOMMELIER   −25   (high-stakes mastery engagement)
 *   GRAND MASTER −25
 *
 * Returns: { score, label, penalty, bonus, sessionModifier }
 *   sessionModifier → 0–100 integer for the live Mastery Score HUD
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod/v4";

const router: IRouter = Router();

// ── Tier conflict penalty weights (AxiomBridge spec) ──────────────────────────

const CONFLICT_PENALTIES: Record<string, number> = {
  explorer:     2,
  apprentice:   5,
  craftsman:    12,
  sommelier:    25,
  grand_master: 25,
};

// ── Input schema ──────────────────────────────────────────────────────────────

const scoringSchema = z.object({
  flavor:      z.number().finite().min(0).max(10),
  strength:    z.number().finite().min(0).max(10),
  pairing:     z.number().finite().min(0).max(10),
  // Neural Bridge session-level modifiers
  tier:        z.enum(["explorer","apprentice","craftsman","sommelier","grand_master"]).optional(),
  hasConflict: z.boolean().optional(),
  isSponsored: z.boolean().optional(),
});

// ── Bucket labels ─────────────────────────────────────────────────────────────

function bucket(score: number): string {
  if (score >= 8.5) return "exceptional";
  if (score >= 7)   return "excellent";
  if (score >= 5)   return "balanced";
  if (score >= 3)   return "modest";
  return "weak";
}

// ── POST / ────────────────────────────────────────────────────────────────────

router.post("/", (req: Request, res: Response) => {
  const parsed = scoringSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues });
    return;
  }

  const { flavor, strength, pairing, tier, hasConflict, isSponsored } = parsed.data;

  // Base taste-match score (0–10)
  const score = Number(((flavor * 0.4) + (strength * 0.3) + (pairing * 0.3)).toFixed(3));

  // Tier-scaled conflict penalty
  const penalty = hasConflict ? (CONFLICT_PENALTIES[tier ?? "explorer"] ?? 5) : 0;

  // Distributor Shadow Product bonus
  const bonus = isSponsored ? 10 : 0;

  // Session modifier: maps 0–10 score to 0–100 then applies Neural Bridge deltas
  const sessionModifier = Math.min(100, Math.max(0, Math.round(score * 10) - penalty + bonus));

  res.json({ score, label: bucket(score), penalty, bonus, sessionModifier });
});

export default router;
