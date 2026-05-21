/**
 * Integration Kernel Routes — Phases 3–16
 * All kernel operations are routed here. Multi-tenant safe, RBAC enforced,
 * rate-limited per venue via tenantGuard middleware.
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { z }             from "zod";
import { requireAuth }   from "../middleware/auth";
import { requireRole }   from "../middleware/roles";
import { logger }        from "../lib/logger";
import {
  getAllProviders, getProvider, getProvidersByCategory, getCategories,
  registerCustomProvider, ensureVaultSchema,
  upsertProvider, listProviders, getProviderById, deleteProvider,
  setPrimary, getUsage, markTested, checkProviderHealth, updateHealthStatus,
  getProviderMetrics, getHourlyTrend, wireMetricsToEventBus,
  checkBudget, getUsageSummary, UsageLimitError,
  registerDevice, listDevices, getDeviceById, updateDevice, deleteDevice, recordHeartbeat,
  receiveWebhook, listInboundEvents, queueDelivery, processDelivery, listDeliveries,
  auditKernelAction, getAuditLog, verifyAuditChain,
  getTenantConfig, setTenantConfig,
  rateLimitTenant, enforceTenantIsolation,
  ensureGlobalControlsSchema,
  getAllGlobalControls,
  setGlobalControl,
  emergencyShutdown,
  restoreFromShutdown,
  isEmergencyShutdownActive,
  listVenueAccess,
  getVenueAccess,
  setVenueAccess,
  revokeVenueAccess,
  restoreVenueAccess,
  buildOfflineBundle,
  PROVIDER_CATEGORIES,
} from "../core/integrationKernel";
import type { ProviderCategory, AuthType, UsageLimits, DeviceType } from "../core/integrationKernel";
import { AIOrchestrator } from "../core/providers/AIOrchestrator";

const router = Router();

// Bootstrap on first request
let booted = false;
router.use(async (_req: Request, _res: Response, next: NextFunction) => {
  if (!booted) {
    await ensureVaultSchema();
    await ensureGlobalControlsSchema();
    wireMetricsToEventBus();
    booted = true;
  }
  next();
});

// Global kernel rate limit: 600 req/min per venue
router.use("/venues/:venueId", rateLimitTenant(600, 60, "kernel"));
router.use("/venues/:venueId", enforceTenantIsolation());

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

const deviceSchema = z.object({
  deviceName:         z.string().min(1).max(100),
  deviceType:         z.enum(["kiosk","pos_terminal","tablet","display","sensor","gateway","other"]),
  assignedProviderId: z.string().uuid().nullable().optional(),
  ipAddress:          z.string().nullable().optional(),
  firmwareVersion:    z.string().max(40).nullable().optional(),
  metadata:           z.record(z.unknown()).optional(),
});

const tenantConfigSchema = z.object({
  rateLimitOverride:     z.number().int().positive().optional(),
  windowSecondsOverride: z.number().int().positive().optional(),
  allowedProviders:      z.array(z.string()).optional(),
  blockedProviders:      z.array(z.string()).optional(),
  features:              z.record(z.boolean()).optional(),
});

/* ─────────────────────────────────────────────────────────────────────────────
   PROVIDER REGISTRY — catalogue (public read)
───────────────────────────────────────────────────────────────────────────── */

router.get("/catalogue", requireAuth, (req: Request, res: Response) => {
  const cat = req.query["category"] ? String(req.query["category"]) : "";
  const providers = cat ? getProvidersByCategory(cat as ProviderCategory) : getAllProviders();
  res.json({ providers, categories: getCategories() });
});

router.get("/catalogue/:id", requireAuth, (req: Request, res: Response) => {
  const def = getProvider(String(req.params.id ?? ""));
  if (!def) { res.status(404).json({ error: "Provider not in registry" }); return; }
  res.json({ provider: def });
});

/* ─────────────────────────────────────────────────────────────────────────────
   VENUE PROVIDER MANAGEMENT — Phase 3
───────────────────────────────────────────────────────────────────────────── */

