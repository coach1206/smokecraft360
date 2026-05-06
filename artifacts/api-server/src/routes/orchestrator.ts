/**
 * orchestrator — API routes for predictive behavioral orchestration.
 *
 * POST /api/orchestrator/signal  — receive session signals, compute + persist profile
 * GET  /api/orchestrator/analytics — aggregated orchestration metrics for analytics tab
 *
 * Auth: requireAuth (any logged-in user for signal; analytics requires role check).
 * Unauthenticated requests to /signal are accepted but venueId is not persisted.
 */

import { Router, type IRouter, type Response, type Request } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { db } from "@workspace/db";
import {
  orchestratorEventsTable,
  experienceControlSettingsTable,
} from "@workspace/db/schema";
import { eq, isNull, desc, avg as sqlAvg, count, sql } from "drizzle-orm";
import { z } from "zod";
import {
  computeOrchestrationProfile,
  type SwipeSignal,
  type SessionAccumulator,
  type CraftType,
  type VenueMode,
} from "../services/predictiveOrchestrator";

const router: IRouter = Router();

// ── Zod schemas ───────────────────────────────────────────────────────────────

const swipeSignalSchema = z.object({
  direction:    z.enum(["add", "skip"]),
  swipeMs:      z.number().min(0).max(60000),
  hesitationMs: z.number().min(0).max(60000),
  tags:         z.array(z.string()).max(20),
  marginPct:    z.number().min(0).max(100),
  isPremium:    z.boolean(),
});

const signalBodySchema = z.object({
  sessionId: z.string().uuid().optional(),
  craftType: z.enum(["smoke", "pour", "brew", "vape"]).default("smoke"),
  signals:   z.array(swipeSignalSchema).max(50),
  sessionStart: z.number().optional(), // epoch ms
});

// ── POST /api/orchestrator/signal ─────────────────────────────────────────────

router.post(
  "/signal",
  async (req: Request, res: Response): Promise<void> => {
    const parsed = signalBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues });
      return;
    }

    const { sessionId, craftType, signals, sessionStart } = parsed.data;
    const authReq = req as AuthRequest;
    const venueId = authReq.user?.venueId ?? null;

    // Fetch venue mode from experience control settings (global row)
    let venueMode: VenueMode | null = null;
    if (venueId) {
      const [settings] = await db
        .select({ venueMode: experienceControlSettingsTable.venueMode })
        .from(experienceControlSettingsTable)
        .where(eq(experienceControlSettingsTable.venueId, venueId))
        .limit(1);
      venueMode = (settings?.venueMode as VenueMode) ?? null;
    }

    const acc: SessionAccumulator = {
      signals:      signals as SwipeSignal[],
      craftType:    craftType as CraftType,
      sessionStart: sessionStart ?? (Date.now() - signals.length * 2000),
    };

    const profile = computeOrchestrationProfile(acc, venueMode);

    // Persist event for analytics (fire-and-forget — don't block response)
    if (signals.length >= 2) {
      db.insert(orchestratorEventsTable).values({
        sessionId:              sessionId ?? undefined,
        venueId:                venueId   ?? undefined,
        craftType,
        mood:                   profile.mood,
        pacing:                 profile.pacing,
        confidence:             profile.confidence,
        premiumIntent:          profile.premiumIntent,
        socialEnergy:           profile.socialEnergy,
        recommendationPressure: profile.recommendationPressure,
        atmosphereIntensity:    profile.atmosphereIntensity,
        venueMode:              venueMode ?? undefined,
        sessionDepth:           profile.sessionDepth,
        avgSwipeMs:             profile.avgSwipeMs,
        skipRatio:              String(profile.skipRatio),
      }).catch(() => { /* non-blocking analytics — ignore DB errors */ });
    }

    res.json({ profile });
  },
);

// ── GET /api/orchestrator/analytics ───────────────────────────────────────────

router.get(
  "/analytics",
  requireAuth,
  requireRole("venue_owner", "manager", "super_admin"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const venueId = req.user!.venueId;

    const whereClause = venueId
      ? eq(orchestratorEventsTable.venueId, venueId)
      : isNull(orchestratorEventsTable.venueId);

    // Aggregate metrics
    const [agg] = await db
      .select({
        totalSessions:           count(orchestratorEventsTable.id),
        avgPremiumIntent:        sqlAvg(orchestratorEventsTable.premiumIntent),
        avgSocialEnergy:         sqlAvg(orchestratorEventsTable.socialEnergy),
        avgRecPressure:          sqlAvg(orchestratorEventsTable.recommendationPressure),
        avgAtmosphere:           sqlAvg(orchestratorEventsTable.atmosphereIntensity),
        avgConfidence:           sqlAvg(orchestratorEventsTable.confidence),
        avgSessionDepth:         sqlAvg(orchestratorEventsTable.sessionDepth),
      })
      .from(orchestratorEventsTable)
      .where(whereClause);

    // Mood distribution
    const moodRows = await db
      .select({
        mood:  orchestratorEventsTable.mood,
        total: count(orchestratorEventsTable.id),
      })
      .from(orchestratorEventsTable)
      .where(whereClause)
      .groupBy(orchestratorEventsTable.mood);

    // Pacing distribution
    const pacingRows = await db
      .select({
        pacing: orchestratorEventsTable.pacing,
        total:  count(orchestratorEventsTable.id),
      })
      .from(orchestratorEventsTable)
      .where(whereClause)
      .groupBy(orchestratorEventsTable.pacing);

    // Recent 20 events for a timeline
    const recent = await db
      .select()
      .from(orchestratorEventsTable)
      .where(whereClause)
      .orderBy(desc(orchestratorEventsTable.createdAt))
      .limit(20);

    res.json({
      totals: agg,
      moodDistribution:   moodRows,
      pacingDistribution: pacingRows,
      recent,
    });
  },
);

export default router;
