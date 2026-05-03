/**
 * /api/exports — data export with audit trail (Brief B).
 *
 * Endpoints:
 *   GET  /api/exports                         — list export history (tenant-scoped)
 *   POST /api/exports                         — execute export, stream file inline,
 *                                               write export_logs row
 *
 * Body for POST:
 *   { scope: "vendors"|"products"|"inventory"|"orders",
 *     format: "csv"|"json",
 *     filters?: { status?, since?, until? } }
 *
 * Tenant rules:
 *   - super_admin               — every scope, every venue
 *   - venue_owner / manager     — `inventory` + `orders` for OWN venueId only
 *                                 (vendors / products are blocked → 403)
 *
 * The export payload itself is NOT persisted. The log row records who pulled
 * what, when, with which filters, plus row + byte counts for audit.
 */

import { Router, type IRouter, type Response } from "express";
import { and, desc, eq, gte, lte, sql }        from "drizzle-orm";
import {
  db,
  distributorsTable, productsTable, venueInventoryTable, ordersTable,
  exportLogsTable,
  EXPORT_SCOPES, EXPORT_FORMATS,
  type ExportScope, type ExportFormat,
} from "@workspace/db";
import { requireAuth, type AuthRequest }       from "../middleware/auth";

const router: IRouter = Router();

// ── helpers ───────────────────────────────────────────────────────────────────

/** HIGH (architect fix): CSV-injection guard. Prefix cells beginning with =/+/-/@/tab/CR
 *  with a single-quote so Excel/Sheets treat them as literal text, not formulas. */
function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = typeof v === "string" ? v : JSON.stringify(v);
  if (s.length > 0 && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]!);
  const head = cols.join(",");
  const body = rows.map(r => cols.map(c => csvEscape(r[c])).join(",")).join("\n");
  return `${head}\n${body}\n`;
}

interface ExportFilters { status?: string; since?: string; until?: string }

/** CRITICAL (architect fix): hard cap to bound memory & prevent OOM/DoS.
 *  Streaming/cursor support is a future improvement; for now we return a
 *  bounded snapshot so a single export cannot exhaust the heap. */
const EXPORT_ROW_CAP = 10000;

/** CRITICAL (architect fix): validate ISO-ish date strings before they reach
 *  Drizzle's gte/lte; an Invalid Date object passed to SQL templates can
 *  crash the driver or produce undefined SQL. Returns null on invalid. */
function safeParseDate(s: string | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseFilters(raw: unknown): ExportFilters {
  if (!raw || typeof raw !== "object") return {};
  const r = raw as Record<string, unknown>;
  const f: ExportFilters = {};
  if (typeof r["status"] === "string") f.status = r["status"];
  if (typeof r["since"]  === "string") f.since  = r["since"];
  if (typeof r["until"]  === "string") f.until  = r["until"];
  return f;
}

async function fetchScope(
  scope: ExportScope, venueScope: string | null, filters: ExportFilters,
): Promise<Record<string, unknown>[]> {
  switch (scope) {
    case "vendors": {
      const rows = await db.select().from(distributorsTable)
        .orderBy(desc(distributorsTable.createdAt)).limit(EXPORT_ROW_CAP);
      return rows as unknown as Record<string, unknown>[];
    }
    case "products": {
      // super_admin only, no tenant filter
      const rows = await db.select().from(productsTable).limit(EXPORT_ROW_CAP);
      return rows as unknown as Record<string, unknown>[];
    }
    case "inventory": {
      const where = venueScope ? eq(venueInventoryTable.venueId, venueScope) : undefined;
      const rows  = where
        ? await db.select().from(venueInventoryTable).where(where).limit(EXPORT_ROW_CAP)
        : await db.select().from(venueInventoryTable).limit(EXPORT_ROW_CAP);
      return rows as unknown as Record<string, unknown>[];
    }
    case "orders": {
      const conds = [];
      if (venueScope)         conds.push(eq(ordersTable.venueId, venueScope));
      if (filters.status)     conds.push(eq(ordersTable.status, filters.status as never));
      const sinceD = safeParseDate(filters.since);
      const untilD = safeParseDate(filters.until);
      if (sinceD)             conds.push(gte(ordersTable.createdAt, sinceD));
      if (untilD)             conds.push(lte(ordersTable.createdAt, untilD));
      const rows = conds.length > 0
        ? await db.select().from(ordersTable).where(and(...conds)).orderBy(desc(ordersTable.createdAt)).limit(EXPORT_ROW_CAP)
        : await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(EXPORT_ROW_CAP);
      return rows as unknown as Record<string, unknown>[];
    }
  }
}

// ── GET /api/exports — history ────────────────────────────────────────────────

router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const role    = req.user!.role;
  const venueId = req.user!.venueId ?? null;

  let rows;
  if (role === "super_admin") {
    rows = await db.select().from(exportLogsTable)
      .orderBy(desc(exportLogsTable.createdAt)).limit(100);
  } else {
    if (!venueId) { res.json({ exports: [] }); return; }
    rows = await db.select().from(exportLogsTable)
      .where(eq(exportLogsTable.venueId, venueId))
      .orderBy(desc(exportLogsTable.createdAt)).limit(100);
  }
  res.json({ exports: rows });
});

