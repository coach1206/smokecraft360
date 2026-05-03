/**
 * /api/os/events — unified cross-cutting event read for the OS dashboard.
 *
 *   GET /api/os/events?venueId=&userId=&eventType=&module=&since=&until=&limit=&format=json|csv
 *
 * Thin filterable wrapper over analytics_events. Does not duplicate that table —
 * it just exposes the rows already there with operator-friendly filters and
 * optional CSV export. super_admin only.
 *
 * The optional `module` filter reads from metadata.module so the same surface
 * works once additional modules (PourCraft, VapeCraft) start emitting events.
 */
import { Router, type IRouter, type Response } from "express";
import { and, eq, gte, lte, desc, sql }        from "drizzle-orm";
import { db, analyticsEventsTable }            from "@workspace/db";
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

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

router.get(
  "/events",
  requireAuth,
  requireRole("super_admin"),
  async (req: AuthRequest, res: Response) => {
    const q = req.query;

    const venueId   = typeof q["venueId"]   === "string" && UUID_RE.test(q["venueId"])   ? q["venueId"]   : null;
    const userId    = typeof q["userId"]    === "string" && UUID_RE.test(q["userId"])    ? q["userId"]    : null;
    const eventType = typeof q["eventType"] === "string" ? q["eventType"] : null;
    const module    = typeof q["module"]    === "string" ? q["module"]    : null;
    const since     = parseDate(q["since"]);
    const until     = parseDate(q["until"]);
    const format    = q["format"] === "csv" ? "csv" : "json";

    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, Number.parseInt(typeof q["limit"] === "string" ? q["limit"] : "100", 10) || 100),
    );

    const conds = [];
    if (venueId)   conds.push(eq(analyticsEventsTable.venueId,   venueId));
    if (userId)    conds.push(eq(analyticsEventsTable.userId,    userId));
    if (eventType) conds.push(sql`${analyticsEventsTable.eventType}::text = ${eventType}`);
    if (since)     conds.push(gte(analyticsEventsTable.createdAt, since));
    if (until)     conds.push(lte(analyticsEventsTable.createdAt, until));
    // metadata.module is JSON — use ->>'module' = $1
    if (module) conds.push(sql`${analyticsEventsTable.metadata}->>'module' = ${module}`);

    const whereClause = conds.length ? and(...conds) : undefined;

    const rows = await db
      .select()
      .from(analyticsEventsTable)
      .where(whereClause)
      .orderBy(desc(analyticsEventsTable.createdAt))
      .limit(limit);

    if (format === "csv") {
      const header = "id,created_at,event_type,venue_id,user_id,product_id,metadata\n";
      const body   = rows.map(r => [
        r.id, r.createdAt.toISOString(), r.eventType,
        r.venueId, r.userId, r.productId, r.metadata,
      ].map(csvEscape).join(",")).join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="os-events-${Date.now()}.csv"`);
      res.send(header + body);
      return;
    }

    res.json({
      generatedAt: new Date().toISOString(),
      filters: { venueId, userId, eventType, module, since, until, limit },
      count:   rows.length,
      events:  rows,
    });
  },
);

export default router;
