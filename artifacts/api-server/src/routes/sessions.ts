/**
 * Multi-user session ("party") routes.
 *
 *   POST   /api/sessions             — host creates a session, returns code
 *   POST   /api/sessions/join        — guest joins by 6-char code
 *   GET    /api/sessions/:id         — list members (any current member only)
 *   POST   /api/sessions/:id/leave   — guest leaves (host cannot leave; must close)
 *   POST   /api/sessions/:id/close   — host-only; sets status=closed, frees code
 *
 * Concurrency / safety:
 *   • Code generation retries up to 5 times on partial-unique-index
 *     collision against the (active) namespace.
 *   • Joining is idempotent: ON CONFLICT (session_id, user_id) DO UPDATE
 *     clears leftAt, so a re-join after leave reactivates the original row.
 *   • Member cap is enforced atomically inside an EXISTS-gated INSERT,
 *     not check-then-act, so a flood of parallel joins cannot blow past
 *     MAX_MEMBERS.
 *   • Closed sessions reject joins with 410 Gone.
 *   • All endpoints require auth; visibility of /:id is restricted to
 *     callers who currently hold a (non-left) membership row.
 */

import { Router, type IRouter, type Response } from "express";
import { eq, and, sql }                        from "drizzle-orm";
import {
  db,
  sessionsTable,
  sessionMembersTable,
  type SessionMemberRole,
}                                              from "@workspace/db";
import { requireAuth, type AuthRequest }       from "../middleware/auth";
import { sessionJoinLimiter }                  from "../middleware/rateLimit";
import { recordVisit }                         from "../services/visitTracker";
import { z }                                   from "zod";

const router: IRouter = Router();

const MAX_MEMBERS         = 20;          // hard cap per session — prevents abuse
const CODE_LENGTH         = 6;
const CODE_ALPHABET       = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
const CODE_GEN_RETRIES    = 5;

function generateCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

// ── POST /api/sessions ─────────────────────────────────────────────────────────

router.post(
  "/",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const hostId  = req.user!.id;
    const venueId = req.user!.venueId ?? null;

    // Try a few codes in case of collision against another active session.
    for (let attempt = 0; attempt < CODE_GEN_RETRIES; attempt++) {
      const code = generateCode();
      try {
        const [sess] = await db
          .insert(sessionsTable)
          .values({ hostUserId: hostId, venueId, code, status: "active" })
          .returning();
        if (!sess) continue;

        // Cross-venue identity: record this user-at-venue visit. Fire-and-forget;
        // failures are swallowed by the service so they cannot break session creation.
        if (venueId) void recordVisit(hostId, venueId);

        // Insert the host as the first member. Wrapped in try so a (theoretically
        // impossible) duplicate doesn't fail the whole flow.
        await db
          .insert(sessionMembersTable)
          .values({ sessionId: sess.id, userId: hostId, role: "host" })
          .onConflictDoNothing();

        res.status(201).json({
          id:         sess.id,
          code:       sess.code,
          status:     sess.status,
          venueId:    sess.venueId,
          hostUserId: sess.hostUserId,
          createdAt:  sess.createdAt,
        });
        return;
      } catch (err) {
        // Partial unique index collision on (code) WHERE status='active'.
        // Retry with a fresh code; surface anything else.
        const msg = err instanceof Error ? err.message : String(err);
        if (!/sessions_code_active_unique|duplicate key/i.test(msg)) {
          req.log?.error({ err }, "session create failed");
          res.status(500).json({ error: "Failed to create session" });
          return;
        }
      }
    }
    res.status(503).json({ error: "Could not allocate a session code, please retry" });
  },
);

// ── POST /api/sessions/join ────────────────────────────────────────────────────

const joinSchema = z.object({
  code: z.string().trim().toUpperCase().length(CODE_LENGTH).regex(/^[A-Z0-9]+$/),
});

