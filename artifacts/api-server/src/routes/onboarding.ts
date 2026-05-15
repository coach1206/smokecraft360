/**
 * Onboarding routes
 *
 * POST /api/onboarding/start              — create a new onboarding session
 * PATCH /api/onboarding/:id              — update step data & selectedCrafts
 * POST /api/onboarding/:id/complete      — mark complete and seed venue defaults
 */

import { Router, type IRouter, type Response } from "express";
import { eq }                                   from "drizzle-orm";
import { randomUUID }                           from "crypto";
import { z }                                    from "zod";
import {
  db, onboardingSessionsTable, venuesTable,
  productsTable, featureFlagsTable,
  venueInventoryTable, campaignsTable, auditLogTable,
  aiConfigurationsTable,
  type CampaignType,
} from "@workspace/db";
import { requireAuth, type AuthRequest }        from "../middleware/auth";
import { requireRole }                          from "../middleware/roles";
import { logger }                               from "../lib/logger";

const router: IRouter = Router();

const startSchema = z.object({
  venueId: z.string().uuid().optional(),
});

const stepSchema = z.object({
  step:           z.enum(["venue_info", "craft_selection", "inventory_preview", "ai_preview", "go_live"]),
  data:           z.record(z.unknown()),
  selectedCrafts: z.array(z.string()).optional(),
});

// ── Default product seeds per craft ─────────────────────────────────────────

// productCategoryEnum: "cigar","alcohol","beer","wine","cocktail","food","coffee","tea","scent","candle"
// productTierEnum: "standard","mid","premium"

const SEED_PRODUCTS: Record<string, Array<{
  name:        string;
  category:    "cigar"|"alcohol"|"beer"|"wine"|"cocktail"|"food";
  tier:        "standard"|"mid"|"premium";
  strength:    number;
  flavorNotes: string[];
}>> = {
  cigar: [
    { name: "Arturo Fuente Opus X",   category: "cigar",   tier: "premium",  strength: 5, flavorNotes: ["cedar","leather","spice"]    },
    { name: "Padron 1926 Serie #80",  category: "cigar",   tier: "premium",  strength: 4, flavorNotes: ["chocolate","earth","nuts"]   },
    { name: "Oliva Serie V Melanio",  category: "cigar",   tier: "standard", strength: 3, flavorNotes: ["fruit","cedar","cream"]      },
  ],
  spirit: [
    { name: "Macallan 18 Sherry Oak", category: "alcohol", tier: "premium",  strength: 3, flavorNotes: ["dried fruit","spice","oak"]  },
    { name: "Buffalo Trace Bourbon",  category: "alcohol", tier: "standard", strength: 2, flavorNotes: ["vanilla","caramel","oak"]    },
    { name: "Clase Azul Reposado",    category: "alcohol", tier: "premium",  strength: 2, flavorNotes: ["agave","caramel","vanilla"]  },
  ],
  beer: [
    { name: "Guinness Draught",       category: "beer",    tier: "standard", strength: 1, flavorNotes: ["roast","coffee","cream"]     },
    { name: "Pliny the Elder IPA",    category: "beer",    tier: "premium",  strength: 2, flavorNotes: ["citrus","pine","floral"]     },
  ],
  wine: [
    { name: "Caymus Cabernet 2021",   category: "wine",    tier: "premium",  strength: 2, flavorNotes: ["blackcurrant","oak","vanilla"]  },
    { name: "Whispering Angel Rosé",  category: "wine",    tier: "standard", strength: 1, flavorNotes: ["peach","citrus","floral"]      },
  ],
  food: [
    { name: "Wagyu Beef Sliders",     category: "food",    tier: "premium",  strength: 1, flavorNotes: ["savory","umami","butter"]    },
    { name: "Charcuterie Board",      category: "food",    tier: "standard", strength: 1, flavorNotes: ["salty","savory","tangy"]     },
  ],
};

// Craft name → seed category mapping
const CRAFT_TO_SEED: Record<string, string> = {
  cigar: "cigar", spirit: "spirit", spiritcraft: "spirit", pourcraft: "spirit",
  beer: "beer", brewcraft: "beer",
  wine: "wine",
  food: "food",
};

const DEFAULT_FLAGS = [
  { name: "loyalty_enabled",       enabled: true  },
  { name: "ai_recommendations",    enabled: true  },
  { name: "cross_sell_enabled",    enabled: true  },
  { name: "pairing_engine",        enabled: true  },
  { name: "offline_mode",          enabled: true  },
  { name: "demand_capture",        enabled: true  },
  { name: "live_inventory_alerts", enabled: true  },
  { name: "vendor_campaigns",      enabled: false },
];

