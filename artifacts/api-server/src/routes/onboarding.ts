/**
 * Onboarding routes
 *
 * POST /api/onboarding/start
 *   — creates a new onboarding session
 *
 * PATCH /api/onboarding/:id
 *   — updates step data during wizard flow
 *
 * POST /api/onboarding/:id/complete
 *   — marks the session complete and seeds initial venue data
 */

import { Router, type IRouter, type Response } from "express";
import { eq }                                   from "drizzle-orm";
import { z }                                    from "zod";
import { db, onboardingSessionsTable, venuesTable } from "@workspace/db";
import { requireAuth, type AuthRequest }         from "../middleware/auth";
import { requireRole }                           from "../middleware/roles";
import { logger }                                from "../lib/logger";

const router: IRouter = Router();

const startSchema = z.object({
  venueId: z.string().uuid().optional(),
});

const stepSchema = z.object({
  step: z.enum(["venue_info", "hardware", "menu", "ai_config", "go_live"]),
  data: z.record(z.unknown()),
});

// ── POST /api/onboarding/start ─────────────────────────────────────────────────

router.post(
  "/onboarding/start",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success) { res.status(422).json({ error: parsed.error.flatten() }); return; }

    const venueId = parsed.data.venueId ?? req.user?.venueId ?? null;

    const [session] = await db
      .insert(onboardingSessionsTable)
      .values({ venueId: venueId ?? undefined, step: "venue_info", data: {} })
      .returning();

    logger.info({ sessionId: session.id, venueId }, "Onboarding session started");
    res.status(201).json(session);
  },
);

// ── PATCH /api/onboarding/:id ──────────────────────────────────────────────────

router.patch(
  "/onboarding/:id",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const parsed = stepSchema.safeParse(req.body);
    if (!parsed.success) { res.status(422).json({ error: parsed.error.flatten() }); return; }

    const existing = await db
      .select()
      .from(onboardingSessionsTable)
      .where(eq(onboardingSessionsTable.id, String(req.params.id ?? "")))
      .limit(1);

    if (!existing[0]) { res.status(404).json({ error: "Session not found" }); return; }
    if (existing[0].completed) { res.status(409).json({ error: "Session already completed" }); return; }

    const merged = { ...(existing[0].data as Record<string, unknown>), ...parsed.data.data };

    const [updated] = await db
      .update(onboardingSessionsTable)
      .set({ step: parsed.data.step, data: merged, updatedAt: new Date() })
      .where(eq(onboardingSessionsTable.id, String(req.params.id ?? "")))
      .returning();

    res.json(updated);
  },
);

// ── POST /api/onboarding/:id/complete ─────────────────────────────────────────

router.post(
  "/onboarding/:id/complete",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const existing = await db
      .select()
      .from(onboardingSessionsTable)
      .where(eq(onboardingSessionsTable.id, String(req.params.id ?? "")))
      .limit(1);

    if (!existing[0]) { res.status(404).json({ error: "Session not found" }); return; }
    if (existing[0].completed) { res.status(409).json({ error: "Already completed" }); return; }

    const sessionData = existing[0].data as Record<string, unknown>;

    // Seed venue name if provided
    const venueName = typeof sessionData.venueName === "string" ? sessionData.venueName : null;
    const venueId = existing[0].venueId ?? req.user?.venueId;
    if (venueName && venueId) {
      try {
        await db
          .update(venuesTable)
          .set({ name: venueName })
          .where(eq(venuesTable.id, venueId));
      } catch {
        // Non-fatal — venue update is best-effort
      }
    }

    const [completed] = await db
      .update(onboardingSessionsTable)
      .set({ completed: true, step: "go_live", updatedAt: new Date() })
      .where(eq(onboardingSessionsTable.id, String(req.params.id ?? "")))
      .returning();

    logger.info({ sessionId: completed.id, venueId }, "Onboarding session completed");
    res.json({ ok: true, session: completed });
  },
);

export default router;