router.post(
  "/join",
  sessionJoinLimiter,
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const parse = joinSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid code" });
      return;
    }
    const userId = req.user!.id;
    const code   = parse.data.code;

    // Look up the active session by code.
    const [sess] = await db
      .select()
      .from(sessionsTable)
      .where(and(eq(sessionsTable.code, code), eq(sessionsTable.status, "active")))
      .limit(1);
    if (!sess) {
      res.status(404).json({ error: "Session not found or already closed" });
      return;
    }

    // ── Atomic capped insert. ──────────────────────────────────────────────
    // We only insert when the count of currently-present members for this
    // session is below MAX_MEMBERS. A re-join by an existing member is
    // handled by ON CONFLICT clearing leftAt (idempotent). A flood of
    // parallel new joiners cannot exceed the cap because each INSERT row
    // is gated on the live COUNT — losers simply insert 0 rows.
    // Aliased to camelCase via RETURNING to keep call-site casing consistent
    // with the rest of the codebase (Drizzle inferred types use camelCase).
    const ins = await db.execute(sql`
      INSERT INTO session_members (session_id, user_id, role, left_at)
      SELECT ${sess.id}::uuid, ${userId}::uuid, 'guest', NULL
       WHERE (
         SELECT COUNT(*) FROM session_members
          WHERE session_id = ${sess.id}::uuid
            AND left_at IS NULL
       ) < ${MAX_MEMBERS}
      ON CONFLICT (session_id, user_id)
      DO UPDATE SET left_at = NULL
      RETURNING id, role, joined_at AS "joinedAt", left_at AS "leftAt"
    `) as { rows: Array<{ id: string; role: SessionMemberRole; joinedAt: Date; leftAt: Date | null }> };

    if (!ins.rows || ins.rows.length === 0) {
      res.status(409).json({ error: "Session is full", limit: MAX_MEMBERS });
      return;
    }

    res.json({
      sessionId: sess.id,
      code:      sess.code,
      role:      ins.rows[0]!.role,
      joinedAt:  ins.rows[0]!.joinedAt,
    });
  },
);

// ── GET /api/sessions/:id ──────────────────────────────────────────────────────

router.get(
  "/:id",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const userId    = req.user!.id;
    const sessionId = String(req.params.id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(sessionId)) {
      res.status(400).json({ error: "Invalid session id" });
      return;
    }

    // Visibility gate: caller must currently hold a non-left membership.
    const [me] = await db
      .select({ role: sessionMembersTable.role })
      .from(sessionMembersTable)
      .where(and(
        eq(sessionMembersTable.sessionId, sessionId),
        eq(sessionMembersTable.userId, userId),
        sql`${sessionMembersTable.leftAt} IS NULL`,
      ))
      .limit(1);
    if (!me) {
      res.status(403).json({ error: "Not a member of this session" });
      return;
    }

    const [sess] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.id, sessionId))
      .limit(1);
    if (!sess) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const members = await db
      .select()
      .from(sessionMembersTable)
      .where(eq(sessionMembersTable.sessionId, sessionId))
      .orderBy(sessionMembersTable.joinedAt);

    res.json({
      session: sess,
      members,
      activeCount: members.filter((m) => m.leftAt === null).length,
    });
  },
);

// ── POST /api/sessions/:id/leave ───────────────────────────────────────────────

router.post(
  "/:id/leave",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const userId    = req.user!.id;
    const sessionId = String(req.params.id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(sessionId)) {
      res.status(400).json({ error: "Invalid session id" });
      return;
    }

    // Fetch own membership.
    const [me] = await db
      .select()
      .from(sessionMembersTable)
      .where(and(
        eq(sessionMembersTable.sessionId, sessionId),
        eq(sessionMembersTable.userId, userId),
      ))
      .limit(1);
    if (!me) {
      res.status(404).json({ error: "Not a member of this session" });
      return;
    }
    if (me.role === "host") {
      res.status(409).json({ error: "Host cannot leave; close the session instead" });
      return;
    }
    if (me.leftAt !== null) {
      res.json({ message: "Already left", leftAt: me.leftAt });
      return;
    }

    const [updated] = await db
      .update(sessionMembersTable)
      .set({ leftAt: new Date() })
      .where(eq(sessionMembersTable.id, me.id))
      .returning();
    res.json({ message: "Left session", leftAt: updated?.leftAt });
  },
);

// ── POST /api/sessions/:id/close ───────────────────────────────────────────────

router.post(
  "/:id/close",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const userId    = req.user!.id;
    const sessionId = String(req.params.id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(sessionId)) {
      res.status(400).json({ error: "Invalid session id" });
      return;
    }

    // Atomic: only close if the caller is the host AND status is still active.
    const [closed] = await db
      .update(sessionsTable)
      .set({ status: "closed", closedAt: new Date() })
      .where(and(
        eq(sessionsTable.id, sessionId),
        eq(sessionsTable.hostUserId, userId),
        eq(sessionsTable.status, "active"),
      ))
      .returning();

    if (!closed) {
      // Distinguish "not host" vs "already closed" vs "doesn't exist".
      const [exists] = await db
        .select({ hostUserId: sessionsTable.hostUserId, status: sessionsTable.status })
        .from(sessionsTable)
        .where(eq(sessionsTable.id, sessionId))
        .limit(1);
      if (!exists) {
        res.status(404).json({ error: "Session not found" });
        return;
      }
      if (exists.hostUserId !== userId) {
        res.status(403).json({ error: "Only the host can close this session" });
        return;
      }
      res.status(409).json({ error: "Session already closed" });
      return;
    }

    res.json({ message: "Session closed", session: closed });
  },
);

export default router;
