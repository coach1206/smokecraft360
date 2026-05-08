/**
 * revenueEngine — Revenue Orchestration Command Center routes.
 *
 * GET  /api/revenue-engine/summary                — full 12-stream platform summary
 * GET  /api/revenue-engine/venue/:venueId         — venue-level revenue breakdown
 * GET  /api/revenue-engine/forecast               — 12-month revenue projection
 * GET  /api/revenue-engine/plans                  — full plan catalog
 * GET  /api/revenue-engine/pricing/:planId        — effective price for plan
 * POST /api/revenue-engine/pricing/rules          — create pricing rule
 * GET  /api/revenue-engine/pricing/rules          — list all pricing rules
 * DELETE /api/revenue-engine/pricing/rules/:id    — deactivate pricing rule
 *
 * Hardware:
 * POST /api/revenue-engine/hardware/leases        — create lease
 * POST /api/revenue-engine/hardware/rentals       — create rental
 * GET  /api/revenue-engine/hardware/:venueId      — lease + rental list
 * GET  /api/revenue-engine/hardware/platform/mrr  — platform hardware MRR
 * PATCH /api/revenue-engine/hardware/leases/:id/status — update lease status
 *
 * Modules:
 * GET  /api/revenue-engine/modules/catalog        — available modules
 * GET  /api/revenue-engine/modules/:venueId       — venue entitlements
 * POST /api/revenue-engine/modules/:venueId/activate — activate module
 * POST /api/revenue-engine/modules/:venueId/suspend  — suspend module
 * GET  /api/revenue-engine/modules/:venueId/check/:moduleId — access check
 *
 * AI Billing:
 * POST /api/revenue-engine/ai/record              — record AI usage event
 * GET  /api/revenue-engine/ai/quota/:venueId      — quota status
 * GET  /api/revenue-engine/ai/usage/:venueId      — usage summary
 *
 * Marketplace:
 * GET  /api/revenue-engine/marketplace/listings   — all listings
 * POST /api/revenue-engine/marketplace/listings   — create listing
 * POST /api/revenue-engine/marketplace/listings/:id/approve — approve
 * POST /api/revenue-engine/marketplace/purchase   — record purchase
 *
 * Enterprise:
 * GET  /api/revenue-engine/enterprise/contracts   — list contracts
 * POST /api/revenue-engine/enterprise/contracts   — create contract
 * GET  /api/revenue-engine/enterprise/white-label — list white-label licenses
 * POST /api/revenue-engine/enterprise/white-label — create white-label license
 */

import { Router } from "express";
import { z }      from "zod";
import { pool }   from "@workspace/db";
import { RevenueOrchestrationEngine } from "../services/revenue/RevenueOrchestrationEngine";
import { DynamicPricingService }      from "../services/revenue/DynamicPricingService";
import { HardwareLeaseManager }       from "../services/revenue/HardwareLeaseManager";
import { AIUsageBillingEngine }       from "../services/revenue/AIUsageBillingEngine";
import { LicenseRevenueManager }      from "../services/revenue/LicenseRevenueManager";
import { MarketplaceRevenueEngine }   from "../services/revenue/MarketplaceRevenueEngine";
import { EnterpriseBillingManager }   from "../services/revenue/EnterpriseBillingManager";
import { RevenueForecastEngine }      from "../services/revenue/RevenueForecastEngine";
import {
  RevenueAttributionEngine,
  SessionPersistenceEngine,
  SalesValidationEngine,
  ObservabilityEngine,
  EnterpriseOrchestrationEngine,
} from "../services/enterpriseExecutionEngine";

const router = Router();

// ── Platform Summary ───────────────────────────────────────────────────────────

router.get("/summary", async (_req, res) => {
  const summary = await RevenueOrchestrationEngine.getPlatformSummary();
  res.json(summary);
});

router.get("/venue/:venueId", async (req, res) => {
  const summary = await RevenueOrchestrationEngine.getVenueSummary(req.params["venueId"]!);
  res.json(summary);
});

router.get("/forecast", async (_req, res) => {
  const forecast = await RevenueForecastEngine.generate();
  res.json(forecast);
});

// ── Plans + Dynamic Pricing ───────────────────────────────────────────────────

router.get("/plans", async (_req, res) => {
  const { rows } = await pool.query(`SELECT * FROM revenue_plans WHERE is_active = true ORDER BY stream_type, base_price_cents`).catch(() => ({ rows: [] }));
  res.json({ plans: rows, count: rows.length });
});

