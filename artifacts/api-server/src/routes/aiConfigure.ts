/**
 * AI Auto-Configuration Engine
 *
 * POST /api/ai/configure
 *   — Deterministically generates a venue AI behavior config from venue profile
 *     inputs. Includes pricing strategy per tier, recommended products per craft,
 *     upsell sequences, experience flow weights. Applies config as a feature flag.
 *
 * GET /api/ai/configure/:venueId
 *   — Returns the most recent active AI config for a venue.
 */

import { Router, type IRouter, type Response } from "express";
import { eq, desc, and }                        from "drizzle-orm";
import { z }                                    from "zod";
import { db, aiConfigurationsTable, featureFlagsTable } from "@workspace/db";
import { requireAuth, type AuthRequest }        from "../middleware/auth";
import { requireRole }                          from "../middleware/roles";
import { logger }                               from "../lib/logger";

const router: IRouter = Router();

const configureSchema = z.object({
  venueId:           z.string().uuid().optional(),
  venueName:         z.string().min(1).max(100).optional(),
  /** Required: determines default tone, strength bias, and food-pairing eligibility */
  venueType:         z.enum(["cigar_lounge", "bar", "restaurant", "hotel", "club", "retail"]),
  /** General size of menu / product catalog */
  menuSize:          z.enum(["small", "medium", "large"]).optional(),
  targetDemographic: z.enum(["upscale", "casual", "mixed", "business"]).optional(),
  focusCategories:   z.array(z.string()).optional(),
  experienceGoal:    z.enum(["revenue", "loyalty", "discovery", "balanced"]).optional(),
  /** Required: Geographic region, e.g. "US-East", "US-West", "Europe", "Asia" */
  location:          z.string().min(1),
  /** Required: Price positioning of the venue — drives margin targets and bundle logic */
  pricingTier:       z.enum(["budget", "mid", "premium", "luxury"]),
});

type ConfigInput = z.infer<typeof configureSchema>;

interface CraftProductRec { name: string; reason: string; upsell: string; }
interface UpsellSequence  { from: string; to: string; trigger: string; value: string; }

interface StructuredConfig {
  // ── Tone + experience ──────────────────────────────────────────────
  tonePreset:           string;
  strengthBias:         string;
  menuDepth:            string;
  crossSellEnabled:     boolean;
  pairingEnabled:       boolean;
  foodPairingEnabled:   boolean;
  maxRecommendations:   number;
  experienceGoal:       string;
  focusCategories:      string[];

  // ── Scoring weights ────────────────────────────────────────────────
  experienceFlowWeights: {
    flavor:  number;
    strength: number;
    balance:  number;
    mood:     number;
  };

  // ── Revenue controls ────────────────────────────────────────────────
  upsellIntensity:      number;
  loyaltyWeight:        number;

  // ── Pricing strategy per tier ──────────────────────────────────────
  pricingStrategy: {
    tier:           string;
    targetMargin:   number;
    happyHourMult:  number;
    loyaltyDisc:    number;
    premiumMult:    number;
    suggestBundles: boolean;
    location:       string;
  };

  // ── Per-craft product recommendations ─────────────────────────────
  craftRecommendations: Record<string, CraftProductRec[]>;

  // ── Upsell sequences ───────────────────────────────────────────────
  upsellSequences: UpsellSequence[];

  // ── Metadata ──────────────────────────────────────────────────────
  generatedAt: string;
  version:     string;
}

