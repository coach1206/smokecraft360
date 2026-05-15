/**
 * /api/enterprise-ai — AI Provider Ownership + API Responsibility System
 *
 * Endpoints:
 *   GET  /api/enterprise-ai/billing-mode/:venueId      — get mode for venue
 *   PUT  /api/enterprise-ai/billing-mode               — set mode (admin/owner)
 *   GET  /api/enterprise-ai/providers/:venueId         — list connected providers
 *   POST /api/enterprise-ai/providers/connect          — connect BYOK provider
 *   DELETE /api/enterprise-ai/providers/:id            — disconnect provider
 *   POST /api/enterprise-ai/providers/:id/validate     — test live API key
 *   GET  /api/enterprise-ai/usage/:venueId             — usage stats
 *   GET  /api/enterprise-ai/limits                     — package tier limits
 *   PUT  /api/enterprise-ai/failover                   — configure failover chain
 *   GET  /api/enterprise-ai/admin/overview             — super_admin venue overview
 *   POST /api/enterprise-ai/route                      — proxy a routed AI request
 */

import { Router, type IRouter } from "express";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  venueAiBillingModesTable,
  venueAiProvidersTable,
  venueApiKeysTable,
  venueApiUsageTable,
  venueAiLimitsTable,
} from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole }                   from "../middleware/roles";
import { tryEncrypt, tryDecrypt }        from "../lib/encryption";
import { logger }                        from "../lib/logger";
import { routeAI }                       from "../services/ai/AIRouter";

const router: IRouter = Router();

/* ── Package tier → default billing mode ───────────────────────────────────── */

const PACKAGE_DEFAULT_MODE: Record<string, "axiom_managed" | "byok"> = {
  axiom_core:  "axiom_managed",
  axiom_pro:   "axiom_managed",
  axiom_xei:   "axiom_managed",
  axiom_black: "byok",
};

const BYOK_PERMITTED: Record<string, boolean> = {
  axiom_core:  false,
  axiom_pro:   false,
  axiom_xei:   true,
  axiom_black: true,
};

/* ── GET /billing-mode/:venueId ─────────────────────────────────────────────── */

router.get("/billing-mode/:venueId", requireAuth, async (req: AuthRequest, res) => {
  const venueId = req.params["venueId"] as string;
  const [row] = await db
    .select()
    .from(venueAiBillingModesTable)
    .where(eq(venueAiBillingModesTable.venueId, venueId))
    .limit(1);

  if (!row) {
    return res.json({
      mode: "axiom_managed",
      axiomPackage: "axiom_core",
      failoverEnabled: false,
      failoverChain: [],
      byokPermitted: false,
      responsibilityStatement:
        "AI infrastructure, orchestration, and API usage are included within your AXIOM subscription.",
    });
  }

  const byokOk = BYOK_PERMITTED[row.axiomPackage] ?? false;
  return res.json({
    ...row,
    byokPermitted: byokOk,
    responsibilityStatement: row.mode === "byok"
      ? "You are responsible for your own provider billing, API usage, and account management."
      : "AI infrastructure, orchestration, and API usage are included within your AXIOM subscription.",
  });
});

/* ── PUT /billing-mode ──────────────────────────────────────────────────────── */

const setBillingModeSchema = z.object({
  venueId:         z.string().uuid(),
  mode:            z.enum(["axiom_managed", "byok"]),
  axiomPackage:    z.enum(["axiom_core", "axiom_pro", "axiom_xei", "axiom_black"]).optional(),
  failoverEnabled: z.boolean().optional(),
  failoverChain:   z.array(z.string()).optional(),
});

