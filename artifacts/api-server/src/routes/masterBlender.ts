/**
 * /api/master-blender — Pairing Intelligence API for the Master Blender ritual.
 *
 * POST /resolve
 *   Body: { leaf, wrapper, vitola, cut, wrapperLabel?, vitolaLabel?, venueId?, guestId? }
 *   Returns: PairingResult (flavor vector, spirit/beer pairings, staff nudge, mentor lines)
 */

import { Router }          from "express";
import { z }              from "zod";
import { resolvePairing } from "../services/PairingIntelligenceEngine";

const router = Router();

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

export default router;