router.get("/pricing/rules", async (req, res) => {
  const rules = await DynamicPricingService.listRules(req.query["planId"] as string | undefined);
  res.json({ rules, count: rules.length });
});

router.get("/pricing/:planId", async (req, res) => {
  const { venueId, region } = req.query as Record<string, string>;
  const price = await DynamicPricingService.resolve(req.params["planId"]!, venueId, region);
  res.json(price);
});

const ruleSchema = z.object({
  planId:         z.string(),
  ruleType:       z.enum(["override","seasonal","regional","promo","enterprise","volume"]),
  targetEntityId: z.string().optional(),
  priceCents:     z.number().int().optional(),
  multiplier:     z.number().optional(),
  validFrom:      z.string().optional(),
  validUntil:     z.string().optional(),
  isActive:       z.boolean().default(true),
  createdBy:      z.string().optional(),
  notes:          z.string().optional(),
});

router.post("/pricing/rules", async (req, res) => {
  const parsed = ruleSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid rule", issues: parsed.error.issues }); return; }
  const id = await DynamicPricingService.createRule(parsed.data);
  res.status(201).json({ id });
});

router.delete("/pricing/rules/:id", async (req, res) => {
  await DynamicPricingService.deactivateRule(req.params["id"]!);
  res.json({ deactivated: true });
});

// ── Hardware ──────────────────────────────────────────────────────────────────

const leaseSchema = z.object({
  venueId:             z.string(),
  deviceType:          z.string(),
  serialNumber:        z.string().optional(),
  leaseStart:          z.string().default(() => new Date().toISOString()),
  leaseEnd:            z.string().optional(),
  monthlyCents:        z.number().int().positive(),
  setupFeeCents:       z.number().int().default(0),
  status:              z.enum(["active","paused","terminated","completed"]).default("active"),
  maintenanceSchedule: z.enum(["monthly","quarterly","annual"]).optional(),
  ownershipStatus:     z.enum(["axiom_owned","financed","byod"]).default("axiom_owned"),
  financingTerms:      z.record(z.unknown()).default({}),
});

router.post("/hardware/leases", async (req, res) => {
  const parsed = leaseSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid lease", issues: parsed.error.issues }); return; }
  const lease = await HardwareLeaseManager.createLease(parsed.data);
  res.status(201).json(lease);
});

const rentalSchema = z.object({
  venueId:       z.string(),
  deviceType:    z.string(),
  rentalStart:   z.string().default(() => new Date().toISOString()),
  rentalEnd:     z.string(),
  dailyRateCents: z.number().int().positive(),
  depositCents:  z.number().int().default(0),
  setupFeeCents: z.number().int().default(0),
  status:        z.enum(["active","returned","overdue","cancelled"]).default("active"),
  purpose:       z.string().optional(),
});

router.post("/hardware/rentals", async (req, res) => {
  const parsed = rentalSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid rental", issues: parsed.error.issues }); return; }
  const rental = await HardwareLeaseManager.createRental(parsed.data);
  res.status(201).json(rental);
});

router.get("/hardware/:venueId", async (req, res) => {
  const data = await HardwareLeaseManager.listByVenue(req.params["venueId"]!);
  res.json(data);
});

router.get("/hardware/platform/mrr", async (_req, res) => {
  const mrr = await HardwareLeaseManager.getPlatformHardwareMrr();
  res.json(mrr);
});

router.patch("/hardware/leases/:id/status", async (req, res) => {
  const { status } = req.body ?? {};
  if (!["active","paused","terminated","completed"].includes(status)) {
    res.status(400).json({ error: "Invalid status" }); return;
  }
  await HardwareLeaseManager.updateLeaseStatus(req.params["id"]!, status);
  res.json({ updated: true });
});

// ── Modules ───────────────────────────────────────────────────────────────────

router.get("/modules/catalog", (_req, res) => {
  res.json({ modules: LicenseRevenueManager.getModuleCatalog() });
});

router.get("/modules/:venueId", async (req, res) => {
  const modules = await LicenseRevenueManager.listForVenue(req.params["venueId"]!);
  res.json({ modules, count: modules.length });
});

router.post("/modules/:venueId/activate", async (req, res) => {
  const { moduleId, billingInterval } = req.body ?? {};
  if (!moduleId) { res.status(400).json({ error: "moduleId required" }); return; }
  const entitlement = await LicenseRevenueManager.activateModule(req.params["venueId"]!, moduleId, billingInterval);
  res.status(201).json(entitlement);
});

