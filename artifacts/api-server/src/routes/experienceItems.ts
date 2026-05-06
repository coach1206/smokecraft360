/**
 * experienceItems — manage swipeable flavor cards.
 *
 * GET  /api/experience-items           — list items (filter by type)
 * POST /api/experience-items           — create item (admin)
 * GET  /api/experience-items/seed      — seed default items if table empty (admin)
 */

import { Router, type IRouter, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db, experienceItemsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/roles";

const router: IRouter = Router();

const VALID_TYPES = ["smoke", "pour", "brew", "vape"] as const;

// ── GET /api/experience-items ─────────────────────────────────────────────────

router.get("/", async (req: AuthRequest, res: Response) => {
  const type = req.query["type"] as string | undefined;

  const items = await db
    .select()
    .from(experienceItemsTable)
    .where(
      type
        ? and(eq(experienceItemsTable.type, type), eq(experienceItemsTable.active, true))
        : eq(experienceItemsTable.active, true)
    )
    .orderBy(experienceItemsTable.baseScore);

  res.json({ items });
});

// ── POST /api/experience-items ────────────────────────────────────────────────

const createSchema = z.object({
  title:       z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  image:       z.string().url().optional(),
  type:        z.enum(VALID_TYPES),
  category:    z.string().max(60).optional(),
  tags:        z.array(z.string().max(60)).max(20).default([]),
  intensity:   z.number().int().min(1).max(10).default(5),
  baseScore:   z.number().int().min(0).max(100).default(50),
  cost:        z.number().min(0).optional(),
  retailPrice: z.number().min(0).optional(),
  inventoryItemId: z.string().optional(),
});

router.post(
  "/",
  requireAuth,
  requireRole("super_admin", "venue_owner", "manager"),
  async (req: AuthRequest, res: Response) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message });
      return;
    }
    const [item] = await db
      .insert(experienceItemsTable)
      .values({
        ...parsed.data,
        cost:        parsed.data.cost?.toString(),
        retailPrice: parsed.data.retailPrice?.toString(),
      })
      .returning();
    res.status(201).json({ item });
  }
);

// ── GET /api/experience-items/seed ────────────────────────────────────────────

