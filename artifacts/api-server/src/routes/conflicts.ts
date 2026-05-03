/**
 * Data conflicts — admin-resolvable cross-source mismatches.
 *
 *   GET    /api/conflicts                — list (filterable by status / venueId)
 *   GET    /api/conflicts/:id            — fetch one
 *   POST   /api/conflicts                — manually record (super_admin only)
 *   PATCH  /api/conflicts/:id/resolve    — resolve / dismiss
 *
 * Tenant scoping mirrors Brief 42 reservations: super_admin sees all,
 * venue_owner / manager scoped to their own venueId. Cross-venue conflicts
 * (venueId IS NULL) are visible to super_admin only.
 *
 * Resolve uses an atomic conditional UPDATE (WHERE id=? AND status='open')
 * to prevent two staff from both resolving the same conflict (lessons from
 * the Brief 42 race fix).
 */

import { Router, type IRouter, type Response } from "express";
import { and, desc, eq, isNull }               from "drizzle-orm";
import {
  db, dataConflictsTable,
  CONFLICT_STATUSES, CONFLICT_RESOLUTIONS, CONFLICT_ENTITY_TYPES, CONFLICT_SOURCES,
  type ConflictStatus, type ConflictResolution, type ConflictEntityType, type ConflictSource,
} from "@workspace/db";
import { requireAuth, type AuthRequest }       from "../middleware/auth";
import { requireRole }                         from "../middleware/roles";
import { allowOnly }                           from "../middleware/sanitize";
import { recordConflict }                      from "../services/conflictRecorder";

const router: IRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── GET /api/conflicts ────────────────────────────────────────────────────────

router.get(
  "/",
  requireAuth,
  requireRole("super_admin", "venue_owner", "manager"),
  async (req: AuthRequest, res: Response) => {
    const isSuperAdmin = req.user?.role === "super_admin";
    const callerVenueId = req.user?.venueId ?? null;

    if (!isSuperAdmin && !callerVenueId) {
      res.status(403).json({ error: "Your account is not linked to a venue; cannot list conflicts" });
      return;
    }

    const statusFilter = typeof req.query["status"] === "string" ? req.query["status"] : null;
    const conditions = [];

    if (!isSuperAdmin) {
      conditions.push(eq(dataConflictsTable.venueId, callerVenueId!));
    }
    if (statusFilter && (CONFLICT_STATUSES as readonly string[]).includes(statusFilter)) {
      conditions.push(eq(dataConflictsTable.status, statusFilter as ConflictStatus));
    }

    const rows = conditions.length > 0
      ? await db.select().from(dataConflictsTable).where(and(...conditions)).orderBy(desc(dataConflictsTable.detectedAt))
      : await db.select().from(dataConflictsTable).orderBy(desc(dataConflictsTable.detectedAt));

    res.json({ conflicts: rows });
  },
);

// ── GET /api/conflicts/:id ────────────────────────────────────────────────────

router.get(
  "/:id",
  requireAuth,
  requireRole("super_admin", "venue_owner", "manager"),
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params["id"] ?? "");
    if (!UUID_RE.test(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [row] = await db.select().from(dataConflictsTable).where(eq(dataConflictsTable.id, id)).limit(1);
    if (!row) { res.status(404).json({ error: "Conflict not found" }); return; }

    if (req.user?.role !== "super_admin") {
      // Cross-venue (null venueId) conflicts: super_admin only.
      if (!row.venueId || row.venueId !== req.user?.venueId) {
        res.status(403).json({ error: "You can only view conflicts for your own venue" });
        return;
      }
    }

    res.json(row);
  },
);

// ── POST /api/conflicts ──────────────────────────────────────────────────────
// Super_admin manual entry. Auto-detection callers should use the
// `recordConflict()` service directly (no HTTP hop).

