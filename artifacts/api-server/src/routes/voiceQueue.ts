/**
 * Inbound voice-command queue.
 *
 *   POST   /api/voice-queue                 — enqueue transcript (public, capped)
 *   GET    /api/voice-queue                 — list pending in caller's venue (staff+)
 *   POST   /api/voice-queue/:id/claim       — atomic claim by worker (staff+)
 *   POST   /api/voice-queue/:id/complete    — claimer-only completion
 *   POST   /api/voice-queue/:id/fail        — claimer-only failure (retries++)
 *   DELETE /api/voice-queue/:id             — super_admin purge
 *
 * Worker pattern (from G1):
 *   Claim is an atomic conditional UPDATE (status='pending' → 'claimed')
 *   returning the row. Two workers racing the same item: one wins (200),
 *   one gets 0 rows back ⇒ 409. No SELECT-then-UPDATE, no advisory locks.
 *
 * Per-venue cap (200 pending) enforced atomically inside the INSERT, same
 * pattern as G2 sessions and G3 memories.
 *
 * Out of scope this slice (call out next round): SSE/socket push, STT to
 * generate transcripts server-side, retry-with-backoff scheduler.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, desc, sql }                    from "drizzle-orm";
import {
  db,
  voiceCommandsTable,
  VOICE_COMMAND_STATUSES,
}                                                from "@workspace/db";
import { requireAuth, type AuthRequest }         from "../middleware/auth";
import { requireRole }                           from "../middleware/roles";
import { voiceQueueEnqueueLimiter }              from "../middleware/rateLimit";
import { verifyToken }                           from "../lib/jwt";
import { z }                                     from "zod";

const router: IRouter = Router();

const MAX_PENDING_PER_VENUE = 200;
const LIST_LIMIT            = 100;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── Optional auth helper (POST is public-but-stamped if a token is present) ──

interface OptionalAuth { userId: string | null; venueId: string | null; }
async function optionalAuth(req: Request): Promise<OptionalAuth> {
  const header = req.headers["authorization"];
  if (!header?.startsWith("Bearer ")) return { userId: null, venueId: null };
  try {
    const payload = await verifyToken(header.slice(7));
    return {
      userId:  payload.sub ?? null,
      venueId: payload.venueId ?? null,
    };
  } catch {
    return { userId: null, venueId: null };
  }
}

// ── POST /api/voice-queue ─────────────────────────────────────────────────────

const enqueueSchema = z.object({
  transcript: z.string().trim().min(1).max(1000),
  // Allow caller to override venueId (e.g. kiosk hitting on behalf of its
  // tenant without a user token). Validated as UUID; the per-venue cap is
  // applied to whatever ends up stored.
  venueId:    z.string().regex(UUID_RE).optional(),
});

router.post(
  "/",
  voiceQueueEnqueueLimiter,
  async (req: Request, res: Response) => {
    const parse = enqueueSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid voice command", issues: parse.error.issues });
      return;
    }
    const auth = await optionalAuth(req);
    const venueId = parse.data.venueId ?? auth.venueId ?? null;
    const userId  = auth.userId ?? null;
    const { transcript } = parse.data;

    // Architect HIGH fix: every enqueue MUST be venue-scoped. Without this,
    // all anonymous (no token, no body venueId) submissions would share one
    // global "NULL bucket" subject to the same 200-pending cap, and one bad
    // actor could DoS every other anonymous kiosk by filling that bucket.
    // Forcing a venueId pushes each request into its own per-venue cap.
    if (!venueId) {
      res.status(400).json({
        error: "venueId is required (provide via body or authenticated token)",
      });
      return;
    }

    // Atomic capped INSERT. Cap counts only PENDING rows for this venue
    // (completed/failed don't crowd the queue).
    const result = await db.execute(sql`
      INSERT INTO voice_commands (user_id, venue_id, transcript, status)
      SELECT ${userId ? sql`${userId}::uuid` : sql`NULL`},
             ${venueId}::uuid,
             ${transcript},
             'pending'
      WHERE (
        SELECT COUNT(*) FROM voice_commands
         WHERE status = 'pending'
           AND venue_id = ${venueId}::uuid
      ) < ${MAX_PENDING_PER_VENUE}
      RETURNING id, user_id  AS "userId",  venue_id AS "venueId",
                transcript, status,
                claimed_by   AS "claimedBy",   result,
                error_message AS "errorMessage", retries,
                created_at   AS "createdAt",
                claimed_at   AS "claimedAt",
                completed_at AS "completedAt"
    `) as { rows: Array<unknown> };

    if (!result.rows || result.rows.length === 0) {
      res.status(429).json({
        error:           "Voice queue full for this venue",
        capPendingPerVenue: MAX_PENDING_PER_VENUE,
      });
      return;
    }
    res.status(201).json(result.rows[0]);
  },
);

// ── GET /api/voice-queue (staff+ only) ────────────────────────────────────────

router.get(
  "/",
  requireAuth,
  requireRole("staff", "admin", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const venueId = req.user!.venueId ?? null;
    // Caller's own venue only (super_admin can pass ?venueId=… to override).
    const reqVenue = typeof req.query.venueId === "string" && UUID_RE.test(req.query.venueId)
      ? req.query.venueId
      : null;
    const scope = req.user!.role === "super_admin" && reqVenue ? reqVenue : venueId;

    const statusParam = String(req.query.status ?? "pending");
    if (!(VOICE_COMMAND_STATUSES as readonly string[]).includes(statusParam)) {
      res.status(400).json({ error: "Invalid status filter" });
      return;
    }

    const rows = await db
      .select()
      .from(voiceCommandsTable)
      .where(and(
        eq(voiceCommandsTable.status, statusParam as typeof VOICE_COMMAND_STATUSES[number]),
        scope
          ? eq(voiceCommandsTable.venueId, scope)
          : sql`${voiceCommandsTable.venueId} IS NULL`,
      ))
      .orderBy(desc(voiceCommandsTable.createdAt))
      .limit(LIST_LIMIT);
    res.json({ commands: rows, limit: LIST_LIMIT, capPendingPerVenue: MAX_PENDING_PER_VENUE });
  },
);

// ── POST /api/voice-queue/:id/claim (worker pattern) ──────────────────────────

function paramId(req: Request, res: Response): string | null {
  const id = String(req.params.id ?? "");
  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: "Invalid voice-command id" });
    return null;
  }
  return id;
}

router.post(
  "/:id/claim",
  requireAuth,
  requireRole("staff", "admin", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const id = paramId(req, res);
    if (!id) return;
    const userId = req.user!.id;

    // Atomic claim: only flips pending → claimed. Two workers racing the
    // same id: exactly one returns a row, the other gets 409.
    const result = await db.execute(sql`
      UPDATE voice_commands
         SET status      = 'claimed',
             claimed_by  = ${userId}::uuid,
             claimed_at  = now()
       WHERE id = ${id}::uuid
         AND status = 'pending'
       RETURNING id, user_id  AS "userId",  venue_id AS "venueId",
                 transcript, status,
                 claimed_by   AS "claimedBy",   result,
                 error_message AS "errorMessage", retries,
                 created_at   AS "createdAt",
                 claimed_at   AS "claimedAt",
                 completed_at AS "completedAt"
    `) as { rows: Array<unknown> };

    if (!result.rows || result.rows.length === 0) {
      res.status(409).json({ error: "Voice command not pending (already claimed, completed, failed, or unknown)" });
      return;
    }
    res.json(result.rows[0]);
  },
);

// ── POST /api/voice-queue/:id/complete ────────────────────────────────────────

const completeSchema = z.object({
  result: z.unknown().optional(),
});

router.post(
  "/:id/complete",
  requireAuth,
  requireRole("staff", "admin", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const id = paramId(req, res);
    if (!id) return;
    const parse = completeSchema.safeParse(req.body ?? {});
    if (!parse.success) {
      res.status(400).json({ error: "Invalid payload", issues: parse.error.issues });
      return;
    }
    const userId = req.user!.id;
    const result = parse.data.result === undefined ? null : parse.data.result;

    // Claimer-only atomic completion. 0 rows ⇒ 404 (covers: not claimed, not
    // by you, already completed/failed, or unknown). We deliberately fold
    // all of those into 404 to avoid leaking lifecycle to non-claimers.
    const updated = await db.execute(sql`
      UPDATE voice_commands
         SET status       = 'completed',
             result       = ${sql`${JSON.stringify(result)}::jsonb`},
             completed_at = now()
       WHERE id = ${id}::uuid
         AND claimed_by = ${userId}::uuid
         AND status = 'claimed'
       RETURNING id, status, result, completed_at AS "completedAt"
    `) as { rows: Array<unknown> };

    if (!updated.rows || updated.rows.length === 0) {
      res.status(404).json({ error: "Voice command not claimed by you" });
      return;
    }
    res.json(updated.rows[0]);
  },
);

// ── POST /api/voice-queue/:id/fail ────────────────────────────────────────────

const failSchema = z.object({
  errorMessage: z.string().trim().min(1).max(500),
});

router.post(
  "/:id/fail",
  requireAuth,
  requireRole("staff", "admin", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const id = paramId(req, res);
    if (!id) return;
    const parse = failSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid payload", issues: parse.error.issues });
      return;
    }
    const userId = req.user!.id;
    const { errorMessage } = parse.data;

    // Same claimer-only gate as complete. Atomic increment of retries.
    const updated = await db.execute(sql`
      UPDATE voice_commands
         SET status        = 'failed',
             error_message = ${errorMessage},
             retries       = retries + 1,
             completed_at  = now()
       WHERE id = ${id}::uuid
         AND claimed_by = ${userId}::uuid
         AND status = 'claimed'
       RETURNING id, status, error_message AS "errorMessage",
                 retries, completed_at    AS "completedAt"
    `) as { rows: Array<unknown> };

    if (!updated.rows || updated.rows.length === 0) {
      res.status(404).json({ error: "Voice command not claimed by you" });
      return;
    }
    res.json(updated.rows[0]);
  },
);

// ── DELETE /api/voice-queue/:id (super_admin purge) ───────────────────────────

router.delete(
  "/:id",
  requireAuth,
  requireRole("super_admin"),
  async (req: AuthRequest, res: Response) => {
    const id = paramId(req, res);
    if (!id) return;
    const deleted = await db
      .delete(voiceCommandsTable)
      .where(eq(voiceCommandsTable.id, id))
      .returning({ id: voiceCommandsTable.id });
    if (deleted.length === 0) {
      res.status(404).json({ error: "Voice command not found" });
      return;
    }
    res.json({ message: "Voice command purged", id: deleted[0]!.id });
  },
);

export default router;