router.put("/billing-mode", requireAuth, requireRole("venue_owner", "admin", "super_admin"), async (req: AuthRequest, res) => {
  const parsed = setBillingModeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { venueId, mode, axiomPackage, failoverEnabled, failoverChain } = parsed.data;

  // Validate BYOK permission for package
  const pkg = axiomPackage ?? "axiom_core";
  if (mode === "byok" && !BYOK_PERMITTED[pkg]) {
    return res.status(403).json({
      error: "BYOK is not available on your current package. Upgrade to AXIOM XEI or AXIOM BLACK.",
    });
  }

  const existing = await db
    .select({ id: venueAiBillingModesTable.id })
    .from(venueAiBillingModesTable)
    .where(eq(venueAiBillingModesTable.venueId, venueId))
    .limit(1);

  const adminForced  = req.user?.role === "super_admin";
  const adminForcedBy = adminForced ? req.user?.id : undefined;

  if (existing.length > 0) {
    await db
      .update(venueAiBillingModesTable)
      .set({
        mode,
        ...(axiomPackage && { axiomPackage }),
        ...(failoverEnabled !== undefined && { failoverEnabled }),
        ...(failoverChain   !== undefined && { failoverChain }),
        adminForced,
        adminForcedBy,
        updatedAt: new Date(),
      })
      .where(eq(venueAiBillingModesTable.venueId, venueId));
  } else {
    await db.insert(venueAiBillingModesTable).values({
      venueId, mode, axiomPackage: pkg,
      failoverEnabled: failoverEnabled ?? false,
      failoverChain:   failoverChain ?? [],
      adminForced,
      adminForcedBy,
    });
  }

  logger.info({ venueId, mode, pkg, actor: req.user?.id }, "enterprise-ai: billing mode updated");
  return res.json({ success: true, mode, package: pkg });
});

/* ── GET /providers/:venueId ────────────────────────────────────────────────── */

router.get("/providers/:venueId", requireAuth, async (req: AuthRequest, res) => {
  const venueId = req.params["venueId"] as string;
  const providers = await db
    .select({
      id:           venueAiProvidersTable.id,
      providerName: venueAiProvidersTable.providerName,
      status:       venueAiProvidersTable.status,
      isPrimary:    venueAiProvidersTable.isPrimary,
      lastCheckedAt: venueAiProvidersTable.lastCheckedAt,
      lastErrorMsg: venueAiProvidersTable.lastErrorMsg,
      disconnectedAt: venueAiProvidersTable.disconnectedAt,
      createdAt:    venueAiProvidersTable.createdAt,
      keyHint:      venueApiKeysTable.keyHint,
      validated:    venueApiKeysTable.validated,
    })
    .from(venueAiProvidersTable)
    .leftJoin(
      venueApiKeysTable,
      and(
        eq(venueApiKeysTable.venueId, venueId),
        eq(venueApiKeysTable.providerId, venueAiProvidersTable.id),
        isNull(venueApiKeysTable.revokedAt),
      )
    )
    .where(
      and(
        eq(venueAiProvidersTable.venueId, venueId),
        isNull(venueAiProvidersTable.disconnectedAt),
      )
    );

  return res.json({ providers });
});

/* ── POST /providers/connect ────────────────────────────────────────────────── */

const connectProviderSchema = z.object({
  venueId:      z.string().uuid(),
  providerName: z.enum(["openai", "anthropic", "gemini", "azure_openai"]),
  apiKey:       z.string().min(10, "API key too short"),
  isPrimary:    z.boolean().optional().default(false),
});

router.post("/providers/connect", requireAuth, requireRole("venue_owner", "admin", "super_admin"), async (req: AuthRequest, res) => {
  const parsed = connectProviderSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { venueId, providerName, apiKey, isPrimary } = parsed.data;
  const keyHint = `...${apiKey.slice(-4)}`;

  // Encrypt key
  let encryptedKey: string;
  try {
    encryptedKey = tryEncrypt(apiKey);
  } catch {
    return res.status(500).json({ error: "Encryption service unavailable. Contact AXIOM support." });
  }

  // If setting as primary, demote existing primary
  if (isPrimary) {
    await db
      .update(venueAiProvidersTable)
      .set({ isPrimary: false, updatedAt: new Date() })
      .where(and(eq(venueAiProvidersTable.venueId, venueId), eq(venueAiProvidersTable.isPrimary, true)));
  }

  // Upsert provider row
  const existing = await db
    .select({ id: venueAiProvidersTable.id })
    .from(venueAiProvidersTable)
    .where(and(eq(venueAiProvidersTable.venueId, venueId), eq(venueAiProvidersTable.providerName, providerName)))
    .limit(1);

  let providerId: string;
  if (existing.length > 0) {
    providerId = existing[0].id;
    await db
      .update(venueAiProvidersTable)
      .set({ status: "pending_validation", isPrimary, disconnectedAt: null, updatedAt: new Date() })
      .where(eq(venueAiProvidersTable.id, providerId));
  } else {
    const [inserted] = await db
      .insert(venueAiProvidersTable)
      .values({ venueId, providerName, status: "pending_validation", isPrimary, connectedBy: req.user?.id })
      .returning({ id: venueAiProvidersTable.id });
    providerId = inserted.id;
  }

  // Revoke old keys for this provider
  await db
    .update(venueApiKeysTable)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(venueApiKeysTable.venueId, venueId), eq(venueApiKeysTable.providerId, providerId)));

  // Insert new key
  await db.insert(venueApiKeysTable).values({
    venueId, providerId, encryptedKey, keyHint, createdBy: req.user?.id,
  });

  logger.info({ venueId, providerName, actor: req.user?.id }, "enterprise-ai: provider connected");
  return res.status(201).json({ success: true, providerId, providerName, keyHint, status: "pending_validation" });
});

