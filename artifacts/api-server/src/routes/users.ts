/**
 * /api/users — user management endpoints for admin/staff panels.
 *
 *   GET /api/users           — list users (manager+, filterable by role)
 *   GET /api/users/:id       — get a single user (manager+)
 *   PATCH /api/users/:id/role — change role (super_admin only)
 */

import { Router, type IRouter, type Response } from "express";
import { db, usersTable }                       from "@workspace/db";
import { requireAuth, type AuthRequest }        from "../middleware/auth";
import { requireRole }                          from "../middleware/roles";
import type { UserRole }                        from "@workspace/db";
import { sql, and, eq }                         from "drizzle-orm";

const router: IRouter = Router();

const VALID_ROLES = new Set<string>(["super_admin", "venue_owner", "manager", "staff", "brand_partner", "customer"]);

function sanitizeUser(user: typeof usersTable.$inferSelect) {
  const { passwordHash: _, ...safe } = user;
  return safe;
}

// ── GET /api/users ────────────────────────────────────────────────────────────
router.get(
  "/users",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const roleFilter = typeof req.query["role"] === "string" ? req.query["role"] : null;

    const filters = [];

    if (roleFilter && VALID_ROLES.has(roleFilter)) {
      filters.push(eq(usersTable.role, roleFilter as UserRole));
    }

    const venueId = req.user!.venueId;
    if (req.user!.role !== "super_admin" && typeof venueId === "string") {
      filters.push(sql`${usersTable.venueId} = ${venueId}::uuid`);
    }

    const rows = await (filters.length > 0
      ? db.select().from(usersTable).where(and(...filters)).limit(200)
      : db.select().from(usersTable).limit(200)
    );

    res.json(rows.map(sanitizeUser));
  },
);

// ── GET /api/users/:id ────────────────────────────────────────────────────────
router.get(
  "/users/:id",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const userId = String(req.params["id"] ?? "");
    if (!userId) { res.status(400).json({ error: "Missing id" }); return; }

    const [user] = await db
      .select()
      .from(usersTable)
      .where(sql`${usersTable.id} = ${userId}::uuid`)
      .limit(1);

    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json(sanitizeUser(user));
  },
);

// ── PATCH /api/users/:id/role ─────────────────────────────────────────────────
router.patch(
  "/users/:id/role",
  requireAuth,
  requireRole("super_admin"),
  async (req: AuthRequest, res: Response) => {
    const userId = String(req.params["id"] ?? "");
    const { role } = req.body as { role?: string };

    if (!userId) { res.status(400).json({ error: "Missing id" }); return; }
    if (!role || !VALID_ROLES.has(role)) {
      res.status(400).json({ error: "Invalid role" }); return;
    }

    const [updated] = await db
      .update(usersTable)
      .set({ role: role as UserRole })
      .where(sql`${usersTable.id} = ${userId}::uuid`)
      .returning();

    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    res.json(sanitizeUser(updated));
  },
);

export default router;
