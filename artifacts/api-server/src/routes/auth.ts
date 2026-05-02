import { Router, type IRouter, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { eq, count } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { signToken } from "../lib/jwt";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import type { UserRole } from "@workspace/db";

const router: IRouter = Router();

const BCRYPT_ROUNDS  = 12;
const ADMIN_ROLES    = new Set(["super_admin", "venue_owner", "manager", "staff", "brand_partner", "customer"]);

function sanitizeUser(user: typeof usersTable.$inferSelect) {
  const { passwordHash: _, ...safe } = user;
  return safe;
}

/**
 * POST /api/auth/register
 *
 * The first user registered automatically receives super_admin role.
 * Subsequent registrations default to "customer" unless a valid role is provided.
 */
router.post("/auth/register", async (req: Request, res: Response) => {
  const { name, email, password, role } = req.body as {
    name?: string; email?: string; password?: string; role?: string;
  };

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "Name is required" });
    return;
  }
  if (!email || !email.includes("@")) {
    res.status(400).json({ error: "A valid email is required" });
    return;
  }
  if (!password || password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const existing = await db.select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Email is already registered" });
    return;
  }

  const [{ totalUsers }] = await db
    .select({ totalUsers: count(usersTable.id) })
    .from(usersTable);

  const isFirstUser    = totalUsers === 0;
  const assignedRole   = isFirstUser
    ? "super_admin"
    : (role && ADMIN_ROLES.has(role) ? role as UserRole : "customer");

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const [user] = await db.insert(usersTable).values({
    name:  name.trim(),
    email: email.toLowerCase(),
    passwordHash,
    role:  assignedRole,
  }).returning();

  const token = await signToken({ sub: user.id, email: user.email, role: user.role, name: user.name });

  req.log.info({ userId: user.id, role: user.role }, "user registered");
  res.status(201).json({ token, user: sanitizeUser(user) });
});

/**
 * POST /api/auth/login
 */
router.post("/auth/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const [user] = await db.select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = await signToken({ sub: user.id, email: user.email, role: user.role, name: user.name });

  req.log.info({ userId: user.id }, "user logged in");
  res.json({ token, user: sanitizeUser(user) });
});

/**
 * GET /api/auth/me
 */
router.get("/auth/me", requireAuth, async (req: AuthRequest, res: Response) => {
  const [user] = await db.select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.id))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ user: sanitizeUser(user) });
});

export default router;