/* ── POST /providers/:id/validate ───────────────────────────────────────────── */

router.post("/providers/:id/validate", requireAuth, requireRole("venue_owner", "admin", "super_admin"), async (req: AuthRequest, res) => {
  const id = req.params["id"] as string;
  const providerRow = await db
    .select()
    .from(venueAiProvidersTable)
    .where(eq(venueAiProvidersTable.id, id))
    .limit(1);

  if (!providerRow[0]) return res.status(404).json({ error: "Provider not found" });

  const venueId  = providerRow[0].venueId;
  const provider = providerRow[0].providerName;

  const keyRow = await db
    .select()
    .from(venueApiKeysTable)
    .where(and(eq(venueApiKeysTable.venueId, venueId), eq(venueApiKeysTable.providerId, id), isNull(venueApiKeysTable.revokedAt)))
    .limit(1);

  if (!keyRow[0]) return res.status(400).json({ error: "No active API key for this provider" });

  let apiKey: string;
  try {
    apiKey = tryDecrypt(keyRow[0].encryptedKey);
  } catch {
    return res.status(500).json({ error: "Failed to decrypt API key" });
  }

  // Live validation ping
  let valid = false;
  let errorMsg: string | undefined;
  try {
    if (provider === "openai" || provider === "azure_openai") {
      const r = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      valid = r.ok;
      if (!valid) errorMsg = `HTTP ${r.status}`;
    } else if (provider === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/models", {
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      });
      valid = r.ok;
      if (!valid) errorMsg = `HTTP ${r.status}`;
    } else if (provider === "gemini") {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      valid = r.ok;
      if (!valid) errorMsg = `HTTP ${r.status}`;
    }
  } catch (err) {
    errorMsg = (err as Error).message;
  }

  // Update records
  await db
    .update(venueAiProvidersTable)
    .set({
      status:       valid ? "connected" : "degraded",
      lastCheckedAt: new Date(),
      lastErrorMsg: errorMsg ?? null,
      updatedAt:    new Date(),
    })
    .where(eq(venueAiProvidersTable.id, id));

  await db
    .update(venueApiKeysTable)
    .set({ validated: valid, validatedAt: valid ? new Date() : null, updatedAt: new Date() })
    .where(eq(venueApiKeysTable.id, keyRow[0].id));

  return res.json({ valid, status: valid ? "connected" : "degraded", errorMsg });
});

/* ── DELETE /providers/:id ──────────────────────────────────────────────────── */

router.delete("/providers/:id", requireAuth, requireRole("venue_owner", "admin", "super_admin"), async (req: AuthRequest, res) => {
  const id = req.params["id"] as string;
  await db
    .update(venueAiProvidersTable)
    .set({ status: "disconnected", disconnectedAt: new Date(), updatedAt: new Date() })
    .where(eq(venueAiProvidersTable.id, id));
  await db
    .update(venueApiKeysTable)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(venueApiKeysTable.providerId, id), isNull(venueApiKeysTable.revokedAt)));

  return res.json({ success: true });
});

/* ── GET /usage/:venueId ────────────────────────────────────────────────────── */

