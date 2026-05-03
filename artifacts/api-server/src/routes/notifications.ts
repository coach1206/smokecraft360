/**
 * Notification inbox writes.
 *
 *   PATCH  /api/notifications/:id/read   — mark one as read
 *   POST   /api/notifications/read-all   — mark every unread for caller's venue
 *   DELETE /api/notifications/:id        — dismiss/delete one
 *
 * The matching GET /api/notifications already lives in routes/subscriptions.ts
 * and is intentionally NOT moved here (no destructive change). Both routers
 * coexist at the same /api prefix — Express dispatches by full path.
 *
 * All endpoints are authed and strictly tenant-scoped via req.user.venueId.
 * Owner-gated atomic UPDATE/DELETE: a row that doesn't belong to the caller's
 * venue returns 404 (not 403) to avoid leaking existence across tenants —
 * same pattern as G3 memories and G4 voice-queue claimer-only writes.
 *
 * `readAt IS NULL` is folded into the WHERE on PATCH /:id/read, so re-marking
 * an already-read notification returns 404 rather than silently re-touching.
 * Callers wanting an idempotent "ensure read" should treat 404 + 200 as the
 * same outcome.
 */

import { Router, type IRouter, type Response } from "express";
import { eq, and, isNull, sql }                from "drizzle-orm";
import { db, notificationsTable }              from "@workspace/db";
import { requireAuth, type AuthRequest }       from "../middleware/auth";
import { notificationWriteLimiter }            from "../middleware/rateLimit";

const router: IRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function paramId(req: AuthRequest, res: Response): string | null {
  const id = String(req.params.id ?? "");
  if (!UUID_RE.test(id)) {
    res.status(400).json({ error: "Invalid notification id" });
    return null;
  }
  return id;
}

function requireVenue(req: AuthRequest, res: Response): string | null {
  const venueId = req.user?.venueId ?? null;
  if (!venueId) {
    // Caller has no tenant context — they can't have notifications by design.
    res.status(403).json({ error: "Caller has no venue context" });
    return null;
  }
  return venueId;
}

// ── PATCH /api/notifications/:id/read ─────────────────────────────────────────

router.patch(
  "/:id/read",
  notificationWriteLimiter,
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const id = paramId(req, res);
    if (!id) return;
    const venueId = requireVenue(req, res);
    if (!venueId) return;

    // Atomic owner-gated mark-as-read. Three-way 404 fold: wrong tenant,
    // unknown id, or already read all collapse to 404 to avoid leaking
    // existence/lifecycle across tenants.
    const updated = await db
      .update(notificationsTable)
      .set({ readAt: new Date() })
      .where(and(
        eq(notificationsTable.id, id),
        eq(notificationsTable.venueId, venueId),
        isNull(notificationsTable.readAt),
      ))
      .returning({
        id:        notificationsTable.id,
        readAt:    notificationsTable.readAt,
        title:     notificationsTable.title,
        category:  notificationsTable.category,
      });

    if (updated.length === 0) {
      res.status(404).json({ error: "Notification not found or already read" });
      return;
    }
    res.json(updated[0]);
  },
);

// ── POST /api/notifications/read-all ──────────────────────────────────────────

router.post(
  "/read-all",
  notificationWriteLimiter,
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const venueId = requireVenue(req, res);
    if (!venueId) return;

    // Idempotent bulk mark — 0 unread is a valid response, not an error.
    const updated = await db
      .update(notificationsTable)
      .set({ readAt: new Date() })
      .where(and(
        eq(notificationsTable.venueId, venueId),
        isNull(notificationsTable.readAt),
      ))
      .returning({ id: notificationsTable.id });

    res.json({ markedCount: updated.length });
  },
);

// ── DELETE /api/notifications/:id ─────────────────────────────────────────────

router.delete(
  "/:id",
  notificationWriteLimiter,
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const id = paramId(req, res);
    if (!id) return;
    const venueId = requireVenue(req, res);
    if (!venueId) return;

    // Owner-gated atomic dismiss. Wrong tenant or unknown id ⇒ 404.
    const deleted = await db
      .delete(notificationsTable)
      .where(and(
        eq(notificationsTable.id, id),
        eq(notificationsTable.venueId, venueId),
      ))
      .returning({ id: notificationsTable.id });

    if (deleted.length === 0) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }
    res.json({ message: "Notification dismissed", id: deleted[0]!.id });
  },
);

// Touch sql to keep the import alive for future expansion (raw fragments are
// likely needed once we add filtering or pagination).
void sql;

export default router;
