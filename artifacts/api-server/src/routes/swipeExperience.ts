/**
 * swipeExperience — Universal Swipe Experience Engine API.
 *
 * POST /api/swipe-experience/session/start       — create a new session
 * GET  /api/swipe-experience/:type/cards         — get adaptive card batch
 * POST /api/swipe-experience/swipe               — record a swipe
 * GET  /api/swipe-experience/session/:id/recommendations — final recommendations
 * POST /api/swipe-experience/session/:id/complete — mark session complete
 * GET  /api/swipe-experience/memory/:userId       — get user taste memory
 * GET  /api/swipe-experience/analytics            — swipe analytics (admin)
 */

import { Router, type IRouter, type Response } from "express";
import { eq, and, sql, count, desc } from "drizzle-orm";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import {
  db,
  experienceSessionsTable,
  sessionSwipesTable,
  userTasteMemoryTable,
  recommendationEventsTable,
  analyticsEventsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { updateTasteMemory, getTasteProfile } from "../services/memoryBrain";
import { getAdaptiveCards, getFinalRecommendations } from "../services/adaptivePairingEngine";

const router: IRouter = Router();

// Rate limit: 120 swipes per 10 min per IP
const swipeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit:    120,
  standardHeaders: "draft-7",
  legacyHeaders:   false,
  message: { error: "Too many swipes — please slow down" },
});

const VALID_TYPES = ["smoke", "pour", "brew", "vape"] as const;
type CraftType = typeof VALID_TYPES[number];

function isValidType(v: unknown): v is CraftType {
  return typeof v === "string" && (VALID_TYPES as readonly string[]).includes(v);
}

// ── POST /api/swipe-experience/session/start ──────────────────────────────────

const startSchema = z.object({
  experienceType: z.enum(VALID_TYPES),
  userId:         z.string().uuid().optional(),
});

router.post("/session/start", async (req: AuthRequest, res: Response) => {
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "experienceType must be one of: smoke, pour, brew, vape" });
    return;
  }

  const userId = req.user?.id ?? parsed.data.userId ?? null;

  const [session] = await db
    .insert(experienceSessionsTable)
    .values({
      userId,
      experienceType: parsed.data.experienceType,
      status:         "active",
    })
    .returning();

  req.log?.info({ sessionId: session!.id, userId, type: parsed.data.experienceType }, "swipe session started");
  res.status(201).json({ session });
});

// ── GET /api/swipe-experience/:type/cards ─────────────────────────────────────

router.get("/:type/cards", async (req: AuthRequest, res: Response) => {
  const type      = req.params["type"] as string;
  const sessionId = req.query["sessionId"] as string | undefined;

  if (!isValidType(type)) {
    res.status(400).json({ error: "type must be one of: smoke, pour, brew, vape" });
    return;
  }
  if (!sessionId) {
    res.status(400).json({ error: "sessionId is required" });
    return;
  }

  const userId = req.user?.id ?? null;
  const cards  = await getAdaptiveCards(userId, type, sessionId);

  res.json({ cards, count: cards.length });
});

// ── POST /api/swipe-experience/swipe ──────────────────────────────────────────

const swipeSchema = z.object({
  sessionId:      z.string().uuid(),
  itemId:         z.string().uuid(),
  experienceType: z.enum(VALID_TYPES),
  action:         z.enum(["add", "skip"]),
  tags:           z.array(z.string().max(60)).max(20).default([]),
});

router.post("/swipe", swipeLimiter, async (req: AuthRequest, res: Response) => {
  const parsed = swipeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid swipe payload" });
    return;
  }

  const { sessionId, itemId, experienceType, action, tags } = parsed.data;
  const userId = req.user?.id ?? null;

  // Validate session exists and is active
  const [session] = await db
    .select({ id: experienceSessionsTable.id, status: experienceSessionsTable.status })
    .from(experienceSessionsTable)
    .where(eq(experienceSessionsTable.id, sessionId));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  if (session.status !== "active") {
    res.status(409).json({ error: "Session is not active" });
    return;
  }

  // Record swipe
  const scoreDelta = action === "add" ? 3 : -1;
  const [swipe] = await db
    .insert(sessionSwipesTable)
    .values({ sessionId, userId, itemId, experienceType, action, tags, scoreDelta })
    .returning();

  // Update taste memory for authenticated users
  if (userId && tags.length) {
    await updateTasteMemory(userId, tags, action).catch(() => {});
  }

  // Record analytics event
  if (userId) {
    await db
      .insert(analyticsEventsTable)
      .values({
        userId,
        eventType: action === "add" ? "swipe_right" : "swipe_left",
        metadata:  { sessionId, itemId, experienceType, tags },
      })
      .catch(() => {});
  }

  const feedback = action === "add"
    ? "Added to your taste profile"
    : "Skipped — learning your preferences";

  res.json({ swipe, feedback });
});

