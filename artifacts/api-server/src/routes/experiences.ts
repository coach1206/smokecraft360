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
  allowOnly("selectedProductId", "pairingProductId", "foodPairingId"),
  async (req: Request, res: Response) => {
    const { selectedProductId, pairingProductId, foodPairingId } = req.body as {
      selectedProductId?: string;
      pairingProductId?:  string;
      foodPairingId?:     string;
    };

    if (!selectedProductId || typeof selectedProductId !== "string") {
      res.status(400).json({ error: '"selectedProductId" is required' });
      return;
    }

    // Attempt to resolve user from JWT — silently falls through if absent/invalid
    let userId: string | null = null;
    const authHeader = req.headers["authorization"];
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const payload = await verifyToken(authHeader.slice(7));
        userId = payload.sub;
      } catch {
        // token invalid or expired — treat as anonymous
      }
    }

    const [saved] = await db
      .insert(experiencesTable)
      .values({
        userId:            userId ?? "00000000-0000-0000-0000-000000000000",
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
