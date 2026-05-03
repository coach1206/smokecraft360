/**
 * Support tickets — Help Center Slice 1.
 *
 *   POST   /api/support-tickets              — open a ticket (venue staff)
 *   GET    /api/support-tickets              — list (own venue, or super_admin → all)
 *   GET    /api/support-tickets/:id          — single ticket (owner-gated)
 *   PATCH  /api/support-tickets/:id/status   — transition status
 *   PATCH  /api/support-tickets/:id/assign   — super_admin assignment
 *
 * Slice 2 (next turn): support_ticket_messages thread + POST/GET messages.
 *
 * Patterns reused (architect-baked across G3/G4/G5/G6):
 *   - Atomic per-venue cap inside INSERT  (G4 voice queue, G3 memories)
 *   - Owner-gated atomic UPDATE → 404      (G3, G5 notifications)
 *   - Super_admin venueId-override on read (G6 audit log)
 *   - Keyset (createdAt DESC, id DESC) µs-cursor pagination (G6 audit log)
 *   - Per-write limiter                    (G3, G5)
 *
 * Tenant scope:
 *   - venue_owner / manager / staff: implicit own-venue scope; ?venueId is
 *     silently ignored (never trusted from a tenanted caller).
 *   - super_admin: may pass ?venueId=… to scope; without it, sees all venues.
 *   - All other roles (customer, brand_partner) get 403 — Help Center is for
 *     venue staff, not shoppers.
 */

import { Router, type IRouter, type Response }     from "express";
import { and, desc, eq, lt, or, sql }              from "drizzle-orm";
import {
  db,
  supportTicketsTable,
  usersTable,
  notificationsTable,
  SUPPORT_TICKET_STATUSES,
  type SupportTicketStatus,
}                                                   from "@workspace/db";
import { requireAuth, type AuthRequest }            from "../middleware/auth";
import { requireRole }                              from "../middleware/roles";
import { supportTicketWriteLimiter }                from "../middleware/rateLimit";
import { z }                                        from "zod";

const router: IRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// µs-precision ISO produced by Postgres `to_char(... 'YYYY-MM-DDTHH24:MI:SS.US')`.
// Same shape as G6 audit-log cursor — Date.toISOString() would truncate to ms
// and let same-millisecond rows skip the keyset.
const TS_US_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{1,6}$/;

const MAX_OPEN_PER_VENUE = 50;
const DEFAULT_LIMIT      = 50;
const MAX_LIMIT          = 200;
const SUBJECT_MAX        = 200;
const BODY_MAX           = 5000;

const VENUE_ROLES   = ["venue_owner", "manager", "staff"] as const;
const ALLOWED_ROLES = [...VENUE_ROLES, "super_admin"] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function paramId(req: AuthRequest, res: Response): string | null {
  const id = String(req.params.id ?? "");
  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: "Invalid ticket id" });
    return null;
  }
  return id;
}

/** Tenanted caller MUST have a venueId. super_admin may have none. */
function requireVenueForTenanted(req: AuthRequest, res: Response): string | null {
  const venueId = req.user?.venueId ?? null;
  if (!venueId) {
    res.status(403).json({ error: "Caller has no venue context" });
    return null;
  }
  return venueId;
}

function parseCursor(raw: unknown): { ts: string; id: string } | null {
  if (typeof raw !== "string" || raw.length === 0) return null;
  const idx = raw.lastIndexOf("_");
  if (idx <= 0) return null;
  const tsPart = raw.slice(0, idx);
  const idPart = raw.slice(idx + 1);
  if (!UUID_RE.test(idPart)) return null;
  if (!TS_US_RE.test(tsPart)) return null;
  return { ts: tsPart, id: idPart };
}

// ── POST /api/support-tickets ────────────────────────────────────────────────

const openSchema = z.object({
  subject:  z.string().trim().min(1).max(SUBJECT_MAX),
  body:     z.string().trim().min(1).max(BODY_MAX),
  priority: z.enum(["low", "normal", "high"]).optional(),
});