// ── GET /api/swipe-experience/session/:id/recommendations ─────────────────────

router.get("/session/:id/recommendations", async (req: AuthRequest, res: Response) => {
  const sessionId = req.params["id"] as string;
  if (!sessionId) { res.status(400).json({ error: "sessionId required" }); return; }

  const recommendations = await getFinalRecommendations(sessionId);

  if (!recommendations.length) {
    res.json({
      recommendations: [],
      fallback: "No stocked match found. Add inventory tags to improve recommendations.",
    });
    return;
  }

  // Record recommendation events
  const userId = req.user?.id ?? null;
  for (const rec of recommendations) {
    await db
      .insert(recommendationEventsTable)
      .values({
        sessionId,
        userId,
        experienceType: rec.item.category ?? "unknown",
        inventoryItemId: rec.item.id,
        recommendationScore: rec.score,
        reason: rec.reason,
        shown: true,
      })
      .catch(() => {});
  }

  res.json({ recommendations });
});

// ── POST /api/swipe-experience/session/:id/complete ───────────────────────────

router.post("/session/:id/complete", async (req: AuthRequest, res: Response) => {
  const sessionId = req.params["id"] as string;
  if (!sessionId) { res.status(400).json({ error: "sessionId required" }); return; }

  const recommendations = await getFinalRecommendations(sessionId);

  const [updated] = await db
    .update(experienceSessionsTable)
    .set({
      status:               "completed",
      completedAt:          new Date(),
      finalRecommendations: recommendations as unknown as Record<string, unknown>[],
    })
    .where(
      and(
        eq(experienceSessionsTable.id, sessionId),
        eq(experienceSessionsTable.status, "active"),
      )
    )
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Session not found or already completed" });
    return;
  }

  req.log?.info({ sessionId }, "swipe session completed");
  res.json({ session: updated, recommendations });
});

// ── GET /api/swipe-experience/memory/:userId ──────────────────────────────────

router.get(
  "/memory/:userId",
  requireAuth,
  requireRole("super_admin", "venue_owner", "manager"),
  async (req: AuthRequest, res: Response) => {
    const userId = req.params["userId"] as string;
    if (!userId) { res.status(400).json({ error: "userId required" }); return; }

    const profile = await getTasteProfile(userId);
    const rawRows = await db
      .select()
      .from(userTasteMemoryTable)
      .where(eq(userTasteMemoryTable.userId, userId));

    res.json({ profile, rawMemory: rawRows });
  }
);

// ── GET /api/swipe-experience/analytics ──────────────────────────────────────

router.get(
  "/analytics",
  requireAuth,
  requireRole("super_admin", "venue_owner", "manager"),
  async (_req: AuthRequest, res: Response) => {
    // Top selected tags
    const topSelected = await db
      .select({
        tag:   sql<string>`unnest(${sessionSwipesTable.tags})`.as("tag"),
        count: count().as("count"),
      })
      .from(sessionSwipesTable)
      .where(eq(sessionSwipesTable.action, "add"))
      .groupBy(sql`unnest(${sessionSwipesTable.tags})`)
      .orderBy(desc(count()))
      .limit(10);

    // Top skipped tags
    const topSkipped = await db
      .select({
        tag:   sql<string>`unnest(${sessionSwipesTable.tags})`.as("tag"),
        count: count().as("count"),
      })
      .from(sessionSwipesTable)
      .where(eq(sessionSwipesTable.action, "skip"))
      .groupBy(sql`unnest(${sessionSwipesTable.tags})`)
      .orderBy(desc(count()))
      .limit(10);

    // Sessions by type
    const byType = await db
      .select({
        experienceType: experienceSessionsTable.experienceType,
        count:          count().as("count"),
      })
      .from(experienceSessionsTable)
      .groupBy(experienceSessionsTable.experienceType)
      .orderBy(desc(count()));

    // Recommendation acceptance rate
    const recStats = await db
      .select({
        shown:    count().as("shown"),
        accepted: sql<number>`SUM(CASE WHEN ${recommendationEventsTable.accepted} THEN 1 ELSE 0 END)`.as("accepted"),
      })
      .from(recommendationEventsTable)
      .then(r => r[0] ?? { shown: 0, accepted: 0 });

    res.json({
      topSelectedTags:         topSelected,
      topSkippedTags:          topSkipped,
      sessionsByType:          byType,
      recommendationShown:     Number(recStats.shown),
      recommendationAccepted:  Number(recStats.accepted),
      acceptanceRate:          recStats.shown
        ? Math.round((Number(recStats.accepted) / Number(recStats.shown)) * 100)
        : 0,
    });
  }
);

export default router;