router.get(
  "/venues/:venueId/providers",
  requireAuth,
  requireRole("staff","venue_owner","manager","admin","super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const venueId  = String(req.params.venueId ?? "");
      const category = req.query["category"] ? String(req.query["category"]) as ProviderCategory : undefined;
      const providers = await listProviders(venueId, category);
      res.json({ providers });
    } catch (err) { next(err); }
  },
);

router.post(
  "/venues/:venueId/providers",
  requireAuth,
  requireRole("venue_owner","manager","admin","super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const venueId = String(req.params.venueId ?? "");
      const body    = upsertSchema.parse(req.body);
      const user    = (req as Request & { user?: { id?: string } }).user;

      const usageLimits: UsageLimits | null = body.usageLimits
        ? { dailyRequests: body.usageLimits.dailyRequests ?? null, monthlyRequests: body.usageLimits.monthlyRequests ?? null, monthlyTokens: body.usageLimits.monthlyTokens ?? null, alertThreshold: body.usageLimits.alertThreshold }
        : null;

      const provider = await upsertProvider({
        venueId, providerName: body.providerName, providerType: body.providerType as ProviderCategory,
        displayName: body.displayName, credentials: body.credentials,
        endpointUrl: body.endpointUrl ?? null, region: body.region ?? null,
        webhookConfig: body.webhookConfig ?? null, usageLimits,
        failoverProviderId: body.failoverProviderId ?? null,
        isPrimary: body.isPrimary, isActive: body.isActive, createdBy: user?.id ?? null,
      });

      await auditKernelAction({ venueId, actorId: user?.id, action: "provider.created", resourceType: "provider", resourceId: provider.id, payload: { providerName: body.providerName } });
      res.status(201).json({ provider });
    } catch (err) { next(err); }
  },
);

router.patch(
  "/venues/:venueId/providers/:id",
  requireAuth,
  requireRole("venue_owner","manager","admin","super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const venueId = String(req.params.venueId ?? "");
      const id      = String(req.params.id ?? "");
      const user    = (req as Request & { user?: { id?: string } }).user;
      const existing = await getProviderById(id, venueId);
      if (!existing) { res.status(404).json({ error: "Provider not found" }); return; }

      const body = upsertSchema.partial().parse(req.body);

      const usageLimits: UsageLimits | null =
        body.usageLimits !== undefined
          ? body.usageLimits
            ? { dailyRequests: body.usageLimits.dailyRequests ?? null, monthlyRequests: body.usageLimits.monthlyRequests ?? null, monthlyTokens: body.usageLimits.monthlyTokens ?? null, alertThreshold: body.usageLimits.alertThreshold ?? 0.8 }
            : null
          : existing.usageLimits;

      const provider = await upsertProvider({
        venueId: existing.venueId, providerName: existing.providerName,
        providerType: (body.providerType as ProviderCategory | undefined) ?? existing.providerType,
        displayName: body.displayName ?? existing.displayName, credentials: body.credentials,
        endpointUrl: "endpointUrl" in body ? (body.endpointUrl ?? null) : existing.endpointUrl,
        region: "region" in body ? (body.region ?? null) : existing.region,
        webhookConfig: "webhookConfig" in body ? (body.webhookConfig ?? null) : existing.webhookConfig,
        usageLimits,
        failoverProviderId: "failoverProviderId" in body ? (body.failoverProviderId ?? null) : existing.failoverProviderId,
        isPrimary: body.isPrimary ?? existing.isPrimary, isActive: body.isActive ?? existing.isActive,
      });

      await auditKernelAction({ venueId, actorId: user?.id, action: "provider.updated", resourceType: "provider", resourceId: id });
      res.json({ provider });
    } catch (err) { next(err); }
  },
);