router.post(
  "/",
  supportTicketWriteLimiter,
  requireAuth,
  requireRole(...VENUE_ROLES),
  async (req: AuthRequest, res: Response) => {
    const parse = openSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid ticket payload", issues: parse.error.issues });
      return;
    }
    // venueId comes from session ONLY — never accepted from body. A tenanted
    // staff user without a venueId is a misconfiguration; reject explicitly
    // rather than silently bucket into NULL (architect HIGH from G4).
    const venueId = requireVenueForTenanted(req, res);
    if (!venueId) return;

    const userId  = req.user!.id;
    const subject = parse.data.subject;
    const body    = parse.data.body;
    const prio    = parse.data.priority ?? "normal";

    // Atomic capped INSERT. Cap counts only OPEN/IN_PROGRESS rows for this
    // venue (resolved/closed don't crowd the queue). 0 rows → 429.
    const result = await db.execute(sql`
      INSERT INTO support_tickets (venue_id, opened_by, subject, body, priority)
      SELECT ${venueId}::uuid,
             ${userId}::uuid,
             ${subject},
             ${body},
             ${prio}::support_ticket_priority
      WHERE (
        SELECT COUNT(*) FROM support_tickets
         WHERE venue_id = ${venueId}::uuid
           AND status IN ('open', 'in_progress')
      ) < ${MAX_OPEN_PER_VENUE}
      RETURNING id, venue_id    AS "venueId",
                opened_by      AS "openedBy",
                subject, body, status, priority,
                assigned_to    AS "assignedTo",
                created_at     AS "createdAt",
                updated_at     AS "updatedAt",
                resolved_at    AS "resolvedAt"
    `) as { rows: Array<unknown> };

    if (!result.rows || result.rows.length === 0) {
      res.status(429).json({
        error:                "Support ticket cap reached for this venue — please resolve open tickets first",
        capOpenPerVenue:      MAX_OPEN_PER_VENUE,
      });
      return;
    }
    res.status(201).json(result.rows[0]);
  },
);

// ── GET /api/support-tickets ─────────────────────────────────────────────────

router.get(
  "/",
  requireAuth,
  requireRole(...ALLOWED_ROLES),
  async (req: AuthRequest, res: Response) => {
    const isSuper = req.user!.role === "super_admin";

    // Tenant scope. Non-super forced to own venueId; ?venueId is silently
    // ignored (G6 pattern). super_admin may pass ?venueId or omit for global.
    let scope: string | null = null;
    if (isSuper) {
      const v = typeof req.query.venueId === "string" ? req.query.venueId : null;
      scope = v && UUID_RE.test(v) ? v : null;
    } else {
      scope = req.user!.venueId ?? null;
      if (!scope) {
        res.status(403).json({ error: "Caller has no venue context" });
        return;
      }
    }

    // Filters.
    const conds = [];
    if (scope) conds.push(eq(supportTicketsTable.venueId, scope));

    if (typeof req.query.status === "string") {
      if (!(SUPPORT_TICKET_STATUSES as readonly string[]).includes(req.query.status)) {
        res.status(400).json({ error: "Invalid status filter" });
        return;
      }
      conds.push(eq(supportTicketsTable.status, req.query.status as SupportTicketStatus));
    }
    if (typeof req.query.assignedTo === "string") {
      if (!UUID_RE.test(req.query.assignedTo)) {
        res.status(400).json({ error: "Invalid assignedTo filter" });
        return;
      }
      // Only super_admin may filter by assignment (it's a super-only field).
      // For tenanted callers, silently ignore rather than 403 — they only
      // see their own venue anyway.
      if (isSuper) {
        conds.push(eq(supportTicketsTable.assignedTo, req.query.assignedTo));
      }
    }

    let limit = DEFAULT_LIMIT;
    if (typeof req.query.limit === "string") {
      const n = Number.parseInt(req.query.limit, 10);
      if (Number.isFinite(n) && n > 0) limit = Math.min(n, MAX_LIMIT);
    }

    // Keyset cursor: same µs round-trip as G6 (createdAt DESC, id DESC).
    const cur = parseCursor(req.query.cursor);
    if (cur) {
      conds.push(
        or(
          sql`${supportTicketsTable.createdAt} < ${cur.ts}::timestamp`,
          and(
            sql`${supportTicketsTable.createdAt} = ${cur.ts}::timestamp`,
            lt(supportTicketsTable.id, cur.id),
          ),
        )!,
      );
    }

    // Internal cursorTs alias (µs precision) is stripped from the response.
    const rows = await db
      .select({
        id:         supportTicketsTable.id,
        venueId:    supportTicketsTable.venueId,
        openedBy:   supportTicketsTable.openedBy,
        subject:    supportTicketsTable.subject,
        body:       supportTicketsTable.body,
        status:     supportTicketsTable.status,
        priority:   supportTicketsTable.priority,
        assignedTo: supportTicketsTable.assignedTo,
        createdAt:  supportTicketsTable.createdAt,
        updatedAt:  supportTicketsTable.updatedAt,
        resolvedAt: supportTicketsTable.resolvedAt,
        cursorTs:   sql<string>`to_char(${supportTicketsTable.createdAt}, 'YYYY-MM-DD"T"HH24:MI:SS.US')`,
      })
      .from(supportTicketsTable)
      .where(and(...conds))
      .orderBy(desc(supportTicketsTable.createdAt), desc(supportTicketsTable.id))
      .limit(limit + 1);

    let nextCursor: string | null = null;
    let sliced = rows;
    if (rows.length > limit) {
      sliced = rows.slice(0, limit);
      const last = sliced[sliced.length - 1]!;
      nextCursor = `${last.cursorTs}_${last.id}`;
    }
    const tickets = sliced.map(({ cursorTs: _cursorTs, ...rest }) => rest);
    res.json({ tickets, nextCursor });
  },
);

