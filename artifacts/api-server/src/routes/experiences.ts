/**
 * GET  /api/experiences  — list recent experiences (auth required, manager+)
 * POST /api/experiences  — persist a recommendation session (auth optional)
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { desc }                                               from "drizzle-orm";
import { db, experiencesTable }                               from "@workspace/db";
import { verifyToken }                                        from "../lib/jwt";
import { requireAuth, type AuthRequest }                      from "../middleware/auth";
import { requireRole }                                        from "../middleware/roles";
import { allowOnly }                                          from "../middleware/sanitize";

const router: IRouter = Router();

// ── GET /api/experiences ──────────────────────────────────────────────────────
router.get(
  "/",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (_req: AuthRequest, res: Response) => {
    const rows = await db
      .select()
      .from(experiencesTable)
      .orderBy(desc(experiencesTable.createdAt))
      .limit(100);
    res.json(rows);
  },
);

router.post(
  "/",
  allowOnly("selectedProductId", "pairingProductId", "foodPairingId", "venueId"),
  async (req: Request, res: Response) => {
    const { selectedProductId, pairingProductId, foodPairingId, venueId } = req.body as {
      selectedProductId?: string;
      pairingProductId?:  string;
      foodPairingId?:     string;
      venueId?:           string;
    };

    if (!selectedProductId || typeof selectedProductId !== "string") {
      res.status(400).json({ error: '"selectedProductId" is required' });
      return;
    }

    let userId: string | null = null;
    let tokenVenueId: string | null = null;
    const authHeader = req.headers["authorization"];
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const payload = await verifyToken(authHeader.slice(7)) as unknown as { sub?: string; venueId?: string };
        userId = payload.sub ?? null;
        tokenVenueId = payload.venueId ?? null;
      } catch {
        // token invalid or expired — treat as anonymous
      }
    }

    const effectiveVenueId = tokenVenueId ?? venueId ?? null;

    const [saved] = await db
      .insert(experiencesTable)
      .values({
        userId:            userId ?? "00000000-0000-0000-0000-000000000000",
        venueId:           effectiveVenueId,
        selectedProductId,
        pairingProductId:  pairingProductId ?? null,
        foodPairingId:     foodPairingId    ?? null,
      })
      .returning({ id: experiencesTable.id });

    req.log.info(
      { experienceId: saved.id, userId: userId ?? "anonymous", selectedProductId },
      "experience saved",
    );

    res.status(201).json({ id: saved.id });
  },
);

export default router;