const SEED_ITEMS = [
  // Smoke
  { title: "Smoky & Bold",    description: "Rich, full-bodied character with deep smoke notes", type: "smoke", tags: ["smoky","bold","earthy"], intensity: 8, baseScore: 70, image: "/images/smoke/smoke_lounge.png" },
  { title: "Earthy & Natural", description: "Grounded, medium-bodied with cedar undertones", type: "smoke", tags: ["earthy","cedar","medium"], intensity: 5, baseScore: 55 },
  { title: "Creamy & Smooth", description: "Buttery finish with hints of cream and wood", type: "smoke", tags: ["creamy","smooth","sweet"], intensity: 4, baseScore: 50, image: "/images/smoke/smoke_solo.png" },
  { title: "Spicy & Complex", description: "Pepper-forward with layered complexity", type: "smoke", tags: ["spicy","complex","bold"], intensity: 7, baseScore: 65 },
  { title: "Sweet & Mild",    description: "Light, approachable with gentle sweetness", type: "smoke", tags: ["sweet","mild","light"], intensity: 2, baseScore: 40 },
  { title: "Cedar & Wood",    description: "Natural wood with aromatic finish", type: "smoke", tags: ["cedar","woody","aromatic"], intensity: 5, baseScore: 52, image: "/images/smoke/smoke_woman.png" },
  // Pour
  { title: "Oak & Vanilla",   description: "Classic barrel-aged sweetness with vanilla notes", type: "pour", tags: ["oak","vanilla","sweet"], intensity: 5, baseScore: 60, image: "/images/pour/pour_bar.png" },
  { title: "Peated & Smoky",  description: "Rich Scottish peat with lingering smoke", type: "pour", tags: ["peat","smoky","bold"], intensity: 8, baseScore: 72 },
  { title: "Caramel & Spice", description: "Warm caramel with a spiced finish", type: "pour", tags: ["caramel","spiced","warm"], intensity: 6, baseScore: 63 },
  { title: "Citrus & Bright", description: "Lively citrus notes with a clean finish", type: "pour", tags: ["citrus","light","crisp"], intensity: 3, baseScore: 45 },
  { title: "Rich & Full",     description: "Full-bodied with dark fruit and tannins", type: "pour", tags: ["rich","bold","dark"], intensity: 7, baseScore: 68 },
  { title: "Floral & Delicate", description: "Light floral notes, easy to enjoy", type: "pour", tags: ["floral","light","delicate"], intensity: 2, baseScore: 40 },
  // Brew
  { title: "Hoppy & Bitter",  description: "Bold hop character with a clean bitter finish", type: "brew", tags: ["hoppy","crisp","bitter"], intensity: 7, baseScore: 62 },
  { title: "Crisp & Light",   description: "Easy-drinking, refreshing and clean", type: "brew", tags: ["crisp","light","smooth"], intensity: 2, baseScore: 40 },
  { title: "Malty & Toasted", description: "Deep malt backbone with toasted notes", type: "brew", tags: ["malty","toasted","smooth"], intensity: 5, baseScore: 55 },
  { title: "Dark Roast",      description: "Stout character with roasted coffee and chocolate", type: "brew", tags: ["dark roast","chocolate","roasted"], intensity: 8, baseScore: 70 },
  { title: "Fruity & Juicy",  description: "Fresh fruit-forward with hazy, tropical notes", type: "brew", tags: ["fruity","tropical","juicy"], intensity: 4, baseScore: 52 },
  { title: "Wheat & Smooth",  description: "Classic wheat beer, light and sessionable", type: "brew", tags: ["smooth","wheat","light"], intensity: 3, baseScore: 45 },
  // Vape
  { title: "Mint & Cool",     description: "Crisp menthol with an icy-clean finish", type: "vape", tags: ["mint","cool","crisp"], intensity: 6, baseScore: 60 },
  { title: "Berry & Sweet",   description: "Ripe mixed berry explosion, dessert-like", type: "vape", tags: ["berry","sweet","fruity"], intensity: 5, baseScore: 55 },
  { title: "Cream & Smooth",  description: "Silky vanilla cream, incredibly smooth", type: "vape", tags: ["cream","smooth","vanilla"], intensity: 4, baseScore: 50 },
  { title: "Tropical Burst",  description: "Mango, pineapple and exotic fruit blend", type: "vape", tags: ["tropical","fruity","exotic"], intensity: 6, baseScore: 58 },
  { title: "Dense Cloud",     description: "Maximum vapor production, subtle taste", type: "vape", tags: ["dense cloud","smooth","cool"], intensity: 7, baseScore: 65 },
  { title: "Cool Citrus",     description: "Bright citrus with a cooling menthol twist", type: "vape", tags: ["citrus","cool","fresh"], intensity: 5, baseScore: 52 },
];

router.get(
  "/seed",
  requireAuth,
  requireRole("super_admin"),
  async (req: AuthRequest, res: Response) => {
    const existing = await db
      .select({ id: experienceItemsTable.id })
      .from(experienceItemsTable)
      .limit(1);

    if (existing.length) {
      res.json({ message: "Already seeded", count: 0 });
      return;
    }

    const inserted = await db
      .insert(experienceItemsTable)
      .values(SEED_ITEMS.map(s => ({
        title:       s.title,
        description: s.description,
        image:       s.image ?? null,
        type:        s.type,
        tags:        s.tags,
        intensity:   s.intensity,
        baseScore:   s.baseScore,
      })))
      .returning();

    req.log.info({ count: inserted.length }, "experience items seeded");
    res.json({ message: "Seeded successfully", count: inserted.length });
  }
);

export default router;