router.delete(
  "/venues/:venueId/providers/:id",
  requireAuth,
  requireRole("venue_owner","admin","super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const venueId = String(req.params.venueId ?? "");
      const id      = String(req.params.id ?? "");
      const user    = (req as Request & { user?: { id?: string } }).user;
      const ok = await deleteProvider(id, venueId);
      if (!ok) { res.status(404).json({ error: "Provider not found" }); return; }
      await auditKernelAction({ venueId, actorId: user?.id, action: "provider.deleted", resourceType: "provider", resourceId: id });
      res.json({ success: true });
    } catch (err) { next(err); }
  },
);

router.post(
  "/venues/:venueId/providers/:id/set-primary",
  requireAuth,
  requireRole("venue_owner","manager","admin","super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const provider = await getProviderById(String(req.params.id ?? ""), String(req.params.venueId ?? ""));
      if (!provider) { res.status(404).json({ error: "Provider not found" }); return; }
      await setPrimary(provider.id, provider.venueId, provider.providerType);
      res.json({ success: true });
    } catch (err) { next(err); }
  },
);

router.post(
  "/venues/:venueId/providers/:id/test",
  requireAuth,
  requireRole("venue_owner","manager","admin","super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const provider = await getProviderById(String(req.params.id ?? ""), String(req.params.venueId ?? ""));
      if (!provider) { res.status(404).json({ error: "Provider not found" }); return; }
      const result = await checkProviderHealth(provider);
      await updateHealthStatus(provider.id, provider.venueId, result.status, result.error);
      await markTested(provider.id, provider.venueId);
      res.json({ status: result.status, latencyMs: result.latencyMs, error: result.error, testedAt: new Date().toISOString() });
    } catch (err) { next(err); }
  },
);

router.get(
  "/venues/:venueId/usage",
  requireAuth,
  requireRole("venue_owner","manager","admin","super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const days  = Math.min(parseInt(String(req.query["days"] ?? "30"), 10), 90);
      const usage = await getUsage(String(req.params.venueId ?? ""), days);
      res.json({ usage, days });
    } catch (err) { next(err); }
  },
);

/* ─────────────────────────────────────────────────────────────────────────────
   OBSERVABILITY — Phase 7
───────────────────────────────────────────────────────────────────────────── */

router.get(
  "/venues/:venueId/metrics",
  requireAuth,
  requireRole("venue_owner","manager","admin","super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const venueId = String(req.params.venueId ?? "");
      const hours   = Math.min(parseInt(String(req.query["hours"] ?? "24"), 10), 720);
      const metrics = await getProviderMetrics(venueId, hours);
      res.json({ metrics, hours });
    } catch (err) { next(err); }
  },
);

router.get(
  "/venues/:venueId/providers/:id/trend",
  requireAuth,
  requireRole("venue_owner","manager","admin","super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const venueId = String(req.params.venueId ?? "");
      const id      = String(req.params.id ?? "");
      const hours   = Math.min(parseInt(String(req.query["hours"] ?? "48"), 10), 720);
      const trend   = await getHourlyTrend(venueId, id, hours);
      res.json({ trend, hours });
    } catch (err) { next(err); }
  },
);

/* ─────────────────────────────────────────────────────────────────────────────
   USAGE METERING — Phase 9
───────────────────────────────────────────────────────────────────────────── */

router.get(
  "/venues/:venueId/usage-summary",
  requireAuth,
  requireRole("venue_owner","manager","admin","super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usage = await getUsageSummary(String(req.params.venueId ?? ""));
      res.json({ usage });
    } catch (err) { next(err); }
  },
);

router.post(
  "/venues/:venueId/providers/:id/check-budget",
  requireAuth,
  requireRole("venue_owner","manager","admin","super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const venueId = String(req.params.venueId ?? "");
      const id      = String(req.params.id ?? "");
      await checkBudget(venueId, id);
      res.json({ allowed: true });
    } catch (err) {
      if (err instanceof UsageLimitError) {
        res.status(429).json({ allowed: false, error: err.message, metric: err.metric, current: err.current, limit: err.limit });
        return;
      }
      next(err);
    }
  },
);