// ── GET /api/support-tickets/:id ─────────────────────────────────────────────

router.get(
  "/:id",
  requireAuth,
  requireRole(...ALLOWED_ROLES),
  async (req: AuthRequest, res: Response) => {
    const id = paramId(req, res);
    if (!id) return;

    const isSuper = req.user!.role === "super_admin";
    const conds   = [eq(supportTicketsTable.id, id)];
    if (!isSuper) {
      const venueId = req.user!.venueId ?? null;
      if (!venueId) {
        res.status(403).json({ error: "Caller has no venue context" });
        return;
      }
      conds.push(eq(supportTicketsTable.venueId, venueId));
    }

    const rows = await db
      .select()
      .from(supportTicketsTable)
      .where(and(...conds))
      .limit(1);

    if (rows.length === 0) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }
    res.json(rows[0]);
  },
);

// ── PATCH /api/support-tickets/:id/status ────────────────────────────────────

const statusSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
});

// Venue-side allowed transitions: only own-ticket open ↔ closed (close own
// or reopen own). Anything else is a super-only operation.
const VENUE_ALLOWED_STATUSES: ReadonlySet<SupportTicketStatus> = new Set(["open", "closed"]);

router.patch(
  "/:id/status",
  supportTicketWriteLimiter,
  requireAuth,
  requireRole(...ALLOWED_ROLES),
  async (req: AuthRequest, res: Response) => {
    const id = paramId(req, res);
    if (!id) return;

    const parse = statusSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid status", issues: parse.error.issues });
      return;
    }
    const newStatus = parse.data.status;
    const isSuper   = req.user!.role === "super_admin";

    // Venue-side guardrail: only open ↔ closed permitted.
    if (!isSuper && !VENUE_ALLOWED_STATUSES.has(newStatus)) {
      res.status(403).json({
        error: "Only super_admin may set in_progress / resolved",
      });
      return;
    }

    // resolved_at: stamp on transition INTO resolved, clear on transition OUT.
    // Super-only states (in_progress, resolved) clear resolved_at when
    // moving back to open/in_progress, so the timestamp reflects the most
    // recent resolution accurately.
    const resolvedAtSql =
      newStatus === "resolved" ? sql`now()` : sql`NULL`;

    // Owner-gated atomic UPDATE. Wrong tenant or unknown id ⇒ 404 (G3/G5
    // pattern; never leak existence across tenants).
    const conds = [eq(supportTicketsTable.id, id)];
    if (!isSuper) {
      const venueId = req.user!.venueId ?? null;
      if (!venueId) {
        res.status(403).json({ error: "Caller has no venue context" });
        return;
      }
      conds.push(eq(supportTicketsTable.venueId, venueId));
    }

    const updated = await db
      .update(supportTicketsTable)
      .set({
        status:     newStatus,
        updatedAt:  new Date(),
        resolvedAt: sql`${resolvedAtSql}` as unknown as Date,
      })
      .where(and(...conds))
      .returning({
        id:         supportTicketsTable.id,
        venueId:    supportTicketsTable.venueId,
        status:     supportTicketsTable.status,
        updatedAt:  supportTicketsTable.updatedAt,
        resolvedAt: supportTicketsTable.resolvedAt,
      });

    if (updated.length === 0) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }
    const row = updated[0]!;

    // Slice 2 — fan-out: when a super_admin moves a ticket FORWARD
    // (in_progress / resolved / closed), drop a notification on the
    // ticket's venue inbox so the opener / venue_owner sees it. We
    // intentionally don't fan-out:
    //   - venue-side toggles (open ↔ closed by the venue itself) —
    //     that would just notify the venue about its own action.
    //   - super-admin REGRESSIONS back to `open` (e.g. reopening a
    //     closed ticket for re-triage) — that's an internal queue
    //     operation, not a customer-facing transition. Notifying the
    //     venue "your ticket is open" after they already saw the
    //     in_progress / resolved notif would just be noise.
    // Failure to write the notification must NOT roll back the status
    // change, so swallow & log only.
    const FORWARD_STATUSES: ReadonlySet<SupportTicketStatus> = new Set([
      "in_progress",
      "resolved",
      "closed",
    ]);
    if (isSuper && FORWARD_STATUSES.has(newStatus)) {
      try {
        await db.insert(notificationsTable).values({
          venueId:  row.venueId,
          channel:  "in_app",
          title:    `Support ticket ${newStatus}`,
          message:  `Your support ticket was marked ${newStatus} by support staff.`,
          category: `support_ticket_${newStatus}`,
        });
      } catch (err) {
        req.log?.warn?.({ err, ticketId: row.id }, "support-ticket fan-out failed");
      }
    }

    // Strip venueId from response — clients already know the scope; this
    // keeps the PATCH response shape minimal (id/status/updatedAt/resolvedAt).
    const { venueId: _venueId, ...rest } = row;
    res.json(rest);
  },
);

