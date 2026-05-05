/**
 * AI Auto-Configuration Engine
 *
 * POST /api/ai/configure
 *   — Deterministically generates a venue AI behavior config from
 *     venue profile inputs (type, size, demographic, categories).
 *     Saves to ai_configurations table and returns the config.
 *
 * GET /api/ai/configure/:venueId
 *   — Returns the most recent AI config for a venue.
 */

import { Router, type IRouter, type Response } from "express";
import { eq, desc }                             from "drizzle-orm";
import { z }                                    from "zod";
import { db, aiConfigurationsTable }            from "@workspace/db";
import { requireAuth, type AuthRequest }        from "../middleware/auth";
import { requireRole }                          from "../middleware/roles";
import { logger }                               from "../lib/logger";

const router: IRouter = Router();

const configureSchema = z.object({
  venueId:           z.string().uuid().optional(),
  venueName:         z.string().min(1).max(100).optional(),
  venueType:         z.enum(["cigar_lounge", "bar", "restaurant", "hotel", "club", "retail"]).optional(),
  menuSize:          z.enum(["small", "medium", "large"]).optional(),
  targetDemographic: z.enum(["upscale", "casual", "mixed", "business"]).optional(),
  focusCategories:   z.array(z.string()).optional(),
  experienceGoal:    z.enum(["revenue", "loyalty", "discovery", "balanced"]).optional(),
});

type ConfigInput = z.infer<typeof configureSchema>;

function buildAiConfig(input: ConfigInput): Record<string, unknown> {
  const { venueType = "cigar_lounge", menuSize = "medium", targetDemographic = "upscale", focusCategories = [], experienceGoal = "balanced" } = input;

  const tonePresets: Record<string, string> = {
    upscale:  "Refined, knowledgeable, and understated. Lead with heritage and craftsmanship.",
    casual:   "Friendly, approachable, and enthusiastic. Make exploration fun.",
    mixed:    "Warm and welcoming. Balance expertise with accessibility.",
    business: "Professional, efficient, and precise. Respect the guest's time.",
  };

  const strengthBias: Record<string, string> = {
    cigar_lounge: "full",
    bar:          "medium",
    restaurant:   "light",
    hotel:        "medium",
    club:         "medium",
    retail:       "any",
  };

  const upsellIntensity: Record<string, number> = {
    revenue:   0.9,
    loyalty:   0.5,
    discovery: 0.4,
    balanced:  0.7,
  };

  const loyaltyWeight: Record<string, number> = {
    revenue:   0.3,
    loyalty:   0.9,
    discovery: 0.5,
    balanced:  0.65,
  };

  const menuDepth = menuSize === "large" ? "deep" : menuSize === "medium" ? "standard" : "curated";
  const crossSellEnabled = focusCategories.length > 1;

  return {
    tonePreset:           tonePresets[targetDemographic] ?? tonePresets.upscale,
    strengthBias:         strengthBias[venueType] ?? "medium",
    upsellIntensity:      upsellIntensity[experienceGoal] ?? 0.7,
    loyaltyWeight:        loyaltyWeight[experienceGoal] ?? 0.65,
    menuDepth,
    crossSellEnabled,
    focusCategories:      focusCategories.length > 0 ? focusCategories : ["cigar", "spirit"],
    maxRecommendations:   menuSize === "large" ? 6 : 3,
    pairingEnabled:       venueType !== "retail",
    foodPairingEnabled:   venueType === "restaurant" || venueType === "hotel",
    experienceGoal,
    generatedAt:          new Date().toISOString(),
    version:              "2.0",
  };
}

// ── POST /api/ai/configure ─────────────────────────────────────────────────────

router.post(
  "/ai/configure",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const parsed = configureSchema.safeParse(req.body);
    if (!parsed.success) { res.status(422).json({ error: parsed.error.flatten() }); return; }

    const venueId = parsed.data.venueId ?? req.user?.venueId ?? null;
    const config = buildAiConfig(parsed.data);

    const [row] = await db
      .insert(aiConfigurationsTable)
      .values({ venueId: venueId ?? undefined, configType: "experience", config })
      .returning();

    logger.info({ venueId, configId: row.id }, "AI configuration generated");
    res.status(201).json({ ok: true, config: row });
  },
);

// ── GET /api/ai/configure/:venueId ────────────────────────────────────────────

router.get(
  "/ai/configure/:venueId",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const venueId = String(req.params.venueId ?? "");

    const rows = await db
      .select()
      .from(aiConfigurationsTable)
      .where(eq(aiConfigurationsTable.venueId, venueId))
      .orderBy(desc(aiConfigurationsTable.createdAt))
      .limit(1);

    if (!rows[0]) { res.status(404).json({ error: "No config found" }); return; }
    res.json(rows[0]);
  },
);

export default router;