router.post("/modules/:venueId/suspend", async (req, res) => {
  const { moduleId } = req.body ?? {};
  if (!moduleId) { res.status(400).json({ error: "moduleId required" }); return; }
  await LicenseRevenueManager.suspendModule(req.params["venueId"]!, moduleId);
  res.json({ suspended: true });
});

router.get("/modules/:venueId/check/:moduleId", async (req, res) => {
  const access = await LicenseRevenueManager.checkAccess(req.params["venueId"]!, req.params["moduleId"]!);
  res.json({ access, venueId: req.params["venueId"], moduleId: req.params["moduleId"] });
});

// ── AI Billing ────────────────────────────────────────────────────────────────

const aiUsageSchema = z.object({
  venueId:      z.string(),
  service:      z.string(),
  inputTokens:  z.number().int().min(0),
  outputTokens: z.number().int().min(0),
  guestId:      z.string().optional(),
  sessionId:    z.string().optional(),
  model:        z.string().optional(),
  markupOverride: z.number().optional(),
});

router.post("/ai/record", async (req, res) => {
  const parsed = aiUsageSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues }); return; }
  const event = await AIUsageBillingEngine.record(parsed.data);
  res.status(201).json(event);
});

router.get("/ai/quota/:venueId", async (req, res) => {
  const quota = await AIUsageBillingEngine.getQuotaStatus(req.params["venueId"]!);
  res.json(quota);
});

router.get("/ai/usage/:venueId", async (req, res) => {
  const days  = parseInt(req.query["days"] as string ?? "30", 10);
  const usage = await AIUsageBillingEngine.getUsageSummary(req.params["venueId"]!, days);
  res.json({ venueId: req.params["venueId"], days, usage });
});

// ── Marketplace ───────────────────────────────────────────────────────────────

router.get("/marketplace/listings", async (req, res) => {
  const listings = await MarketplaceRevenueEngine.getListings(req.query["status"] as string | undefined);
  res.json({ listings, count: listings.length });
});

const listingSchema = z.object({
  id:             z.string(),
  developerId:    z.string(),
  title:          z.string(),
  description:    z.string().optional(),
  category:       z.enum(["plugin","environment_pack","ai_module","operational_template"]),
  priceCents:     z.number().int().min(0),
  isSubscription: z.boolean().default(false),
  platformFeePct: z.number().min(0).max(1).default(0.3),
  status:         z.enum(["pending","approved","rejected","suspended"]).default("pending"),
});

router.post("/marketplace/listings", async (req, res) => {
  const parsed = listingSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid listing", issues: parsed.error.issues }); return; }
  const listing = await MarketplaceRevenueEngine.createListing(parsed.data);
  res.status(201).json(listing);
});

router.post("/marketplace/listings/:id/approve", async (req, res) => {
  await MarketplaceRevenueEngine.approveListing(req.params["id"]!);
  res.json({ approved: true });
});

router.post("/marketplace/purchase", async (req, res) => {
  const { listingId, venueId } = req.body ?? {};
  if (!listingId || !venueId) { res.status(400).json({ error: "listingId + venueId required" }); return; }
  const result = await MarketplaceRevenueEngine.purchase(listingId, venueId);
  res.json(result);
});

// ── Enterprise ────────────────────────────────────────────────────────────────

router.get("/enterprise/contracts", async (req, res) => {
  const contracts = await EnterpriseBillingManager.listContracts(req.query["status"] as string | undefined);
  res.json({ contracts, count: contracts.length });
});

const contractSchema = z.object({
  contractType:             z.enum(["enterprise","franchise","regional_chain"]),
  entityName:               z.string(),
  contactEmail:             z.string().email().optional(),
  monthlyBaseCents:         z.number().int().min(0),
  perLocationCents:         z.number().int().min(0).default(0),
  locationCount:            z.number().int().min(1).default(1),
  aiMarkupMultiplier:       z.number().min(1).default(2.5),
  hardwareLeaseDiscountPct: z.number().min(0).max(1).default(0),
  status:                   z.enum(["active","suspended","terminated"]).default("active"),
  contractStart:            z.string().default(() => new Date().toISOString()),
  contractEnd:              z.string().optional(),
  autoRenew:                z.boolean().default(true),
  notes:                    z.string().optional(),
});

router.post("/enterprise/contracts", async (req, res) => {
  const parsed = contractSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid contract", issues: parsed.error.issues }); return; }
  const contract = await EnterpriseBillingManager.createContract(parsed.data);
  res.status(201).json(contract);
});

