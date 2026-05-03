/**
 * Reservations — RSVP / hold-the-spot flow.
 *
 *   POST   /api/reservations                 — create (auth required; user OR
 *                                              venue staff creating walk-in)
 *   GET    /api/reservations/mine            — caller's own reservations
 *   GET    /api/venues/:venueId/reservations — venue queue
 *                                              (venue_owner/manager scoped to
 *                                              their own venueId)
 *   PATCH  /api/reservations/:id/status      — accept / reject / mark fulfilled
 *                                              / mark no-show (venue staff)
 *
 * SECURITY: like products POST, venueId on create is forced server-side for
 * venue_owner / manager (their own venue). Customers may target any venueId
 * (they're guests on the platform). The PATCH route verifies the reviewer
 * actually owns the venue before mutating.
 */

import { Router, type IRouter, type Response } from "express";
import { and, eq, desc }                       from "drizzle-orm";
import { db, reservationsTable }               from "@workspace/db";
import {
  RESERVATION_STATUSES, RESERVATION_PAYMENT_MODES,
  type ReservationStatus, type ReservationPaymentMode,
} from "@workspace/db";
import { requireAuth, type AuthRequest }       from "../middleware/auth";
import { requireRole }                         from "../middleware/roles";
import { allowOnly }                           from "../middleware/sanitize";

const router: IRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Staff state machine. Pending may be accepted/rejected/cancelled. Accepted
 * may be fulfilled/no_show/cancelled. All others are terminal.
 */
const STAFF_TRANSITIONS: Record<ReservationStatus, readonly ReservationStatus[]> = {
  pending:   ["accepted", "rejected", "cancelled"],
  accepted:  ["fulfilled", "no_show", "cancelled"],
  rejected:  [],
  cancelled: [],
  fulfilled: [],
  no_show:   [],
};

const VENUE_STAFF_ROLES = ["venue_owner", "manager", "staff"] as const;

// ── POST /api/reservations ────────────────────────────────────────────────────

router.post(
  "/",
  requireAuth,
  allowOnly(
    "venueId", "productId", "productName", "guestName", "guestPhone",
    "partySize", "requestedAt", "paymentMode", "depositCents", "notes",
  ),
  async (req: AuthRequest, res: Response) => {
    const {
      venueId, productId, productName, guestName, guestPhone,
      partySize, requestedAt, paymentMode, depositCents, notes,
    } = req.body as {
      venueId?:     string;
      productId?:   string;
      productName?: string;
      guestName?:   string;
      guestPhone?:  string;
      partySize?:   number;
      requestedAt?: string;
      paymentMode?: string;
      depositCents?: number;
      notes?:       string;
    };

    // ── Venue binding ─────────────────────────────────────────────────────────
    // Venue staff (venue_owner/manager/staff) can only create reservations on
    // their own venue — forced from the JWT, client value ignored. Customers
    // may target any venueId.
    const role = req.user?.role ?? "";
    const isVenueStaff = (VENUE_STAFF_ROLES as readonly string[]).includes(role);

    let effectiveVenueId: string;
    if (isVenueStaff) {
      const callerVenueId = req.user?.venueId ?? null;
      if (!callerVenueId) {
        res.status(403).json({ error: "Your account is not linked to a venue; cannot create reservations" });
        return;
      }
      effectiveVenueId = callerVenueId;
    } else {
      if (!venueId || !UUID_RE.test(venueId)) {
        res.status(400).json({ error: '"venueId" is required and must be a UUID' });
        return;
      }
      effectiveVenueId = venueId;
    }

    // ── Validation ────────────────────────────────────────────────────────────
    if (!requestedAt || typeof requestedAt !== "string") {
      res.status(400).json({ error: '"requestedAt" is required (ISO 8601 timestamp)' }); return;
    }
    const requestedAtDate = new Date(requestedAt);
    if (Number.isNaN(requestedAtDate.getTime())) {
      res.status(400).json({ error: '"requestedAt" must be a valid ISO 8601 timestamp' }); return;
    }
    if (requestedAtDate.getTime() < Date.now() - 60_000) {
      res.status(400).json({ error: '"requestedAt" must be in the future' }); return;
    }

    const party = partySize ?? 2;
    if (!Number.isInteger(party) || party < 1 || party > 50) {
      res.status(400).json({ error: '"partySize" must be an integer between 1 and 50' }); return;
    }

    // Strict contract: unknown paymentMode is rejected (not silently coerced).
    let mode: ReservationPaymentMode = "none";
    if (paymentMode !== undefined) {
      if (typeof paymentMode !== "string" || !(RESERVATION_PAYMENT_MODES as readonly string[]).includes(paymentMode)) {
        res.status(400).json({ error: `"paymentMode" must be one of: ${RESERVATION_PAYMENT_MODES.join(", ")}` });
        return;
      }
      mode = paymentMode as ReservationPaymentMode;
    }

    let effectiveDepositCents: number | null = null;
    if (mode === "deposit") {
      if (typeof depositCents !== "number" || !Number.isInteger(depositCents) || depositCents < 100) {
        res.status(400).json({ error: '"depositCents" must be an integer ≥ 100 when paymentMode = "deposit"' });
        return;
      }
      effectiveDepositCents = depositCents;
    }

    // For walk-ins (staff creating on behalf of a guest with no account)
    // we leave userId null and require a guestName for traceability.
    const isWalkIn = isVenueStaff && (!!guestName || !!guestPhone);
    const effectiveUserId = isWalkIn ? null : (req.user?.id ?? null);

    if (!effectiveUserId && !guestName?.trim()) {
      res.status(400).json({ error: 'Either an authenticated user or "guestName" is required' });
      return;
    }

    const [inserted] = await db
      .insert(reservationsTable)
      .values({
        userId:      effectiveUserId,
        venueId:     effectiveVenueId,
        productId:   productId   ?? null,
        productName: productName ?? null,
        guestName:   guestName?.trim() || null,
        guestPhone:  guestPhone?.trim() || null,
        partySize:   party,
        requestedAt: requestedAtDate,
        paymentMode: mode,
        depositCents: effectiveDepositCents,
        notes:       notes?.trim() || null,
        status:      "pending",
      })
      .returning();

    req.log.info(
      { reservationId: inserted.id, venueId: effectiveVenueId, paymentMode: mode },
      "reservation created",
    );
    res.status(201).json(inserted);
  },
);

