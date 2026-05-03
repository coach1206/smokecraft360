/**
 * Audit-log reader (G6).
 *
 *   GET /api/audit-log
 *
 * Append-only privileged-action trail. The table is written from server-side
 * code via lib/audit.ts#logAudit only — there is intentionally NO write
 * surface here. The reader is the missing piece compliance / back-office
 * needs to view "who did what, when, why".
 *
 * Auth: requireAuth + requireRole(venue_owner | manager | super_admin).
 *
 * Tenant scoping:
 *   - super_admin            — may pass ?venueId=… or omit (sees all venues).
 *   - venue_owner | manager  — forced to req.user.venueId; any ?venueId= in
 *                              the query string is silently ignored. A caller
 *                              of these roles with no venueId in their token
 *                              gets 403 (they cannot have audit context).
 *
 * Filters (all optional, AND-combined):
 *   ?action=…       exact match on action verb (e.g. "subscription.override")
 *   ?entityType=…   exact match on entity type
 *   ?actorId=…      uuid; restrict to actions taken by one user
 *   ?since=…        ISO datetime; createdAt >= since
 *   ?until=…        ISO datetime; createdAt <  until  (half-open)
 *
 * Pagination — keyset cursor on (createdAt DESC, id DESC) to avoid OFFSET
 * cliff. limit defaults 50, hard cap 200. Cursor format:
 *   "<createdAtISO>_<uuid>"
 * Response contains nextCursor=null once exhausted.
 */

import { Router, type IRouter, type Response } from "express";
import { and, desc, eq, gte, lt, lte, or, sql }from "drizzle-orm";
import { db, auditLogTable }                    from "@workspace/db";
import { requireAuth, type AuthRequest }        from "../middleware/auth";
import { requireRole }                          from "../middleware/roles";

const router: IRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Microsecond ISO produced by Postgres `to_char(... 'YYYY-MM-DDTHH24:MI:SS.US')`.
// JS `Date.toISOString()` is millisecond-only, which would truncate the µs and
// cause same-millisecond rows to be skipped by the keyset predicate. We use
// raw Postgres-formatted text for the cursor instead and let Postgres parse
// it back as `::timestamp` on the next page (full µs round-trip).
const TS_US_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{1,6}$/;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT     = 200;

/** Decode "<microsec-iso>_<uuid>". Null on any parse failure (lenient: first page). */
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

