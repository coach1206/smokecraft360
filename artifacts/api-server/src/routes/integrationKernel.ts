/**
 * Integration Kernel Routes — Phases 3 + 5
 * Venue API Management Center + Custom Provider Registration
 *
 * RBAC:
 *   GET  catalogue          — any authenticated user
 *   GET  venue providers    — staff+
 *   POST/PATCH/DELETE       — venue_owner / manager / admin / super_admin
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { z }             from "zod";
import { requireAuth }   from "../middleware/auth";
import { requireRole }   from "../middleware/roles";
import { logger }        from "../lib/logger";
import {
  getAllProviders,
  getProvider,
  getProvidersByCategory,
  getCategories,
  registerCustomProvider,
  ensureVaultSchema,
  upsertProvider,
  listProviders,
  getProviderById,
  deleteProvider,
  setPrimary,
  getUsage,
  markTested,
  checkProviderHealth,
  updateHealthStatus,
} from "../core/integrationKernel";
import type { ProviderCategory, AuthType, UsageLimits } from "../core/integrationKernel";

const router = Router();

// Ensure DB schema exists on first request
router.use((_req: Request, _res: Response, next: NextFunction) => {
  ensureVaultSchema().then(() => next()).catch(next);
});

/* ─────────────────────────────────────────────────────────────────────────────
   PROVIDER REGISTRY — read-only catalogue
───────────────────────────────────────────────────────────────────────────── */

router.get("/catalogue", requireAuth, (req: Request, res: Response) => {
  const category = String(req.query["category"] ?? "");
  const providers = category
    ? getProvidersByCategory(category as ProviderCategory)
    : getAllProviders();
  res.json({ providers, categories: getCategories() });
});

router.get("/catalogue/:id", requireAuth, (req: Request, res: Response) => {
  const def = getProvider(String(req.params.id ?? ""));
  if (!def) { res.status(404).json({ error: "Provider not in registry" }); return; }
  res.json({ provider: def });
});

/* ─────────────────────────────────────────────────────────────────────────────
   Zod schemas
───────────────────────────────────────────────────────────────────────────── */

const usageLimitsSchema = z.object({
  dailyRequests:   z.number().int().positive().nullable().default(null),
  monthlyRequests: z.number().int().positive().nullable().default(null),
  monthlyTokens:   z.number().int().positive().nullable().default(null),
  alertThreshold:  z.number().min(0).max(1).default(0.8),
});

const webhookConfigSchema = z.object({
  url:             z.string().url(),
  secret:          z.string().min(8),
  events:          z.array(z.string()),
  retryMax:        z.number().int().min(0).max(10).default(3),
  timeoutMs:       z.number().int().min(1000).max(30_000).default(5_000),
  signatureHeader: z.string().default("x-webhook-signature"),
});

const credentialsSchema = z.object({
  apiKey:        z.string().optional(),
  apiSecret:     z.string().optional(),
  webhookSecret: z.string().optional(),
  oauthToken:    z.string().optional(),
  oauthRefresh:  z.string().optional(),
  customHeaders: z.record(z.string()).optional(),
  extra:         z.record(z.string()).optional(),
});

const upsertSchema = z.object({
  providerName:       z.string().min(1).max(80),
  providerType:       z.string().min(1),
  displayName:        z.string().max(120).optional(),
  endpointUrl:        z.string().url().nullable().optional(),
  region:             z.string().max(40).nullable().optional(),
  failoverProviderId: z.string().uuid().nullable().optional(),
  isPrimary:          z.boolean().optional(),
  isActive:           z.boolean().optional(),
  usageLimits:        usageLimitsSchema.nullable().optional(),
  webhookConfig:      webhookConfigSchema.nullable().optional(),
  credentials:        credentialsSchema.optional(),
});

