import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { eq, count, and, isNull } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { signToken } from "../lib/jwt";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { allowOnly } from "../middleware/sanitize";
import type { UserRole } from "@workspace/db";

const router: IRouter = Router();

const BCRYPT_ROUNDS = 12;
const VALID_ROLES   = new Set(["super_admin", "venue_owner", "manager", "staff", "brand_partner", "customer"]);

function sanitizeUser(user: typeof usersTable.$inferSelect) {
  const { passwordHash: _, ...safe } = user;
  return safe;
}

/**
 * POST /api/auth/register
 *
 * The very first user registered automatically becomes super_admin.
 * Subsequent registrations use the requested role (defaulting to "customer").
 */
router.post(
  "/register",
  allowOnly("name", "email", "password", "role"),
  async (req: Request, res: Response) => {
    const { name, email, password, role } = req.body as {
      name?: string; email?: string; password?: string; role?: string;
    };

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      res.status(400).json({ error: "Name is required" }); return;
    }
    if (!email || !email.includes("@")) {
      res.status(400).json({ error: "A valid email is required" }); return;
    }
    if (!password || password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" }); return;
    }

    const existing = await db.select({ id: usersTable.id })
      .from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "Email is already registered" }); return;
    }

    const [{ totalUsers }] = await db
      .select({ totalUsers: count(usersTable.id) }).from(usersTable);

    const assignedRole = totalUsers === 0
      ? "super_admin"
      : (role && VALID_ROLES.has(role) ? role as UserRole : "customer");

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const [user] = await db.insert(usersTable).values({
      name:  name.trim(),
      email: email.toLowerCase(),
      passwordHash,
      role:  assignedRole,
    }).returning();

    const token = await signToken({ sub: user.id, email: user.email, role: user.role, name: user.name, venueId: user.venueId ?? null });

    req.log.info({ userId: user.id, role: user.role }, "user registered");
    res.status(201).json({ token, user: sanitizeUser(user) });
  },
);

/**
 * POST /api/auth/login
 */
router.post(
  "/login",
  allowOnly("email", "password"),
  async (req: Request, res: Response) => {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" }); return;
    }

    const [user] = await db.select().from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase())).limit(1);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: "Invalid email or password" }); return;
    }

    const token = await signToken({ sub: user.id, email: user.email, role: user.role, name: user.name, venueId: user.venueId ?? null });

    req.log.info({ userId: user.id }, "user logged in");

    const response: Record<string, unknown> = { token, user: sanitizeUser(user) };
    if (user.role === "venue_owner" && !user.venueId) {
      req.log.warn({ userId: user.id, role: user.role }, "venue_owner login with no venueId — Sovereign mode will be inaccessible");
      response.warning = "This venue_owner account has no venueId assigned. Sovereign mode will not be accessible until a venueId is set by a super_admin.";
    }

    res.json(response);
  },
);

/**
 * GET /api/auth/me
 */
router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const [user] = await db.select().from(usersTable)
    .where(eq(usersTable.id, req.user!.id)).limit(1);

  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const meResponse: Record<string, unknown> = { user: sanitizeUser(user) };
  if (user.role === "venue_owner" && !user.venueId) {
    req.log.warn({ userId: user.id, role: user.role }, "venue_owner /me with no venueId — Sovereign mode will be inaccessible");
    meResponse.warning = "This venue_owner account has no venueId assigned. Sovereign mode will not be accessible until a venueId is set by a super_admin.";
  }

  res.json(meResponse);
});

/**
 * GET /api/auth/orphaned-venue-owners
 *
 * Super-admin only. Lists all venue_owner accounts that have no venueId assigned,
 * making them unable to access Sovereign mode.
 */
router.get("/orphaned-venue-owners", requireAuth, async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const orphaned = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(
    and(eq(usersTable.role, "venue_owner"), isNull(usersTable.venueId))
  );

  res.json({ count: orphaned.length, users: orphaned });
});

/**
 * PATCH /api/auth/assign-venue/:userId
 *
 * Super-admin only. Assigns a venueId to a venue_owner account that was
 * created without one (legacy accounts), restoring their Sovereign mode access.
 */
router.patch("/assign-venue/:userId", requireAuth, allowOnly("venueId"), async (req: AuthRequest, res: Response) => {
  if (req.user?.role !== "super_admin") {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  const { userId } = req.params as { userId: string };
  const { venueId } = req.body as { venueId?: string };

  if (!venueId || typeof venueId !== "string" || venueId.trim().length === 0) {
    res.status(400).json({ error: "venueId is required" }); return;
  }

  const [target] = await db.select({ id: usersTable.id, role: usersTable.role })
    .from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  if (!target) { res.status(404).json({ error: "User not found" }); return; }
  if (target.role !== "venue_owner") {
    res.status(400).json({ error: "Only venue_owner accounts can be assigned a venueId via this endpoint" }); return;
  }

  const [updated] = await db.update(usersTable)
    .set({ venueId: venueId.trim() })
    .where(eq(usersTable.id, userId))
    .returning();

  req.log.info({ adminId: req.user.id, targetUserId: userId, venueId: venueId.trim() }, "super_admin assigned venueId to venue_owner");
  res.json({ user: sanitizeUser(updated) });
});

/**
 * POST /api/auth/kiosk
 *
 * Provisions a device-scoped kiosk user on first boot, then re-issues a
 * fresh JWT on every call — supports proactive 30-minute refresh from the
 * frontend without user interaction. No password required; kiosk devices
 * authenticate by deviceId only.
 */
router.post(
  "/kiosk",
  allowOnly("deviceId"),
  async (req: Request, res: Response) => {
    const { deviceId } = req.body as { deviceId?: string };

    if (!deviceId || typeof deviceId !== "string" || deviceId.trim().length < 4) {
      res.status(400).json({ error: "A valid deviceId (min 4 chars) is required" });
      return;
    }

    const sanitized = deviceId.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 64);
    const email     = `kiosk-${sanitized}@kiosk.internal`;
    const name      = `Kiosk ${sanitized.slice(0, 12)}`;

    let [user] = await db.select().from(usersTable)
      .where(eq(usersTable.email, email)).limit(1);

    if (!user) {
      // Random password — kiosk users never authenticate via password
      const passwordHash = await bcrypt.hash(`kiosk-${Math.random()}`, BCRYPT_ROUNDS);
      try {
        [user] = await db.insert(usersTable).values({
          name,
          email,
          passwordHash,
          role: "customer" as UserRole,
        }).returning();
        req.log.info({ deviceId, userId: user.id }, "kiosk user created");
      } catch {
        // Race condition — another request created it first; re-fetch
        [user] = await db.select().from(usersTable)
          .where(eq(usersTable.email, email)).limit(1);
        if (!user) {
          res.status(500).json({ error: "Failed to provision kiosk device user" });
          return;
        }
      }
    }

    const token = await signToken({
      sub:     user.id,
      email:   user.email,
      role:    user.role,
      name:    user.name,
      venueId: user.venueId ?? null,
    });

    req.log.info({ deviceId, userId: user.id }, "kiosk auth issued");
    res.json({ token, user: sanitizeUser(user) });
  },
);

export default router;