/* ─────────────────────────────────────────────────────────────────────────────
   DEVICE ORCHESTRATION — Phase 11
───────────────────────────────────────────────────────────────────────────── */

router.get(
  "/venues/:venueId/devices",
  requireAuth,
  requireRole("staff","venue_owner","manager","admin","super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const type    = req.query["type"] ? String(req.query["type"]) as DeviceType : undefined;
      const devices = await listDevices(String(req.params.venueId ?? ""), type);
      res.json({ devices });
    } catch (err) { next(err); }
  },
);

router.post(
  "/venues/:venueId/devices",
  requireAuth,
  requireRole("venue_owner","manager","admin","super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const venueId = String(req.params.venueId ?? "");
      const user    = (req as Request & { user?: { id?: string } }).user;
      const body    = deviceSchema.parse(req.body);
      const device  = await registerDevice({ venueId, ...body });
      await auditKernelAction({ venueId, actorId: user?.id, action: "device.registered", resourceType: "device", resourceId: device.id, payload: { deviceName: body.deviceName } });
      res.status(201).json({ device });
    } catch (err) { next(err); }
  },
);

router.patch(
  "/venues/:venueId/devices/:id",
  requireAuth,
  requireRole("venue_owner","manager","admin","super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const venueId = String(req.params.venueId ?? "");
      const id      = String(req.params.id ?? "");
      const body    = deviceSchema.partial().parse(req.body);
      const device  = await updateDevice(id, venueId, body);
      if (!device) { res.status(404).json({ error: "Device not found" }); return; }
      res.json({ device });
    } catch (err) { next(err); }
  },
);

router.delete(
  "/venues/:venueId/devices/:id",
  requireAuth,
  requireRole("venue_owner","admin","super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ok = await deleteDevice(String(req.params.id ?? ""), String(req.params.venueId ?? ""));
      if (!ok) { res.status(404).json({ error: "Device not found" }); return; }
      res.json({ success: true });
    } catch (err) { next(err); }
  },
);

router.post(
  "/venues/:venueId/devices/:id/heartbeat",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const venueId = String(req.params.venueId ?? "");
      const id      = String(req.params.id ?? "");
      const status  = (req.body as { status?: string }).status as "online" | "offline" | "degraded" | "maintenance" | undefined ?? "online";
      const device  = await recordHeartbeat(id, venueId, status);
      if (!device) { res.status(404).json({ error: "Device not found" }); return; }
      res.json({ device });
    } catch (err) { next(err); }
  },
);

/* ─────────────────────────────────────────────────────────────────────────────
   WEBHOOK INFRASTRUCTURE — Phase 12
───────────────────────────────────────────────────────────────────────────── */

router.post(
  "/venues/:venueId/webhooks/inbound/:providerName",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const venueId      = String(req.params.venueId ?? "");
      const providerName = String(req.params.providerName ?? "");
      const signature    = String(req.headers["x-webhook-signature"] ?? req.headers["x-hub-signature-256"] ?? "");
      const eventType    = String(req.headers["x-event-type"] ?? req.body?.type ?? "unknown");
      const event = await receiveWebhook({
        venueId, providerName, eventType,
        payload:    req.body as unknown,
        rawHeaders: req.headers as Record<string, string>,
        signature:  signature || undefined,
      });
      logger.info({ venueId, providerName, eventId: event.id, signatureOk: event.signatureOk }, "integrationKernel: inbound webhook");
      res.json({ received: true, eventId: event.id, signatureOk: event.signatureOk });
    } catch (err) { next(err); }
  },
);

router.get(
  "/venues/:venueId/webhooks/inbound",
  requireAuth,
  requireRole("venue_owner","manager","admin","super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit  = Math.min(parseInt(String(req.query["limit"]  ?? "50"), 10), 200);
      const offset = parseInt(String(req.query["offset"] ?? "0"),  10);
      const result = await listInboundEvents(String(req.params.venueId ?? ""), limit, offset);
      res.json(result);
    } catch (err) { next(err); }
  },
);

