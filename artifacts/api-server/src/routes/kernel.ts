/**
 * Kernel routes — NOVEE OS Titan Kernel
 *
 * GET  /api/kernel/modules                              — list registered modules
 * POST /api/kernel/modules                              — register a module (admin/super_admin)
 * GET  /api/kernel/mode/:venueId                        — get Sovereign/Essential mode for a venue
 * PATCH /api/kernel/mode/:venueId                       — set mode (admin/super_admin only)
 * POST /api/kernel/telemetry                            — ingest a telemetry event
 * GET  /api/kernel/telemetry/summary                    — aggregated telemetry summary
 * GET  /api/kernel/telemetry/products/trends/batch      — batch daily add/skip trends (up to 50 cardIds)
 * GET  /api/kernel/telemetry/products/:cardId/trend     — daily add/skip trend for a product
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { db }                        from "@workspace/db";
import {
  kernelModulesTable,
  kernelModeConfigTable,
  kernelModeAuditLogTable,
  telemetryEventsTable,
  kernelModuleAuditLogTable,
  kernelModuleSlugHistoryTable,
  usersTable,
  venueAiProvidersTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { z }                             from "zod";
import { eq, desc, sql, count, and, ne, isNull, isNotNull, gte, lte } from "drizzle-orm";

const router: IRouter = Router();

// ── Validation schemas ─────────────────────────────────────────────────────────

const RegisterModuleSchema = z.object({
  name:        z.string().min(1).max(120),
  craftType:   z.enum(["smoke", "pour", "brew", "vape", "none"]).default("none"),
  slug:        z.string().min(1).max(80),
  status:      z.enum(["active", "inactive", "suspended"]).default("active"),
  description: z.string().optional(),
  launchUrl:   z.string().optional(),
});

const SetModeSchema = z.object({
  mode: z.enum(["sovereign", "essential"]),
});

const TelemetryIngestSchema = z.object({
  moduleId:  z.string().uuid().optional(),
  venueId:   z.string().uuid().optional(),
  eventType: z.string().min(1).max(120),
  payload:   z.record(z.unknown()).optional(),
});

const EditModuleSchema = z.object({
  name:        z.string().min(1).max(120).optional(),
  craftType:   z.enum(["smoke", "pour", "brew", "vape", "none"]).optional(),
  slug:        z.string().min(1).max(80).optional(),
  status:      z.enum(["active", "inactive", "suspended"]).optional(),
  description: z.string().optional(),
  launchUrl:   z.string().optional(),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── GET /api/kernel/modules ────────────────────────────────────────────────────
// Optional query params:
//   ?slug=<value>       — returns { available: boolean } only
//   ?excludeId=<uuid>   — when combined with ?slug, ignore a match with this ID
//                         (used by the Edit modal so a module's own slug isn't
//                          flagged as a conflict)

router.get("/modules", async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const { slug, excludeId } = q;

  if (slug !== undefined) {
    // Slug availability check — no auth required
    if (excludeId !== undefined && !UUID_RE.test(excludeId)) {
      return res.status(400).json({ error: "excludeId must be a valid UUID" });
    }
    try {
      const whereClause = excludeId
        ? and(eq(kernelModulesTable.slug, slug.trim()), ne(kernelModulesTable.id, excludeId))
        : eq(kernelModulesTable.slug, slug.trim());

      const rows = await db
        .select({ id: kernelModulesTable.id })
        .from(kernelModulesTable)
        .where(whereClause)
        .limit(1);
      return res.json({ available: rows.length === 0 });
    } catch {
      return res.status(500).json({ error: "Failed to check slug availability" });
    }
  }

  try {
    const modules = await db
      .select()
      .from(kernelModulesTable)
      .where(isNull(kernelModulesTable.deletedAt))
      .orderBy(desc(kernelModulesTable.registeredAt));
    return res.json({ modules });
  } catch {
    return res.status(500).json({ error: "Failed to list kernel modules" });
  }
});

// ── GET /api/kernel/modules/deleted ───────────────────────────────────────────
// Returns soft-deleted modules for audit purposes (admin/super_admin only).
// Optional query param: ?limit=N  (default: 100, max: 500)

router.get("/modules/deleted", requireAuth, async (req: AuthRequest, res: Response) => {
  const role = (req as AuthRequest).user?.role;
  if (role !== "admin" && role !== "super_admin") {
    return res.status(403).json({ error: "admin or super_admin only" });
  }

  const rawLimit = req.query.limit as string | undefined;
  let limitN = 100;
  if (rawLimit !== undefined) {
    const parsed = parseInt(rawLimit, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 500) {
      return res.status(400).json({ error: "limit must be an integer between 1 and 500" });
    }
    limitN = parsed;
  }

  try {
    const modules = await db
      .select()
      .from(kernelModulesTable)
      .where(isNotNull(kernelModulesTable.deletedAt))
      .orderBy(desc(kernelModulesTable.deletedAt))
      .limit(limitN);
    return res.json({ modules });
  } catch {
    return res.status(500).json({ error: "Failed to list deleted modules" });
  }
});

// ── GET /api/kernel/modules/by-slug/:slug ─────────────────────────────────────
// Resolves a module by its current or any historical slug.
// Current slug  → 200 { redirect: false, module }
// Historical slug → 200 { redirect: true, currentSlug, module }
//   Note: we return 200 (not 301) so that XHR/fetch clients see the body.
//   fetch auto-follows 301s, which would swallow the redirect flag.
//   The X-Redirect-Slug response header carries the canonical slug for
//   non-JSON consumers (e.g. server-to-server integrations).
// Unknown / deleted slug → 404

router.get("/modules/by-slug/:slug", async (req: Request, res: Response) => {
  const { slug } = req.params as { slug: string };
  if (!slug || slug.length > 80) {
    return res.status(400).json({ error: "Invalid slug" });
  }

  try {
    // Check if slug is a current active module slug
    const [current] = await db
      .select()
      .from(kernelModulesTable)
      .where(and(eq(kernelModulesTable.slug, slug), isNull(kernelModulesTable.deletedAt)))
      .limit(1);

    if (current) {
      return res.json({ redirect: false, module: current });
    }

    // Check slug history — find the most recent entry for this old slug
    const [historyEntry] = await db
      .select()
      .from(kernelModuleSlugHistoryTable)
      .where(eq(kernelModuleSlugHistoryTable.oldSlug, slug))
      .orderBy(desc(kernelModuleSlugHistoryTable.changedAt))
      .limit(1);

    if (!historyEntry) {
      return res.status(404).json({ error: "No module found with this slug" });
    }

    // Fetch the current state of that module
    const [module] = await db
      .select()
      .from(kernelModulesTable)
      .where(and(eq(kernelModulesTable.id, historyEntry.moduleId), isNull(kernelModulesTable.deletedAt)))
      .limit(1);

    if (!module) {
      return res.status(404).json({ error: "Module has been deleted" });
    }

    // Return 200 with redirect metadata so XHR/fetch callers see the body.
    // (HTTP 301 is auto-followed by fetch, which would hide the redirect flag.)
    // The `redirect: true` flag signals the frontend to update its URL to currentSlug.
    // Direct API consumers can also inspect the `X-Redirect-Slug` header for routing.
    res.setHeader("X-Redirect-Slug", module.slug);
    return res.json({ redirect: true, currentSlug: module.slug, module });
  } catch {
    return res.status(500).json({ error: "Failed to resolve slug" });
  }
});

// ── GET /api/kernel/modules/:id/slug-history ──────────────────────────────────
// Returns the full slug change history for a module (admin/super_admin only).

router.get("/modules/:id/slug-history", requireAuth, async (req: AuthRequest, res: Response) => {
  const role = (req as AuthRequest).user?.role;
  if (role !== "admin" && role !== "super_admin") {
    return res.status(403).json({ error: "admin or super_admin only" });
  }

  const { id } = req.params as { id: string };
  if (!UUID_RE.test(id)) return res.status(400).json({ error: "id must be a valid UUID" });

  try {
    const history = await db
      .select()
      .from(kernelModuleSlugHistoryTable)
      .where(eq(kernelModuleSlugHistoryTable.moduleId, id))
      .orderBy(desc(kernelModuleSlugHistoryTable.changedAt));

    return res.json({ slugHistory: history });
  } catch {
    return res.status(500).json({ error: "Failed to load slug history" });
  }
});

// ── POST /api/kernel/modules ───────────────────────────────────────────────────

router.post("/modules", requireAuth, async (req: AuthRequest, res: Response) => {
  const role = (req as AuthRequest).user?.role;
  if (role !== "admin" && role !== "super_admin") {
    return res.status(403).json({ error: "admin or super_admin only" });
  }

  const parsed = RegisterModuleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }

  try {
    const [mod] = await db
      .insert(kernelModulesTable)
      .values(parsed.data)
      .returning();
    return res.status(201).json({ module: mod });
  } catch (err: unknown) {
    // PostgreSQL unique-constraint violation
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "23505"
    ) {
      return res.status(409).json({ error: "Slug already in use", field: "slug" });
    }
    const msg = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: msg });
  }
});

// ── PATCH /api/kernel/modules/:id ─────────────────────────────────────────────
// Update an existing module (admin/super_admin only). Writes an audit log entry.

router.patch("/modules/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const user = (req as AuthRequest).user;
  const role = user?.role;
  if (role !== "admin" && role !== "super_admin") {
    return res.status(403).json({ error: "admin or super_admin only" });
  }

  const { id } = req.params as { id: string };
  if (!UUID_RE.test(id)) return res.status(400).json({ error: "id must be a valid UUID" });

  const parsed = EditModuleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }

  if (Object.keys(parsed.data).length === 0) {
    return res.status(400).json({ error: "No fields to update" });
  }

  try {
    const changedBy = user?.email ?? user?.id ?? "unknown";

    // Run module update + audit log insert atomically in a transaction
    const mod = await db.transaction(async (tx) => {
      // Fetch current values so we can compute a before/after diff
      const [before] = await tx
        .select()
        .from(kernelModulesTable)
        .where(eq(kernelModulesTable.id, id))
        .limit(1);

      if (!before) return null;

      const [updated] = await tx
        .update(kernelModulesTable)
        .set(parsed.data)
        .where(eq(kernelModulesTable.id, id))
        .returning();

      // Build diff: only include fields that actually changed
      const diff: Record<string, { before: unknown; after: unknown }> = {};
      for (const key of Object.keys(parsed.data) as (keyof typeof parsed.data)[]) {
        const prev = before[key as keyof typeof before];
        const next = parsed.data[key];
        if (prev !== next) {
          diff[key] = { before: prev, after: next };
        }
      }

      await tx.insert(kernelModuleAuditLogTable).values({ moduleId: id, changedBy, diff });

      // Record slug change in history so old links can be redirected
      if (parsed.data.slug && parsed.data.slug !== before.slug) {
        await tx.insert(kernelModuleSlugHistoryTable).values({
          moduleId:  id,
          oldSlug:   before.slug,
          newSlug:   parsed.data.slug,
          changedBy,
        });
      }

      return updated;
    });

    if (!mod) return res.status(404).json({ error: "Module not found" });
    return res.json({ module: mod });
  } catch (err: unknown) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "23505"
    ) {
      return res.status(409).json({ error: "Slug already in use", field: "slug" });
    }
    const msg = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: msg });
  }
});

// ── GET /api/kernel/modules/:id/history ───────────────────────────────────────
// Returns audit log entries for a module (admin/super_admin only).
// Optional query params:
//   ?field=<name>        — only entries whose diff contains this field key
//   ?since=<ISO date>    — only entries at or after this timestamp
//   ?until=<ISO date>    — only entries at or before this timestamp
//   ?page=<1…>           — page number (default: 1)
//   ?limit=<1–50>        — page size (default: 20, max: 50)
// Response: { history, total, page, totalPages }

router.get("/modules/:id/history", requireAuth, async (req: AuthRequest, res: Response) => {
  const role = (req as AuthRequest).user?.role;
  if (role !== "admin" && role !== "super_admin") {
    return res.status(403).json({ error: "admin or super_admin only" });
  }

  const { id } = req.params as { id: string };
  if (!UUID_RE.test(id)) return res.status(400).json({ error: "id must be a valid UUID" });

  const q = req.query as Record<string, string | undefined>;

  // Parse ?limit
  let limitN = 20;
  if (q.limit !== undefined) {
    const parsed = parseInt(q.limit, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 50) {
      return res.status(400).json({ error: "limit must be an integer between 1 and 50" });
    }
    limitN = parsed;
  }

  // Parse ?page
  let pageN = 1;
  if (q.page !== undefined) {
    const parsed = parseInt(q.page, 10);
    if (isNaN(parsed) || parsed < 1) {
      return res.status(400).json({ error: "page must be a positive integer" });
    }
    pageN = parsed;
  }

  // Parse ?since / ?until
  let sinceDate: Date | undefined;
  let untilDate: Date | undefined;
  if (q.since !== undefined) {
    sinceDate = new Date(q.since);
    if (isNaN(sinceDate.getTime())) {
      return res.status(400).json({ error: "since must be a valid ISO date string" });
    }
  }
  if (q.until !== undefined) {
    untilDate = new Date(q.until);
    if (isNaN(untilDate.getTime())) {
      return res.status(400).json({ error: "until must be a valid ISO date string" });
    }
  }

  // Parse ?field — must be a safe identifier (letters, numbers, underscores)
  const fieldFilter = q.field?.trim() || undefined;
  if (fieldFilter !== undefined && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fieldFilter)) {
    return res.status(400).json({ error: "field must be a valid field name" });
  }

  try {
    // Build WHERE conditions
    const conditions = [eq(kernelModuleAuditLogTable.moduleId, id)];
    if (sinceDate) conditions.push(gte(kernelModuleAuditLogTable.changedAt, sinceDate));
    if (untilDate) conditions.push(lte(kernelModuleAuditLogTable.changedAt, untilDate));
    if (fieldFilter) {
      conditions.push(sql`jsonb_exists(${kernelModuleAuditLogTable.diff}::jsonb, ${fieldFilter})`);
    }

    const whereClause = and(...conditions);

    const [{ total }] = await db
      .select({ total: count() })
      .from(kernelModuleAuditLogTable)
      .where(whereClause);

    const entries = await db
      .select()
      .from(kernelModuleAuditLogTable)
      .where(whereClause)
      .orderBy(desc(kernelModuleAuditLogTable.changedAt))
      .limit(limitN)
      .offset((pageN - 1) * limitN);

    return res.json({
      history:    entries,
      total,
      page:       pageN,
      totalPages: Math.ceil(total / limitN),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: msg });
  }
});

// ── DELETE /api/kernel/modules/:id ────────────────────────────────────────────
// Soft-deletes a module from the registry (admin/super_admin only).
// Sets deletedAt / deletedBy; the row is retained for audit purposes.

router.delete("/modules/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const user = (req as AuthRequest).user;
  const role = user?.role;
  if (role !== "admin" && role !== "super_admin") {
    return res.status(403).json({ error: "admin or super_admin only" });
  }

  const { id } = req.params as { id: string };
  if (!UUID_RE.test(id)) return res.status(400).json({ error: "id must be a valid UUID" });

  const deletedBy = user?.email ?? user?.id ?? "unknown";

  try {
    const [softDeleted] = await db
      .update(kernelModulesTable)
      .set({ deletedAt: new Date(), deletedBy })
      .where(and(eq(kernelModulesTable.id, id), isNull(kernelModulesTable.deletedAt)))
      .returning({ id: kernelModulesTable.id });

    if (!softDeleted) return res.status(404).json({ error: "Module not found or already deleted" });
    return res.status(204).send();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return res.status(500).json({ error: msg });
  }
});

// ── GET /api/kernel/mode/:venueId ─────────────────────────────────────────────
// Public read — returns mode config and, when a prior change exists, the display
// name of the admin who last made the change (updatedByName) alongside updatedAt.

router.get("/mode/:venueId", async (req: Request, res: Response) => {
  const { venueId } = req.params as { venueId: string };
  if (!UUID_RE.test(venueId)) return res.status(400).json({ error: "venueId must be a valid UUID" });

  try {
    const [row] = await db
      .select({
        mode:          kernelModeConfigTable.mode,
        updatedAt:     kernelModeConfigTable.updatedAt,
        updatedByName: usersTable.name,
      })
      .from(kernelModeConfigTable)
      .leftJoin(usersTable, eq(kernelModeConfigTable.updatedBy, usersTable.id))
      .where(eq(kernelModeConfigTable.venueId, venueId));

    if (!row) {
      return res.json({ venueId, mode: "sovereign" });
    }
    return res.json({
      venueId,
      mode:          row.mode,
      updatedAt:     row.updatedAt,
      updatedByName: row.updatedByName ?? undefined,
    });
  } catch {
    return res.status(500).json({ error: "Failed to read mode config" });
  }
});

// ── PATCH /api/kernel/mode/:venueId ──────────────────────────────────────────
// super_admin: can update any venue.
// venue_owner: can only update the venue they own (req.user.venueId must match).

router.patch("/mode/:venueId", requireAuth, async (req: AuthRequest, res: Response) => {
  const { role, venueId: userVenueId } = (req as AuthRequest).user ?? {};
  if (role !== "super_admin" && role !== "venue_owner") {
    return res.status(403).json({ error: "super_admin or venue_owner only" });
  }

  const { venueId } = req.params as { venueId: string };
  if (!UUID_RE.test(venueId)) return res.status(400).json({ error: "venueId must be a valid UUID" });

  // Venue-scoped guard: venue_owner may only update their own venue.
  if (role === "venue_owner" && userVenueId !== venueId) {
    return res.status(403).json({ error: "venue_owner may only update their own venue" });
  }
  const parsed = SetModeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }

  const authUser = (req as AuthRequest).user;

  try {
    const cfg = await db.transaction(async (tx) => {
      // Read current mode so we can record old→new in the audit log
      const [existing] = await tx
        .select({ mode: kernelModeConfigTable.mode })
        .from(kernelModeConfigTable)
        .where(eq(kernelModeConfigTable.venueId, venueId))
        .limit(1);

      const [updated] = await tx
        .insert(kernelModeConfigTable)
        .values({
          venueId,
          mode: parsed.data.mode,
          updatedBy: authUser?.id,
        })
        .onConflictDoUpdate({
          target: kernelModeConfigTable.venueId,
          set: {
            mode: parsed.data.mode,
            updatedAt: new Date(),
            updatedBy: authUser?.id,
          },
        })
        .returning();

      // Only write an audit entry when the mode actually changes
      const oldMode = existing?.mode ?? null;
      if (oldMode !== parsed.data.mode) {
        await tx.insert(kernelModeAuditLogTable).values({
          venueId,
          oldMode:       oldMode ?? undefined,
          newMode:       parsed.data.mode,
          changedBy:     authUser?.id,
          changedByName: authUser?.name ?? authUser?.email ?? undefined,
        });
      }

      return updated;
    });

    return res.json({
      venueId,
      mode:          cfg.mode,
      updatedAt:     cfg.updatedAt,
      updatedByName: authUser?.name ?? undefined,
    });
  } catch {
    return res.status(500).json({ error: "Failed to update mode config" });
  }
});

// ── GET /api/kernel/sovereign-readiness ──────────────────────────────────────
// Pre-upgrade check: reports whether AI provider keys are configured so the UI
// can warn admins before they switch to Sovereign mode.
//
// Access: super_admin or venue_owner only.
//
// Optional query param:
//   ?venueId=<uuid>  — also checks BYOK providers stored for that venue.
//
// Response:
//   { ready: boolean, missing: string[], byokAvailable: boolean }
//   - ready          : true when at least one AI provider is usable
//   - missing        : names of AXIOM platform keys that are absent
//   - byokAvailable  : true when the venue has ≥1 connected BYOK provider

router.get("/sovereign-readiness", requireAuth, async (req: AuthRequest, res: Response) => {
  const user = (req as AuthRequest).user;
  const { role, venueId: userVenueId } = user ?? {};
  if (role !== "super_admin" && role !== "venue_owner") {
    return res.status(403).json({ error: "super_admin or venue_owner only" });
  }

  // Resolve which venue to check BYOK for.
  // venue_owner is scoped to their own venue — they may not probe other venues.
  const rawVenueId = req.query["venueId"] as string | undefined;
  let resolvedVenueId: string | undefined;

  if (rawVenueId !== undefined) {
    if (!UUID_RE.test(rawVenueId)) {
      return res.status(400).json({ error: "venueId must be a valid UUID" });
    }
    if (role === "venue_owner" && userVenueId !== rawVenueId) {
      return res.status(403).json({ error: "venue_owner may only check readiness for their own venue" });
    }
    resolvedVenueId = rawVenueId;
  } else if (role === "venue_owner" && userVenueId) {
    // Default to the caller's own venue when no param is supplied
    resolvedVenueId = userVenueId;
  }

  const AXIOM_KEYS: { key: string; label: string }[] = [
    { key: "OPENAI_API_KEY",      label: "OpenAI"       },
    { key: "ANTHROPIC_API_KEY",   label: "Anthropic"    },
    { key: "GEMINI_API_KEY",      label: "Gemini"       },
    { key: "AZURE_OPENAI_API_KEY",label: "Azure OpenAI" },
  ];

  const missing = AXIOM_KEYS
    .filter(({ key }) => !process.env[key])
    .map(({ label }) => label);

  const allAxiomMissing = missing.length === AXIOM_KEYS.length;

  let byokAvailable = false;
  let byokCheckError = false;
  if (resolvedVenueId) {
    try {
      const rows = await db
        .select({ id: venueAiProvidersTable.id })
        .from(venueAiProvidersTable)
        .where(
          and(
            eq(venueAiProvidersTable.venueId, resolvedVenueId),
            eq(venueAiProvidersTable.status, "connected"),
            isNull(venueAiProvidersTable.disconnectedAt),
          ),
        )
        .limit(1);
      byokAvailable = rows.length > 0;
    } catch (err) {
      req.log.warn({ err, venueId: resolvedVenueId }, "sovereign-readiness: BYOK provider lookup failed");
      byokCheckError = true;
    }
  }

  const ready = !allAxiomMissing || byokAvailable;

  return res.json({ ready, missing, byokAvailable, byokCheckError });
});

// ── GET /api/kernel/mode/:venueId/history ────────────────────────────────────
// Returns mode change audit log for a venue.
// Access policy (intentional):
//   - super_admin / admin : can read history for any venue
//   - venue_owner         : can read history for their own venue only (scoped by userVenueId === venueId)
// Venue owners are granted read-only visibility into their own history so they can
// audit who changed their mode and when, without exposing cross-venue data.
// Optional query params:
//   ?limit=<1–50>  — page size (default 20, max 50)
//   ?offset=<0…>   — row offset for pagination (default 0)

router.get("/mode/:venueId/history", requireAuth, async (req: AuthRequest, res: Response) => {
  const { role, venueId: userVenueId } = (req as AuthRequest).user ?? {};
  if (role !== "super_admin" && role !== "admin" && role !== "venue_owner") {
    return res.status(403).json({ error: "admin, super_admin, or venue_owner only" });
  }

  const { venueId } = req.params as { venueId: string };
  if (!UUID_RE.test(venueId)) return res.status(400).json({ error: "venueId must be a valid UUID" });

  if (role === "venue_owner" && userVenueId !== venueId) {
    return res.status(403).json({ error: "venue_owner may only view their own venue history" });
  }

  const q = req.query as Record<string, string | undefined>;

  let limitN = 20;
  if (q.limit !== undefined) {
    const parsed = parseInt(q.limit, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 50) {
      return res.status(400).json({ error: "limit must be an integer between 1 and 50" });
    }
    limitN = parsed;
  }

  let offsetN = 0;
  if (q.offset !== undefined) {
    const parsed = parseInt(q.offset, 10);
    if (isNaN(parsed) || parsed < 0) {
      return res.status(400).json({ error: "offset must be a non-negative integer" });
    }
    offsetN = parsed;
  }

  try {
    const [{ total }] = await db
      .select({ total: count() })
      .from(kernelModeAuditLogTable)
      .where(eq(kernelModeAuditLogTable.venueId, venueId));

    const entries = await db
      .select()
      .from(kernelModeAuditLogTable)
      .where(eq(kernelModeAuditLogTable.venueId, venueId))
      .orderBy(desc(kernelModeAuditLogTable.changedAt))
      .limit(limitN)
      .offset(offsetN);

    return res.json({ history: entries, total });
  } catch {
    return res.status(500).json({ error: "Failed to load mode change history" });
  }
});

// ── POST /api/kernel/telemetry ─────────────────────────────────────────────────
//
// Expected request body shape (validated by TelemetryIngestSchema):
//   {
//     eventType: string,           — e.g. "swipe_start" | "swipe_add" | "swipe_skip" | "build_complete" | "add_to_order"
//     moduleId?:  string (uuid),   — kernel_modules.id for the emitting craft module
//     venueId?:   string (uuid),   — venue scope; resolved from localStorage by the client
//     payload?:   Record<string, unknown>
//   }
//
// The payload MUST include craftType when the emitting client cannot guarantee
// that a matching kernel_modules row exists for the moduleId.  The craft-activity
// dashboard query resolves craft type via:
//   COALESCE(payload->>'craftType', kernel_modules.craft_type, 'unknown')
// Events where both sources are absent are grouped as 'unknown' and excluded
// from the Craft Compare tab.
//
// Required payload fields per event type:
//   swipe_start    — { craftType: "smoke"|"pour"|"brew"|"vape", cardId?: string }
//   swipe_add      — { craftType, cardId, title }
//   swipe_skip     — { craftType, cardId, title }
//   build_complete — { craftType, sessionId?, count? }
//   reveal_view    — { craftType, sessionId? }
//   add_to_order   — { craftType, orderId?, items? }

router.post("/telemetry", async (req: Request, res: Response) => {
  const parsed = TelemetryIngestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.format() });
  }

  try {
    await db.insert(telemetryEventsTable).values({
      moduleId:  parsed.data.moduleId ?? null,
      venueId:   parsed.data.venueId  ?? null,
      eventType: parsed.data.eventType,
      payload:   parsed.data.payload  ?? {},
    });
    return res.status(202).json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Failed to ingest telemetry event" });
  }
});

// ── GET /api/kernel/telemetry/recent ──────────────────────────────────────────
// Returns the most recent telemetry events in reverse-chronological order.
// Optional query param: ?limit=N  (default 20, max 100)

router.get("/telemetry/recent", async (req: Request, res: Response) => {
  const rawLimit = parseInt((req.query as Record<string, string>).limit ?? "20", 10);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;

  try {
    const rows = await db
      .select({
        id:         telemetryEventsTable.id,
        eventType:  telemetryEventsTable.eventType,
        moduleId:   telemetryEventsTable.moduleId,
        venueId:    telemetryEventsTable.venueId,
        occurredAt: telemetryEventsTable.occurredAt,
        payload:    telemetryEventsTable.payload,
      })
      .from(telemetryEventsTable)
      .orderBy(desc(telemetryEventsTable.occurredAt))
      .limit(limit);

    return res.json({ events: rows });
  } catch {
    return res.status(500).json({ error: "Failed to load recent telemetry events" });
  }
});

// ── GET /api/kernel/telemetry/summary ─────────────────────────────────────────
// Public read — aggregated counts only, no PII.
// Query params:
//   ?days=N          — primary window length in days (default 30, max 365)
//   ?compareDays=N   — when set, also return a comparison block for the
//                      preceding equivalent window of that length

async function buildSummary(windowDays: number, offsetDays = 0) {
  const windowEnd   = sql`NOW() - (${offsetDays} || ' days')::interval`;
  const windowStart = sql`NOW() - (${offsetDays + windowDays} || ' days')::interval`;

  // Total events in window
  const totalResult = await db.execute(sql`
    SELECT COUNT(*)::int AS total
    FROM telemetry_events
    WHERE occurred_at >= ${windowStart} AND occurred_at < ${windowEnd}
  `);
  const total = (totalResult.rows[0] as { total: number }).total;

  // Events per day — generate_series zero-fills days with no events so every
  // window always returns exactly windowDays rows in ascending order.
  const dailyResult = await db.execute(sql`
    SELECT
      gs.day::date::text AS day,
      COALESCE(c.cnt, 0)::int AS cnt
    FROM (
      SELECT generate_series(
        (${windowStart})::date,
        (${windowEnd})::date - INTERVAL '1 day',
        '1 day'::interval
      )::date AS day
    ) gs
    LEFT JOIN (
      SELECT DATE_TRUNC('day', occurred_at)::date AS day, COUNT(*)::int AS cnt
      FROM telemetry_events
      WHERE occurred_at >= ${windowStart} AND occurred_at < ${windowEnd}
      GROUP BY 1
    ) c USING (day)
    ORDER BY gs.day ASC
  `);
  const dailyCounts = dailyResult.rows as { day: string; cnt: number }[];

  // Top event types in window
  const topResult = await db.execute(sql`
    SELECT event_type, COUNT(*)::int AS cnt
    FROM telemetry_events
    WHERE occurred_at >= ${windowStart} AND occurred_at < ${windowEnd}
    GROUP BY event_type
    ORDER BY cnt DESC
    LIMIT 10
  `);
  const topEventTypes = topResult.rows as { event_type: string; cnt: number }[];

  // Per-module usage in window
  const moduleResult = await db.execute(sql`
    SELECT
      km.name AS module_name,
      km.slug AS module_slug,
      COUNT(te.id)::int AS event_count
    FROM kernel_modules km
    LEFT JOIN telemetry_events te
      ON te.module_id = km.id
      AND te.occurred_at >= ${windowStart}
      AND te.occurred_at < ${windowEnd}
    GROUP BY km.id, km.name, km.slug
    ORDER BY event_count DESC
  `);
  const moduleUsage = moduleResult.rows as { module_name: string; module_slug: string; event_count: number }[];

  // Ritual engagement in window
  const ritualResult = await db.execute(sql`
    SELECT
      SUM(CASE WHEN event_type = 'swipe_start'    THEN 1 ELSE 0 END)::int AS starts,
      SUM(CASE WHEN event_type = 'build_complete' THEN 1 ELSE 0 END)::int AS completions
    FROM telemetry_events
    WHERE occurred_at >= ${windowStart} AND occurred_at < ${windowEnd}
  `);
  const { starts, completions } = ritualResult.rows[0] as { starts: number; completions: number };
  const ritualEngagement = starts > 0 ? Math.round((completions / starts) * 100) : 0;

  // Per-module daily counts (sparkline data) — cross join modules × date series,
  // then left join telemetry events so every module gets a zero-filled series.
  const moduleSparklineResult = await db.execute(sql`
    SELECT
      km.slug AS module_slug,
      gs.day::date::text AS day,
      COALESCE(c.cnt, 0)::int AS cnt
    FROM kernel_modules km
    CROSS JOIN (
      SELECT generate_series(
        (${windowStart})::date,
        (${windowEnd})::date - INTERVAL '1 day',
        '1 day'::interval
      )::date AS day
    ) gs
    LEFT JOIN (
      SELECT module_id, DATE_TRUNC('day', occurred_at)::date AS day, COUNT(*)::int AS cnt
      FROM telemetry_events
      WHERE occurred_at >= ${windowStart} AND occurred_at < ${windowEnd}
      GROUP BY module_id, 2
    ) c ON c.module_id = km.id AND c.day = gs.day
    ORDER BY km.slug, gs.day
  `);

  type SparkRow = { module_slug: string; day: string; cnt: number };
  const sparkRows = moduleSparklineResult.rows as SparkRow[];

  const moduleDailyCounts: Record<string, { day: string; cnt: number }[]> = {};
  for (const r of sparkRows) {
    if (!moduleDailyCounts[r.module_slug]) moduleDailyCounts[r.module_slug] = [];
    moduleDailyCounts[r.module_slug]!.push({ day: r.day, cnt: r.cnt });
  }

  return { total, dailyCounts, topEventTypes, moduleUsage, ritualEngagement, moduleDailyCounts };
}

router.get("/telemetry/summary", async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const rawDays = parseInt(q.days ?? "30", 10);
  const days = Number.isFinite(rawDays) && rawDays > 0 ? Math.min(rawDays, 365) : 30;

  const rawCompare = parseInt(q.compareDays ?? "", 10);
  const compareDays = Number.isFinite(rawCompare) && rawCompare > 0 ? Math.min(rawCompare, 365) : null;

  try {
    const primary = await buildSummary(days, 0);

    let comparison = null;
    if (compareDays !== null) {
      comparison = await buildSummary(compareDays, days);
    }

    return res.json({ ...primary, comparison });
  } catch {
    return res.status(500).json({ error: "Failed to load telemetry summary" });
  }
});

// ── GET /api/kernel/telemetry/products ────────────────────────────────────────
// Aggregates swipe_add / swipe_skip counts by cardId + title from the payload.
// Query params:
//   ?moduleId=<uuid>              — filter to a specific module (optional)
//   ?window=24h|7d|30d|90d        — shorthand time window (default: 30d)
//   ?days=N                       — explicit day count (overrides window, max 365)
//   ?craftType=smoke|pour|brew|vape — filter by payload craftType (optional)

const CRAFT_TYPES = ["smoke", "pour", "brew", "vape"] as const;
type CraftType = typeof CRAFT_TYPES[number];

router.get("/telemetry/products", async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;

  // Resolve window in days
  let days = 30;
  if (q.days !== undefined) {
    const d = parseInt(q.days, 10);
    if (Number.isFinite(d) && d > 0) days = Math.min(d, 365);
  } else if (q.window !== undefined) {
    const w = q.window.trim().toLowerCase();
    if (w === "24h" || w === "1d") {
      days = 1;
    } else {
      const m = /^(\d+)d$/.exec(w);
      if (m) days = Math.min(parseInt(m[1]!, 10), 365);
    }
  }

  const moduleId = q.moduleId;
  if (moduleId !== undefined && !UUID_RE.test(moduleId)) {
    return res.status(400).json({ error: "moduleId must be a valid UUID" });
  }

  const rawCraftType = q.craftType?.trim().toLowerCase();
  if (rawCraftType !== undefined && !(CRAFT_TYPES as readonly string[]).includes(rawCraftType)) {
    return res.status(400).json({ error: "craftType must be one of: smoke, pour, brew, vape" });
  }
  const craftType: CraftType | null = rawCraftType ? (rawCraftType as CraftType) : null;

  try {
    const windowStart = sql`NOW() - (${days} || ' days')::interval`;

    type ProductRow = { card_id: string; title: string | null; craft_type: string | null; adds: number; skips: number; total: number };

    const craftFilter = craftType
      ? sql`AND payload->>'craftType' = ${craftType}`
      : sql``;

    let rows: ProductRow[];

    if (moduleId) {
      const result = await db.execute(sql`
        SELECT
          payload->>'cardId'    AS card_id,
          payload->>'title'     AS title,
          payload->>'craftType' AS craft_type,
          SUM(CASE WHEN event_type = 'swipe_add'  THEN 1 ELSE 0 END)::int AS adds,
          SUM(CASE WHEN event_type = 'swipe_skip' THEN 1 ELSE 0 END)::int AS skips,
          COUNT(*)::int AS total
        FROM telemetry_events
        WHERE event_type IN ('swipe_add', 'swipe_skip')
          AND occurred_at >= ${windowStart}
          AND module_id = ${moduleId}::uuid
          AND payload->>'cardId' IS NOT NULL
          ${craftFilter}
        GROUP BY payload->>'cardId', payload->>'title', payload->>'craftType'
        ORDER BY total DESC
        LIMIT 50
      `);
      rows = result.rows as ProductRow[];
    } else {
      const result = await db.execute(sql`
        SELECT
          payload->>'cardId'    AS card_id,
          payload->>'title'     AS title,
          payload->>'craftType' AS craft_type,
          SUM(CASE WHEN event_type = 'swipe_add'  THEN 1 ELSE 0 END)::int AS adds,
          SUM(CASE WHEN event_type = 'swipe_skip' THEN 1 ELSE 0 END)::int AS skips,
          COUNT(*)::int AS total
        FROM telemetry_events
        WHERE event_type IN ('swipe_add', 'swipe_skip')
          AND occurred_at >= ${windowStart}
          AND payload->>'cardId' IS NOT NULL
          ${craftFilter}
        GROUP BY payload->>'cardId', payload->>'title', payload->>'craftType'
        ORDER BY total DESC
        LIMIT 50
      `);
      rows = result.rows as ProductRow[];
    }

    return res.json({ products: rows, days, moduleId: moduleId ?? null, craftType: craftType ?? null });
  } catch {
    return res.status(500).json({ error: "Failed to load product telemetry" });
  }
});

// ── GET /api/kernel/telemetry/craft-activity ──────────────────────────────────
// Returns per-craft breakdown of swipe lifecycle events for the Craft Compare
// tab on the Swipe Intelligence Dashboard.
//
// Query params:
//   ?days=N       — look-back window in days (default 30, max 365)
//   ?window=...   — shorthand (24h, 7d, 30d, 90d) — overridden by ?days
//
// Response:
//   { days, crafts: [{ craftType, swipe_start, swipe_add, swipe_skip, build_complete, add_to_order }] }
//
// Data is pulled from telemetry_events joined with kernel_modules so that
// rows written by any of the craft-* modules are captured even when
// payload.craftType is absent — falling back to the module's craftType field.

router.get("/telemetry/craft-activity", async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;

  // Resolve window
  let days = 30;
  if (q.days !== undefined) {
    const d = parseInt(q.days, 10);
    if (Number.isFinite(d) && d > 0) days = Math.min(d, 365);
  } else if (q.window !== undefined) {
    const w = q.window.trim().toLowerCase();
    if (w === "24h" || w === "1d") {
      days = 1;
    } else {
      const m = /^(\d+)d$/.exec(w);
      if (m) days = Math.min(parseInt(m[1]!, 10), 365);
    }
  }

  try {
    type CraftRow = {
      craft_type: string;
      swipe_start: number;
      swipe_add: number;
      swipe_skip: number;
      build_complete: number;
      add_to_order: number;
    };

    const result = await db.execute(sql`
      SELECT
        COALESCE(te.payload->>'craftType', km.craft_type::text, 'unknown') AS craft_type,
        SUM(CASE WHEN te.event_type = 'swipe_start'    THEN 1 ELSE 0 END)::int AS swipe_start,
        SUM(CASE WHEN te.event_type = 'swipe_add'      THEN 1 ELSE 0 END)::int AS swipe_add,
        SUM(CASE WHEN te.event_type = 'swipe_skip'     THEN 1 ELSE 0 END)::int AS swipe_skip,
        SUM(CASE WHEN te.event_type = 'build_complete' THEN 1 ELSE 0 END)::int AS build_complete,
        SUM(CASE WHEN te.event_type = 'add_to_order'   THEN 1 ELSE 0 END)::int AS add_to_order
      FROM telemetry_events te
      LEFT JOIN kernel_modules km ON km.id = te.module_id
      WHERE te.event_type IN ('swipe_start', 'swipe_add', 'swipe_skip', 'build_complete', 'add_to_order')
        AND te.occurred_at >= NOW() - (${days} || ' days')::interval
        AND COALESCE(te.payload->>'craftType', km.craft_type::text) IN ('smoke', 'pour', 'brew', 'vape')
        AND (
          km.slug IN ('craft-smoke', 'craft-pour', 'craft-brew', 'craft-vape')
          OR te.payload->>'craftType' IN ('smoke', 'pour', 'brew', 'vape')
        )
      GROUP BY 1
      ORDER BY 1
    `);

    const dbRows = result.rows as CraftRow[];

    // Ensure all four crafts are always present (zero-filled when no events)
    const ALL_CRAFTS = ["smoke", "pour", "brew", "vape"] as const;
    const byType = new Map(dbRows.map(r => [r.craft_type, r]));
    const crafts = ALL_CRAFTS.map(ct => {
      const r = byType.get(ct);
      return {
        craftType:      ct,
        swipe_start:    r?.swipe_start    ?? 0,
        swipe_add:      r?.swipe_add      ?? 0,
        swipe_skip:     r?.swipe_skip     ?? 0,
        build_complete: r?.build_complete ?? 0,
        add_to_order:   r?.add_to_order   ?? 0,
      };
    });

    return res.json({ days, crafts });
  } catch {
    return res.status(500).json({ error: "Failed to load craft activity" });
  }
});

// ── GET /api/kernel/telemetry/products/by-craft ───────────────────────────────
// Returns adds + skips per craft type, scoped to the same ?days window used
// by the /telemetry/products endpoint.  Used by the Products tab breakdown chart.
//
// Query params:
//   ?days=N  — look-back window in days (default 30, max 365)
//
// Response: { days, breakdown: [{ craft_type, adds, skips, total }] }
// All four craft types are always present (zeroed when no events found).

router.get("/telemetry/products/by-craft", async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;

  let days = 30;
  if (q.days !== undefined) {
    const d = parseInt(q.days, 10);
    if (Number.isFinite(d) && d > 0) days = Math.min(d, 365);
  }

  try {
    const windowStart = sql`NOW() - (${days} || ' days')::interval`;

    type BreakdownRow = { craft_type: string; adds: number; skips: number; total: number };

    const result = await db.execute(sql`
      SELECT
        payload->>'craftType' AS craft_type,
        SUM(CASE WHEN event_type = 'swipe_add'  THEN 1 ELSE 0 END)::int AS adds,
        SUM(CASE WHEN event_type = 'swipe_skip' THEN 1 ELSE 0 END)::int AS skips,
        COUNT(*)::int AS total
      FROM telemetry_events
      WHERE event_type IN ('swipe_add', 'swipe_skip')
        AND occurred_at >= ${windowStart}
        AND payload->>'cardId' IS NOT NULL
        AND payload->>'craftType' IN ('smoke', 'pour', 'brew', 'vape')
      GROUP BY payload->>'craftType'
      ORDER BY total DESC
    `);

    const dbRows = result.rows as BreakdownRow[];
    const byType = new Map(dbRows.map(r => [r.craft_type, r]));
    const ALL_CRAFTS = ["smoke", "pour", "brew", "vape"] as const;
    const breakdown = ALL_CRAFTS.map(ct => {
      const r = byType.get(ct);
      return {
        craft_type: ct,
        adds:  r?.adds  ?? 0,
        skips: r?.skips ?? 0,
        total: r?.total ?? 0,
      };
    });

    return res.json({ days, breakdown });
  } catch {
    return res.status(500).json({ error: "Failed to load craft breakdown" });
  }
});

// ── GET /api/kernel/telemetry/products/trends/batch ───────────────────────────
// Returns daily add/skip trends for multiple products in one request.
// Query params:
//   ?cardIds=id1,id2,...  — comma-separated list of card IDs (max 50)
//   ?days=N               — number of days to look back (default 7, max 90)
//
// Response: { days, trends: { [cardId]: [{ day, adds, skips }] } }

router.get("/telemetry/products/trends/batch", async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;

  const rawCardIds = q.cardIds ?? "";
  const cardIds = rawCardIds
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (cardIds.length === 0) {
    return res.status(400).json({ error: "cardIds query param is required" });
  }
  if (cardIds.length > 50) {
    return res.status(400).json({ error: "Maximum 50 cardIds per request" });
  }

  const rawDays = parseInt(q.days ?? "7", 10);
  const days = Number.isFinite(rawDays) && rawDays > 0 ? Math.min(rawDays, 90) : 7;

  try {
    type TrendRow = { card_id: string; day: string; adds: number; skips: number };

    const result = await db.execute(sql`
      SELECT
        payload->>'cardId' AS card_id,
        TO_CHAR(DATE(occurred_at), 'YYYY-MM-DD') AS day,
        SUM(CASE WHEN event_type = 'swipe_add'  THEN 1 ELSE 0 END)::int AS adds,
        SUM(CASE WHEN event_type = 'swipe_skip' THEN 1 ELSE 0 END)::int AS skips
      FROM telemetry_events
      WHERE event_type IN ('swipe_add', 'swipe_skip')
        AND occurred_at >= NOW() - (${days} || ' days')::interval
        AND payload->>'cardId' = ANY(${cardIds}::text[])
      GROUP BY payload->>'cardId', DATE(occurred_at)
      ORDER BY card_id, day ASC
    `);

    const dbRows = result.rows as TrendRow[];

    // Build a per-cardId map of day → row
    const byCard = new Map<string, Map<string, { adds: number; skips: number }>>();
    for (const row of dbRows) {
      if (!byCard.has(row.card_id)) byCard.set(row.card_id, new Map());
      byCard.get(row.card_id)!.set(row.day, { adds: row.adds, skips: row.skips });
    }

    // Build full series (gap-filled) for each requested cardId
    const trends: Record<string, { day: string; adds: number; skips: number }[]> = {};
    for (const cardId of cardIds) {
      const dayMap = byCard.get(cardId) ?? new Map();
      const series: { day: string; adds: number; skips: number }[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - i);
        const dayKey = d.toISOString().slice(0, 10);
        const existing = dayMap.get(dayKey);
        series.push({ day: dayKey, adds: existing?.adds ?? 0, skips: existing?.skips ?? 0 });
      }
      trends[cardId] = series;
    }

    return res.json({ days, trends });
  } catch {
    return res.status(500).json({ error: "Failed to load batch product trends" });
  }
});

// ── GET /api/kernel/telemetry/products/:cardId/trend ──────────────────────────
// Returns daily add/skip counts for a specific product over the last N days.
// Query params:
//   ?days=N  — number of days to look back (default 7, max 90)
//
// Response: { cardId, days, trend: [{ day: "YYYY-MM-DD", adds: N, skips: N }] }
// Days with no events are included with zeros so the client always gets a full series.

router.get("/telemetry/products/:cardId/trend", async (req: Request, res: Response) => {
  const cardId = req.params.cardId as string;

  if (!cardId || cardId.trim().length === 0) {
    return res.status(400).json({ error: "cardId is required" });
  }

  const q = req.query as Record<string, string | undefined>;
  const rawDays = parseInt(q.days ?? "7", 10);
  const days = Number.isFinite(rawDays) && rawDays > 0 ? Math.min(rawDays, 90) : 7;

  try {
    type TrendRow = { day: string; adds: number; skips: number };

    const result = await db.execute(sql`
      SELECT
        TO_CHAR(DATE(occurred_at), 'YYYY-MM-DD') AS day,
        SUM(CASE WHEN event_type = 'swipe_add'  THEN 1 ELSE 0 END)::int AS adds,
        SUM(CASE WHEN event_type = 'swipe_skip' THEN 1 ELSE 0 END)::int AS skips
      FROM telemetry_events
      WHERE event_type IN ('swipe_add', 'swipe_skip')
        AND occurred_at >= NOW() - (${days} || ' days')::interval
        AND payload->>'cardId' = ${cardId}
      GROUP BY DATE(occurred_at)
      ORDER BY day ASC
    `);

    const dbRows = result.rows as TrendRow[];
    const dbMap = new Map(dbRows.map((r) => [r.day, r]));

    // Build a full series filling gaps with zeros
    const trend: TrendRow[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const dayKey = d.toISOString().slice(0, 10);
      const existing = dbMap.get(dayKey);
      trend.push({ day: dayKey, adds: existing?.adds ?? 0, skips: existing?.skips ?? 0 });
    }

    return res.json({ cardId, days, trend });
  } catch {
    return res.status(500).json({ error: "Failed to load product trend" });
  }
});

// ── GET /api/kernel/telemetry/health ──────────────────────────────────────────
// Lightweight health summary for the Swipe Intelligence Telemetry Health widget.
// No auth required — counts only, no PII.
//
// Response:
//   {
//     updatedAt: ISO string,
//     overall: { totalEvents24h, totalEvents7d, lastEventAt | null },
//     crafts: [{
//       craftType, totalEvents24h, totalEvents7d,
//       lastEventAt: ISO string | null,
//       breakdown24h: { swipe_start, swipe_add, swipe_skip, build_complete, add_to_order }
//     }]
//   }

router.get("/telemetry/health", async (_req: Request, res: Response) => {
  try {
    type CraftHealthRow = {
      craft_type: string;
      total_24h: number;
      total_7d: number;
      last_event_at: string | null;
      swipe_start_24h: number;
      swipe_add_24h: number;
      swipe_skip_24h: number;
      build_complete_24h: number;
      add_to_order_24h: number;
    };

    const craftResult = await db.execute(sql`
      SELECT
        COALESCE(te.payload->>'craftType', km.craft_type::text) AS craft_type,
        SUM(CASE WHEN te.occurred_at >= NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END)::int AS total_24h,
        SUM(CASE WHEN te.occurred_at >= NOW() - INTERVAL '7 days'   THEN 1 ELSE 0 END)::int AS total_7d,
        TO_CHAR(MAX(te.occurred_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS last_event_at,
        SUM(CASE WHEN te.occurred_at >= NOW() - INTERVAL '24 hours' AND te.event_type = 'swipe_start'    THEN 1 ELSE 0 END)::int AS swipe_start_24h,
        SUM(CASE WHEN te.occurred_at >= NOW() - INTERVAL '24 hours' AND te.event_type = 'swipe_add'      THEN 1 ELSE 0 END)::int AS swipe_add_24h,
        SUM(CASE WHEN te.occurred_at >= NOW() - INTERVAL '24 hours' AND te.event_type = 'swipe_skip'     THEN 1 ELSE 0 END)::int AS swipe_skip_24h,
        SUM(CASE WHEN te.occurred_at >= NOW() - INTERVAL '24 hours' AND te.event_type = 'build_complete' THEN 1 ELSE 0 END)::int AS build_complete_24h,
        SUM(CASE WHEN te.occurred_at >= NOW() - INTERVAL '24 hours' AND te.event_type = 'add_to_order'   THEN 1 ELSE 0 END)::int AS add_to_order_24h
      FROM telemetry_events te
      LEFT JOIN kernel_modules km ON km.id = te.module_id
      WHERE te.occurred_at >= NOW() - INTERVAL '7 days'
        AND COALESCE(te.payload->>'craftType', km.craft_type::text) IN ('smoke', 'pour', 'brew', 'vape')
      GROUP BY 1
    `);

    const dbRows = craftResult.rows as CraftHealthRow[];
    const byType = new Map(dbRows.map(r => [r.craft_type, r]));

    const ALL_CRAFTS = ["smoke", "pour", "brew", "vape"] as const;
    const crafts = ALL_CRAFTS.map(ct => {
      const r = byType.get(ct);
      return {
        craftType:     ct,
        totalEvents24h: r?.total_24h    ?? 0,
        totalEvents7d:  r?.total_7d     ?? 0,
        lastEventAt:    r?.last_event_at ?? null,
        breakdown24h: {
          swipe_start:    r?.swipe_start_24h    ?? 0,
          swipe_add:      r?.swipe_add_24h      ?? 0,
          swipe_skip:     r?.swipe_skip_24h     ?? 0,
          build_complete: r?.build_complete_24h ?? 0,
          add_to_order:   r?.add_to_order_24h   ?? 0,
        },
      };
    });

    const overallResult = await db.execute(sql`
      SELECT
        COALESCE(SUM(CASE WHEN occurred_at >= NOW() - INTERVAL '24 hours' THEN 1 ELSE 0 END), 0)::int AS total_24h,
        COALESCE(SUM(CASE WHEN occurred_at >= NOW() - INTERVAL '7 days'   THEN 1 ELSE 0 END), 0)::int AS total_7d,
        TO_CHAR(MAX(occurred_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS last_event_at
      FROM telemetry_events
      WHERE occurred_at >= NOW() - INTERVAL '7 days'
    `);

    type OverallRow = { total_24h: number; total_7d: number; last_event_at: string | null };
    const ov = (overallResult.rows[0] ?? { total_24h: 0, total_7d: 0, last_event_at: null }) as OverallRow;

    return res.json({
      updatedAt: new Date().toISOString(),
      overall: {
        totalEvents24h: ov.total_24h,
        totalEvents7d:  ov.total_7d,
        lastEventAt:    ov.last_event_at,
      },
      crafts,
    });
  } catch {
    return res.status(500).json({ error: "Failed to load telemetry health" });
  }
});

export default router;
