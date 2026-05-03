/**
 * /api/scoring — simple weighted-sum score endpoint.
 *
 * Companion to the richer /api/recommend engine. The dynamic-template brief
 * defines a deterministic formula:
 *
 *     score = (flavor * 0.4) + (strength * 0.3) + (pairing * 0.3)
 *
 * exposed as a public POST so any kiosk theme (SmokeCraft, PourCraft, …) can
 * call it without the recommendation engine's category/inventory plumbing.
 *
 * Inputs are clamped to [0, 10] and rejected if not finite numbers. The
 * returned label is a coarse human-readable bucket the UI can render directly.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod/v4";

const router: IRouter = Router();

const scoringSchema = z.object({
  flavor:   z.number().finite().min(0).max(10),
  strength: z.number().finite().min(0).max(10),
  pairing:  z.number().finite().min(0).max(10),
});

function bucket(score: number): string {
  if (score >= 8.5) return "exceptional";
  if (score >= 7)   return "excellent";
  if (score >= 5)   return "balanced";
  if (score >= 3)   return "modest";
  return "weak";
}

router.post("/", (req: Request, res: Response) => {
  const parsed = scoringSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues });
    return;
  }
  const { flavor, strength, pairing } = parsed.data;
  const score = Number(((flavor * 0.4) + (strength * 0.3) + (pairing * 0.3)).toFixed(3));
  res.json({ score, label: bucket(score) });
});

export default router;
