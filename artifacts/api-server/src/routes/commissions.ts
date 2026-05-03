/**
 * Commissions — admin payout ledger.
 *
 *   GET  /api/admin/commissions          — list with optional ?venueId & ?status
 *   GET  /api/admin/commissions/summary  — { pendingCents, paidCents, count } (optionally by venue)
 *   POST /api/admin/payout               — mark all pending commissions paid (optionally by venue)
 *
 * All routes require an authenticated user with role super_admin / venue_owner / manager.
 */

import { Router, type Response, type IRouter } from "express";
import { and, eq, sql }                        from "drizzle-orm";
import { db, commissionsTable }                from "@workspace/db";
import { requireAuth, type AuthRequest }       from "../middleware/auth";
import { requireRole }                         from "../middleware/roles";

const router: IRouter = Router();

const ADMIN_ROLES = ["venue_owner", "manager"] as const;

router.get(
  "/admin/commissions",
  requireAuth,
  requireRole(...ADMIN_ROLES),
  async (req: AuthRequest, res: Response) => {
    const venueId = typeof req.query["venueId"] === "string" ? req.query["venueId"] : undefined;
    const status  = typeof req.query["status"]  === "string" ? req.query["status"]  : undefined;

    const conditions = [];
    if (venueId) conditions.push(eq(commissionsTable.venueId, venueId));
    if (status === "pending" || status === "paid") {
      conditions.push(eq(commissionsTable.status, status));
    }

    const rows = await db
      .select()
      .from(commissionsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(sql`${commissionsTable.createdAt} desc`)
      .limit(500);

    res.json({ commissions: rows });
  },
);

router.get(
  "/admin/commissions/summary",
  requireAuth,
  requireRole(...ADMIN_ROLES),
  async (req: AuthRequest, res: Response) => {
    const venueId = typeof req.query["venueId"] === "string" ? req.query["venueId"] : undefined;

    const where = venueId ? eq(commissionsTable.venueId, venueId) : undefined;

    const [agg] = await db
      .select({
        pendingCents: sql<number>`coalesce(sum(case when ${commissionsTable.status} = 'pending' then ${commissionsTable.amountCents} else 0 end), 0)::int`,
        paidCents:    sql<number>`coalesce(sum(case when ${commissionsTable.status} = 'paid'    then ${commissionsTable.amountCents} else 0 end), 0)::int`,
        count:        sql<number>`count(*)::int`,
      })
      .from(commissionsTable)
      .where(where);

    res.json(agg ?? { pendingCents: 0, paidCents: 0, count: 0 });
  },
);

router.post(
  "/admin/payout",
  requireAuth,
  requireRole(...ADMIN_ROLES),
  async (req: AuthRequest, res: Response) => {
    const venueId = typeof req.body?.venueId === "string" ? req.body.venueId : undefined;

    const conditions = [eq(commissionsTable.status, "pending" as const)];
    if (venueId) conditions.push(eq(commissionsTable.venueId, venueId));

    const updated = await db
      .update(commissionsTable)
      .set({ status: "paid" as const, paidAt: new Date() })
      .where(and(...conditions))
      .returning({ id: commissionsTable.id, amountCents: commissionsTable.amountCents });

    const totalCents = updated.reduce((sum, r) => sum + r.amountCents, 0);
    req.log.info(
      { venueId, count: updated.length, totalCents, by: req.user?.id },
      "Commission payout marked paid",
    );

    res.json({ count: updated.length, totalCents });
  },
);

export default router;
