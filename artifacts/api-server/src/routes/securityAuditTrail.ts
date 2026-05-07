/**
 * Security Audit Trail API — anomaly detection and incident ledger.
 *
 * GET   /api/security-audit-trail              List incidents (manager+, venue-scoped)
 * GET   /api/security-audit-trail/open         Open (unresolved) incidents (manager+)
 * POST  /api/security-audit-trail              Append incident (staff+)
 * PATCH /api/security-audit-trail/:auditId/resolve  Acknowledge + close (super_admin)
 *
 * Append-only: no general PATCH or DELETE.
 */

import { Router, type IRouter, type Response } from "express";
import { eq, and, isNull, isNotNull, desc, sql } from "drizzle-orm";
import { z }                                   from "zod";
import {
  db,
  securityAuditTrailTable,
  AUDIT_EVENT_TYPES,
  AUDIT_SEVERITY_LEVELS,
}                                              from "@workspace/db";
import { requireAuth, type AuthRequest }       from "../middleware/auth";
import { requireRole }                         from "../middleware/roles";

const router: IRouter = Router();

const staffUp   = [requireAuth, requireRole("staff",   "manager", "venue_owner", "super_admin")];
const managerUp = [requireAuth, requireRole("manager", "venue_owner", "super_admin")];
const superOnly = [requireAuth, requireRole("super_admin")];

function venueScope(req: AuthRequest): string | null {
  return req.user!.role === "super_admin"
    ? (typeof req.query["venueId"] === "string" ? req.query["venueId"] : null)
    : (req.user!.venueId ?? null);
}

// ── GET / ─────────────────────────────────────────────────────────────────────

const listQuerySchema = z.object({
  eventType:   z.enum(AUDIT_EVENT_TYPES as unknown as [string, ...string[]]).optional(),
  minSeverity: z.coerce.number().int().min(1).max(5).optional(),
  resolved:    z.enum(["true", "false"]).optional(),
  limit:       z.coerce.number().int().min(1).max(200).default(50),
  offset:      z.coerce.number().int().min(0).default(0),
});

router.get("/", ...managerUp, async (req: AuthRequest, res: Response) => {
  const q = listQuerySchema.safeParse(req.query);
  if (!q.success) { res.status(400).json({ error: "Invalid query", details: q.error.flatten() }); return; }

  const { eventType, minSeverity, resolved, limit, offset } = q.data;
  const venueId = venueScope(req);

  const conditions = [];
  if (venueId)    conditions.push(eq(securityAuditTrailTable.venueId, venueId));
  if (eventType)  conditions.push(eq(securityAuditTrailTable.eventType, eventType as typeof AUDIT_EVENT_TYPES[number]));
  if (minSeverity) conditions.push(sql`${securityAuditTrailTable.severityLevel} >= ${minSeverity}`);
  if (resolved === "true")  conditions.push(isNotNull(securityAuditTrailTable.resolvedAt));
  if (resolved === "false") conditions.push(isNull(securityAuditTrailTable.resolvedAt));

  const rows = await db
    .select()
    .from(securityAuditTrailTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(securityAuditTrailTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({ total: rows.length, limit, offset, incidents: rows });
});

// ── GET /open — unresolved incidents ─────────────────────────────────────────

router.get("/open", ...managerUp, async (req: AuthRequest, res: Response) => {
  const venueId = venueScope(req);
  const conditions = [isNull(securityAuditTrailTable.resolvedAt)];
  if (venueId) conditions.push(eq(securityAuditTrailTable.venueId, venueId));

  const rows = await db
    .select()
    .from(securityAuditTrailTable)
    .where(and(...conditions))
    .orderBy(desc(securityAuditTrailTable.severityLevel), desc(securityAuditTrailTable.createdAt))
    .limit(100);

  res.json({ open: rows.length, incidents: rows });
});

// ── POST / — append incident ──────────────────────────────────────────────────

const appendSchema = z.object({
  venueId:       z.string().uuid().optional(),
  deviceId:      z.string().uuid().optional(),
  eventType:     z.enum(AUDIT_EVENT_TYPES as unknown as [string, ...string[]]),
  severityLevel: z.union([
    z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5),
  ]).default(1),
  payloadHash:   z.string().max(512).optional(),
});

router.post("/", ...staffUp, async (req: AuthRequest, res: Response) => {
  const parsed = appendSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() }); return; }

  const effectiveVenueId = parsed.data.venueId ?? req.user!.venueId ?? null;

  const [row] = await db
    .insert(securityAuditTrailTable)
    .values({
      venueId:       effectiveVenueId,
      deviceId:      parsed.data.deviceId   ?? null,
      eventType:     parsed.data.eventType  as typeof AUDIT_EVENT_TYPES[number],
      severityLevel: parsed.data.severityLevel as typeof AUDIT_SEVERITY_LEVELS[number],
      payloadHash:   parsed.data.payloadHash ?? null,
    })
    .returning();

  res.status(201).json({ message: "Incident recorded", auditId: row!.auditId, severityLevel: row!.severityLevel });
});

// ── PATCH /:auditId/resolve ───────────────────────────────────────────────────

router.patch("/:auditId/resolve", ...superOnly, async (req: AuthRequest, res: Response) => {
  const id = String(req.params.auditId ?? "").trim();

  const [row] = await db
    .update(securityAuditTrailTable)
    .set({ resolvedAt: new Date(), resolvedBy: req.user!.id })
    .where(
      and(
        eq(securityAuditTrailTable.auditId, id),
        isNull(securityAuditTrailTable.resolvedAt),
      ),
    )
    .returning({ auditId: securityAuditTrailTable.auditId, resolvedAt: securityAuditTrailTable.resolvedAt });

  if (!row) { res.status(404).json({ error: "Incident not found or already resolved" }); return; }
  res.json({ message: "Incident resolved", auditId: row.auditId, resolvedAt: row.resolvedAt });
});

export default router;