router.get("/enterprise/white-label", async (_req, res) => {
  const licenses = await EnterpriseBillingManager.listWhiteLabels();
  res.json({ licenses, count: licenses.length });
});

const wlSchema = z.object({
  clientId:             z.string(),
  clientName:           z.string(),
  tier:                 z.enum(["standard","enterprise","full_white_label"]).default("standard"),
  brandName:            z.string().optional(),
  monthlyLicenseCents:  z.number().int().min(0),
  brandingFeeCents:     z.number().int().min(0).default(0),
  maxVenues:            z.number().int().min(1).default(1),
  status:               z.enum(["active","suspended","terminated"]).default("active"),
  contractStart:        z.string().default(() => new Date().toISOString()),
  contractEnd:          z.string().optional(),
});

router.post("/enterprise/white-label", async (req, res) => {
  const parsed = wlSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid white-label payload", issues: parsed.error.issues }); return; }
  const license = await EnterpriseBillingManager.createWhiteLabel(parsed.data);
  res.status(201).json(license);
});

// ── Licensing / EntitlementEngine ─────────────────────────────────────────────

import { EntitlementEngine }         from "../services/revenue/EntitlementEngine";
import { ProvisioningEngine }         from "../services/revenue/ProvisioningEngine";
import { AffiliateCommissionEngine }  from "../services/revenue/AffiliateCommissionEngine";
import { WhiteLabelLicenseService }   from "../services/revenue/WhiteLabelLicenseService";

router.post("/licensing/feature/enable", async (req, res) => {
  const { venueId, featureKey, source, expiresAt } = req.body ?? {};
  if (!venueId || !featureKey) { res.status(400).json({ error: "venueId + featureKey required" }); return; }
  const result = await EntitlementEngine.enableFeature({ venueId, featureKey, source, expiresAt });
  res.json(result);
});

router.post("/licensing/feature/disable", async (req, res) => {
  const { venueId, featureKey } = req.body ?? {};
  if (!venueId || !featureKey) { res.status(400).json({ error: "venueId + featureKey required" }); return; }
  const result = await EntitlementEngine.disableFeature({ venueId, featureKey });
  res.json(result);
});

router.get("/licensing/features/:venueId", async (req, res) => {
  const features = await EntitlementEngine.listForVenue(req.params["venueId"]!);
  res.json({ features, count: features.length });
});

router.get("/licensing/features/:venueId/check/:featureKey", async (req, res) => {
  const access = await EntitlementEngine.checkFeature(req.params["venueId"]!, req.params["featureKey"]!);
  res.json({ access, venueId: req.params["venueId"], featureKey: req.params["featureKey"] });
});

// ── Provisioning ──────────────────────────────────────────────────────────────

router.post("/provision/:venueId/:tier", async (req, res) => {
  const tier = (req.params["tier"] ?? "").toUpperCase() as import("../services/revenue/ProvisioningEngine").AxiomTier;
  if (!["CORE","PRO","XEI","BLACK"].includes(tier)) {
    res.status(400).json({ error: "tier must be CORE | PRO | XEI | BLACK" }); return;
  }
  const result = await ProvisioningEngine.provisionTier(req.params["venueId"]!, tier);
  res.json(result);
});

router.post("/deprovision/:venueId", async (req, res) => {
  const { fromTier, toTier } = req.body ?? {};
  if (!fromTier || !toTier) { res.status(400).json({ error: "fromTier + toTier required" }); return; }
  const result = await ProvisioningEngine.deprovisionTier(req.params["venueId"]!, fromTier, toTier);
  res.json(result);
});

router.get("/provision/tier-map", async (_req, res) => {
  res.json({ tiers: ProvisioningEngine.getTierMap() });
});

// ── Revenue Events ────────────────────────────────────────────────────────────

router.post("/events", async (req, res) => {
  const { venueId, revenueType, amountCents, metadata } = req.body ?? {};
  if (!venueId || !revenueType) { res.status(400).json({ error: "venueId + revenueType required" }); return; }
  const event = await RevenueOrchestrationEngine.recordEvent({ venueId, revenueType, amountCents: amountCents ?? 0, metadata });
  res.status(201).json(event);
});

router.get("/events/platform", async (req, res) => {
  const limit = parseInt(req.query["limit"] as string ?? "100", 10);
  const events = await RevenueOrchestrationEngine.getPlatformRevenueEventsFeed(limit);
  res.json({ events, count: events.length });
});