async function seedVenueDefaults(
  venueId: string,
  selectedCrafts: string[],
  inventoryQtys: Record<string, number> = {},
  actorId?: string,
) {
  const crafts = selectedCrafts.length > 0 ? selectedCrafts : ["cigar", "spirit"];
  const seeded  = new Set<string>();
  const seededProducts: Array<{ id: string; name: string }> = [];

  // 1. Seed default products per craft — errors here are fatal (critical path)
  for (const craft of crafts) {
    const key = CRAFT_TO_SEED[craft.toLowerCase()] ?? craft.toLowerCase();
    if (seeded.has(key)) continue;
    seeded.add(key);

    for (const p of SEED_PRODUCTS[key] ?? []) {
      const productId = randomUUID();
      await db.insert(productsTable).values({
        id:          productId,
        venueId,
        name:        p.name,
        category:    p.category,
        tier:        p.tier,
        strength:    p.strength,
        flavorNotes: p.flavorNotes,
      }).onConflictDoNothing();
      seededProducts.push({ id: productId, name: p.name });
    }
  }

  // 2. Seed inventory levels — quantities from wizard; default 20 — fatal on error
  for (const { id: productId, name: productName } of seededProducts) {
    await db.insert(venueInventoryTable).values({
      venueId,
      productId,
      quantity:   inventoryQtys[productName] ?? 20,
      available:  true,
      priceCents: null,
    }).onConflictDoNothing();
  }

  // 3. Seed default feature flags — fatal on error
  for (const flag of DEFAULT_FLAGS) {
    await db.insert(featureFlagsTable).values({
      name:    flag.name,
      enabled: flag.enabled,
      venueId,
    }).onConflictDoNothing();
  }

  // 4. Seed welcome + per-craft starter campaigns
  const campaignSeeds: Array<{ name: string; type: CampaignType; xpMultiplier: number; rewardBonus: number }> = [
    { name: "Welcome to NOVEE OS",  type: "GENERAL", xpMultiplier: 1.5, rewardBonus: 10  },
    ...crafts.map(craft => ({
      name:         `${craft.charAt(0).toUpperCase() + craft.slice(1)}Craft Launch Promotion`,
      type:         "GENERAL" as CampaignType,
      xpMultiplier: 2.0,
      rewardBonus:  25,
    })),
  ];
  for (const c of campaignSeeds) {
    try {
      await db.insert(campaignsTable).values({
        name:            c.name,
        type:            c.type,
        venueId,
        status:          "draft",
        boostMultiplier: 1.0,
        xpMultiplier:    c.xpMultiplier,
        rewardBonus:     c.rewardBonus,
        active:          false,
        createdBy:       actorId ?? undefined,
      }).onConflictDoNothing();
    } catch { /* non-fatal */ }
  }

  // 5. Seed pricing tier + vendor stub feature flags
  const extraFlags = [
    { name: "pricing_tier_premium",      enabled: true,  metadata: { tier: "premium", targetMarginPct: 55 } },
    { name: "pricing_tier_dynamic",      enabled: false, metadata: { tier: "dynamic" } },
    { name: "vendor_stub_connected",     enabled: true,  metadata: { provider: "stub", status: "sandbox" } },
    { name: "vendor_stub_pos_toast",     enabled: false, metadata: { provider: "toast", status: "pending" } },
  ];
  for (const f of extraFlags) {
    try {
      await db.insert(featureFlagsTable).values({ name: f.name, enabled: f.enabled, venueId, metadata: f.metadata }).onConflictDoNothing();
    } catch { /* non-fatal */ }
  }

  // 6. Write audit log entry for onboarding completion
  try {
    await db.insert(auditLogTable).values({
      actorId:    actorId ?? null,
      actorRole:  "system",
      action:     "onboarding.complete",
      entityType: "venue",
      entityId:   venueId,
      afterState: { crafts: selectedCrafts, productsSeeded: seededProducts.length, flagsSeeded: DEFAULT_FLAGS.length },
      venueId,
    });
  } catch { /* non-fatal */ }
}

// ── POST /api/onboarding/start ─────────────────────────────────────────────────

