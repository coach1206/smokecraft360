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
import { z }                                    from "zod";
import { verifyUnsubscribeToken }               from "../workers/telemetryDigestWorker";

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

// ── PATCH /api/users/me/telemetry-digest ──────────────────────────────────────
// Allows any authenticated user to update their own telemetry digest opt-out
// preference.  Returns the updated preference state.
//
// Body: { optOut: boolean }
//
// Also accepts a token-based opt-out for unsubscribe links in emails:
//   GET /api/users/me/telemetry-digest?token=opt-out&uid=<userId>
// This route handles both so the email link does not require a login.

const OptOutBodySchema = z.object({ optOut: z.boolean() });

router.patch(
  "/users/me/telemetry-digest",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const parsed = OptOutBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Body must be { optOut: boolean }" }); return;
    }
    const userId = req.user!.id;
    const [updated] = await db
      .update(usersTable)
      .set({ telemetryDigestOptOut: parsed.data.optOut })
      .where(sql`${usersTable.id} = ${userId}::uuid`)
      .returning({ telemetryDigestOptOut: usersTable.telemetryDigestOptOut });

    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    res.json({ telemetryDigestOptOut: updated.telemetryDigestOptOut });
  },
);

// Token-based unsubscribe — two-step flow to prevent prefetcher-triggered opt-outs.
//
// GET  /api/users/me/telemetry-digest?token=<hmac>&uid=<userId>
//   → Validates token, renders a confirmation page with a POST form.
//     Does NOT mutate state — safe for link prefetchers / email clients.
//
// POST /api/users/me/telemetry-digest/confirm
//   → Validates token from form body, performs the actual opt-out update.
//
// Tokens are HMAC-SHA256 signed with SESSION_SECRET and cannot be forged
// or used to opt out another user.

const UUID_RE_UNSUB = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

router.get(
  "/users/me/telemetry-digest",
  async (req: AuthRequest, res: Response) => {
    const { token, uid } = req.query as Record<string, string | undefined>;
    if (!token || !uid) {
      res.status(400).json({ error: "Missing token or uid" }); return;
    }
    if (!UUID_RE_UNSUB.test(uid)) { res.status(400).json({ error: "Invalid uid" }); return; }
    if (!verifyUnsubscribeToken(uid, token)) {
      res.status(403).json({ error: "Invalid or expired unsubscribe token" }); return;
    }
    res.send(`
      <!doctype html>
      <html><head><meta charset="utf-8"><title>Unsubscribe</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:64px;background:#f9f6f1;">
        <h2 style="margin-bottom:8px;">Unsubscribe from Weekly Digest?</h2>
        <p style="color:#555;margin-bottom:32px;">You will no longer receive weekly telemetry digest emails.</p>
        <form method="POST" action="/api/users/me/telemetry-digest/confirm">
          <input type="hidden" name="uid"   value="${uid.replace(/"/g, "")}">
          <input type="hidden" name="token" value="${token.replace(/"/g, "")}">
          <button type="submit"
            style="background:#D48B00;color:#fff;border:none;padding:12px 32px;font-size:16px;border-radius:6px;cursor:pointer;">
            Confirm Unsubscribe
          </button>
        </form>
      </body></html>
    `);
  },
);

router.post(
  "/users/me/telemetry-digest/confirm",
  async (req: AuthRequest, res: Response) => {
    const { token, uid } = req.body as Record<string, string | undefined>;
    if (!token || !uid) {
      res.status(400).json({ error: "Missing token or uid" }); return;
    }
    if (!UUID_RE_UNSUB.test(uid)) { res.status(400).json({ error: "Invalid uid" }); return; }
    if (!verifyUnsubscribeToken(uid, token)) {
      res.status(403).json({ error: "Invalid or expired unsubscribe token" }); return;
    }

    const [updated] = await db
      .update(usersTable)
      .set({ telemetryDigestOptOut: true })
      .where(eq(usersTable.id, uid))
      .returning({ id: usersTable.id });

    if (!updated) { res.status(404).json({ error: "User not found" }); return; }
    res.send(`
      <!doctype html>
      <html><head><meta charset="utf-8"><title>Unsubscribed</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:64px;background:#f9f6f1;">
        <h2>You have been unsubscribed.</h2>
        <p style="color:#555;">You will no longer receive weekly telemetry digest emails.</p>
      </body></html>
    `);
  },
);

export default router;
