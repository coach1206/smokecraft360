import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors     from "cors";
import helmet  from "helmet";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger";
import { rejectDeepPayloads }             from "./middleware/sanitize";
import { authLimiter, recommendLimiter, osLimiter, voiceLimiter, loginLimiter, financialLimiter, pinLimiter } from "./middleware/rateLimit";
import { localeMiddleware }                 from "./middleware/locale";

import healthRouter        from "./routes/health";
import authRouter          from "./routes/auth";
import recommendRouter     from "./routes/recommend";
import productsRouter      from "./routes/products";
import analyticsRouter     from "./routes/analytics";
import venueAnalyticsRouter from "./routes/venueAnalytics";
import eventsRouter        from "./routes/events";
import preferencesRouter      from "./routes/preferences";
import sessionEconomicsRouter from "./routes/sessionEconomics";
import voiceRouter             from "./routes/voice";
import menuRouter              from "./routes/menu";
import experiencesRouter   from "./routes/experiences";
import brandsRouter        from "./routes/brands";
import distributorsRouter  from "./routes/distributors";
import insightsRouter      from "./routes/insights";
import campaignsRouter     from "./routes/campaigns";
import venuesRouter        from "./routes/venues";
import themesRouter        from "./routes/themes";
import featureFlagsRouter  from "./routes/featureFlags";
import governanceRouter      from "./routes/governance";
import otaRouter            from "./routes/ota";
import remoteActionsRouter  from "./routes/remoteActions";
import { environmentRouter }           from "./routes/environment";
import { enterpriseIntelligenceRouter } from "./routes/enterpriseIntelligence";
import { dashboardRouter, enginesRouter } from "./routes/masterDashboard";
import scoringRouter       from "./routes/scoring";
import systemStatusRouter  from "./routes/systemStatus";
import meRouter            from "./routes/me";
import uploadRouter             from "./routes/upload";
import ordersRouter             from "./routes/orders";
import offlineQueueRouter       from "./routes/offlineQueue";
import sessionsRouter           from "./routes/sessions";
import memoriesRouter           from "./routes/memories";
import voiceQueueRouter         from "./routes/voiceQueue";
import notificationsRouter      from "./routes/notifications";
import auditLogRouter           from "./routes/auditLog";
import supportTicketsRouter     from "./routes/supportTickets";
import supportTicketMessagesRouter from "./routes/supportTicketMessages";
import deviceHardwareRouter,        { deviceHardwareReportRouter } from "./routes/deviceHardware";
import reservationsRouter       from "./routes/reservations";
import conflictsRouter          from "./routes/conflicts";
import ipVaultRouter            from "./routes/ipVault";
import exportsRouter            from "./routes/exports";
import ndaRouter                from "./routes/nda";
import checkoutRouter           from "./routes/checkout";
import { stripeWebhookHandler } from "./routes/stripeWebhook";
import { posWebhookHandler }    from "./routes/posWebhook";
import operationsRouter         from "./routes/operations";
import imagesRouter             from "./routes/images";
import enrollmentRouter         from "./routes/enrollment";
import sageRouter               from "./routes/sage";
import venueSetupRouter         from "./routes/venueSetup";
import staffAuthRouter          from "./routes/staffAuth";
import salesNudgeRouter         from "./routes/salesNudge";
import guestReturnRouter        from "./routes/guestReturn";
import adEngineRouter           from "./routes/adEngine";
import referralsRouter          from "./routes/referrals";
import iotRouter                from "./routes/iot";
import axiomCreditsRouter       from "./routes/axiomCredits";
import palateIndexRouter        from "./routes/palateIndex";
import demoRouter               from "./routes/demo";
import demandRouter             from "./routes/demand";
import demandEventsRouter       from "./routes/demandEvents";
import demandProofRouter        from "./routes/demandProof";
import demandInsightsRouter     from "./routes/demandInsights";
import orderVerificationRouter  from "./routes/orderVerification";
import progressionRouter        from "./routes/progression";
import venueIntelligenceRouter  from "./routes/venueIntelligence";
import signatureCigarsRouter    from "./routes/signatureCigars";
import manufacturersRouter      from "./routes/manufacturers";
import loyaltyRouter            from "./routes/loyalty";
import rewardsAdminRouter       from "./routes/rewardsAdmin";
import loungeLeagueRouter       from "./routes/loungeLeague";
import devicesRouter            from "./routes/devices";
import commissionsRouter        from "./routes/commissions";
import networkInsightsRouter    from "./routes/networkInsights";
import payoutsRouter            from "./routes/payouts";
import vendorAdminRouter        from "./routes/vendorAdmin";
import vendorPlacementsRouter   from "./routes/vendorPlacements";
import vendorPortalRouter       from "./routes/vendorPortal";
import { paymentsRouter }       from "./routes/payments";
import subscriptionsRouter      from "./routes/subscriptions";
import osEventsRouter           from "./routes/osEvents";
import osCommandRouter          from "./routes/osCommand";
import osFinancialsRouter       from "./routes/osFinancials";
import { deviceTouch }          from "./middleware/deviceTouch";
import { startAggregationWorker } from "./lib/aggregationWorker";
import experienceEngineRouter    from "./routes/experienceEngine";
import experienceCompleteRouter  from "./routes/experienceComplete";
import adminIntensityRouter      from "./routes/adminIntensity";
import experienceControlRouter  from "./routes/experienceControl";
import orchestratorRouter       from "./routes/orchestrator";
import systemValidationRouter  from "./routes/systemValidation";
import operatorReadinessRouter from "./routes/operatorReadiness";
import adminWorkersRouter        from "./routes/adminWorkers";
import systemVersionRouter       from "./routes/systemVersion";
import deviceHeartbeatRouter     from "./routes/deviceHeartbeat";
import brandPartnersRouter      from "./routes/brandPartners";
import distributionInsightsRouter from "./routes/distributionInsights";
import roiReportingRouter        from "./routes/roiReporting";
import touchscreenRouter         from "./routes/touchscreen";
import campaignEntriesRouter    from "./routes/campaignEntries";
import craftBuildsRouter        from "./routes/craftBuilds";
import designDraftsRouter       from "./routes/designDrafts";
import craftSessionsRouter      from "./routes/craftSessions";
import craftRouter              from "./routes/craft";
import competitionsRouter       from "./routes/competitions";
import posOrdersRouter          from "./routes/posOrders";
import swipeExperienceRouter    from "./routes/swipeExperience";
import experienceItemsRouter    from "./routes/experienceItems";
import swipeOrdersRouter        from "./routes/swipeOrders";
import vaultRouter              from "./routes/vault";
import usersRouter              from "./routes/users";
import aiRouter                 from "./routes/ai";
import entitlementsRouter       from "./routes/entitlements";
import behaviorEventsRouter     from "./routes/behaviorEvents";
import dataIntelligenceRouter   from "./routes/dataIntelligence";
import onboardingRouter         from "./routes/onboarding";
import aiConfigureRouter        from "./routes/aiConfigure";
import demoSimulateRouter       from "./routes/demoSimulate";
import { startExperienceAutomation }          from "./services/experienceAutomation";
import { startSensoryEngine }                  from "./services/sensoryEngine";
import { startVenueEnergyEngine }              from "./services/venueEnergyEngine";
import { startOperationalAutonomyEngine }      from "./services/operationalAutonomyEngine";
import { startPredictiveHospitalityEngine }    from "./services/predictiveHospitalityEngine";
import { startVenueClusterManager }            from "./services/venueClusterManager";
import { startUnifiedPOSBridge }               from "./services/unifiedPosBridge";
import eeieCommandRouter                       from "./routes/eeieCommand";
import eeieCommerceRouter                      from "./routes/eeie-commerce-routes";
import eeieStaffRouter                         from "./routes/eeie-staff-routes";
import { startSessionCleanupWorker } from "./lib/sessionCleanupWorker";
import { startPayoutWorker }         from "./lib/payoutWorker";
import { startRewardOptimizationWorker } from "./lib/rewardOptimizationWorker";
import { startCampaignBudgetWorker }    from "./lib/campaignBudgetWorker";
import { startTournamentWorker }        from "./lib/tournamentWorker";
import { requirePaymentsEnabled, requireRewardsEnabled } from "./middleware/killSwitch";
import guestTabsRouter      from "./routes/guestTabs";
import fulfillmentRouter    from "./routes/fulfillmentQueue";
import stripeConnectRouter  from "./routes/stripeConnect";
import failedWebhooksRouter      from "./routes/failedWebhooks";
import launchReadinessRouter     from "./routes/launchReadiness";
import receiptsRouter            from "./routes/receipts";
import financeReconciliationRouter from "./routes/financeReconciliation";
import paymentTimelineRouter     from "./routes/paymentTimeline";
import trainingRouter            from "./routes/training";
import demoEngineRouter          from "./routes/demoEngine";
import trainingAccountsRouter    from "./routes/trainingAccounts";
import { startFailedWebhookWorker }   from "./lib/failedWebhookWorker.js";
import { startReconciliationWorker }  from "./lib/reconciliationWorker.js";
import { notFoundHandler, globalErrorHandler } from "./middleware/responseFormat";
import executiveIntelligenceRouter   from "./routes/executiveIntelligence";
import manufacturerWarRoomRouter     from "./routes/manufacturerWarRoom";
import identityEvolutionRouter      from "./routes/identityEvolution";
import hardwareRegistryRouter       from "./routes/hardwareRegistry";
import enterpriseSecurityLogsRouter from "./routes/enterpriseSecurityLogs";
import hardwareFleetRouter          from "./routes/hardwareFleet";
import environmentSyncRouter        from "./routes/environmentSync";
import securityAuditTrailRouter     from "./routes/securityAuditTrail";
import investorDemoRouter           from "./routes/investorDemo";
import masteryRouter               from "./routes/mastery";
import pairingEngineRouter         from "./routes/pairingEngine";
import masterBlenderRouter          from "./routes/masterBlender";
import enterpriseAiRouter          from "./routes/enterprise-ai";
import artisanOrdersRouter         from "./routes/artisanOrders";
import sovereignOrderRouter        from "./routes/sovereignOrder";
import sovereignEventsRouter       from "./routes/sovereignEvents";
import sovereignDistributionRouter from "./routes/sovereignDistribution";
import sovereignAuthRouter         from "./routes/sovereignAuth";
import pinAuthRouter               from "./routes/pinAuth";
import biometricHardwareRouter     from "./routes/biometricHardware";
import titanEngineRouter, { startSignalMonitor } from "./routes/titanEngine";
import cognitiveBuildSheetRouter   from "./routes/cognitiveBuildSheet";