// ── GET /api/reservations/mine ────────────────────────────────────────────────

router.get(
  "/mine",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ error: "Authentication required" }); return; }

    const rows = await db
      .select()
      .from(reservationsTable)
      .where(eq(reservationsTable.userId, userId))
      .orderBy(desc(reservationsTable.requestedAt));

    res.json({ reservations: rows });
  },
);

// ── GET /api/venues/:venueId/reservations ─────────────────────────────────────

router.get(
  "/venue/:venueId",
  requireAuth,
  requireRole("venue_owner", "manager", "staff", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const venueId = String(req.params["venueId"] ?? "");
    if (!venueId || !UUID_RE.test(venueId)) {
      res.status(400).json({ error: "Invalid venueId" }); return;
    }

    // Tenant scoping: non-super_admin staff may only read their own venue.
    if (req.user?.role !== "super_admin" && req.user?.venueId !== venueId) {
      res.status(403).json({ error: "You can only view reservations for your own venue" });
      return;
    }

    const statusFilter = typeof req.query["status"] === "string" ? req.query["status"] : null;
    const conditions = [eq(reservationsTable.venueId, venueId)];
    if (statusFilter && (RESERVATION_STATUSES as readonly string[]).includes(statusFilter)) {
      conditions.push(eq(reservationsTable.status, statusFilter as ReservationStatus));
    }

    const rows = await db
      .select()
      .from(reservationsTable)
      .where(and(...conditions))
      .orderBy(desc(reservationsTable.requestedAt));

    res.json({ reservations: rows });
  },
);

// ── PATCH /api/reservations/:id/status ────────────────────────────────────────

router.patch(
  "/:id/status",
  requireAuth,
  requireRole("venue_owner", "manager", "staff", "super_admin"),
  allowOnly("status"),
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params["id"] ?? "");
    if (!id || !UUID_RE.test(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const { status } = req.body as { status?: string };
    if (!status || !(RESERVATION_STATUSES as readonly string[]).includes(status)) {
      res.status(400).json({ error: `"status" must be one of: ${RESERVATION_STATUSES.join(", ")}` });
      return;
    }
    const nextStatus = status as ReservationStatus;

    const [existing] = await db.select().from(reservationsTable).where(eq(reservationsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Reservation not found" }); return; }

    // Tenant scoping
    if (req.user?.role !== "super_admin" && req.user?.venueId !== existing.venueId) {
      res.status(403).json({ error: "You can only modify reservations for your own venue" });
      return;
    }

    const allowed = STAFF_TRANSITIONS[existing.status];
    if (!allowed.includes(nextStatus)) {
      res.status(409).json({
        error: `Cannot transition from "${existing.status}" to "${nextStatus}"`,
        allowed,
      });
      return;
    }

    // ── Atomic conditional update — guards against TOCTOU/race conditions ────
    // Two concurrent staff actions could both pass the check above based on
    // the same `existing.status` snapshot. Constraining the UPDATE to the
    // expected current status ensures only one wins; the loser sees 409.
    const updatedRows = await db
      .update(reservationsTable)
      .set({
        status:     nextStatus,
        reviewedBy: req.user?.id ?? null,
        reviewedAt: new Date(),
      })
      .where(and(
        eq(reservationsTable.id, id),
        eq(reservationsTable.status, existing.status),
      ))
      .returning();

    if (updatedRows.length === 0) {
      // Another writer raced ahead and changed the status before us.
      const [fresh] = await db.select().from(reservationsTable).where(eq(reservationsTable.id, id)).limit(1);
      res.status(409).json({
        error: "Reservation status changed concurrently; please refresh and retry",
        currentStatus: fresh?.status ?? null,
      });
      return;
    }

    const updated = updatedRows[0];
    req.log.info(
      { reservationId: id, from: existing.status, to: nextStatus, by: req.user?.id },
      "reservation status changed",
    );
    res.json(updated);
  },
);

export default router;
