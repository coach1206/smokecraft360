/**
 * /api/venue-setup — Venue Onboarding & Staff Management
 *
 *   POST /api/venue-setup/staff        — create a staff member (venue_staff table)
 *   GET  /api/venue-setup/staff        — list venue staff
 *   POST /api/venue-setup/inventory    — bulk-intake inventory items
 *   GET  /api/venue-setup/inventory    — list venue inventory with flavor profiles
 */

import { Router, type Response }              from "express";
import { randomUUID }                         from "crypto";
import { eq, and }                            from "drizzle-orm";
import { db, venueStaffTable, productsTable,
         venueInventoryTable }                from "@workspace/db";
import { z }                                  from "zod";
import { requireAuth }                         from "../middleware/auth";
import { requireRole }                         from "../middleware/roles";
import type { AuthRequest }                   from "../middleware/auth";

const router = Router();
const ownerOrAdmin = requireRole("venue_owner", "manager", "super_admin");

// ── POST /staff — create a staff member ───────────────────────────────────────

const createStaffSchema = z.object({
  staffName:       z.string().min(1).max(100).trim(),
  staffPin:        z.string().length(4).regex(/^\d{4}$/),
  assignedSection: z.string().max(50).optional(),
  assignedTables:  z.array(z.string()).optional(),
  venueId:         z.string().uuid().optional(),
});

router.post("/staff", requireAuth, ownerOrAdmin, async (req: AuthRequest, res: Response) => {
  const body = createStaffSchema.parse(req.body);

  const [staff] = await db
    .insert(venueStaffTable)
    .values({
      venueId:         body.venueId,
      staffName:       body.staffName,
      staffPin:        body.staffPin,
      assignedSection: body.assignedSection,
      assignedTables:  body.assignedTables?.join(","),
      isActive:        true,
    })
    .returning();

  res.status(201).json({ staff });
});

// ── GET /staff — list venue staff ─────────────────────────────────────────────

router.get("/staff", requireAuth, ownerOrAdmin, async (req: AuthRequest, res: Response) => {
  const venueId = req.query["venueId"] as string | undefined;

  const rows = venueId
    ? await db.select().from(venueStaffTable).where(eq(venueStaffTable.venueId, venueId))
    : await db.select().from(venueStaffTable).where(eq(venueStaffTable.isActive, true)).limit(100);

  res.json({ staff: rows });
});

// ── PATCH /staff/:staffId — toggle active / update section ────────────────────

router.patch("/staff/:staffId", requireAuth, ownerOrAdmin, async (req: AuthRequest, res: Response) => {
  const body = z.object({
    isActive:        z.boolean().optional(),
    assignedSection: z.string().optional(),
    assignedTables:  z.array(z.string()).optional(),
  }).parse(req.body);

  type StaffUpdate = {
    isActive?:        boolean;
    assignedSection?: string;
    assignedTables?:  string;
  };
  const patch: StaffUpdate = {};
  if (body.isActive        !== undefined) patch.isActive        = body.isActive;
  if (body.assignedSection !== undefined) patch.assignedSection = body.assignedSection;
  if (body.assignedTables  !== undefined) patch.assignedTables  = body.assignedTables.join(",");

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [staff] = await db
    .update(venueStaffTable)
    .set(patch)
    .where(eq(venueStaffTable.staffId, req.params.staffId as string))
    .returning();

  if (!staff) { res.status(404).json({ error: "Staff not found" }); return; }
  res.json({ staff });
});

// ── POST /inventory — intake inventory items ──────────────────────────────────

const intakeItemSchema = z.object({
  name:          z.string().min(1).max(200).trim(),
  category:      z.enum(["cigar", "alcohol", "beer", "wine", "cocktail", "food", "coffee", "tea"]),
  quantity:      z.number().int().min(0),
  costCents:     z.number().int().min(0).optional(),
  premiumTier:   z.number().int().min(1).max(5).optional(),
  flavorProfile: z.object({
    body:  z.string().optional(),
    notes: z.array(z.string()).optional(),
  }).optional(),
});

const inventoryIntakeSchema = z.object({
  items:   z.array(intakeItemSchema).min(1).max(100),
  venueId: z.string().uuid().optional(),
});

router.post("/inventory", requireAuth, ownerOrAdmin, async (req: AuthRequest, res: Response) => {
  const body = inventoryIntakeSchema.parse(req.body);
  const results: { id: string; name: string; inserted: boolean }[] = [];

  for (const item of body.items) {
    // Upsert product — check by name first, insert if missing
    const [existing] = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(eq(productsTable.name, item.name))
      .limit(1);

    let productId = existing?.id;
    const isNew   = !productId;

    if (!productId) {
      const [created] = await db
        .insert(productsTable)
        .values({
          id:        randomUUID(),
          name:      item.name,
          category:  item.category as "cigar" | "alcohol" | "beer" | "wine" | "cocktail" | "food" | "coffee" | "tea",
          costCents: item.costCents,
        })
        .returning({ id: productsTable.id, name: productsTable.name });
      productId = created?.id;
    }

    if (!productId) continue;

    if (body.venueId) {
      // Upsert venue inventory with flavor profile + premium tier
      await db
        .insert(venueInventoryTable)
        .values({
          venueId:       body.venueId,
          productId,
          quantity:      item.quantity,
          flavorProfile: item.flavorProfile,
          premiumTier:   item.premiumTier ?? 1,
        });
    }

    results.push({ id: productId, name: item.name, inserted: isNew });
  }

  res.status(201).json({ ok: true, count: results.length, items: results });
});

// ── GET /inventory — venue inventory list ─────────────────────────────────────

router.get("/inventory", requireAuth, ownerOrAdmin, async (req: AuthRequest, res: Response) => {
  const venueId = z.string().uuid().parse(req.query["venueId"]);

  const rows = await db
    .select({
      productId:     venueInventoryTable.productId,
      quantity:      venueInventoryTable.quantity,
      available:     venueInventoryTable.available,
      priceCents:    venueInventoryTable.priceCents,
      flavorProfile: venueInventoryTable.flavorProfile,
      premiumTier:   venueInventoryTable.premiumTier,
      name:          productsTable.name,
      category:      productsTable.category,
      costCents:     productsTable.costCents,
    })
    .from(venueInventoryTable)
    .innerJoin(productsTable, eq(venueInventoryTable.productId, productsTable.id))
    .where(eq(venueInventoryTable.venueId, venueId));

  res.json({ inventory: rows });
});

export default router;