router.get("/usage/:venueId", requireAuth, async (req: AuthRequest, res) => {
  const venueId = req.params["venueId"] as string;
  const rows = await db
    .select()
    .from(venueApiUsageTable)
    .where(eq(venueApiUsageTable.venueId, venueId))
    .orderBy(desc(venueApiUsageTable.bucketDate))
    .limit(90);

  const totals = rows.reduce(
    (acc, r) => ({
      totalRequests: acc.totalRequests + r.requestCount,
      totalTokens:   acc.totalTokens + r.tokenCount,
      totalCostCents: acc.totalCostCents + r.estimatedCostCents,
    }),
    { totalRequests: 0, totalTokens: 0, totalCostCents: 0 },
  );

  return res.json({ usage: rows, totals });
});

/* ── GET /limits ────────────────────────────────────────────────────────────── */

router.get("/limits", async (_req, res) => {
  const limits = await db.select().from(venueAiLimitsTable);
  // Fallback to hardcoded defaults if not yet seeded
  if (limits.length === 0) {
    return res.json({
      limits: [
        { axiomPackage: "axiom_core",  monthlyRequestCap: 1000,  byokPermitted: false, multiProviderEnabled: false, description: "Limited AI usage included in your subscription." },
        { axiomPackage: "axiom_pro",   monthlyRequestCap: 10000, byokPermitted: false, multiProviderEnabled: false, description: "Expanded AI orchestration included in your subscription." },
        { axiomPackage: "axiom_xei",   monthlyRequestCap: null,  byokPermitted: true,  multiProviderEnabled: false, description: "Choose AXIOM-managed or connect your own AI provider." },
        { axiomPackage: "axiom_black", monthlyRequestCap: null,  byokPermitted: true,  multiProviderEnabled: true,  description: "Enterprise AI ownership. BYOK recommended. Multi-provider routing enabled." },
      ],
    });
  }
  return res.json({ limits });
});

/* ── PUT /failover ──────────────────────────────────────────────────────────── */

const failoverSchema = z.object({
  venueId:         z.string().uuid(),
  failoverEnabled: z.boolean(),
  failoverChain:   z.array(z.enum(["openai", "anthropic", "gemini", "azure_openai"])).max(4),
});

router.put("/failover", requireAuth, requireRole("venue_owner", "admin", "super_admin"), async (req: AuthRequest, res) => {
  const parsed = failoverSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { venueId, failoverEnabled, failoverChain } = parsed.data;
  await db
    .update(venueAiBillingModesTable)
    .set({ failoverEnabled, failoverChain, updatedAt: new Date() })
    .where(eq(venueAiBillingModesTable.venueId, venueId));

  return res.json({ success: true, failoverEnabled, failoverChain });
});

/* ── GET /admin/overview ─────────────────────────────────────────────────────── */

router.get("/admin/overview", requireAuth, requireRole("super_admin"), async (_req, res) => {
  const modes = await db.select().from(venueAiBillingModesTable);
  const usage = await db
    .select({
      venueId:       venueApiUsageTable.venueId,
      providerName:  venueApiUsageTable.providerName,
      totalRequests: sql<number>`sum(${venueApiUsageTable.requestCount})`,
      totalTokens:   sql<number>`sum(${venueApiUsageTable.tokenCount})`,
      totalCostCents: sql<number>`sum(${venueApiUsageTable.estimatedCostCents})`,
    })
    .from(venueApiUsageTable)
    .groupBy(venueApiUsageTable.venueId, venueApiUsageTable.providerName);

  const axiomManagedCount = modes.filter(m => m.mode === "axiom_managed").length;
  const byokCount         = modes.filter(m => m.mode === "byok").length;
  return res.json({ venueCount: modes.length, axiomManagedCount, byokCount, modes, usage });
});

/* ── POST /route ─────────────────────────────────────────────────────────────── */

const routeSchema = z.object({
  venueId:    z.string().uuid(),
  messages:   z.array(z.object({ role: z.enum(["system", "user", "assistant"]), content: z.string() })),
  model:      z.string().optional(),
  maxTokens:  z.number().int().min(1).max(4096).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

router.post("/route", requireAuth, async (req: AuthRequest, res) => {
  const parsed = routeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const result = await routeAI(parsed.data);
    return res.json(result);
  } catch (err) {
    logger.error({ err }, "enterprise-ai: routing failed");
    return res.status(503).json({ error: "AI provider unavailable. Please try again." });
  }
});

export default router;
