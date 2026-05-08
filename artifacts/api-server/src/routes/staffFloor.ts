/**
 * staffFloor — live floor overview and operational handoff for staff.
 *
 * GET  /api/staff/floor                       — active guest tiles with AI insights
 * POST /api/staff/handoff                     — trigger assisted discovery mode
 * POST /api/staff/push-recommendation         — push recommendation to guest screen
 * DELETE /api/staff/handoff/:guestProfileId   — end handoff, restore guest session
 */

import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../lib/logger";
import { desc, gte, sql, eq } from "drizzle-orm";
import {
  guestSessionsTable,
  guestProfilesTable,
  xpTransactionsTable,
} from "@workspace/db/schema";

const router = Router();

// In-memory handoff state (production: use Redis)
const activeHandoffs = new Map<string, {
  triggeredAt:    Date;
  staffNote:      string;
  recommendation: string | null;
}>();

// ── GET /api/staff/floor ─────────────────────────────────────────────────────

router.get("/floor", async (req, res) => {
  try {
    const since = new Date(Date.now() - 45 * 60 * 1000); // last 45 min

    // Query active guest sessions from last 45 minutes
    const sessions = await db
      .select({
        sessionId:      guestSessionsTable.id,
        guestProfileId: guestSessionsTable.guestProfileId,
        craftType:      guestSessionsTable.craftType,
        startedAt:      guestSessionsTable.createdAt,
        mentorId:       guestSessionsTable.mentorId,
        swipeHistory:   guestSessionsTable.swipeHistory,
        blendSnapshot:  guestSessionsTable.blendSnapshot,
        status:         guestSessionsTable.status,
      })
      .from(guestSessionsTable)
      .where(gte(guestSessionsTable.createdAt, since))
      .orderBy(desc(guestSessionsTable.createdAt))
      .limit(20);

    // Enrich with guest profiles and XP
    const enriched = await Promise.all(sessions.map(async (s) => {
      let guest: { firstName: string; lastInitial: string; masteryTier: string } | null = null;
      let xpTotal = 0;
      let recentTags: string[] = [];

      // Guest profile
      const [gp] = await db.select({
        firstName:   guestProfilesTable.firstName,
        lastInitial: guestProfilesTable.lastInitial,
        masteryTier: guestProfilesTable.masteryTier,
      }).from(guestProfilesTable)
        .where(eq(guestProfilesTable.id, s.guestProfileId))
        .limit(1).catch(() => []);

      if (gp) guest = gp as typeof guest;

      // XP total from transactions ledger
      const xpResult = await db
        .select({ total: sql<number>`coalesce(sum(${xpTransactionsTable.amount}),0)` })
        .from(xpTransactionsTable)
        .where(eq(xpTransactionsTable.guestProfileId, s.guestProfileId))
        .catch(() => [{ total: 0 }]);
      xpTotal = Number(xpResult[0]?.total ?? 0);

      // Tags from blend snapshot (taste profile keys = flavor tags)
      const blend = (s.blendSnapshot ?? {}) as Record<string, number>;
      recentTags = Object.entries(blend)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([tag]) => tag);

      const swipeHistory = (s.swipeHistory ?? []) as Array<{ action: string }>;
      const swipeCount   = swipeHistory.length;
      const addCount     = swipeHistory.filter(sw => sw.action === "add").length;
      const sessionScore = swipeCount > 0 ? Math.round((addCount / swipeCount) * 100) : 0;

      const handoffState = activeHandoffs.get(s.guestProfileId);

      return {
        sessionId:      s.sessionId,
        guestProfileId: s.guestProfileId,
        craftType:      s.craftType,
        startedAt:      s.startedAt,
        swipeCount,
        sessionScore,
        guest:          guest ?? { firstName: "Anonymous", lastInitial: "", masteryTier: "explorer" },
        xpTotal,
        recentTags,
        inHandoff:      !!handoffState,
        handoffNote:    handoffState?.staffNote ?? null,
        aiInsight:      buildInstantInsight(s.craftType, recentTags, sessionScore, xpTotal),
      };
    }));

    res.json({ guests: enriched, activeHandoffs: activeHandoffs.size, timestamp: new Date() });
  } catch (err) {
    logger.error({ err }, "staff floor error");
    res.status(500).json({ error: "Floor data unavailable" });
  }
});

// ── POST /api/staff/floor/ai-insight ─────────────────────────────────────────

