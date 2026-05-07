/**
 * Enterprise Security Logs API — append-only, tenant-isolated security ledger.
 *
 * GET  /api/enterprise-security-logs
 *   Returns logs for the caller's tenant, filtered to clearance level ≤ caller's role.
 *   super_admin may cross-tenant via ?tenantId=.
 *   Query: ?tenantId= &actionType= &minClearance= &maxClearance= &limit= &offset=
 *   Roles: super_admin (all clearance levels)
 *          venue_owner (clearance ≤ 3)
 *          manager     (clearance ≤ 2)
 *          staff       (clearance = 1)
 *
 * POST /api/enterprise-security-logs
 *   Appends a security log entry.  No UPDATE or DELETE routes exist — immutable.
 *   Body: { tenantId, actionType, securityClearanceLevel, encryptedPayloadHash?,
 *           actorId?, actorRole?, ipAddress? }
 *   Roles: staff, manager, venue_owner, super_admin
 */

import { Router, type IRouter, type Response }   from "express";
import { eq, and, desc, sql }                    from "drizzle-orm";
import { z }                                      from "zod";
import {
  db,
  enterpriseSecurityLogsTable,
  SECURITY_CLEARANCE_LEVELS,
}                                                 from "@workspace/db";
import { requireAuth, type AuthRequest }          from "../middleware/auth";
import { requireRole }                            from "../middleware/roles";

const router: IRouter = Router();

const allRoles  = [requireAuth, requireRole("staff", "manager", "venue_owner", "super_admin")];
const readRoles = [requireAuth, requireRole("staff", "manager", "venue_owner", "super_admin")];

// ── Clearance ceiling per role ─────────────────────────────────────────────────

const ROLE_CLEARANCE_CEILING: Record<string, number> = {
  staff:       1,
  manager:     2,
  venue_owner: 3,
  super_admin: 4,
};

function clearanceCeiling(role: string): number {
  return ROLE_CLEARANCE_CEILING[role] ?? 1;
}

// ── GET / ─────────────────────────────────────────────────────────────────────

const listQuerySchema = z.object({
  tenantId:      z.string().uuid().optional(),
  actionType:    z.string().max(100).optional(),
  minClearance:  z.coerce.number().int().min(1).max(4).optional(),
  maxClearance:  z.coerce.number().int().min(1).max(4).optional(),
  limit:         z.coerce.number().int().min(1).max(200).default(50),
  offset:        z.coerce.number().int().min(0).default(0),
});

router.get(
  "/",
  ...readRoles,
  async (req: AuthRequest, res: Response) => {
    const q = listQuerySchema.safeParse(req.query);
    if (!q.success) {
      res.status(400).json({ error: "Invalid query", details: q.error.flatten() });
      return;
    }

    const { actionType, limit, offset } = q.data;
    const role = req.user!.role;

    // Tenant scoping — super_admin can cross-tenant, others locked to their venue
    const effectiveTenantId: string | null =
      role === "super_admin"
        ? (q.data.tenantId ?? null)
        : (req.user!.venueId ?? null);

    // Clearance ceiling — callers never see entries above their role's level
    const roleCeiling = clearanceCeiling(role);
    const maxClearance = Math.min(q.data.maxClearance ?? 4, roleCeiling);
    const minClearance = q.data.minClearance ?? 1;

    if (minClearance > maxClearance) {
      res.status(400).json({ error: "minClearance exceeds your role's clearance ceiling" });
      return;
    }

    const conditions = [
      sql`${enterpriseSecurityLogsTable.securityClearanceLevel} <= ${maxClearance}`,
      sql`${enterpriseSecurityLogsTable.securityClearanceLevel} >= ${minClearance}`,
    ];
    if (effectiveTenantId) conditions.push(eq(enterpriseSecurityLogsTable.tenantId, effectiveTenantId));
    if (actionType)        conditions.push(eq(enterpriseSecurityLogsTable.actionType, actionType));

    const rows = await db
      .select()
      .from(enterpriseSecurityLogsTable)
      .where(and(...conditions))
      .orderBy(desc(enterpriseSecurityLogsTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      total:  rows.length,
      limit,
      offset,
      clearanceCeiling: roleCeiling,
      logs:   rows,
    });
  },
);

// ── POST / — append ───────────────────────────────────────────────────────────

const appendSchema = z.object({
  tenantId:               z.string().uuid(),
  actionType:             z.string().min(1).max(100),
  securityClearanceLevel: z.union([
    z.literal(1), z.literal(2), z.literal(3), z.literal(4),
  ]).default(1),
  encryptedPayloadHash:   z.string().max(512).optional(),
  actorId:                z.string().uuid().optional(),
  actorRole:              z.string().max(50).optional(),
  ipAddress:              z.string().max(45).optional(),
});

router.post(
  "/",
  ...allRoles,
  async (req: AuthRequest, res: Response) => {
    const parsed = appendSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
      return;
    }

    const {
      tenantId, actionType, securityClearanceLevel,
      encryptedPayloadHash, actorId, actorRole, ipAddress,
    } = parsed.data;

    // Enforce: callers can only write entries at or below their own clearance level
    const roleCeiling = clearanceCeiling(req.user!.role);
    if (securityClearanceLevel > roleCeiling) {
      res.status(403).json({
        error: `Cannot write clearance-${securityClearanceLevel} entries — your role ceiling is ${roleCeiling}`,
      });
      return;
    }

    // Non-super_admin can only write to their own tenant
    if (req.user!.role !== "super_admin" && tenantId !== req.user!.venueId) {
      res.status(403).json({ error: "Cross-tenant log write denied" });
      return;
    }

    const [row] = await db
      .insert(enterpriseSecurityLogsTable)
      .values({
        tenantId,
        actorId:                actorId    ?? req.user!.id,
        actorRole:              actorRole  ?? req.user!.role,
        actionType,
        securityClearanceLevel: securityClearanceLevel as typeof SECURITY_CLEARANCE_LEVELS[number],
        encryptedPayloadHash:   encryptedPayloadHash ?? null,
        ipAddress:              ipAddress ?? (req.ip ?? null),
      })
      .returning();

    res.status(201).json({ message: "Security log appended", logId: row!.logId });
  },
);

export default router;
