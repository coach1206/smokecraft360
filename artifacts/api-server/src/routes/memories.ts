/**
 * AI memory routes.
 *
 *   GET    /api/memories        — list current user's memories
 *   POST   /api/memories        — upsert a memory by key (atomic, capped)
 *   PATCH  /api/memories/:id    — update value / confidence / touch lastUsedAt
 *   DELETE /api/memories/:id    — forget a memory
 *
 * All endpoints are authed and scoped strictly to the calling user — even
 * a super_admin cannot read or mutate someone else's memories through this
 * surface. Future analytics or AI-pipeline access should go through a
 * separate admin route file with explicit role checks.
 *
 * Concurrency / safety:
 *   • Upsert is a single SQL statement with ON CONFLICT, so two parallel
 *     writes for the same key cannot create duplicate rows.
 *   • The per-user cap (MAX_MEMORIES_PER_USER) is enforced atomically
 *     inside the INSERT via a gated SELECT-COUNT, mirroring the
 *     session-join cap pattern. The cap only applies to net-new keys —
 *     re-upserting an existing key never increases the count.
 *   • PATCH and DELETE use atomic conditional updates that include the
 *     user_id in the WHERE clause; a 0-row result becomes 404.
 *   • String lengths are bounded by zod (key ≤64, value ≤500), not by the
 *     DB, so misbehaving callers get a 400 not a Postgres error.
 */

import { Router, type IRouter, type Response } from "express";
import { eq, and, sql, desc }                  from "drizzle-orm";
import {
  db,
  userMemoriesTable,
  MEMORY_SOURCES,
}                                              from "@workspace/db";
import { requireAuth, type AuthRequest }       from "../middleware/auth";
import { memoryWriteLimiter }                  from "../middleware/rateLimit";
import { z }                                   from "zod";

const router: IRouter = Router();

const MAX_MEMORIES_PER_USER = 50;
const LIST_LIMIT            = 50;

// Slugged key: lowercase ascii letters/digits/underscore/dash, ≤64 chars.
// Stops free-form keys from polluting the namespace ("My Big Long Sentence!").
const KEY_RE = /^[a-z0-9_\-]{1,64}$/;

// ── GET /api/memories ──────────────────────────────────────────────────────────

router.get(
  "/",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const rows = await db
      .select()
      .from(userMemoriesTable)
      .where(eq(userMemoriesTable.userId, userId))
      // recency-of-use first (nulls last), then most-recently-updated
      .orderBy(sql`${userMemoriesTable.lastUsedAt} DESC NULLS LAST`, desc(userMemoriesTable.updatedAt))
      .limit(LIST_LIMIT);
    res.json({ memories: rows, limit: LIST_LIMIT, capPerUser: MAX_MEMORIES_PER_USER });
  },
);

// ── POST /api/memories (upsert by key) ────────────────────────────────────────

const upsertSchema = z.object({
  key:        z.string().trim().toLowerCase().regex(KEY_RE, "key must be 1-64 chars of [a-z0-9_-]"),
  value:      z.string().trim().min(1).max(500),
  source:     z.enum(MEMORY_SOURCES).default("manual"),
  confidence: z.number().min(0).max(1).default(1.0),
});

