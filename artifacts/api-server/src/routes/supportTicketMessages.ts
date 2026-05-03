/**
 * Support ticket messages — Help Center Slice 2.
 *
 *   POST  /api/support-tickets/:ticketId/messages   — append a message
 *   GET   /api/support-tickets/:ticketId/messages   — paginated thread
 *
 * Auth + tenant scope is inherited from the PARENT ticket: a caller may
 * read/write the thread iff they could read the ticket itself (cross-tenant
 * → 404, no existence leak — same G3/G5/G6 pattern).
 *
 * Append-only: there is no PATCH or DELETE for messages. Once posted, the
 * row is permanent (it's part of the support audit trail). Architectural
 * decisions like "let openers edit their last message within 60s" are
 * deliberately out of scope for this slice.
 *
 * Per-ticket cap of 200 messages is enforced atomically inside the INSERT
 * (G4 pattern — race-free without explicit transactions).
 *
 * Pagination: thread is returned oldest-first to match natural chat
 * reading order. Keyset cursor on (createdAt ASC, id ASC) with µs
 * precision (G6 pattern reused) — same-microsecond rows tie-break on id.
 */

import { Router, type IRouter, type Response } from "express";
import { and, asc, eq, gt, or, sql } from "drizzle-orm";
import {
  db,
  supportTicketsTable,
  supportTicketMessagesTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { supportTicketWriteLimiter } from "../middleware/rateLimit";
import { z } from "zod";

const router: IRouter = Router({ mergeParams: true });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TS_US_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{1,6}$/;

const MAX_MESSAGES_PER_TICKET = 200;
const DEFAULT_LIMIT           = 50;
const MAX_LIMIT               = 200;
const BODY_MAX                = 5000;

const VENUE_ROLES   = ["venue_owner", "manager", "staff"] as const;
const ALLOWED_ROLES = [...VENUE_ROLES, "super_admin"] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function paramTicketId(req: AuthRequest, res: Response): string | null {
  const id = String(req.params.ticketId ?? "");
  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: "Invalid ticket id" });
    return null;
  }
  return id;
}

/**
 * Resolve the ticket the caller is targeting, applying tenant scope.
 * Returns the ticket row on success, or null after writing a 404 response
 * (cross-tenant access and unknown ids both 404 — G3/G5/G6 pattern).
 */
async function resolveTicket(
  req: AuthRequest,
  res: Response,
  ticketId: string,
): Promise<{ id: string; venueId: string } | null> {
  const isSuper = req.user!.role === "super_admin";
  const conds   = [eq(supportTicketsTable.id, ticketId)];
  if (!isSuper) {
    const venueId = req.user!.venueId ?? null;
    if (!venueId) {
      res.status(403).json({ error: "Caller has no venue context" });
      return null;
    }
    conds.push(eq(supportTicketsTable.venueId, venueId));
  }
  const rows = await db
    .select({
      id:      supportTicketsTable.id,
      venueId: supportTicketsTable.venueId,
    })
    .from(supportTicketsTable)
    .where(and(...conds))
    .limit(1);
  if (rows.length === 0) {
    res.status(404).json({ error: "Ticket not found" });
    return null;
  }
  return rows[0]!;
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

// ── POST /api/support-tickets/:ticketId/messages ─────────────────────────────

const postSchema = z.object({
  body: z.string().trim().min(1).max(BODY_MAX),
});

router.post(
  "/",
  supportTicketWriteLimiter,
  requireAuth,
  requireRole(...ALLOWED_ROLES),
  async (req: AuthRequest, res: Response) => {
    const ticketId = paramTicketId(req, res);
    if (!ticketId) return;

    const parse = postSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid message payload", issues: parse.error.issues });
      return;
    }

    const ticket = await resolveTicket(req, res, ticketId);
    if (!ticket) return;

    const authorId = req.user!.id;
    const body     = parse.data.body;

    // Atomic per-ticket cap. Like the per-venue cap on support_tickets,
    // the count subquery runs inside the INSERT predicate so a flood of
    // concurrent posts cannot overrun the cap.
    const result = await db.execute(sql`
      INSERT INTO support_ticket_messages (ticket_id, author_id, body)
      SELECT ${ticketId}::uuid,
             ${authorId}::uuid,
             ${body}
      WHERE (
        SELECT COUNT(*) FROM support_ticket_messages
         WHERE ticket_id = ${ticketId}::uuid
      ) < ${MAX_MESSAGES_PER_TICKET}
      RETURNING id, ticket_id   AS "ticketId",
                author_id      AS "authorId",
                body,
                created_at     AS "createdAt"
    `) as { rows: Array<unknown> };

    if (!result.rows || result.rows.length === 0) {
      res.status(429).json({
        error:                  "Message cap reached for this ticket — please open a new ticket",
        capMessagesPerTicket:   MAX_MESSAGES_PER_TICKET,
      });
      return;
    }

    // Touch the parent ticket's updated_at so list queries surface
    // recently-active threads near the top. Status is unchanged.
    await db
      .update(supportTicketsTable)
      .set({ updatedAt: new Date() })
      .where(eq(supportTicketsTable.id, ticketId));

    res.status(201).json(result.rows[0]);
  },
);

// ── GET /api/support-tickets/:ticketId/messages ──────────────────────────────

router.get(
  "/",
  requireAuth,
  requireRole(...ALLOWED_ROLES),
  async (req: AuthRequest, res: Response) => {
    const ticketId = paramTicketId(req, res);
    if (!ticketId) return;

    const ticket = await resolveTicket(req, res, ticketId);
    if (!ticket) return;

    let limit = DEFAULT_LIMIT;
    if (typeof req.query.limit === "string") {
      const n = Number.parseInt(req.query.limit, 10);
      if (Number.isFinite(n) && n > 0) limit = Math.min(n, MAX_LIMIT);
    }

    const conds = [eq(supportTicketMessagesTable.ticketId, ticketId)];

    // Forward keyset pagination (oldest first). Same µs handling as G6 /
    // tickets list — but ASC, so the predicate flips: rows STRICTLY AFTER
    // the cursor row in (createdAt, id) ascending order.
    const cur = parseCursor(req.query.cursor);
    if (cur) {
      conds.push(
        or(
          sql`${supportTicketMessagesTable.createdAt} > ${cur.ts}::timestamp`,
          and(
            sql`${supportTicketMessagesTable.createdAt} = ${cur.ts}::timestamp`,
            gt(supportTicketMessagesTable.id, cur.id),
          ),
        )!,
      );
    }

    const rows = await db
      .select({
        id:        supportTicketMessagesTable.id,
        ticketId:  supportTicketMessagesTable.ticketId,
        authorId:  supportTicketMessagesTable.authorId,
        body:      supportTicketMessagesTable.body,
        createdAt: supportTicketMessagesTable.createdAt,
        cursorTs:  sql<string>`to_char(${supportTicketMessagesTable.createdAt}, 'YYYY-MM-DD"T"HH24:MI:SS.US')`,
      })
      .from(supportTicketMessagesTable)
      .where(and(...conds))
      .orderBy(asc(supportTicketMessagesTable.createdAt), asc(supportTicketMessagesTable.id))
      .limit(limit + 1);

    let nextCursor: string | null = null;
    let sliced = rows;
    if (rows.length > limit) {
      sliced = rows.slice(0, limit);
      const last = sliced[sliced.length - 1]!;
      nextCursor = `${last.cursorTs}_${last.id}`;
    }
    const messages = sliced.map(({ cursorTs: _cursorTs, ...rest }) => rest);
    res.json({ messages, nextCursor });
  },
);

export default router;
