import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger";
import { rejectDeepPayloads } from "./middleware/sanitize";
import { authLimiter, recommendLimiter } from "./middleware/rateLimit";

import healthRouter      from "./routes/health";
import authRouter        from "./routes/auth";
import recommendRouter   from "./routes/recommend";
import productsRouter    from "./routes/products";
import analyticsRouter   from "./routes/analytics";
import eventsRouter      from "./routes/events";
import experiencesRouter from "./routes/experiences";

// ── CORS ─────────────────────────────────────────────────────────────────────
// Allow origins listed in REPLIT_DOMAINS (published app) and REPLIT_DEV_DOMAIN
// (preview). In development fall back to localhost so local curl tests work.

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
    // Same-origin requests (and curl/healthchecks) have no Origin header — always allow.
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

// Structured request/response logging (pino-http)
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

// Limit body size to 16 KB — protects against oversized payload attacks
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// Reject payloads nested beyond MAX_DEPTH — prevents DoS / prototype pollution
app.use(rejectDeepPayloads);

// ── Routes ────────────────────────────────────────────────────────────────────
// Each router owns its relative paths (e.g. GET "/" not GET "/api/products").
// Rate limiters are applied before the routers they protect.

app.use("/api",                         healthRouter);
app.use("/api/auth",     authLimiter,   authRouter);
app.use("/api/recommend",recommendLimiter, recommendRouter);
app.use("/api/products",                productsRouter);
app.use("/api/analytics",               analyticsRouter);
app.use("/api/events",                  eventsRouter);
app.use("/api/experiences",             experiencesRouter);

// ── 404 catch-all ────────────────────────────────────────────────────────────
// Must come after all route registrations. Returns JSON, never Express's
// default HTML page.

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// ── Global error handler ──────────────────────────────────────────────────────
// Express 5 automatically forwards async errors here.
// Never exposes stack traces, raw error messages, or internal data.

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  // Log the full error server-side (pino picks up req.log if available)
  const log = (req as typeof req & { log?: typeof logger }).log ?? logger;
  log.error({ err }, "Unhandled error");

  // Safe, generic response — no implementation details leak to the client
  if (res.headersSent) return;
  res.status(500).json({ error: "Something went wrong" });
});

export default app;
