/**
 * /api/me — caller-scoped read endpoints.
 *
 * GET /api/me/visits → list of venues this user has visited, with their
 * home venue flagged. Used by the kiosk to render "Welcome back from
 * <home>" greetings and per-venue stats. Always scoped to req.user.id —
 * no parameters, no cross-user leak surface.
 */

import { Router, type Response } from "express";
import { desc, eq } from "drizzle-orm";
import { db } from "@workspace/db";
import { userVenueVisitsTable, venuesTable, usersTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middleware/auth";

const router = Router();

const MAX_VISITS = 100;

router.get("/visits", requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  try {
    const [me] = await db
      .select({ homeVenueId: usersTable.venueId })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    const rows = await db
      .select({
        venueId:      userVenueVisitsTable.venueId,
        venueName:    venuesTable.name,
        firstVisitAt: userVenueVisitsTable.firstVisitAt,
        lastVisitAt:  userVenueVisitsTable.lastVisitAt,
        visitCount:   userVenueVisitsTable.visitCount,
      })
      .from(userVenueVisitsTable)
      .leftJoin(venuesTable, eq(venuesTable.id, userVenueVisitsTable.venueId))
      .where(eq(userVenueVisitsTable.userId, userId))
      .orderBy(desc(userVenueVisitsTable.lastVisitAt))
      .limit(MAX_VISITS);

    const homeVenueId = me?.homeVenueId ?? null;
    res.json({
      homeVenueId,
      visits: rows.map((r) => ({
        venueId:      r.venueId,
        venueName:    r.venueName,
        firstVisitAt: r.firstVisitAt,
        lastVisitAt:  r.lastVisitAt,
        visitCount:   r.visitCount,
        isHome:       r.venueId === homeVenueId,
      })),
    });
  } catch (err) {
    req.log?.error({ err }, "GET /api/me/visits failed");
    res.status(500).json({ error: "Failed to load visits" });
  }
});

export default router;