// ── CORS ──────────────────────────────────────────────────────────────────────

function buildAllowedOrigins(): string[] {
  const origins: string[] = [];
  if (process.env["REPLIT_DOMAINS"]) {
    for (const d of process.env["REPLIT_DOMAINS"].split(",")) {
      origins.push(`https://${d.trim()}`);
    }
  }
  if (process.env["REPLIT_DEV_DOMAIN"]) {
    origins.push(`https://${process.env["REPLIT_DEV_DOMAIN"]}`);
  }
  if (process.env["NODE_ENV"] !== "production") {
    // Port-specific dev servers + port-80 proxy (used by Replit's shared reverse proxy)
    origins.push(
      "http://localhost",
      "http://localhost:80",
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:8080",
    );
  }
  return origins;
}

const allowedOrigins = buildAllowedOrigins();

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some((o) => origin === o || origin.startsWith(o))) {
      return callback(null, true);
    }
    callback(new Error(`CORS: origin "${origin}" is not allowed`));
  },
  credentials: true,
};

// ── App ───────────────────────────────────────────────────────────────────────

const app: Express = express();

// Replit routes all traffic through its reverse proxy — trust the X-Forwarded-For
// header so express-rate-limit and other middleware can read the real client IP.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; },
      res(res) { return { statusCode: res.statusCode }; },
    },
  }),
);

