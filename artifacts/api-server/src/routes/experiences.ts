/**
 * POST /api/experiences
 *
 * Persists a completed recommendation session to the experiences table.
 * Auth is optional — links to the authenticated user when a valid JWT is
 * present; stored anonymously otherwise.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { db, experiencesTable } from "@workspace/db";
import { verifyToken } from "../lib/jwt";
import { allowOnly } from "../middleware/sanitize";

const router: IRouter = Router();

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