// ── POST /api/exports — execute + stream + log ────────────────────────────────

router.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const role    = req.user!.role;
  const userId  = req.user!.id;
  const venueId = req.user!.venueId ?? null;

  const body    = (req.body ?? {}) as Record<string, unknown>;
  const scope   = body["scope"]  as ExportScope | undefined;
  const format  = body["format"] as ExportFormat | undefined;
  const filters = parseFilters(body["filters"]);

  if (!scope  || !EXPORT_SCOPES.includes(scope))   { res.status(400).json({ error: `scope must be one of ${EXPORT_SCOPES.join("|")}` }); return; }
  if (!format || !EXPORT_FORMATS.includes(format)) { res.status(400).json({ error: `format must be one of ${EXPORT_FORMATS.join("|")}` }); return; }
  // CRITICAL (architect fix): reject malformed date filters up-front with a
  // helpful 400 instead of letting them reach the SQL layer as Invalid Date.
  if (filters.since && safeParseDate(filters.since) === null) { res.status(400).json({ error: '"filters.since" must be an ISO date string' }); return; }
  if (filters.until && safeParseDate(filters.until) === null) { res.status(400).json({ error: '"filters.until" must be an ISO date string' }); return; }

  // Role gate per scope
  const isSuper = role === "super_admin";
  const isStaff = role === "venue_owner" || role === "manager";
  if (!isSuper && !isStaff) { res.status(403).json({ error: "Forbidden" }); return; }

  if (!isSuper && (scope === "vendors" || scope === "products")) {
    res.status(403).json({ error: `${scope} export is restricted to super_admin` }); return;
  }
  if (!isSuper && !venueId) {
    res.status(403).json({ error: "Venue scope required" }); return;
  }

  // For staff, force their own venueId. For super_admin, no venue scope.
  const venueScope = isSuper ? null : venueId;

  let rows: Record<string, unknown>[] = [];
  let body_: string;
  let mime: string;
  let ext:  string;
  try {
    rows = await fetchScope(scope, venueScope, filters);
    if (format === "csv") { body_ = toCsv(rows);                              mime = "text/csv; charset=utf-8";        ext = "csv";  }
    else                  { body_ = JSON.stringify({ scope, exportedAt: new Date().toISOString(), count: rows.length, rows }, null, 2); mime = "application/json; charset=utf-8"; ext = "json"; }
  } catch (e) {
    await db.insert(exportLogsTable).values({
      requestedBy:  userId,
      scope, format, venueId: venueScope,
      filters:      filters as Record<string, unknown>,
      rowCount:     0,
      byteCount:    0,
      status:       "failed",
      errorMessage: e instanceof Error ? e.message : "unknown",
    });
    req.log?.error({ err: e, scope, format }, "export failed");
    res.status(500).json({ error: "Export failed" });
    return;
  }

  const bytes = Buffer.byteLength(body_, "utf8");
  await db.insert(exportLogsTable).values({
    requestedBy:  userId,
    scope, format, venueId: venueScope,
    filters:      filters as Record<string, unknown>,
    rowCount:     rows.length,
    byteCount:    bytes,
    status:       "completed",
  });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  res.setHeader("Content-Type",        mime);
  res.setHeader("Content-Disposition", `attachment; filename="${scope}-${stamp}.${ext}"`);
  res.setHeader("X-Export-Rows",       String(rows.length));
  res.setHeader("X-Export-Bytes",      String(bytes));
  res.send(body_);
});

export default router;
