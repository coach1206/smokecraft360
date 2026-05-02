import app from "./app";
import { logger } from "./lib/logger";
import { initInventory } from "./engine/inventory";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

try {
  logger.info("Initialising inventory from database…");
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