export function buildConfig(input: ConfigInput): StructuredConfig {
  const {
    venueType        = "cigar_lounge",
    menuSize         = "medium",
    targetDemographic = "upscale",
    focusCategories  = [],
    experienceGoal   = "balanced",
    pricingTier      = "premium",
    location         = "US",
  } = input;

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

  const upsellInt: Record<string, number> = {
    revenue: 0.9, loyalty: 0.5, discovery: 0.4, balanced: 0.7,
  };
  const loyaltyW: Record<string, number> = {
    revenue: 0.3, loyalty: 0.9, discovery: 0.5, balanced: 0.65,
  };

  // Pricing strategy per tier
  const pricingStrategies: Record<string, Omit<StructuredConfig["pricingStrategy"], "location" | "tier">> = {
    budget:  { targetMargin: 0.30, happyHourMult: 0.75, loyaltyDisc: 0.05, premiumMult: 1.1, suggestBundles: true  },
    mid:     { targetMargin: 0.40, happyHourMult: 0.80, loyaltyDisc: 0.08, premiumMult: 1.15, suggestBundles: true },
    premium: { targetMargin: 0.50, happyHourMult: 0.85, loyaltyDisc: 0.10, premiumMult: 1.20, suggestBundles: false },
    luxury:  { targetMargin: 0.60, happyHourMult: 0.90, loyaltyDisc: 0.12, premiumMult: 1.30, suggestBundles: false },
  };

  // Per-craft product recommendations (5–8 per craft)
  const craftRecs: Record<string, CraftProductRec[]> = {
    cigar: [
      { name: "Arturo Fuente Opus X",       reason: "Top-rated full strength — anchors premium perception",         upsell: "Add a pairing spirit"        },
      { name: "Padron 1926 Serie #80",      reason: "Heritage brand, consistent bestseller",                        upsell: "Suggest limited edition"     },
      { name: "Cohiba Behike 52",           reason: "Aspirational SKU — drives AOV upward",                         upsell: "Membership add-on"           },
      { name: "Rocky Patel Vintage 1992",   reason: "Strong value-luxury ratio — converts first-time buyers",       upsell: "Flight of three cigars"      },
      { name: "Oliva Serie V Melanio",      reason: "Award-winner accessible to new enthusiasts",                   upsell: "Pair with coffee flight"     },
      { name: "My Father Le Bijou 1922",    reason: "Rich, full-bodied — resonates with connoisseurs",              upsell: "Private blend upgrade"       },
      { name: "Liga Privada No. 9",         reason: "Trending enthusiast brand — drives social proof",              upsell: "Box purchase upsell"         },
      { name: "Davidoff Aniversario No. 3", reason: "Prestige gifting SKU — highest per-unit margin",               upsell: "Gift packaging add-on"       },
    ],
    spirit: [
      { name: "Macallan 18 Sherry Oak",     reason: "Defines the category for discerning guests",                   upsell: "Flight pairing with cigar"   },
      { name: "Glenfiddich 21 Gran Res.",   reason: "Accessible luxury — strong price-to-prestige ratio",            upsell: "Double pour upsell"          },
      { name: "Buffalo Trace Antique",      reason: "Bourbon enthusiast magnet — broadens demographic",             upsell: "Suggest neat vs. rocks"      },
      { name: "Pappy Van Winkle 15yr",      reason: "Aspirational pinnacle — generates word-of-mouth",              upsell: "Vertical tasting flight"     },
      { name: "Clase Azul Reposado",        reason: "Artisan bottle drives impulse purchase and gifting",            upsell: "Pair with premium cigar"     },
      { name: "Johnnie Walker Blue Label",  reason: "Status signal familiar to all demographics",                   upsell: "Ice sphere or rocks service" },
      { name: "Hennessy Paradis",           reason: "High-ticket cognac — maximizes occasion revenue",              upsell: "Private lounge reservation"  },
    ],
    beer: [
      { name: "Guinness Draught",           reason: "Familiar anchor — draws new guests into premium territory",    upsell: "Craft flight upsell"         },
      { name: "Pliny the Elder IPA",        reason: "Enthusiast pull — social sharing effect",                      upsell: "Pair with appetizer"         },
      { name: "Westvleteren 12",            reason: "Cult status — creates destination-worthy experience",           upsell: "Limited-release bundle"      },
      { name: "Goose Island Bourbon County",reason: "Barrel-aged crossover appeals to whiskey fans",                upsell: "Cigar pairing suggestion"    },
      { name: "Allagash White",             reason: "Sessionable crowd-pleaser broadens appeal",                    upsell: "Sampler flight upgrade"      },
      { name: "Founders KBS",              reason: "High ABV collector beer — drives repeat loyalty visits",        upsell: "Members-only allocation"     },
    ],
    vape: [
      { name: "Puffco Peak Pro",            reason: "High-margin hardware — drives attachment sales",               upsell: "Accessory bundle"            },
      { name: "Lost Mary OS5000",           reason: "Entry-level pull — converts guests to regulars",               upsell: "Membership upgrade"          },
      { name: "Elf Bar BC5000",             reason: "High-velocity SKU — drives repeat foot traffic",               upsell: "Flavor subscription"         },
      { name: "SMOK Morph 3",              reason: "Advanced mod for enthusiasts — high attachment rate",           upsell: "Coil + battery bundle"       },
      { name: "Vaporesso XROS",            reason: "Sleek pod system popular with younger demographics",            upsell: "Extra pods upsell"           },
    ],
    food: [
      { name: "Wagyu Beef Sliders",         reason: "Premium comfort food — pairs naturally with spirits",          upsell: "Add a spirit pairing"        },
      { name: "Charcuterie Board",          reason: "High-margin shareable — extends dwell time",                   upsell: "Wine or spirit flight"       },
      { name: "Lobster Bisque",             reason: "Aspirational starter — signals culinary prestige",              upsell: "Champagne pairing"           },
      { name: "Truffle Fries",             reason: "Low-cost, high-margin add-on — easy impulse upsell",            upsell: "Aioli dipping sauces"        },
      { name: "Smoked Salmon Crostini",    reason: "Light pairing for guests exploring spirits or wine",            upsell: "Add a rosé flight"           },
    ],
  };

  // Only include crafts in focus
  const cats = focusCategories.length > 0 ? focusCategories : ["cigar", "spirit"];
  const filteredRecs: Record<string, CraftProductRec[]> = {};
  cats.forEach(c => {
    if (craftRecs[c]) filteredRecs[c] = craftRecs[c]!;
  });

  // Upsell sequences
  const upsellSeqs: UpsellSequence[] = [
    { from: "cigar_selection",   to: "spirit_pairing",    trigger: "after_craft_match",     value: "Suggest complementary spirit" },
    { from: "spirit_order",      to: "cigar_pairing",     trigger: "repeat_spirit_view",    value: "Offer cigar flight" },
    { from: "any_product",       to: "loyalty_enroll",    trigger: "first_order",            value: "Introduce loyalty program" },
    { from: "loyalty_bronze",    to: "loyalty_silver",    trigger: "points_threshold_50pct", value: "Show tier progress + reward preview" },
    { from: "single_item_cart",  to: "bundle_suggestion", trigger: "cart_add",               value: "Curated bundle +15% AOV" },
  ];

  // Experience flow weights
  const flowWeights = {
    flavor:   targetDemographic === "upscale" ? 0.35 : 0.30,
    strength: venueType === "cigar_lounge"    ? 0.30 : 0.20,
    balance:  experienceGoal === "loyalty"    ? 0.20 : 0.25,
    mood:     experienceGoal === "discovery"  ? 0.25 : 0.20,
  };

  return {
    tonePreset:           tonePresets[targetDemographic] ?? tonePresets.upscale!,
    strengthBias:         strengthBias[venueType] ?? "medium",
    menuDepth:            menuSize === "large" ? "deep" : menuSize === "medium" ? "standard" : "curated",
    crossSellEnabled:     cats.length > 1,
    pairingEnabled:       venueType !== "retail",
    foodPairingEnabled:   venueType === "restaurant" || venueType === "hotel",
    maxRecommendations:   menuSize === "large" ? 10 : menuSize === "medium" ? 7 : 5,
    experienceGoal,
    focusCategories:      cats,

    experienceFlowWeights: flowWeights,
    upsellIntensity:       upsellInt[experienceGoal] ?? 0.7,
    loyaltyWeight:         loyaltyW[experienceGoal]  ?? 0.65,

    pricingStrategy: {
      tier:        pricingTier,
      location,
      ...pricingStrategies[pricingTier]!,
    },

    craftRecommendations: filteredRecs,
    upsellSequences:      upsellSeqs,

    generatedAt: new Date().toISOString(),
    version:     "3.0",
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

    // Venue ownership guard: non-super_admins may only configure their own venue
    const resolvedVenueId = parsed.data.venueId ?? req.user?.venueId ?? null;
    if (
      req.user?.role !== "super_admin" &&
      parsed.data.venueId &&
      parsed.data.venueId !== req.user?.venueId
    ) {
      res.status(403).json({ error: "Access denied: cannot configure a different venue" }); return;
    }

    const venueId    = resolvedVenueId;
    const config     = buildConfig(parsed.data);
    const pricingTier = parsed.data.pricingTier ?? "premium";
    const location    = parsed.data.location ?? "US";

    // Mark previous configs inactive
    if (venueId) {
      try {
        await db
          .update(aiConfigurationsTable)
          .set({ isActive: "false" })
          .where(eq(aiConfigurationsTable.venueId, venueId));
      } catch { /* non-fatal */ }
    }

    const [row] = await db
      .insert(aiConfigurationsTable)
      .values({
        venueId:    venueId ?? undefined,
        configType: "experience",
        location,
        pricingTier,
        config: {
          inputParams:  parsed.data as Record<string, unknown>,
          outputConfig: config as unknown as Record<string, unknown>,
          appliedAt:    new Date().toISOString(),
        },
        isActive:   "true",
      })
      .returning();

    // Apply as a feature flag so the experience engine can read it
    if (venueId) {
      try {
        await db
          .insert(featureFlagsTable)
          .values({
            name:    "ai_config_active",
            enabled: true,
            venueId,
            metadata: { configId: row.id, pricingTier, experienceGoal: config.experienceGoal },
          })
          .onConflictDoNothing();
      } catch { /* non-fatal */ }
    }

    // Apply pricing engine config immediately — true upsert semantics so re-runs always update
    if (venueId) {
      try {
        const pricingMeta: Record<string, unknown> = {
          configId:       row.id,
          pricingTier,
          targetMargin:   config.pricingStrategy.targetMargin,
          happyHourMult:  config.pricingStrategy.happyHourMult,
          loyaltyDisc:    config.pricingStrategy.loyaltyDisc,
          premiumMult:    config.pricingStrategy.premiumMult,
          suggestBundles: config.pricingStrategy.suggestBundles,
          location,
          appliedAt:      new Date().toISOString(),
        };
        const upd = await db
          .update(featureFlagsTable)
          .set({ enabled: true, metadata: pricingMeta, updatedAt: new Date() })
          .where(and(
            eq(featureFlagsTable.name,    "pricing_engine_config"),
            eq(featureFlagsTable.venueId, venueId),
          ))
          .returning({ id: featureFlagsTable.id });
        if (upd.length === 0) {
          await db.insert(featureFlagsTable).values({
            name: "pricing_engine_config", enabled: true, venueId, metadata: pricingMeta,
          }).onConflictDoNothing();
        }
      } catch { /* non-fatal */ }
    }

    logger.info({ venueId, configId: row.id, pricingTier }, "AI configuration generated and applied");
    // Return the built config object (not the DB row) so callers get the full strategy
    res.status(201).json({ ok: true, config, id: row.id });
  },
);

// ── GET /api/ai/configure/:venueId ────────────────────────────────────────────

router.get(
  "/ai/configure/:venueId",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const venueId = String(req.params.venueId ?? "");

    // Venue ownership guard: non-super_admins may only read their own venue config
    if (req.user?.role !== "super_admin" && req.user?.venueId !== venueId) {
      res.status(403).json({ error: "Access denied" }); return;
    }

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