const customProviderSchema = z.object({
  id:                  z.string().min(1).max(80).regex(/^[a-z0-9_-]+$/),
  name:                z.string().min(1).max(120),
  category:            z.enum(["ai","pos","payment","music","lighting","sensor","crm","booking","voice","analytics","device","custom"]),
  description:         z.string().max(500).default(""),
  authType:            z.enum(["api_key","oauth2","basic","bearer","none","custom_header"]),
  baseUrl:             z.string().url().optional(),
  docsUrl:             z.string().url().optional(),
  supportsWebhook:     z.boolean().default(false),
  supportsHealthCheck: z.boolean().default(false),
});

/* ─────────────────────────────────────────────────────────────────────────────
   VENUE PROVIDER MANAGEMENT
───────────────────────────────────────────────────────────────────────────── */

/** GET /api/integration-kernel/venues/:venueId/providers */
router.get(
  "/venues/:venueId/providers",
  requireAuth,
  requireRole("staff", "venue_owner", "manager", "admin", "super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const venueId  = String(req.params.venueId ?? "");
      const category = req.query["category"] ? String(req.query["category"]) : undefined;
      const providers = await listProviders(venueId, category as ProviderCategory | undefined);
      res.json({ providers });
    } catch (err) { next(err); }
  },
);

/** POST /api/integration-kernel/venues/:venueId/providers */
router.post(
  "/venues/:venueId/providers",
  requireAuth,
  requireRole("venue_owner", "manager", "admin", "super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const venueId = String(req.params.venueId ?? "");
      const body    = upsertSchema.parse(req.body);
      const user    = (req as Request & { user?: { id?: string } }).user;

      const usageLimits: UsageLimits | null = body.usageLimits
        ? {
            dailyRequests:   body.usageLimits.dailyRequests ?? null,
            monthlyRequests: body.usageLimits.monthlyRequests ?? null,
            monthlyTokens:   body.usageLimits.monthlyTokens ?? null,
            alertThreshold:  body.usageLimits.alertThreshold,
          }
        : null;

      const provider = await upsertProvider({
        venueId,
        providerName:       body.providerName,
        providerType:       body.providerType as ProviderCategory,
        displayName:        body.displayName,
        credentials:        body.credentials,
        endpointUrl:        body.endpointUrl ?? null,
        region:             body.region ?? null,
        webhookConfig:      body.webhookConfig ?? null,
        usageLimits,
        failoverProviderId: body.failoverProviderId ?? null,
        isPrimary:          body.isPrimary,
        isActive:           body.isActive,
        createdBy:          user?.id ?? null,
      });
      res.status(201).json({ provider });
    } catch (err) { next(err); }
  },
);

/** PATCH /api/integration-kernel/venues/:venueId/providers/:id */
router.patch(
  "/venues/:venueId/providers/:id",
  requireAuth,
  requireRole("venue_owner", "manager", "admin", "super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const venueId = String(req.params.venueId ?? "");
      const id      = String(req.params.id ?? "");

      const existing = await getProviderById(id, venueId);
      if (!existing) { res.status(404).json({ error: "Provider not found" }); return; }

      const body = upsertSchema.partial().parse(req.body);

      const usageLimits: UsageLimits | null =
        body.usageLimits !== undefined
          ? body.usageLimits
            ? {
                dailyRequests:   body.usageLimits.dailyRequests ?? null,
                monthlyRequests: body.usageLimits.monthlyRequests ?? null,
                monthlyTokens:   body.usageLimits.monthlyTokens ?? null,
                alertThreshold:  body.usageLimits.alertThreshold ?? 0.8,
              }
            : null
          : existing.usageLimits;

      const provider = await upsertProvider({
        venueId:            existing.venueId,
        providerName:       existing.providerName,
        providerType:       (body.providerType as ProviderCategory | undefined) ?? existing.providerType,
        displayName:        body.displayName ?? existing.displayName,
        credentials:        body.credentials,
        endpointUrl:        "endpointUrl" in body ? (body.endpointUrl ?? null) : existing.endpointUrl,
        region:             "region"      in body ? (body.region      ?? null) : existing.region,
        webhookConfig:      "webhookConfig" in body ? (body.webhookConfig ?? null) : existing.webhookConfig,
        usageLimits,
        failoverProviderId: "failoverProviderId" in body ? (body.failoverProviderId ?? null) : existing.failoverProviderId,
        isPrimary:          body.isPrimary ?? existing.isPrimary,
        isActive:           body.isActive  ?? existing.isActive,
      });
      res.json({ provider });
    } catch (err) { next(err); }
  },
);

