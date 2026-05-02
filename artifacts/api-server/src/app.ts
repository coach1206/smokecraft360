import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors     from "cors";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger";
import { rejectDeepPayloads }             from "./middleware/sanitize";
import { authLimiter, recommendLimiter }  from "./middleware/rateLimit";

import healthRouter      from "./routes/health";
import authRouter        from "./routes/auth";
import recommendRouter   from "./routes/recommend";
import productsRouter    from "./routes/products";
import analyticsRouter   from "./routes/analytics";
import eventsRouter      from "./routes/events";
import experiencesRouter from "./routes/experiences";
import venuesRouter      from "./routes/venues";
import uploadRouter      from "./routes/upload";
import ordersRouter      from "./routes/orders";

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
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(rejectDeepPayloads);

// ── Routes ────────────────────────────────────────────────────────────────────

app.use("/api",                             healthRouter);
app.use("/api/auth",      authLimiter,      authRouter);
app.use("/api/recommend", recommendLimiter, recommendRouter);
app.use("/api/products",                    productsRouter);
app.use("/api/analytics",                   analyticsRouter);
app.use("/api/events",                      eventsRouter);
app.use("/api/experiences",                 experiencesRouter);
app.use("/api/venues",                      venuesRouter);
app.use("/api/upload",                      uploadRouter);
app.use("/api/orders",                      ordersRouter);

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
