/**
 * GET /api/os/financials — read view over orders + commissions.
 *
 *   ?venueId=&status=&from=&to=&limit=  (limit ≤ 1000, default 100)
 *
 * No parallel GLOBAL_FINANCIALS table — orders.stripe_payment_intent_id is
 * already UNIQUE and webhook writes are already idempotent at
 * stripeWebhook.ts:127. This endpoint just exposes the existing data with
 * operator-friendly filters. super_admin only.
 */
import { Router, type IRouter, type Response } from "express";
import { and, eq, gte, lte, desc, sql }        from "drizzle-orm";
import { db, ordersTable, commissionsTable }   from "@workspace/db";
import { requireAuth, type AuthRequest }       from "../middleware/auth";
import { requireRole }                         from "../middleware/roles";

const router: IRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LIMIT = 1000;

function parseDate(v: unknown): Date | null {
  if (typeof v !== "string") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

router.get(
  "/financials",
  requireAuth,
  requireRole("super_admin"),
  async (req: AuthRequest, res: Response) => {
    const q = req.query;

    const venueId = typeof q["venueId"] === "string" && UUID_RE.test(q["venueId"]) ? q["venueId"] : null;
    const status  = typeof q["status"]  === "string" ? q["status"] : null;
    const from    = parseDate(q["from"]);
    const to      = parseDate(q["to"]);
    const limit   = Math.min(
      MAX_LIMIT,
      Math.max(1, Number.parseInt(typeof q["limit"] === "string" ? q["limit"] : "100", 10) || 100),
    );

    const conds = [];
    if (venueId) conds.push(eq(ordersTable.venueId, venueId));
    if (status)  conds.push(sql`${ordersTable.status} = ${status}`);
    if (from)    conds.push(gte(ordersTable.createdAt, from));
    if (to)      conds.push(lte(ordersTable.createdAt, to));

    const rows = await db
      .select({
        orderId:               ordersTable.id,
        venueId:               ordersTable.venueId,
        status:                ordersTable.status,
        amountCents:           ordersTable.expectedAmountCents,
        fundsStatus:           ordersTable.fundsStatus,
        stripePaymentIntentId: ordersTable.stripePaymentIntentId,
        createdAt:             ordersTable.createdAt,
      })
      .from(ordersTable)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(ordersTable.createdAt))
      .limit(limit);

    // Aggregate commission totals over the same filter window for a quick summary.
    const commConds = [];
    if (venueId) commConds.push(eq(commissionsTable.venueId, venueId));
    if (from)    commConds.push(gte(commissionsTable.createdAt, from));
    if (to)      commConds.push(lte(commissionsTable.createdAt, to));

    const [summary] = await db
      .select({
        commissionGrossCents: sql<number>`coalesce(sum(${commissionsTable.grossAmountCents}), 0)::int`,
        commissionNetCents:   sql<number>`coalesce(sum(${commissionsTable.amountCents}), 0)::int`,
        commissionCount:      sql<number>`count(*)::int`,
      })
      .from(commissionsTable)
      .where(commConds.length ? and(...commConds) : undefined);

    res.json({
      generatedAt: new Date().toISOString(),
      filters:     { venueId, status, from, to, limit },
      count:       rows.length,
      summary,
      orders:      rows,
    });
  },
);

export default router;