router.post(
  "/venues/:venueId/webhooks/outbound",
  requireAuth,
  requireRole("venue_owner","manager","admin","super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const venueId = String(req.params.venueId ?? "");
      const body    = z.object({
        providerName: z.string().min(1),
        targetUrl:    z.string().url(),
        eventType:    z.string().min(1),
        payload:      z.unknown().optional(),
        maxAttempts:  z.number().int().min(1).max(10).default(3),
      }).parse(req.body);
      const delivery = await queueDelivery({ venueId, ...body });
      res.status(201).json({ delivery });
    } catch (err) { next(err); }
  },
);

router.get(
  "/venues/:venueId/webhooks/outbound",
  requireAuth,
  requireRole("venue_owner","manager","admin","super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status    = req.query["status"] ? String(req.query["status"]) : undefined;
      const deliveries = await listDeliveries(String(req.params.venueId ?? ""), status);
      res.json({ deliveries });
    } catch (err) { next(err); }
  },
);

router.post(
  "/venues/:venueId/webhooks/outbound/:id/send",
  requireAuth,
  requireRole("venue_owner","manager","admin","super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const delivery = await processDelivery(String(req.params.id ?? ""), String(req.params.venueId ?? ""));
      res.json({ delivery });
    } catch (err) { next(err); }
  },
);

/* ─────────────────────────────────────────────────────────────────────────────
   AUDIT TRAIL — Phase 16
───────────────────────────────────────────────────────────────────────────── */

router.get(
  "/venues/:venueId/audit",
  requireAuth,
  requireRole("venue_owner","manager","admin","super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const venueId      = String(req.params.venueId ?? "");
      const limit        = Math.min(parseInt(String(req.query["limit"]  ?? "50"), 10), 200);
      const offset       = parseInt(String(req.query["offset"] ?? "0"),  10);
      const resourceType = req.query["resourceType"] ? String(req.query["resourceType"]) : undefined;
      const resourceId   = req.query["resourceId"]   ? String(req.query["resourceId"])   : undefined;
      const action       = req.query["action"]       ? String(req.query["action"])       : undefined;
      const result = await getAuditLog(venueId, limit, offset, { resourceType, resourceId, action });
      res.json(result);
    } catch (err) { next(err); }
  },
);

router.get(
  "/venues/:venueId/audit/verify",
  requireAuth,
  requireRole("admin","super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await verifyAuditChain(String(req.params.venueId ?? ""));
      res.json(result);
    } catch (err) { next(err); }
  },
);

/* ─────────────────────────────────────────────────────────────────────────────
   TENANT CONFIG — Phase 14
───────────────────────────────────────────────────────────────────────────── */

router.get(
  "/venues/:venueId/tenant-config",
  requireAuth,
  requireRole("venue_owner","admin","super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await getTenantConfig(String(req.params.venueId ?? ""));
      res.json({ config });
    } catch (err) { next(err); }
  },
);

router.patch(
  "/venues/:venueId/tenant-config",
  requireAuth,
  requireRole("venue_owner","admin","super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const venueId = String(req.params.venueId ?? "");
      const user    = (req as Request & { user?: { id?: string } }).user;
      const body    = tenantConfigSchema.parse(req.body);
      await setTenantConfig(venueId, body);
      await auditKernelAction({ venueId, actorId: user?.id, action: "tenant_config.updated", resourceType: "tenant_config", payload: body });
      res.json({ success: true });
    } catch (err) { next(err); }
  },
);

/* ─────────────────────────────────────────────────────────────────────────────
   CIRCUIT BREAKER STATUS — Phase 8
───────────────────────────────────────────────────────────────────────────── */

router.get(
  "/circuit-breakers",
  requireAuth,
  requireRole("admin","super_admin"),
  (_req: Request, res: Response) => {
    res.json({ breakers: AIOrchestrator.circuitBreakerStatus() });
  },
);