router.get("/events/:venueId", async (req, res) => {
  const limit = parseInt(req.query["limit"] as string ?? "50", 10);
  const events = await RevenueOrchestrationEngine.getRevenueEvents(req.params["venueId"]!, limit);
  res.json({ events, count: events.length });
});

// ── Affiliate Commission Engine ───────────────────────────────────────────────

router.post("/affiliate/commission", async (req, res) => {
  const { venueId, source, grossCents, externalProductId, referrerId, metadata } = req.body ?? {};
  if (!venueId || !source || !grossCents) { res.status(400).json({ error: "venueId, source, grossCents required" }); return; }
  const result = await AffiliateCommissionEngine.recordAndQueue({ venueId, source, grossCents, externalProductId, referrerId, metadata });
  res.status(201).json(result);
});

router.get("/affiliate/commission/calculate", async (req, res) => {
  const { grossCents, source, referrerId } = req.query as Record<string, string>;
  if (!grossCents || !source) { res.status(400).json({ error: "grossCents + source required" }); return; }
  const calc = AffiliateCommissionEngine.calculateCommission({ grossCents: parseInt(grossCents, 10), source, referrerId });
  res.json(calc);
});

router.get("/affiliate/commission/queue", async (req, res) => {
  const queue = await AffiliateCommissionEngine.getPayoutQueue(req.query["venueId"] as string | undefined);
  res.json(queue);
});

router.post("/affiliate/commission/mark-paid", async (req, res) => {
  const { eventIds } = req.body ?? {};
  if (!Array.isArray(eventIds) || !eventIds.length) { res.status(400).json({ error: "eventIds[] required" }); return; }
  const count = await AffiliateCommissionEngine.markPaid(eventIds);
  res.json({ marked: count });
});

router.get("/affiliate/commission/rates", async (_req, res) => {
  res.json({ rates: AffiliateCommissionEngine.getPartnerRates() });
});

// ── White-Label Provisioning (dedicated service) ──────────────────────────────

const wlProvisionSchema = z.object({
  clientId:         z.string(),
  clientName:       z.string(),
  tier:             z.enum(["standard","enterprise","full_white_label"]).default("standard"),
  branding:         z.object({
    brandName:    z.string(),
    primaryColor: z.string().optional(),
    logoUrl:      z.string().optional(),
    domain:       z.string().optional(),
    accentColor:  z.string().optional(),
    fontFamily:   z.string().optional(),
    tagline:      z.string().optional(),
  }),
  maxVenues:        z.number().int().min(1).default(1),
  monthlyRateCents: z.number().int().min(0),
});

router.post("/white-label/provision", async (req, res) => {
  const parsed = wlProvisionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues }); return; }
  const result = await WhiteLabelLicenseService.provision(parsed.data);
  res.status(201).json(result);
});

router.get("/white-label/active", async (_req, res) => {
  const licenses = await WhiteLabelLicenseService.listActive();
  res.json({ licenses, count: licenses.length });
});

router.get("/white-label/:clientId/branding", async (req, res) => {
  const branding = await WhiteLabelLicenseService.getBrandingConfig(req.params["clientId"]!);
  if (!branding) { res.status(404).json({ error: "No active white-label license for this client" }); return; }
  res.json(branding);
});

router.post("/white-label/:clientId/add-venue", async (req, res) => {
  const result = await WhiteLabelLicenseService.addVenueDeployment(req.params["clientId"]!);
  res.json(result);
});

router.post("/white-label/:clientId/revoke", async (req, res) => {
  await WhiteLabelLicenseService.revoke(req.params["clientId"]!);
  res.json({ revoked: true });
});

// ── Revenue Attribution ────────────────────────────────────────────────────────

const attributionSchema = z.object({
  tenantId:           z.string(),
  sessionId:          z.string(),
  recommendationType: z.string(),
  revenue:            z.number().min(0),
  confidence:         z.number().min(0).max(1),
});

router.post("/attribution/track", async (req, res) => {
  const parsed = attributionSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues }); return; }
  const event = RevenueAttributionEngine.trackInfluence(parsed.data);
  res.status(201).json(event);
});

router.get("/attribution/ledger", async (_req, res) => {
  const tenantId = typeof _req.query["tenantId"] === "string" ? _req.query["tenantId"] : undefined;
  res.json({ ledger: RevenueAttributionEngine.getLedger(tenantId), count: RevenueAttributionEngine.getLedger(tenantId).length });
});