router.post(
  "/",
  requireAuth,
  requireRole("super_admin"),
  allowOnly(
    "entityType", "entityId", "venueId", "fieldName",
    "sourceA", "valueA", "sourceB", "valueB", "notes",
  ),
  async (req: AuthRequest, res: Response) => {
    const {
      entityType, entityId, venueId, fieldName,
      sourceA, valueA, sourceB, valueB, notes,
    } = req.body as Record<string, unknown>;

    if (typeof entityType !== "string" || !(CONFLICT_ENTITY_TYPES as readonly string[]).includes(entityType)) {
      res.status(400).json({ error: `"entityType" must be one of: ${CONFLICT_ENTITY_TYPES.join(", ")}` }); return;
    }
    if (typeof entityId !== "string" || !entityId.trim()) {
      res.status(400).json({ error: '"entityId" is required' }); return;
    }
    if (typeof fieldName !== "string" || !fieldName.trim()) {
      res.status(400).json({ error: '"fieldName" is required' }); return;
    }
    for (const [name, val] of [["sourceA", sourceA], ["sourceB", sourceB]] as const) {
      if (typeof val !== "string" || !(CONFLICT_SOURCES as readonly string[]).includes(val)) {
        res.status(400).json({ error: `"${name}" must be one of: ${CONFLICT_SOURCES.join(", ")}` }); return;
      }
    }
    if (typeof valueA !== "string" || typeof valueB !== "string") {
      res.status(400).json({ error: '"valueA" and "valueB" must be strings (stringify numbers/json upstream)' }); return;
    }
    if (venueId !== undefined && venueId !== null && (typeof venueId !== "string" || !UUID_RE.test(venueId))) {
      res.status(400).json({ error: '"venueId" must be a UUID or omitted' }); return;
    }

    const row = await recordConflict({
      entityType: entityType as ConflictEntityType,
      entityId:   entityId.trim(),
      venueId:    typeof venueId === "string" ? venueId : null,
      fieldName:  fieldName.trim(),
      sourceA:    sourceA as ConflictSource,
      valueA,
      sourceB:    sourceB as ConflictSource,
      valueB,
      detectedBy: req.user?.id ?? null,
      notes:      typeof notes === "string" ? notes.trim() || null : null,
    });
    res.status(201).json(row);
  },
);

// ── PATCH /api/conflicts/:id/resolve ──────────────────────────────────────────

router.patch(
  "/:id/resolve",
  requireAuth,
  requireRole("super_admin", "venue_owner", "manager"),
  allowOnly("resolution", "customValue", "notes"),
  async (req: AuthRequest, res: Response) => {
    const id = String(req.params["id"] ?? "");
    if (!UUID_RE.test(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const { resolution, customValue, notes } = req.body as {
      resolution?: string; customValue?: string; notes?: string;
    };
    if (!resolution || !(CONFLICT_RESOLUTIONS as readonly string[]).includes(resolution)) {
      res.status(400).json({ error: `"resolution" must be one of: ${CONFLICT_RESOLUTIONS.join(", ")}` });
      return;
    }
    const res_ = resolution as ConflictResolution;

    const [existing] = await db.select().from(dataConflictsTable).where(eq(dataConflictsTable.id, id)).limit(1);
    if (!existing) { res.status(404).json({ error: "Conflict not found" }); return; }

    // Tenant scoping
    if (req.user?.role !== "super_admin") {
      if (!existing.venueId || existing.venueId !== req.user?.venueId) {
        res.status(403).json({ error: "You can only resolve conflicts for your own venue" });
        return;
      }
    }

    if (existing.status !== "open") {
      res.status(409).json({ error: `Conflict already ${existing.status}` });
      return;
    }

    let resolvedValue: string | null = null;
    if (res_ === "use_a")      resolvedValue = existing.valueA;
    else if (res_ === "use_b") resolvedValue = existing.valueB;
    else if (res_ === "use_custom") {
      if (typeof customValue !== "string") {
        res.status(400).json({ error: '"customValue" is required when resolution = "use_custom"' });
        return;
      }
      resolvedValue = customValue;
    }
    // "dismissed" → resolvedValue stays null

    const nextStatus: ConflictStatus = res_ === "dismissed" ? "dismissed" : "resolved";

    // Atomic conditional update (Brief 42 pattern) — guards concurrent resolves.
    const updatedRows = await db
      .update(dataConflictsTable)
      .set({
        status:        nextStatus,
        resolution:    res_,
        resolvedValue,
        resolvedBy:    req.user?.id ?? null,
        resolvedAt:    new Date(),
        notes:         typeof notes === "string" && notes.trim() ? notes.trim() : existing.notes,
      })
      .where(and(
        eq(dataConflictsTable.id, id),
        eq(dataConflictsTable.status, "open"),
      ))
      .returning();

    if (updatedRows.length === 0) {
      const [fresh] = await db.select().from(dataConflictsTable).where(eq(dataConflictsTable.id, id)).limit(1);
      res.status(409).json({
        error: "Conflict was resolved concurrently; please refresh",
        currentStatus: fresh?.status ?? null,
      });
      return;
    }

    req.log.info(
      { conflictId: id, resolution: res_, by: req.user?.id },
      "conflict resolved",
    );
    res.json(updatedRows[0]);
  },
);

// avoid unused-import lint when isNull goes unused — kept for future filters
void isNull;

export default router;
