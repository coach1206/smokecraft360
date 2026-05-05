import http                     from "http";
import app from "./app";
import { logger }               from "./lib/logger";
import { initSocketServer }     from "./lib/socketServer";
import { initInventory }        from "./engine/inventory";
import { loadCampaigns }        from "./services/campaignStore";
import { loadVenueInventory }   from "./services/venueInventoryStore";
import { refreshTrends, scheduleTrendRefresh } from "./services/trendStore";
import { loadBrandPartnerStore }               from "./services/brandPartnerStore";
import { reconcileActiveTournamentScores }     from "./lib/tournamentSync";

// ── Required environment variable guard ───────────────────────────────────────
// Fail fast at startup rather than crashing mid-request or silently misbehaving.

const REQUIRED_ENV: Record<string, string> = {
  PORT:           "Port the server listens on (set automatically by Replit)",
  SESSION_SECRET: "Secret key used to sign JWTs (set as a Replit Secret)",
  DATABASE_URL:   "PostgreSQL connection string (provisioned by Replit)",
};

let envError = false;
for (const [key, description] of Object.entries(REQUIRED_ENV)) {
  if (!process.env[key]) {
    logger.error({ key, description }, `Required environment variable "${key}" is missing`);
    envError = true;
  }
}
if (envError) process.exit(1);

// ── Startup ───────────────────────────────────────────────────────────────────

const port = Number(process.env["PORT"]);

if (Number.isNaN(port) || port <= 0) {
  logger.error({ port: process.env["PORT"] }, "PORT is not a valid number");
  process.exit(1);
}

try {
  logger.info("Initialising inventory from database\u2026");
  await initInventory();
  logger.info("Inventory ready.");
} catch (err) {
  logger.error({ err }, "Failed to initialise inventory — check DATABASE_URL");
  process.exit(1);
}

// Load campaigns after inventory (non-fatal — campaigns are optional)
await loadCampaigns();

// Load brand partner store (non-fatal — partnership engine is optional)
try {
  await loadBrandPartnerStore();
} catch (err) {
  logger.warn({ err }, "Brand partner store load failed — partnership boosts disabled");
}

// Load per-venue inventory cache (non-fatal — falls back to all-available)
try {
  await loadVenueInventory();
} catch (err) {
  logger.warn({ err }, "Venue inventory load failed — treating all products as available");
}

// Seed global trend scores from analytics (non-fatal)
try {
  await refreshTrends();
  scheduleTrendRefresh();
} catch (err) {
  logger.warn({ err }, "Initial trend score load failed — will retry on schedule");
}

// Reconcile active tournament scores on startup (non-fatal).
// Recovers any scores lost due to in-flight syncs interrupted by the restart.
// Runs synchronously before the HTTP server binds so the first request sees
// correct ranks. For very large tournaments this adds latency to startup —
// track durationMs in the log to detect if batching becomes necessary.
try {
  const reconcileStart = Date.now();
  await reconcileActiveTournamentScores();
  logger.info({ durationMs: Date.now() - reconcileStart }, "Tournament score reconciliation complete");
} catch (err) {
  logger.warn({ err }, "Tournament score reconciliation failed — leaderboards may be stale");
}

// ── HTTP server + Socket.io ────────────────────────────────────────────────────
// Upgrade from app.listen() → http.createServer() so Socket.io can share
// the same port as the REST API. The Socket.io server mounts at
// /api/socket.io — routed correctly through Replit's shared proxy.

const httpServer = http.createServer(app);
initSocketServer(httpServer);

httpServer.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening (HTTP + Socket.io)");
});