router.get("/attribution/:tenantId/impact", async (req, res) => {
  const impact = RevenueAttributionEngine.calculateRevenueImpact(req.params["tenantId"]!);
  res.json({ tenantId: req.params["tenantId"], influencedRevenue: impact });
});

// ── Session Persistence ────────────────────────────────────────────────────────

const sessionSnapshotSchema = z.object({
  sessionId:         z.string(),
  tenantId:          z.string(),
  guestId:           z.string(),
  currentExperience: z.string(),
  currentStep:       z.number().int().min(0),
  mentorState:       z.unknown().optional(),
  rewards:           z.number().default(0),
  paused:            z.boolean().default(false),
});

router.post("/sessions/save", async (req, res) => {
  const parsed = sessionSnapshotSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues }); return; }
  SessionPersistenceEngine.saveSession({ ...parsed.data, mentorState: parsed.data.mentorState ?? null, savedAt: new Date() });
  res.status(201).json({ saved: true, sessionId: parsed.data.sessionId });
});

router.get("/sessions/:sessionId", async (req, res) => {
  const session = await SessionPersistenceEngine.recoverSession(req.params["sessionId"]!);
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  res.json(session);
});

router.post("/sessions/:sessionId/pause", async (req, res) => {
  const ok = SessionPersistenceEngine.pauseSession(req.params["sessionId"]!);
  if (!ok) { res.status(404).json({ error: "Session not found" }); return; }
  res.json({ paused: true, sessionId: req.params["sessionId"] });
});

router.post("/sessions/:sessionId/resume", async (req, res) => {
  const session = SessionPersistenceEngine.resumeSession(req.params["sessionId"]!);
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }
  res.json(session);
});

router.get("/sessions", async (req, res) => {
  const tenantId = typeof req.query["tenantId"] === "string" ? req.query["tenantId"] : undefined;
  res.json({ sessions: SessionPersistenceEngine.listSessions(tenantId) });
});

// ── Sales Validation ───────────────────────────────────────────────────────────

router.post("/sales-validation/tenant", async (req, res) => {
  const schema = z.object({
    id:                z.string(),
    venueName:         z.string().default("Unknown"),
    subscriptionTier:  z.enum(["CORE", "PRO", "XEI", "BLACK"]),
    enabledModules:    z.array(z.string()).default([]),
    whiteLabelEnabled: z.boolean().default(false),
    operationalStatus: z.enum(["ACTIVE","PAUSED","SUSPENDED","PROVISIONING","FAILED"]).default("ACTIVE"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues }); return; }
  const result = SalesValidationEngine.validateTenant({ ...parsed.data, createdAt: new Date() });
  res.json(result);
});

// ── Observability ──────────────────────────────────────────────────────────────

router.get("/observability/health", async (_req, res) => {
  res.json(ObservabilityEngine.getHealth());
});

router.get("/observability/errors", async (req, res) => {
  const limit = typeof req.query["limit"] === "string" ? parseInt(req.query["limit"], 10) : 50;
  res.json({ errors: ObservabilityEngine.getRecentErrors(limit), count: ObservabilityEngine.errors.length });
});

router.post("/observability/errors", async (req, res) => {
  const schema = z.object({ source: z.string(), message: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload" }); return; }
  const error = ObservabilityEngine.logError(parsed.data);
  res.status(201).json(error);
});

// ── Enterprise Regions ─────────────────────────────────────────────────────────

router.get("/enterprise/regions", async (_req, res) => {
  res.json({ regions: EnterpriseOrchestrationEngine.listRegions() });
});

router.get("/enterprise/regions/:regionId/venues", async (req, res) => {
  const venues = EnterpriseOrchestrationEngine.getRegionalVenues(req.params["regionId"]!);
  res.json({ regionId: req.params["regionId"], venues, count: venues.length });
});

router.post("/enterprise/regions", async (req, res) => {
  const schema = z.object({ regionId: z.string(), tenantId: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid payload" }); return; }
  const venues = EnterpriseOrchestrationEngine.addVenueToRegion(parsed.data);
  res.status(201).json({ regionId: parsed.data.regionId, venues });
});

router.delete("/enterprise/regions/:regionId/venues/:tenantId", async (req, res) => {
  const ok = EnterpriseOrchestrationEngine.removeVenueFromRegion({
    regionId: req.params["regionId"]!,
    tenantId: req.params["tenantId"]!,
  });
  if (!ok) { res.status(404).json({ error: "Region not found" }); return; }
  res.json({ removed: true });
});

export default router;
