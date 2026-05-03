import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors     from "cors";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger";
import { rejectDeepPayloads }             from "./middleware/sanitize";
import { authLimiter, recommendLimiter }  from "./middleware/rateLimit";

import healthRouter        from "./routes/health";
import authRouter          from "./routes/auth";
import recommendRouter     from "./routes/recommend";
import productsRouter      from "./routes/products";
import analyticsRouter     from "./routes/analytics";
import venueAnalyticsRouter from "./routes/venueAnalytics";
import eventsRouter        from "./routes/events";
import preferencesRouter   from "./routes/preferences";
import experiencesRouter   from "./routes/experiences";
import brandsRouter        from "./routes/brands";
import distributorsRouter  from "./routes/distributors";
import insightsRouter      from "./routes/insights";
import campaignsRouter     from "./routes/campaigns";
import venuesRouter        from "./routes/venues";
import themesRouter        from "./routes/themes";
import featureFlagsRouter  from "./routes/featureFlags";
import scoringRouter       from "./routes/scoring";
import uploadRouter             from "./routes/upload";
import ordersRouter             from "./routes/orders";
import checkoutRouter           from "./routes/checkout";
import { stripeWebhookHandler } from "./routes/stripeWebhook";
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
import { startAggregationWorker } from "./lib/aggregationWorker";

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

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(rejectDeepPayloads);

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
app.use("/api/experiences",                 experiencesRouter);
app.use("/api/brands",                      brandsRouter);
app.use("/api/distributors",                distributorsRouter);
app.use("/api/campaigns",                   campaignsRouter);
app.use("/api/venues",                      venuesRouter);
app.use("/api/themes",                      themesRouter);
app.use("/api/feature-flags",               featureFlagsRouter);
app.use("/api/scoring",                     scoringRouter);
app.use("/api/upload",                      uploadRouter);
app.use("/api/orders",                      ordersRouter);
app.use("/api",                             checkoutRouter);
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
app.use("/api/loyalty",                     loyaltyRouter);
app.use("/api/rewards",                     rewardsAdminRouter);
app.use("/api/lounge-league",               loungeLeagueRouter);
app.use("/api/devices",                     devicesRouter);
app.use("/api",                             commissionsRouter);
app.use("/api/network",                     networkInsightsRouter);
app.use("/api/payouts",                     payoutsRouter);
app.use("/api/admin/vendor",                vendorAdminRouter);
app.use("/api/vendor/placements",           vendorPlacementsRouter);
app.use("/api/payments",                    paymentsRouter);     // Elements-based PaymentIntent flow
// Subscriptions: license/status, create-checkout, portal, admin override
// (router internally exposes /status, /create-checkout, /portal, /admin/:venueId/override)
app.use("/api/license",                     subscriptionsRouter);   // mounts /status
app.use("/api/subscriptions",               subscriptionsRouter);   // mounts /create-checkout, /portal, /admin/:venueId/override, /admin/:venueId/extend-grace, /notifications
app.use("/api/billing",                     subscriptionsRouter);   // alias — exposes /portal at the brief's requested path
app.use("/api",                             subscriptionsRouter);   // exposes /notifications at /api/notifications

// Start background aggregation worker (hourly rollups for network/venue metrics)
if (process.env["NODE_ENV"] !== "test") {
  startAggregationWorker();
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
  res.status(500).json({ error: "Something went wrong" });
});

export default app;
