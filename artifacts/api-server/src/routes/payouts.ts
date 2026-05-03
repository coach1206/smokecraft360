/**
 * Payouts — venue-initiated payout requests + super_admin approval.
 *
 *   POST /api/payouts/request          — venue_owner/manager creates a request
 *   GET  /api/payouts                  — list (filters by venueId for non-admins)
 *   POST /api/payouts/:id/approve      — super_admin marks approved
 *   POST /api/payouts/:id/mark-paid    — super_admin marks paid (after wire/Stripe Connect transfer)
 *   POST /api/payouts/:id/reject       — super_admin rejects
 *
 * Minimum payout: $50.00 (5000 cents).
 * Stripe Connect transfer dispatch is intentionally NOT implemented here —
 * approval today, transfer-of-money tomorrow when venues are KYC'd.
 */

import { Router, type IRouter, type Response } from "express";
import { and, eq, sql }                        from "drizzle-orm";
import {
  db,
  payoutRequestsTable,
  commissionsTable,
}                                               from "@workspace/db";
import { requireAuth, type AuthRequest }        from "../middleware/auth";
import { requireRole }                          from "../middleware/roles";
import { allowOnly }                            from "../middleware/sanitize";
import { logAudit }                             from "../lib/audit";

const router: IRouter = Router();

const MIN_PAYOUT_CENTS = 5_000;

// ── POST /api/payouts/request ─────────────────────────────────────────────────

router.post(
  "/request",
  requireAuth,
  requireRole("venue_owner", "manager"),
  allowOnly("amountCents", "notes"),
  async (req: AuthRequest, res: Response) => {
    const venueId = req.user?.venueId;
    if (!venueId) {
      res.status(400).json({ error: "User is not associated with a venue" });
      return;
    }

    const amountCents = Number(req.body?.amountCents);
    const notes       = typeof req.body?.notes === "string" ? req.body.notes : null;

    if (!Number.isFinite(amountCents) || amountCents < MIN_PAYOUT_CENTS) {
      res.status(400).json({
        error:    `Minimum payout is $${(MIN_PAYOUT_CENTS / 100).toFixed(2)}`,
        minCents: MIN_PAYOUT_CENTS,
      });
      return;
    }

    // Available balance = venue's gross earnings (paid orders) minus platform commission
    // minus already-requested-or-paid amounts.
    const [bal] = (await db.execute<{ available: string }>(sql`
      WITH paid AS (
        SELECT
          COALESCE(SUM(c.gross_amount_cents), 0)::int AS gross,
          COALESCE(SUM(c.amount_cents),       0)::int AS commission
        FROM commissions c
        WHERE c.venue_id = ${venueId}
      ),
      reserved AS (
        SELECT COALESCE(SUM(amount_cents), 0)::int AS used
        FROM payout_requests
        WHERE venue_id = ${venueId}
          AND status IN ('pending', 'approved', 'paid')
      )
      SELECT (paid.gross - paid.commission - reserved.used)::text AS available
      FROM paid, reserved
    `)).rows;
    const available = bal ? Number(bal.available) : 0;

    if (amountCents > available) {
      res.status(400).json({
        error:           "Requested amount exceeds available balance",
        availableCents:  available,
      });
      return;
    }

    const [created] = await db
      .insert(payoutRequestsTable)
      .values({
        venueId,
        amountCents,
        currency:    "usd",
        status:      "pending",
        requestedBy: req.user!.id,
        notes,
      })
      .returning();

    req.log.info({ payoutId: created!.id, venueId, amountCents }, "Payout requested");
    res.status(201).json(created);
  },
);

// ── GET /api/payouts ──────────────────────────────────────────────────────────

router.get(
  "/",
  requireAuth,
  requireRole("venue_owner", "manager"),
  async (req: AuthRequest, res: Response) => {
    const isAdmin       = req.user?.role === "super_admin";
    const filterVenueId = isAdmin && typeof req.query["venueId"] === "string"
      ? req.query["venueId"]
      : req.user?.venueId;

    const where = filterVenueId ? eq(payoutRequestsTable.venueId, filterVenueId) : undefined;

    const rows = await db
      .select()
      .from(payoutRequestsTable)
      .where(where)
      .orderBy(sql`${payoutRequestsTable.createdAt} desc`)
      .limit(200);

    res.json({ payoutRequests: rows });
  },
);

// ── helper: status transition by super_admin ──────────────────────────────────

async function transition(
  req: AuthRequest, res: Response,
  to: "approved" | "paid" | "rejected",
  fromAllowed: ("pending" | "approved")[],
) {
  const id: string = String(req.params["id"] ?? "");
  if (!id) { res.status(400).json({ error: "Payout id is required" }); return; }

  const [existing] = await db.select().from(payoutRequestsTable).where(eq(payoutRequestsTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Payout request not found" }); return; }
  if (!fromAllowed.includes(existing.status as "pending" | "approved")) {
    res.status(409).json({ error: `Cannot transition from ${existing.status} to ${to}` });
    return;
  }

  const patch: Partial<typeof payoutRequestsTable.$inferInsert> = { status: to };
  if (to === "approved") { patch.approvedBy = req.user!.id; patch.approvedAt = new Date(); }
  if (to === "paid")     { patch.paidAt     = new Date(); }

  // When marking paid, mark the venue's oldest pending commissions as paid,
  // FIFO, only up to this payout's amount (not all pending — that would wipe
  // unrelated balance the venue hasn't requested yet).
  if (to === "paid") {
    let remaining = existing.amountCents;
    const pending = await db
      .select({ id: commissionsTable.id, amount: commissionsTable.amountCents })
      .from(commissionsTable)
      .where(and(eq(commissionsTable.venueId, existing.venueId), eq(commissionsTable.status, "pending")))
      .orderBy(commissionsTable.createdAt);

    for (const c of pending) {
      if (remaining <= 0) break;
      if (c.amount <= remaining) {
        await db.update(commissionsTable)
          .set({ status: "paid", paidAt: new Date() })
          .where(eq(commissionsTable.id, c.id));
        remaining -= c.amount;
      }
    }
  }

  const [updated] = await db
    .update(payoutRequestsTable)
    .set(patch)
    .where(eq(payoutRequestsTable.id, id))
    .returning();

  await logAudit(req, {
    action:     `payout.${to}`,
    entityType: "payout_request",
    entityId:   id,
    before:     { status: existing.status, amountCents: existing.amountCents },
    after:      { status: to, amountCents: existing.amountCents },
    venueId:    existing.venueId,
  });

  req.log.info({ payoutId: id, to, by: req.user?.id }, "Payout status updated");
  res.json(updated);
}

router.post("/:id/approve",   requireAuth, requireRole(),
  (req, res) => transition(req as AuthRequest, res, "approved", ["pending"]));

router.post("/:id/mark-paid", requireAuth, requireRole(),
  (req, res) => transition(req as AuthRequest, res, "paid",     ["approved"]));

router.post("/:id/reject",    requireAuth, requireRole(),
  (req, res) => transition(req as AuthRequest, res, "rejected", ["pending"]));

export default router;
