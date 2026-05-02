/**
 * POST /api/preferences
 *
 * Fire-and-forget preference snapshot — called automatically when a user
 * runs the recommendation engine.  Records the preference combination so
 * the analytics engine can surface flavor trends over time.
 *
 * Authentication is optional: userId is extracted from a Bearer token when
 * present, otherwise the snapshot is stored as anonymous (userId = null).
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { db, userPreferencesTable }                          from "@workspace/db";
import { verifyToken }                                       from "../lib/jwt";
import { allowOnly }                                         from "../middleware/sanitize";

const router: IRouter = Router();

async function tryGetUserId(req: Request): Promise<string | null> {
  const header = req.headers["authorization"];
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const payload = await verifyToken(header.slice(7));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

router.post(
  "/",
  allowOnly("category", "flavorPreferences", "strength", "mood", "venueId", "sessionId"),
  async (req: Request, res: Response) => {
    const { category, flavorPreferences, strength, mood, venueId, sessionId } = req.body as {
      category?:          string;
      flavorPreferences?: string[];
      strength?:          number;
      mood?:              string;
      venueId?:           string;
      sessionId?:         string;
    };

    if (!category || !["cigar", "alcohol"].includes(category)) {
      res.status(400).json({ error: '"category" must be "cigar" or "alcohol"' });
      return;
    }
    if (!mood) {
      res.status(400).json({ error: '"mood" is required' });
      return;
    }

    // Respond immediately — never let tracking block the UI
    res.json({ ok: true });

    const userId = await tryGetUserId(req);

    db.insert(userPreferencesTable)
      .values({
        userId:           userId ?? undefined,
        venueId:          venueId ?? undefined,
        sessionId:        sessionId ?? undefined,
        category:         category as "cigar" | "alcohol",
        flavorPreferences: Array.isArray(flavorPreferences) ? flavorPreferences : [],
        strength:         typeof strength === "number" ? strength : 3,
        mood,
      })
      .catch((err) => {
        req.log.error({ err }, "Failed to persist user preferences");
      });
  },
);

export default router;