// ── PATCH /api/support-tickets/:id/assign ────────────────────────────────────

const assignSchema = z.object({
  // null = unassign. Otherwise must be a UUID belonging to a super_admin user.
  assignedTo: z.string().regex(UUID_RE).nullable(),
});

router.patch(
  "/:id/assign",
  supportTicketWriteLimiter,
  requireAuth,
  requireRole("super_admin"),
  async (req: AuthRequest, res: Response) => {
    const id = paramId(req, res);
    if (!id) return;

    const parse = assignSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid assignment payload", issues: parse.error.issues });
      return;
    }
    const target = parse.data.assignedTo;

    // Validate the target is itself a super_admin (we don't want to assign
    // to a venue user who has no super-only PATCH access). null = unassign,
    // skip the lookup.
    if (target !== null) {
      const targetUser = await db
        .select({ role: usersTable.role })
        .from(usersTable)
        .where(eq(usersTable.id, target))
        .limit(1);
      if (targetUser.length === 0 || targetUser[0]!.role !== "super_admin") {
        res.status(400).json({ error: "assignedTo must reference a super_admin user" });
        return;
      }
    }

    const updated = await db
      .update(supportTicketsTable)
      .set({ assignedTo: target, updatedAt: new Date() })
      .where(eq(supportTicketsTable.id, id))
      .returning({
        id:         supportTicketsTable.id,
        assignedTo: supportTicketsTable.assignedTo,
        updatedAt:  supportTicketsTable.updatedAt,
      });

    if (updated.length === 0) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }
    res.json(updated[0]);
  },
);

export default router;