// Helmet sets security-relevant HTTP headers (X-Frame-Options, HSTS,
// X-Content-Type-Options, etc.). Content-Security-Policy is disabled
// here — the API is pure JSON; CSP is handled on the Vite frontend layer.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors(corsOptions));

// Stripe webhook must receive the raw body for signature verification —
// register BEFORE express.json() parses and discards the raw stream.
app.post(
  "/api/webhook/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler,
);

// POS webhook also needs the raw body for HMAC verification — same pattern
// as Stripe. Generic vendor-neutral receiver; gated by POS_WEBHOOK_SECRET.
app.post(
  "/api/webhooks/pos",
  express.raw({ type: "application/json", limit: "32kb" }),
  posWebhookHandler,
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// Passive device-touch — must run BEFORE the API routers so every /api/*
// request contributes to liveness telemetry (architect feedback). Header
// is optional; missing/invalid header is a no-op.
app.use("/api", deviceTouch);

// POS order + webhook routes are mounted BEFORE rejectDeepPayloads because
// real POS vendors (Square, Toast) send payloads nested 5+ levels deep.
// Both endpoints are Zod-validated before any property access so there is
// no prototype-pollution risk from skipping the depth guard here.
app.use("/api", posOrdersRouter);

app.use(rejectDeepPayloads);
// Parse Accept-Language → req.locale (en/es/fr). Passive: no body changes.
app.use(localeMiddleware);

// ── Routes ────────────────────────────────────────────────────────────────────

app.use("/api",                             healthRouter);
// loginLimiter is tighter (10/15-min, skip successes) and layered BEFORE
// authLimiter on the specific login path to enforce brute-force protection.
app.use("/api/auth/login",     loginLimiter);
// pinLimiter is the tightest brute-force guard (5/15-min, skip successes).
// Must be applied BEFORE authLimiter so the PIN path gets both layers.
app.use("/api/auth/pin-login", pinLimiter, pinAuthRouter);
app.use("/api/auth",           authLimiter, authRouter);
app.use("/api/recommend", recommendLimiter, recommendRouter);
app.use("/api/products",                    productsRouter);
app.use("/api/analytics",                   venueAnalyticsRouter);
app.use("/api/analytics",                   insightsRouter);
app.use("/api/analytics",                   analyticsRouter);
app.use("/api/events",                      eventsRouter);
app.use("/api/preferences",                 preferencesRouter);
// sessionEconomicsRouter exposes /session/forecast → /api/session/forecast
app.use("/api",                             sessionEconomicsRouter);
// voiceRouter exposes /voice/speak → /api/voice/speak (ElevenLabs proxy).
// voiceLimiter caps spend: every call is paid TTS characters.
app.use("/api/voice",                       voiceLimiter, voiceRouter);
// menuRouter exposes /all, /suggested, / → /api/menu/* (orderable menu items)
app.use("/api/menu",                        menuRouter);
app.use("/api/experiences",                 experiencesRouter);
app.use("/api/brands",                      brandsRouter);
app.use("/api/distributors",                distributorsRouter);
app.use("/api/campaigns",                   campaignsRouter);
app.use("/api/campaigns",                   campaignEntriesRouter);
app.use("/api/venues",                      venuesRouter);
app.use("/api/themes",                      themesRouter);
app.use("/api/feature-flags",               featureFlagsRouter);
app.use("/api/governance",                  governanceRouter);
app.use("/api/ota",                         otaRouter);
app.use("/api/remote-actions",              remoteActionsRouter);
app.use("/api/environment",                 environmentRouter);
app.use("/api/enterprise-intelligence",    enterpriseIntelligenceRouter);
app.use("/api/dashboard",                 dashboardRouter);
app.use("/api/engines",                   enginesRouter);
app.use("/api/tabs",                      financialLimiter, requirePaymentsEnabled, guestTabsRouter);
app.use("/api/fulfillment",               fulfillmentRouter);
app.use("/api/stripe-connect",            financialLimiter, stripeConnectRouter);
app.use("/api/scoring",                     scoringRouter);
app.use("/api/system",                      systemStatusRouter);
app.use("/api/me",                          meRouter);
app.use("/api/upload",                      uploadRouter);
app.use("/api/orders",                      ordersRouter);
app.use("/api/offline-queue",               offlineQueueRouter);
app.use("/api/sessions",                    sessionsRouter);
app.use("/api/memories",                    memoriesRouter);
app.use("/api/voice-queue",                 voiceQueueRouter);
// notificationsRouter adds PATCH /:id/read, POST /read-all, DELETE /:id at
// /api/notifications. The matching GET /api/notifications stays in
// subscriptionsRouter (mounted below at /api). Both routers coexist —
// Express dispatches by full path.
app.use("/api/notifications",               notificationsRouter);
// auditLogRouter exposes read-only GET /api/audit-log. Append-only writes
// flow exclusively through lib/audit.ts#logAudit on the server side; there
// is intentionally no public write endpoint here (G6).
app.use("/api/audit-log",                   auditLogRouter);
// Help Center Slice 1 — venue staff open tickets, super_admin works them.
// Per-venue 50 open|in_progress cap inside POST.
app.use("/api/support-tickets",             supportTicketsRouter);
// Help Center Slice 2 — append-only message thread on a ticket. Mounted
// as a nested resource so tenant scope is inherited from the parent
// ticket (router uses mergeParams for :ticketId). Per-ticket 200-message
// cap inside POST.
app.use(
  "/api/support-tickets/:ticketId/messages",
  supportTicketMessagesRouter,
);
app.use("/api/reservations",                reservationsRouter);
app.use("/api/conflicts",                   conflictsRouter);
app.use("/api/ip-vault",                    ipVaultRouter);
app.use("/api/exports",                     exportsRouter);
app.use("/api/nda",                         ndaRouter);
// Operations layer — staff/manager tools: reorder alerts, menu layout
// optimization, profit calc, staff pitch. All gated to staff+.
app.use("/api/ops",                         operationsRouter);
app.use("/api/images",   recommendLimiter,  imagesRouter);
app.use("/api/enrollment",                  enrollmentRouter);
app.use("/api/sage",                        sageRouter);
app.use("/api/venue-setup",                 venueSetupRouter);
app.use("/api/staff",                       staffAuthRouter);
app.use("/api/sales",                       salesNudgeRouter);
app.use("/api/auth",                        guestReturnRouter);
app.use("/api/ads",                         adEngineRouter);
app.use("/api/referrals",                   referralsRouter);
app.use("/api/iot",                         iotRouter);
app.use("/api/credits",                     axiomCreditsRouter);
app.use("/api/palate",                      palateIndexRouter);
app.use("/api",             requirePaymentsEnabled, checkoutRouter);
app.use("/api",                             demoRouter);
app.use("/api/demand",                      demandEventsRouter);
app.use("/api/demand",                      demandRouter);
app.use("/api/demand",                      demandProofRouter);
app.use("/api/demand",                      demandInsightsRouter);
app.use("/api/orders",                      orderVerificationRouter);
app.use("/api/progression",                 progressionRouter);
app.use("/api/venues",                      venueIntelligenceRouter);
app.use("/api/signature-cigars",            signatureCigarsRouter);
app.use("/api/manufacturers",               manufacturersRouter);
app.use("/api/loyalty",     requireRewardsEnabled,  loyaltyRouter);
app.use("/api/rewards",    requireRewardsEnabled,  rewardsAdminRouter);
app.use("/api/lounge-league",               loungeLeagueRouter);
// Hardware lifecycle sidecar to /api/devices. The report router is mounted
// at the literal /api/devices/hardware path BEFORE the per-device router
// so Express matches the static segment ahead of the :deviceId param
// (otherwise "hardware" would be tried as a UUID by the per-device mount
// and fail with 400). The per-device router uses mergeParams so the
// :deviceId from the parent mount is visible.
app.use("/api/devices/hardware",            deviceHardwareReportRouter);
app.use(
  "/api/devices/:deviceId/hardware",
  deviceHardwareRouter,
);
app.use("/api/devices",                     devicesRouter);
app.use("/api/os",          osLimiter,      osEventsRouter);
app.use("/api/os",          osLimiter,      osCommandRouter);
app.use("/api/os",          osLimiter,      osFinancialsRouter);
app.use("/api",                             commissionsRouter);
app.use("/api/network",                     networkInsightsRouter);
app.use("/api/payouts",                     payoutsRouter);
app.use("/api/admin/vendor",                vendorAdminRouter);
app.use("/api/vendor/placements",           vendorPlacementsRouter);
app.use("/api/vendor",                      vendorPortalRouter);
app.use("/api/payments",    requirePaymentsEnabled, paymentsRouter);     // Elements-based PaymentIntent flow
// Subscriptions: license/status, create-checkout, portal, admin override
// (router internally exposes /status, /create-checkout, /portal, /admin/:venueId/override)
app.use("/api/license",                     subscriptionsRouter);   // mounts /status
app.use("/api/subscriptions",               subscriptionsRouter);   // mounts /create-checkout, /portal, /admin/:venueId/override, /admin/:venueId/extend-grace, /notifications
app.use("/api/billing",                     subscriptionsRouter);   // alias — exposes /portal at the brief's requested path
app.use("/api",                             subscriptionsRouter);   // exposes /notifications at /api/notifications
app.use("/api/experience-engine",          experienceEngineRouter);
app.use("/api/experience",                experienceCompleteRouter);
app.use("/api/admin/intensity",           adminIntensityRouter);
app.use("/api/admin/experience-control", experienceControlRouter);
app.use("/api/orchestrator",                  orchestratorRouter);
app.use("/api/admin/system-validation",      systemValidationRouter);
app.use("/api/admin/operator-readiness",    operatorReadinessRouter);
app.use("/api/admin/failed-webhooks",      failedWebhooksRouter);
app.use("/api/admin/launch-readiness",     launchReadinessRouter);
app.use("/api/receipts",                   receiptsRouter);
app.use("/api/finance-reconciliation",     financeReconciliationRouter);
app.use("/api/payment-timeline",           paymentTimelineRouter);
app.use("/api/training/accounts",          trainingAccountsRouter);
app.use("/api/training",                   trainingRouter);
app.use("/api/demo",                       demoEngineRouter);
app.use("/api/admin/workers",             adminWorkersRouter);
app.use("/api/eeie",                      eeieCommerceRouter);
app.use("/api/eeie",                      eeieStaffRouter);
app.use("/api/eeie",                      eeieCommandRouter);
app.use("/api/system",                   systemVersionRouter);
app.use("/api/admin/system",             systemVersionRouter);
app.use("/api/device",                   deviceHeartbeatRouter);
app.use("/api/admin",                    deviceHeartbeatRouter);
app.use("/api/brand-partners",           brandPartnersRouter);
app.use("/api/distribution",             distributionInsightsRouter);
app.use("/api/admin",                    roiReportingRouter);
app.use("/api/touchscreen",              touchscreenRouter);
app.use("/api/craft-builds",            craftBuildsRouter);
app.use("/api/design-drafts",           designDraftsRouter);
app.use("/api/craft-sessions",          craftSessionsRouter);
app.use("/api/craft",                   craftRouter);
app.use("/api/competitions",            competitionsRouter);
app.use("/api/swipe-experience",        swipeExperienceRouter);
app.use("/api/experience-items",        experienceItemsRouter);
app.use("/api/swipe-orders",            swipeOrdersRouter);
app.use("/api/vault",                   vaultRouter);
import mentorAIRouter          from "./routes/mentorAI";
import xpEngineRouter          from "./routes/xpEngine";
import staffFloorRouter        from "./routes/staffFloor";
import leaderboardRouter        from "./routes/leaderboard";
import snapshotRouter,
       { operationalRouter }   from "./routes/sessionSnapshots";
import neuralSubstrateRouter   from "./routes/neuralSubstrate";
import venueDNARouter          from "./routes/venueDNA";
import spatialHapticsRouter    from "./routes/spatialHaptics";
import axiomConnectRouter        from "./routes/axiomConnect";
import environmentalModeRouter   from "./routes/environmentalMode";
import predictiveIntentRouter    from "./routes/predictiveIntent";
import founderIntelligenceRouter from "./routes/founderIntelligence";
import plumbingRouter            from "./routes/plumbing";
import revenueEngineRouter       from "./routes/revenueEngine";
import axiomCoreRouter           from "./routes/axiomCore";
import { BlackBoxRecovery }               from "./services/blackBoxRecovery";
import { RuntimeActivationService }       from "./services/runtimeActivation";
import { FounderIntelligenceStream }      from "./services/founderIntelligenceStream";
import {
  validateEnv,
  initProductionIndexes,
  deepHealthCheck,
}                                         from "./services/productionHardening";
import { aiLimiter }                      from "./middleware/rateLimit";
import { startPredictiveIntentWorker }    from "./workers/predictiveIntentWorker";
import { startRecurringBillingWorker }    from "./workers/recurringBillingWorker";
import { startAIUsageWorker }             from "./workers/aiUsageWorker";
app.use("/api/mentor",        aiLimiter, mentorAIRouter);
app.use("/api/xp",            xpEngineRouter);
app.use("/api/staff",         staffFloorRouter);
app.use("/api/leaderboard",   leaderboardRouter);
app.use("/api/snapshots",     snapshotRouter);
app.use("/api/operational",   operationalRouter);
app.use("/api/neural",        neuralSubstrateRouter);
app.use("/api/venue-dna",     venueDNARouter);
app.use("/api",               spatialHapticsRouter);
app.use("/api/connect",       axiomConnectRouter);
app.use("/api/env-mode",      environmentalModeRouter);
app.use("/api/intent",        predictiveIntentRouter);
app.use("/api/founder",         founderIntelligenceRouter);
app.use("/api/plumbing",        plumbingRouter);
app.use("/api/revenue-engine",  revenueEngineRouter);
app.use("/api/axiom",           axiomCoreRouter);
app.use("/api",                         usersRouter);
app.use("/api",                         aiRouter);
app.use("/api/admin/entitlements",      entitlementsRouter);
app.use("/api/entitlements",            entitlementsRouter);
app.use("/api/events/behavior",         behaviorEventsRouter);
app.use("/api/analytics",               behaviorEventsRouter);
app.use("/api/data-intelligence",       dataIntelligenceRouter);
app.use("/api/executive-intelligence",  executiveIntelligenceRouter);
app.use("/api/manufacturer-war-room",   manufacturerWarRoomRouter);
app.use("/api/identity-evolution",        identityEvolutionRouter);
app.use("/api/hardware-registry",         hardwareRegistryRouter);
app.use("/api/enterprise-security-logs",  enterpriseSecurityLogsRouter);
app.use("/api/hardware-fleet",            hardwareFleetRouter);
app.use("/api/environment-sync",          environmentSyncRouter);
app.use("/api/security-audit-trail",      securityAuditTrailRouter);
app.use("/api/investor-demo",             investorDemoRouter);
app.use("/api/mastery",                  masteryRouter);
app.use("/api/pairing-engine",           pairingEngineRouter);
app.use("/api/master-blender",           masterBlenderRouter);
app.use("/api/enterprise-ai",           enterpriseAiRouter);
app.use("/api",                         artisanOrdersRouter);
app.use("/api",                         sovereignOrderRouter);
app.use("/api",                         sovereignEventsRouter);
app.use("/api",                         sovereignDistributionRouter);
app.use("/api",                         sovereignAuthRouter);
app.use("/api",                         biometricHardwareRouter);
app.use("/api",                         titanEngineRouter);
app.use("/api",                         cognitiveBuildSheetRouter);
app.use("/api",                         onboardingRouter);
app.use("/api",                         aiConfigureRouter);
app.use("/api",                         demoSimulateRouter);

// ── Deep health endpoint ───────────────────────────────────────────────────────

app.get("/api/health/deep", async (_req, res) => {
  try {
    const report = await deepHealthCheck();
    const status = report.overallStatus === "unhealthy" ? 503 : 200;
    res.status(status).json(report);
  } catch (err) {
    logger.error({ err }, "deep health check failed");
    res.status(500).json({ error: "health check failed" });
  }
});

// Start background workers
if (process.env["NODE_ENV"] !== "test") {
  // Validate required environment variables immediately at startup
  validateEnv();

  BlackBoxRecovery.init();
  startPredictiveIntentWorker();
  RuntimeActivationService.registerWorker("predictiveIntent");
  startRecurringBillingWorker();
  startAIUsageWorker();
  RuntimeActivationService.registerWorker("aiUsage");
  startAggregationWorker();
  startExperienceAutomation();
  startSensoryEngine();
  startVenueEnergyEngine();
  startOperationalAutonomyEngine();
  startPredictiveHospitalityEngine();
  startVenueClusterManager();
  startUnifiedPOSBridge();
  startSessionCleanupWorker();
  startPayoutWorker();
  startRewardOptimizationWorker();
  startCampaignBudgetWorker();
  startTournamentWorker();
  startFailedWebhookWorker();
  startReconciliationWorker();
  startSignalMonitor();
  RuntimeActivationService.registerWorker("reconciliation");

  // Non-blocking DB index hardening + runtime activation
  Promise.all([
    initProductionIndexes(),
    RuntimeActivationService.run(),
  ]).catch(err => logger.error({ err }, "AXIOM OS — startup hardening failed"));
}

// ── 404 + global error handler ────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