router.post(
  "/",
  memoryWriteLimiter,
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const parse = upsertSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid memory", issues: parse.error.issues });
      return;
    }
    const userId  = req.user!.id;
    const venueId = req.user!.venueId ?? null;
    const { key, value, source, confidence } = parse.data;

    // ── Atomic capped upsert. ──────────────────────────────────────────────
    // - INSERT only fires when EITHER the key already exists (so the cap
    //   doesn't apply — we're updating in place) OR the user is below cap.
    // - On conflict, value/source/confidence/updated_at are refreshed.
    // - Returns the row whether inserted or updated.
    // - 0 rows back means: row didn't already exist AND user is at cap.
    const result = await db.execute(sql`
      INSERT INTO user_memories (user_id, venue_id, key, value, source, confidence)
      SELECT ${userId}::uuid, ${venueId ? sql`${venueId}::uuid` : sql`NULL`},
             ${key}, ${value}, ${source}, ${confidence}
       WHERE EXISTS (SELECT 1 FROM user_memories WHERE user_id = ${userId}::uuid AND key = ${key})
          OR (SELECT COUNT(*) FROM user_memories WHERE user_id = ${userId}::uuid) < ${MAX_MEMORIES_PER_USER}
      ON CONFLICT (user_id, key) DO UPDATE SET
        value      = EXCLUDED.value,
        source     = EXCLUDED.source,
        confidence = EXCLUDED.confidence,
        updated_at = now()
      RETURNING id, user_id  AS "userId",  venue_id AS "venueId",
                key, value, source, confidence,
                created_at AS "createdAt", updated_at AS "updatedAt",
                last_used_at AS "lastUsedAt"
    `) as { rows: Array<{
      id: string; userId: string; venueId: string | null; key: string; value: string;
      source: string; confidence: number; createdAt: Date; updatedAt: Date; lastUsedAt: Date | null;
    }> };

    if (!result.rows || result.rows.length === 0) {
      res.status(409).json({
        error:      "Memory cap reached for this user",
        capPerUser: MAX_MEMORIES_PER_USER,
      });
      return;
    }
    res.status(201).json(result.rows[0]);
  },
);

// ── PATCH /api/memories/:id ───────────────────────────────────────────────────

const patchSchema = z.object({
  value:      z.string().trim().min(1).max(500).optional(),
  confidence: z.number().min(0).max(1).optional(),
  touch:      z.boolean().optional(),    // when true, sets last_used_at = now()
}).refine(
  (d) => d.value !== undefined || d.confidence !== undefined || d.touch === true,
  { message: "At least one of value, confidence, or touch must be provided" },
);

router.patch(
  "/:id",
  memoryWriteLimiter,
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      res.status(400).json({ error: "Invalid memory id" });
      return;
    }
    const parse = patchSchema.safeParse(req.body);
    if (!parse.success) {
      res.status(400).json({ error: "Invalid payload", issues: parse.error.issues });
      return;
    }
    const userId = req.user!.id;
    const { value, confidence, touch } = parse.data;

    // Build the SET dynamically but preserve owner gate atomically.
    const sets: ReturnType<typeof sql>[] = [sql`updated_at = now()`];
    if (value      !== undefined) sets.push(sql`value      = ${value}`);
    if (confidence !== undefined) sets.push(sql`confidence = ${confidence}`);
    if (touch)                    sets.push(sql`last_used_at = now()`);

    const updated = await db.execute(sql`
      UPDATE user_memories
         SET ${sql.join(sets, sql`, `)}
       WHERE id = ${id}::uuid
         AND user_id = ${userId}::uuid
       RETURNING id, user_id  AS "userId",  venue_id AS "venueId",
                 key, value, source, confidence,
                 created_at AS "createdAt", updated_at AS "updatedAt",
                 last_used_at AS "lastUsedAt"
    `) as { rows: Array<unknown> };

    if (!updated.rows || updated.rows.length === 0) {
      res.status(404).json({ error: "Memory not found" });
      return;
    }
    res.json(updated.rows[0]);
  },
);

// ── DELETE /api/memories/:id ──────────────────────────────────────────────────

router.delete(
  "/:id",
  memoryWriteLimiter,
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      res.status(400).json({ error: "Invalid memory id" });
      return;
    }
    const userId = req.user!.id;

    // Owner-gated atomic delete: WHERE userId AND id, 0 rows ⇒ 404.
    const deleted = await db
      .delete(userMemoriesTable)
      .where(and(
        eq(userMemoriesTable.id, id),
        eq(userMemoriesTable.userId, userId),
      ))
      .returning({ id: userMemoriesTable.id });

    if (deleted.length === 0) {
      res.status(404).json({ error: "Memory not found" });
      return;
    }
    res.json({ message: "Memory forgotten", id: deleted[0]!.id });
  },
);

export default router;