router.get(
  "/",
  requireAuth,
  requireRole("venue_owner", "manager", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const role     = req.user!.role;
    const isSuper  = role === "super_admin";

    // ── Tenant scoping ─────────────────────────────────────────────────────
    let venueScope: string | null = null;
    if (isSuper) {
      // super_admin may explicitly scope to one venue; null = all venues.
      const q = req.query.venueId;
      if (typeof q === "string" && q.length > 0) {
        if (!UUID_RE.test(q)) {
          res.status(400).json({ error: "Invalid venueId" });
          return;
        }
        venueScope = q;
      }
    } else {
      // Non-super_admin is forced to their own venue. No venue ⇒ 403.
      const v = req.user?.venueId ?? null;
      if (!v) {
        res.status(403).json({ error: "Caller has no venue context" });
        return;
      }
      venueScope = v;
    }

    // ── Filter parsing ─────────────────────────────────────────────────────
    const conds = [];
    if (venueScope !== null) conds.push(eq(auditLogTable.venueId, venueScope));

    const action = req.query.action;
    if (typeof action === "string" && action.length > 0) {
      if (action.length > 128) {
        res.status(400).json({ error: "action too long" });
        return;
      }
      conds.push(eq(auditLogTable.action, action));
    }

    const entityType = req.query.entityType;
    if (typeof entityType === "string" && entityType.length > 0) {
      if (entityType.length > 64) {
        res.status(400).json({ error: "entityType too long" });
        return;
      }
      conds.push(eq(auditLogTable.entityType, entityType));
    }

    const actorId = req.query.actorId;
    if (typeof actorId === "string" && actorId.length > 0) {
      if (!UUID_RE.test(actorId)) {
        res.status(400).json({ error: "Invalid actorId" });
        return;
      }
      conds.push(eq(auditLogTable.actorId, actorId));
    }

    const since = req.query.since;
    if (typeof since === "string" && since.length > 0) {
      const d = new Date(since);
      if (Number.isNaN(d.getTime())) {
        res.status(400).json({ error: "Invalid since (must be ISO datetime)" });
        return;
      }
      conds.push(gte(auditLogTable.createdAt, d));
    }

    const until = req.query.until;
    if (typeof until === "string" && until.length > 0) {
      const d = new Date(until);
      if (Number.isNaN(d.getTime())) {
        res.status(400).json({ error: "Invalid until (must be ISO datetime)" });
        return;
      }
      conds.push(lt(auditLogTable.createdAt, d));
    }

    // ── Pagination ─────────────────────────────────────────────────────────
    let limit = DEFAULT_LIMIT;
    if (typeof req.query.limit === "string") {
      const n = Number.parseInt(req.query.limit, 10);
      if (Number.isFinite(n) && n > 0) limit = Math.min(n, MAX_LIMIT);
    }

    // Keyset cursor — strict (createdAt, id) lexicographic compare.
    // Rows ordered (createdAt DESC, id DESC). Next page predicate:
    //   createdAt < cursor.ts  OR  (createdAt = cursor.ts AND id < cursor.id)
    // The cursor.ts is a µs-precision Postgres-formatted string; we cast it
    // back to ::timestamp so the comparison is exact at storage precision.
    const cur = parseCursor(req.query.cursor);
    if (cur) {
      conds.push(
        or(
          sql`${auditLogTable.createdAt} < ${cur.ts}::timestamp`,
          and(
            sql`${auditLogTable.createdAt} = ${cur.ts}::timestamp`,
            lt(auditLogTable.id, cur.id),
          ),
        )!,
      );
    }

    // ── Projection / PII redaction ─────────────────────────────────────────
    // beforeState/afterState jsonb may contain PII, tokens, payment artifacts,
    // or other sensitive snapshots. Default policy: only super_admin sees the
    // payloads; venue_owner/manager get null. They still see WHO did WHAT to
    // WHICH entity at WHEN, which is the audit-trail value-add — they just
    // don't get the diff blob.
    //
    // Also select created_at as µs-precision text alias `cursorTs` so the
    // emitted nextCursor round-trips at full storage precision.
    const includeState = isSuper;
    const rows = await db
      .select({
        id:          auditLogTable.id,
        actorId:     auditLogTable.actorId,
        actorRole:   auditLogTable.actorRole,
        action:      auditLogTable.action,
        entityType:  auditLogTable.entityType,
        entityId:    auditLogTable.entityId,
        beforeState: includeState ? auditLogTable.beforeState : sql<null>`NULL`,
        afterState:  includeState ? auditLogTable.afterState  : sql<null>`NULL`,
        venueId:     auditLogTable.venueId,
        ipAddress:   auditLogTable.ipAddress,
        createdAt:   auditLogTable.createdAt,
        cursorTs:    sql<string>`to_char(${auditLogTable.createdAt}, 'YYYY-MM-DD"T"HH24:MI:SS.US')`,
      })
      .from(auditLogTable)
      .where(and(...conds))
      .orderBy(desc(auditLogTable.createdAt), desc(auditLogTable.id))
      .limit(limit + 1);

    let nextCursor: string | null = null;
    let sliced = rows;
    if (rows.length > limit) {
      sliced = rows.slice(0, limit);
      const last = sliced[sliced.length - 1]!;
      nextCursor = `${last.cursorTs}_${last.id}`;
    }
    // Strip the internal cursorTs column from the response shape.
    const entries = sliced.map(({ cursorTs: _cursorTs, ...rest }) => rest);

    res.json({ entries, nextCursor });
  },
);

// Touch lte to keep import available without renaming churn if we add inclusive
// `until` semantics later.
void lte;

export default router;
