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
import { eq, and } from "drizzle-orm";

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

// ── POST /api/staff/validate-pin ─────────────────────────────────────────────
// Level "supervisor": match active staff PIN in venue_staff table.
// Level "admin":      bcrypt-compare against FOUNDER_PIN_HASH env var (dev fallback: "9999").
router.post("/validate-pin", async (req, res) => {
  const { pin, level } = req.body as { pin?: string; level?: string };
  if (!pin || !/^\d{4}$/.test(pin) || !["supervisor", "admin"].includes(level ?? "")) {
    res.status(400).json({ ok: false, error: "invalid_request" }); return;
  }
  try {
    if (level === "admin") {
      const hash = process.env["FOUNDER_PIN_HASH"] ?? "";
      if (!hash) {
        res.json({ ok: pin === "9999", level }); return;
      }
      const { compare } = await import("bcryptjs");
      const ok = await compare(pin, hash);
      res.json({ ok, level }); return;
    }
    // supervisor: check any active staff member with matching PIN
    const matched = await db
      .select({ staffId: venueStaffTable.staffId, staffName: venueStaffTable.staffName })
      .from(venueStaffTable)
      .where(and(eq(venueStaffTable.staffPin, pin), eq(venueStaffTable.isActive, true)))
      .limit(1);
    res.json({ ok: matched.length > 0, staffName: matched[0]?.staffName ?? null, level });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
