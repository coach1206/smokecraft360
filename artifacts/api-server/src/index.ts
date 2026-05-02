import app from "./app";
import { logger } from "./lib/logger";
import { initInventory } from "./engine/inventory";

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

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
});
