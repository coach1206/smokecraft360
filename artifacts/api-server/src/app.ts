import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors     from "cors";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger";
import { rejectDeepPayloads }             from "./middleware/sanitize";
import { authLimiter, recommendLimiter, osLimiter, voiceLimiter } from "./middleware/rateLimit";
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
import { startExperienceAutomation } from "./services/experienceAutomation";
import { startSessionCleanupWorker } from "./lib/sessionCleanupWorker";
import { startPayoutWorker }         from "./lib/payoutWorker";
import { startRewardOptimizationWorker } from "./lib/rewardOptimizationWorker";
import { startCampaignBudgetWorker }    from "./lib/campaignBudgetWorker";
import { requirePaymentsEnabled, requireRewardsEnabled } from "./middleware/killSwitch";

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
    origins.push("http://localhost:5173", "http://localhost:3000", "http://localhost:8080");
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
app.use("/api/auth",      authLimiter,      authRouter);
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
app.use("/api/admin/workers",             adminWorkersRouter);
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

// Start background workers
if (process.env["NODE_ENV"] !== "test") {
  startAggregationWorker();
  startExperienceAutomation();
  startSessionCleanupWorker();
  startPayoutWorker();
  startRewardOptimizationWorker();
  startCampaignBudgetWorker();
}

// ── 404 catch-all ─────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  const log = (req as typeof req & { log?: typeof logger }).log ?? logger;
  log.error({ err }, "Unhandled error");
  if (res.headersSent) return;

  // Honor explicit status from express/body-parser errors (PayloadTooLarge=413, SyntaxError on JSON=400, etc.)
  const e      = err as Error & { status?: number; statusCode?: number; type?: string };
  const status = e.status ?? e.statusCode ?? 500;
  const message =
    status === 413 ? "Payload too large" :
    status === 400 ? "Invalid request"   :
    "Something went wrong";
  res.status(status).json({ error: message });
});

export default app;