router.post(
  "/onboarding/start",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const parsed = startSchema.safeParse(req.body);
    if (!parsed.success) { res.status(422).json({ error: parsed.error.flatten() }); return; }

    // Venue ownership guard: non-super_admins may only start onboarding for their own venue
    const callerVenueId = req.user?.venueId ?? null;
    if (
      req.user?.role !== "super_admin" &&
      parsed.data.venueId &&
      parsed.data.venueId !== callerVenueId
    ) {
      res.status(403).json({ error: "Access denied: cannot start onboarding for a different venue" }); return;
    }
    const venueId = parsed.data.venueId ?? callerVenueId ?? null;

    const [session] = await db
      .insert(onboardingSessionsTable)
      .values({ venueId: venueId ?? undefined, step: "venue_info", data: {}, selectedCrafts: [], status: "in_progress" })
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

    if (!existing[0])                         { res.status(404).json({ error: "Session not found" }); return; }
    if (existing[0].status === "completed")   { res.status(409).json({ error: "Already completed" }); return; }

    // Venue ownership guard: non-super_admins may only patch their own session
    if (req.user?.role !== "super_admin" && existing[0].venueId && existing[0].venueId !== req.user?.venueId) {
      res.status(403).json({ error: "Access denied" }); return;
    }

    const merged        = { ...(existing[0].data as Record<string, unknown>), ...parsed.data.data };
    const selectedCrafts = parsed.data.selectedCrafts ?? (existing[0].selectedCrafts as string[]);

    const [updated] = await db
      .update(onboardingSessionsTable)
      .set({ step: parsed.data.step, data: merged, selectedCrafts, updatedAt: new Date() })
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

    if (!existing[0])                        { res.status(404).json({ error: "Session not found" }); return; }
    if (existing[0].status === "completed")  { res.status(409).json({ error: "Already completed" }); return; }

    // Venue ownership guard: non-super_admins may only complete their own session
    if (req.user?.role !== "super_admin" && existing[0].venueId && existing[0].venueId !== req.user?.venueId) {
      res.status(403).json({ error: "Access denied" }); return;
    }

    const sessionData    = existing[0].data as Record<string, unknown>;
    const selectedCrafts = (existing[0].selectedCrafts as string[]) ?? [];
    const venueId        = existing[0].venueId ?? req.user?.venueId;

    // Inventory quantities: prefer body (last-step values), fall back to persisted session data
    const inventoryQtys: Record<string, number> =
      (typeof req.body.inventoryQtys === "object" && req.body.inventoryQtys !== null)
        ? (req.body.inventoryQtys as Record<string, number>)
        : (typeof sessionData.inventoryQtys === "object" && sessionData.inventoryQtys !== null)
          ? (sessionData.inventoryQtys as Record<string, number>)
          : {};

    // 1. Update venue name if provided
    const venueName = typeof sessionData.venueName === "string" ? sessionData.venueName : null;
    if (venueName && venueId) {
      try { await db.update(venuesTable).set({ name: venueName }).where(eq(venuesTable.id, venueId)); } catch { /* non-fatal */ }
    }

    // 2. Seed default products + feature flags + inventory + campaign + audit
    if (venueId) {
      await seedVenueDefaults(venueId, selectedCrafts, inventoryQtys, req.user?.id);
    }

    // 2b. Seed initial AI configuration — applies pricing strategy immediately on go-live
    if (venueId) {
      try {
        const vt  = typeof sessionData.venueType     === "string" && sessionData.venueType     ? String(sessionData.venueType)     : "cigar_lounge";
        const loc = typeof sessionData.venueLocation === "string" && sessionData.venueLocation ? String(sessionData.venueLocation) : "US";
        const sz  = typeof sessionData.venueSize     === "string" ? String(sessionData.venueSize) : "medium";
        const pt  = sz === "large" ? "luxury" : sz === "small" ? "mid" : "premium";
        const initialAiCfg = {
          tonePreset:         "Refined, knowledgeable, and understated.",
          pricingStrategy:    { tier: pt, targetMarginPct: pt === "luxury" ? 60 : pt === "premium" ? 50 : 40, location: loc },
          experienceGoal:     "balanced",
          focusCategories:    selectedCrafts.slice(0, 2),
          maxRecommendations: sz === "large" ? 10 : sz === "medium" ? 7 : 5,
          generatedAt:        new Date().toISOString(),
          version:            "seed_1.0",
        };
        await db.insert(aiConfigurationsTable).values({
          venueId,
          configType:  "experience",
          location:    loc,
          pricingTier: pt,
          config: {
            inputParams:  { venueType: vt, location: loc, pricingTier: pt, menuSize: sz },
            outputConfig: initialAiCfg as Record<string, unknown>,
            appliedAt:    new Date().toISOString(),
          },
          isActive:    "true",
        }).onConflictDoNothing();
      } catch { /* non-fatal */ }
    }

    // 3. Mark session complete
    const now = new Date();
    const [completed] = await db
      .update(onboardingSessionsTable)
      .set({ completed: true, status: "completed", step: "go_live", completedAt: now, updatedAt: now })
      .where(eq(onboardingSessionsTable.id, String(req.params.id ?? "")))
      .returning();

    logger.info({ sessionId: completed.id, venueId, selectedCrafts }, "Onboarding completed + seeded");
    res.json({ ok: true, session: completed });
  },
);

export default router;