router.post("/floor/ai-insight", async (req, res) => {
  const { craftType, recentTags, sessionScore, xpTotal, guestName } = req.body as {
    craftType: string; recentTags: string[]; sessionScore: number; xpTotal: number; guestName: string;
  };

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      max_completion_tokens: 80,
      messages: [{
        role: "system",
        content: `You are an AI hospitality intelligence system. Generate a single concise actionable insight for a staff member about a guest. Format: one sentence starting with the guest action or observation, followed by a staff recommendation. Be specific and revenue-aware. No fluff.`,
      }, {
        role: "user",
        content: `Guest "${guestName}" is in ${craftType} session. Score: ${sessionScore}/100. XP: ${xpTotal}. Profile tags: ${recentTags.join(", ") || "building"}. Generate staff insight.`,
      }],
    });

    res.json({ insight: response.choices[0]?.message?.content?.trim() ?? buildInstantInsight(craftType, recentTags, sessionScore, xpTotal) });
  } catch (err) {
    logger.warn({ err }, "AI insight failed, using heuristic");
    res.json({ insight: buildInstantInsight(craftType, recentTags, sessionScore, xpTotal) });
  }
});

// ── POST /api/staff/handoff ───────────────────────────────────────────────────

const handoffSchema = z.object({
  guestProfileId: z.string(),
  staffNote:      z.string().default("A Craft Specialist is preparing your experience."),
});

router.post("/handoff", (req, res) => {
  const parsed = handoffSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid" }); return; }

  const { guestProfileId, staffNote } = parsed.data;
  activeHandoffs.set(guestProfileId, { triggeredAt: new Date(), staffNote, recommendation: null });

  res.json({ success: true, message: "Assisted discovery mode activated" });
});

// ── DELETE /api/staff/handoff/:guestProfileId ─────────────────────────────────

router.delete("/handoff/:guestProfileId", (req, res) => {
  activeHandoffs.delete(req.params.guestProfileId);
  res.json({ success: true, message: "Handoff ended — guest session restored" });
});

// ── POST /api/staff/push-recommendation ──────────────────────────────────────

const pushRecSchema = z.object({
  guestProfileId: z.string(),
  recommendation: z.string(),
  type:           z.enum(["pairing","reward","vip","product"]).default("pairing"),
});

router.post("/push-recommendation", (req, res) => {
  const parsed = pushRecSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid" }); return; }

  const { guestProfileId, recommendation } = parsed.data;
  const existing = activeHandoffs.get(guestProfileId);

  if (existing) {
    activeHandoffs.set(guestProfileId, { ...existing, recommendation });
  } else {
    activeHandoffs.set(guestProfileId, {
      triggeredAt: new Date(),
      staffNote: "A Craft Specialist has a recommendation for you.",
      recommendation,
    });
  }

  res.json({ success: true });
});

// ── GET /api/staff/handoff-state/:guestProfileId ─────────────────────────────
// Called by customer device to check if handoff is active

router.get("/handoff-state/:guestProfileId", (req, res) => {
  const state = activeHandoffs.get(req.params.guestProfileId);
  if (!state) { res.json({ active: false }); return; }

  res.json({
    active:         true,
    staffNote:      state.staffNote,
    recommendation: state.recommendation,
    triggeredAt:    state.triggeredAt,
  });
});

// ── Heuristic instant insight (no API call) ───────────────────────────────────

function buildInstantInsight(craftType: string, tags: string[], score: number, xp: number): string {
  const craftLabel = { smoke: "cigar", pour: "spirits", brew: "beer", vape: "vaping" }[craftType] ?? craftType;

  if (score >= 80 && xp >= 200)  return `Guest shows high engagement — ideal moment to suggest a premium ${craftLabel} upgrade or exclusive pairing.`;
  if (tags.some(t => ["bold","robust","full-body","strong"].includes(t.toLowerCase())))
    return `Guest favors bold profiles — recommend your highest-intensity ${craftLabel} option or a power pairing.`;
  if (tags.some(t => ["smooth","mild","delicate","light"].includes(t.toLowerCase())))
    return `Guest trends toward smooth, approachable profiles — a signature introduction offering would convert well now.`;
  if (score < 30) return `Guest engagement is building — consider a complimentary tasting note or curated discovery moment.`;
  if (xp >= 300)  return `Returning guest with strong loyalty profile — a VIP recognition moment would significantly increase retention.`;
  return `Guest is actively building their ${craftLabel} profile — recommend allowing natural discovery before offering suggestions.`;
}

export default router;
