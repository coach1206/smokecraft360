/**
 * tokenRefresh.worker — OAuth token proactive refresh.
 *
 * Polls every 10 minutes. For each active connection with a stored token
 * that is within 10 minutes of expiry, calls the adapter's refreshToken()
 * and re-stores via tokenManager. Logs to pos_health_logs on failure.
 * Emits NeuralEventBus "pos.token.refreshed" or "pos.token.refresh_failed".
 */

import { db, posConnectionsTable, posHealthLogsTable } from "@workspace/db";
import { eq, and, isNotNull } from "drizzle-orm";
import { logger }          from "../../lib/logger";
import { tokenManager }    from "../services/tokenManager";
import { getUniversalAdapter } from "../services/posRouter";
import { NeuralEventBus }      from "../../services/neuralEventBus";

const POLL_INTERVAL_MS   = 10 * 60 * 1000;
const REFRESH_THRESHOLD_MS = 10 * 60 * 1000;

async function refreshExpiring(): Promise<void> {
  const connections = await db.select().from(posConnectionsTable)
    .where(eq(posConnectionsTable.status, "active"));

  for (const conn of connections) {
    try {
      const creds = await tokenManager.get(conn.id, conn.venueId);
      if (!creds || !creds.refreshToken) continue;

      const shouldRefresh = creds.isExpired || tokenManager.isNearExpiry(creds, REFRESH_THRESHOLD_MS);
      if (!shouldRefresh) continue;

      const adapter = getUniversalAdapter(conn.provider);
      if (!adapter?.refreshToken) {
        logger.debug({ provider: conn.provider }, "tokenRefresh.worker: adapter does not support refresh");
        continue;
      }

      logger.info({ venueId: conn.venueId, provider: conn.provider }, "tokenRefresh.worker: refreshing token");

      const newTokens = await adapter.refreshToken({
        refreshToken: creds.refreshToken,
        accessToken:  creds.accessToken,
        apiSecret:    creds.apiSecret,
      });

      await tokenManager.storeRefreshed(conn.id, conn.venueId, conn.provider, newTokens);

      NeuralEventBus.publish("pos.token.refreshed", {
        venueId: conn.venueId, provider: conn.provider, connectionId: conn.id,
      }, conn.venueId);

      logger.info({ venueId: conn.venueId, provider: conn.provider }, "Token refreshed successfully");
    } catch (err) {
      logger.error({ err, venueId: conn.venueId, provider: conn.provider }, "tokenRefresh.worker: refresh failed");

      await db.insert(posHealthLogsTable).values({
        connectionId:    conn.id,
        venueId:         conn.venueId,
        provider:        conn.provider,
        checkType:       "token_expiry",
        result:          "degraded",
        isTokenExpired:  true,
        errorMessage:    String(err),
        consecutiveFails: 1,
      });

      NeuralEventBus.publish("pos.token.refresh_failed", {
        venueId: conn.venueId, provider: conn.provider, error: String(err),
      }, conn.venueId);
    }
  }
}

export function startTokenRefreshWorker(): void {
  setInterval(async () => {
    await refreshExpiring().catch(err => logger.error({ err }, "tokenRefresh.worker: poll failed"));
  }, POLL_INTERVAL_MS);

  logger.info("Token refresh worker started (10-min poll interval)");
}