/** DELETE /api/integration-kernel/venues/:venueId/providers/:id */
router.delete(
  "/venues/:venueId/providers/:id",
  requireAuth,
  requireRole("venue_owner", "admin", "super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ok = await deleteProvider(String(req.params.id ?? ""), String(req.params.venueId ?? ""));
      if (!ok) { res.status(404).json({ error: "Provider not found" }); return; }
      res.json({ success: true });
    } catch (err) { next(err); }
  },
);

/** POST /api/integration-kernel/venues/:venueId/providers/:id/set-primary */
router.post(
  "/venues/:venueId/providers/:id/set-primary",
  requireAuth,
  requireRole("venue_owner", "manager", "admin", "super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const provider = await getProviderById(
        String(req.params.id ?? ""),
        String(req.params.venueId ?? ""),
      );
      if (!provider) { res.status(404).json({ error: "Provider not found" }); return; }
      await setPrimary(provider.id, provider.venueId, provider.providerType);
      res.json({ success: true });
    } catch (err) { next(err); }
  },
);

/** POST /api/integration-kernel/venues/:venueId/providers/:id/test */
router.post(
  "/venues/:venueId/providers/:id/test",
  requireAuth,
  requireRole("venue_owner", "manager", "admin", "super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const provider = await getProviderById(
        String(req.params.id ?? ""),
        String(req.params.venueId ?? ""),
      );
      if (!provider) { res.status(404).json({ error: "Provider not found" }); return; }

      const result = await checkProviderHealth(provider);
      await updateHealthStatus(provider.id, provider.venueId, result.status, result.error);
      await markTested(provider.id, provider.venueId);

      res.json({
        status:    result.status,
        latencyMs: result.latencyMs,
        error:     result.error,
        testedAt:  new Date().toISOString(),
      });
    } catch (err) { next(err); }
  },
);

/** GET /api/integration-kernel/venues/:venueId/usage */
router.get(
  "/venues/:venueId/usage",
  requireAuth,
  requireRole("venue_owner", "manager", "admin", "super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const days  = Math.min(parseInt(String(req.query["days"] ?? "30"), 10), 90);
      const usage = await getUsage(String(req.params.venueId ?? ""), days);
      res.json({ usage, days });
    } catch (err) { next(err); }
  },
);

/* ─────────────────────────────────────────────────────────────────────────────
   CUSTOM PROVIDER REGISTRATION — Phase 5
───────────────────────────────────────────────────────────────────────────── */

/**
 * POST /api/integration-kernel/custom-providers
 * Registers a new provider definition into the global registry (in-memory).
 * After registration, callers may POST to /venues/:venueId/providers to configure it.
 */
router.post(
  "/custom-providers",
  requireAuth,
  requireRole("venue_owner", "admin", "super_admin"),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = customProviderSchema.parse(req.body);

      if (getProvider(body.id)) {
        res.status(409).json({ error: "Provider ID already registered" });
        return;
      }

      registerCustomProvider({
        id:                  body.id,
        name:                body.name,
        category:            body.category,
        description:         body.description,
        authType:            body.authType as AuthType,
        baseUrl:             body.baseUrl,
        docsUrl:             body.docsUrl,
        isCustom:            true,
        supportsWebhook:     body.supportsWebhook,
        supportsHealthCheck: body.supportsHealthCheck,
      });

      logger.info({ providerId: body.id, name: body.name }, "integrationKernel: custom provider registered");
      res.status(201).json({ provider: getProvider(body.id) });
    } catch (err) { next(err); }
  },
);

export default router;