/* ─────────────────────────────────────────────────────────────────────────────
   CUSTOM PROVIDER REGISTRATION — Phase 5
───────────────────────────────────────────────────────────────────────────── */

router.post(
  "/custom-providers",
  requireAuth,
  requireRole("venue_owner","admin","super_admin"),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = customProviderSchema.parse(req.body);
      if (getProvider(body.id)) { res.status(409).json({ error: "Provider ID already registered" }); return; }
      registerCustomProvider({
        id: body.id, name: body.name, category: body.category, description: body.description,
        authType: body.authType as AuthType, baseUrl: body.baseUrl, docsUrl: body.docsUrl,
        isCustom: true, supportsWebhook: body.supportsWebhook, supportsHealthCheck: body.supportsHealthCheck,
      });
      logger.info({ providerId: body.id, name: body.name }, "integrationKernel: custom provider registered");
      res.status(201).json({ provider: getProvider(body.id) });
    } catch (err) { next(err); }
  },
);

/* ─────────────────────────────────────────────────────────────────────────────
   GLOBAL PROVIDER CONTROL CENTER — master API controls (super_admin only)
───────────────────────────────────────────────────────────────────────────── */

const globalControlSchema = z.object({
  isEnabled: z.boolean(),
  reason:    z.string().max(200).optional(),
});

const venueAccessSchema = z.object({
  isEnabled:         z.boolean().optional(),
  isDemoMode:        z.boolean().optional(),
  demoExpiresAt:     z.string().datetime().nullable().optional(),
  isLocked:          z.boolean().optional(),
  lockedReason:      z.string().max(200).nullable().optional(),
  allowedCategories: z.array(z.enum(PROVIDER_CATEGORIES as unknown as [string, ...string[]])).nullable().optional(),
});

/* GET  /admin/global-controls  — list all category flags + emergency state */
router.get(
  "/admin/global-controls",
  requireAuth,
  requireRole("admin","super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const controls    = await getAllGlobalControls();
      const shutdown    = await isEmergencyShutdownActive();
      const categories  = PROVIDER_CATEGORIES.map(cat => ({
        key:       `category:${cat}`,
        category:  cat,
        isEnabled: controls.find(c => c.controlKey === `category:${cat}`)?.isEnabled ?? true,
        updatedAt: controls.find(c => c.controlKey === `category:${cat}`)?.updatedAt ?? null,
        updatedBy: controls.find(c => c.controlKey === `category:${cat}`)?.updatedBy ?? null,
        reason:    controls.find(c => c.controlKey === `category:${cat}`)?.reason    ?? null,
      }));
      res.json({ controls, categories, emergencyShutdownActive: shutdown });
    } catch (err) { next(err); }
  },
);

/* PUT  /admin/global-controls/:key  — enable/disable a category or any key */
router.put(
  "/admin/global-controls/:key",
  requireAuth,
  requireRole("super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key    = String(req.params.key ?? "");
      const user   = (req as Request & { user?: { id?: string } }).user;
      const body   = globalControlSchema.parse(req.body);
      const result = await setGlobalControl(key, body.isEnabled, user?.id, body.reason);
      await auditKernelAction({
        venueId: "global", actorId: user?.id,
        action: body.isEnabled ? "global_control.enabled" : "global_control.disabled",
        resourceType: "global_control", resourceId: key,
        payload: { reason: body.reason },
      });
      res.json({ control: result });
    } catch (err) { next(err); }
  },
);

/* POST /admin/emergency-shutdown  — disable ALL categories globally */
router.post(
  "/admin/emergency-shutdown",
  requireAuth,
  requireRole("super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user   = (req as Request & { user?: { id?: string } }).user;
      const reason = (req.body as { reason?: string }).reason ?? "Emergency shutdown";
      await emergencyShutdown(user?.id, reason);
      await auditKernelAction({
        venueId: "global", actorId: user?.id,
        action: "emergency_shutdown.activated", resourceType: "global_control",
        payload: { reason },
      });
      logger.warn({ actorId: user?.id, reason }, "integrationKernel: emergency shutdown via API");
      res.json({ success: true, message: "Emergency shutdown activated — all provider categories disabled" });
    } catch (err) { next(err); }
  },
);

