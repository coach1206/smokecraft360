/**
 * staffRoster — kiosk-level staff management CRUD.
 *
 * GET    /api/staff/roster          — list venue staff (no auth — kiosk-open)
 * POST   /api/staff/roster          — add staff member
 * PATCH  /api/staff/roster/:id      — update (isActive, section, tables, PIN)
 */

import { Router } from "express";
import { db }     from "@workspace/db";
import { venueStaffTable } from "@workspace/db/schema";
import { eq }     from "drizzle-orm";

const router = Router();

router.get("/roster", async (_req, res) => {
  try {
    const rows = await db
      .select({
        staffId:         venueStaffTable.staffId,
        staffName:       venueStaffTable.staffName,
        assignedSection: venueStaffTable.assignedSection,
        assignedTables:  venueStaffTable.assignedTables,
        isActive:        venueStaffTable.isActive,
        createdAt:       venueStaffTable.createdAt,
      })
      .from(venueStaffTable)
      .limit(100);
    res.json({ staff: rows });
  } catch {
    res.json({ staff: [] });
  }
});

router.post("/roster", async (req, res) => {
  try {
    const { staffName, staffPin, assignedSection, assignedTables, venueId } = req.body as {
      staffName: string; staffPin: string;
      assignedSection?: string; assignedTables?: string; venueId?: string;
    };

    if (!staffName?.trim()) {
      res.status(400).json({ error: "staffName required" }); return;
    }
    if (!staffPin || !/^\d{4}$/.test(staffPin)) {
      res.status(400).json({ error: "staffPin must be 4 digits" }); return;
    }

    const [row] = await db.insert(venueStaffTable).values({
      staffName:       staffName.trim(),
      staffPin,
      assignedSection: assignedSection?.trim() ?? null,
      assignedTables:  assignedTables?.trim()  ?? null,
      venueId:         venueId                  ?? null,
      isActive:        true,
    }).returning();

    res.status(201).json({ member: row });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

router.patch("/roster/:id", async (req, res) => {
  try {
    const { id } = req.params as { id: string };
    const { isActive, assignedSection, assignedTables, staffPin } = req.body as {
      isActive?: boolean; assignedSection?: string; assignedTables?: string; staffPin?: string;
    };

    const patch: Partial<{
      isActive: boolean; assignedSection: string | null;
      assignedTables: string | null; staffPin: string;
    }> = {};

    if (typeof isActive        === "boolean")  patch.isActive        = isActive;
    if (assignedSection        !== undefined)   patch.assignedSection = assignedSection || null;
    if (assignedTables         !== undefined)   patch.assignedTables  = assignedTables  || null;
    if (staffPin && /^\d{4}$/.test(staffPin))   patch.staffPin        = staffPin;

    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: "no_valid_fields" }); return;
    }

    const [row] = await db.update(venueStaffTable)
      .set(patch)
      .where(eq(venueStaffTable.staffId, id))
      .returning();

    if (!row) { res.status(404).json({ error: "not_found" }); return; }
    res.json({ member: row });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