/* POST /admin/restore-operations  — re-enable all categories after shutdown */
router.post(
  "/admin/restore-operations",
  requireAuth,
  requireRole("super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as Request & { user?: { id?: string } }).user;
      await restoreFromShutdown(user?.id);
      await auditKernelAction({
        venueId: "global", actorId: user?.id,
        action: "emergency_shutdown.cleared", resourceType: "global_control",
      });
      res.json({ success: true, message: "Operations restored — all provider categories re-enabled" });
    } catch (err) { next(err); }
  },
);

/* ─── Venue Access Controls ────────────────────────────────────────────────── */

/* GET  /admin/venue-access  — list all venue access records */
router.get(
  "/admin/venue-access",
  requireAuth,
  requireRole("admin","super_admin"),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const rows = await listVenueAccess();
      res.json({ venueAccess: rows });
    } catch (err) { next(err); }
  },
);

/* GET  /admin/venue-access/:venueId  — get a single venue's access record */
router.get(
  "/admin/venue-access/:venueId",
  requireAuth,
  requireRole("venue_owner","manager","admin","super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const access = await getVenueAccess(String(req.params.venueId ?? ""));
      res.json({ access });
    } catch (err) { next(err); }
  },
);

/* PUT  /admin/venue-access/:venueId  — update a venue's access record */
router.put(
  "/admin/venue-access/:venueId",
  requireAuth,
  requireRole("super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const venueId = String(req.params.venueId ?? "");
      const user    = (req as Request & { user?: { id?: string } }).user;
      const body    = venueAccessSchema.parse(req.body);
      const access  = await setVenueAccess(venueId, { ...body, updatedBy: user?.id });
      await auditKernelAction({
        venueId, actorId: user?.id,
        action: "venue_access.updated", resourceType: "venue_access", resourceId: venueId,
        payload: body,
      });
      res.json({ access });
    } catch (err) { next(err); }
  },
);

/* POST /admin/venue-access/:venueId/revoke  — lock and disable a venue */
router.post(
  "/admin/venue-access/:venueId/revoke",
  requireAuth,
  requireRole("super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const venueId = String(req.params.venueId ?? "");
      const user    = (req as Request & { user?: { id?: string } }).user;
      const reason  = (req.body as { reason?: string }).reason ?? "Access revoked";
      await revokeVenueAccess(venueId, user?.id, reason);
      await auditKernelAction({
        venueId, actorId: user?.id,
        action: "venue_access.revoked", resourceType: "venue_access", resourceId: venueId,
        payload: { reason },
      });
      res.json({ success: true });
    } catch (err) { next(err); }
  },
);

/* POST /admin/venue-access/:venueId/restore  — unlock and re-enable a venue */
router.post(
  "/admin/venue-access/:venueId/restore",
  requireAuth,
  requireRole("super_admin"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const venueId = String(req.params.venueId ?? "");
      const user    = (req as Request & { user?: { id?: string } }).user;
      await restoreVenueAccess(venueId, user?.id);
      await auditKernelAction({
        venueId, actorId: user?.id,
        action: "venue_access.restored", resourceType: "venue_access", resourceId: venueId,
      });
      res.json({ success: true });
    } catch (err) { next(err); }
  },
);

/* ─── Offline Resilience Bundle ────────────────────────────────────────────── */

/* GET /offline-bundle  — full training + SOPs + pairing guides + emergency docs */
router.get(
  "/offline-bundle",
  requireAuth,
  (_req: Request, res: Response) => {
    const bundle = buildOfflineBundle();
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.json(bundle);
  },
);

export default router;
