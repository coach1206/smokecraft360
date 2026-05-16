/**
 * posHealthMonitor — Persistent POS connection health tracking.
 *
 * Probes each active POS connection every 5 minutes:
 *   - Connectivity (attempt lightweight API call)
 *   - Token expiry check
 *   - Consecutive failure tracking → status degradation
 *   - Alert emission via NeuralEventBus when status changes
 *
 * Results written to pos_health_logs for the health dashboard.
 */

import { db, posConnectionsTable, posHealthLogsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger }  from "../../lib/logger";
import { tokenManager } from "./tokenManager";
import { getUniversalAdapter } from "./posRouter";
import { NeuralEventBus }      from "../../services/neuralEventBus";

const consecutiveFailMap = new Map<string, number>();
const FAIL_THRESHOLD = 3;
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

export type HealthResult = "healthy" | "degraded" | "offline" | "unconfigured";

export interface ConnectionHealth {
  connectionId:  string;
  venueId:       string;
  provider:      string;
  result:        HealthResult;
  responseMs?:   number;
  errorMessage?: string;
  tokenExpiry?:  Date;
  isTokenExpired: boolean;
  consecutiveFails: number;
}

export async function checkConnectionHealth(connectionId: string): Promise<ConnectionHealth> {
  const rows = await db.select().from(posConnectionsTable)
    .where(eq(posConnectionsTable.id, connectionId))
    .limit(1);
  const conn = rows[0];
  if (!conn) {
    return { connectionId, venueId: "", provider: "unknown", result: "unconfigured", isTokenExpired: false, consecutiveFails: 0 };
  }

  const adapter = getUniversalAdapter(conn.provider);
  if (!adapter) {
    return { connectionId, venueId: conn.venueId, provider: conn.provider, result: "unconfigured", isTokenExpired: false, consecutiveFails: 0 };
  }

  const creds = await tokenManager.get(connectionId, conn.venueId);
  if (!creds) {
    const health: ConnectionHealth = {
      connectionId, venueId: conn.venueId, provider: conn.provider,
      result: "unconfigured", isTokenExpired: false, consecutiveFails: 0,
      errorMessage: "No credentials stored",
    };
    await writeHealthLog(conn.id, conn.venueId, conn.provider, health, "auth");
    return health;
  }

  const isTokenExpired = creds.isExpired;
  const tokenExpiry    = creds.expiresAt;

  if (isTokenExpired) {
    const fails = incrementFail(connectionId);
    const health: ConnectionHealth = {
      connectionId, venueId: conn.venueId, provider: conn.provider,
      result: fails >= FAIL_THRESHOLD ? "offline" : "degraded",
      isTokenExpired: true, tokenExpiry, consecutiveFails: fails,
      errorMessage: "Access token expired",
    };
    await writeHealthLog(conn.id, conn.venueId, conn.provider, health, "token_expiry");
    return health;
  }

  const start = Date.now();
  try {
    await adapter.syncInventory(
      { accessToken: creds.accessToken, refreshToken: creds.refreshToken, apiSecret: creds.apiSecret,
        merchantId: conn.merchantId ?? undefined, locationId: conn.locationId ?? undefined },
      conn.venueId,
    );
    const responseMs = Date.now() - start;
    clearFail(connectionId);
    const health: ConnectionHealth = {
      connectionId, venueId: conn.venueId, provider: conn.provider,
      result: "healthy", responseMs, isTokenExpired: false, tokenExpiry, consecutiveFails: 0,
    };
    await writeHealthLog(conn.id, conn.venueId, conn.provider, health, "connectivity");
    return health;
  } catch (err) {
    const fails      = incrementFail(connectionId);
    const responseMs = Date.now() - start;
    const health: ConnectionHealth = {
      connectionId, venueId: conn.venueId, provider: conn.provider,
      result: fails >= FAIL_THRESHOLD ? "offline" : "degraded",
      responseMs, isTokenExpired: false, tokenExpiry, consecutiveFails: fails,
      errorMessage: String(err),
    };
    await writeHealthLog(conn.id, conn.venueId, conn.provider, health, "connectivity");

    if (fails === FAIL_THRESHOLD) {
      NeuralEventBus.publish("pos.health.offline", {
        connectionId, venueId: conn.venueId, provider: conn.provider, error: String(err),
      }, conn.venueId);
    }
    return health;
  }
}

async function writeHealthLog(
  connectionId: string, venueId: string, provider: string,
  health: ConnectionHealth, checkType: "connectivity" | "auth" | "sync" | "webhook" | "token_expiry",
): Promise<void> {
  try {
    await db.insert(posHealthLogsTable).values({
      connectionId, venueId, provider,
      checkType,
      result:           health.result,
      responseMs:       health.responseMs ?? null,
      errorMessage:     health.errorMessage ?? null,
      tokenExpiresAt:   health.tokenExpiry ?? null,
      isTokenExpired:   health.isTokenExpired,
      consecutiveFails: health.consecutiveFails,
    });
  } catch (err) {
    logger.error({ err }, "posHealthMonitor: failed to write health log");
  }
}

function incrementFail(connectionId: string): number {
  const n = (consecutiveFailMap.get(connectionId) ?? 0) + 1;
  consecutiveFailMap.set(connectionId, n);
  return n;
}

function clearFail(connectionId: string): void {
  consecutiveFailMap.delete(connectionId);
}

export async function getAllConnectionHealth(): Promise<ConnectionHealth[]> {
  const connections = await db.select().from(posConnectionsTable)
    .where(eq(posConnectionsTable.status, "active"));

  return Promise.all(connections.map(c => checkConnectionHealth(c.id)));
}

export function startHealthMonitor(): void {
  setInterval(async () => {
    try {
      const results = await getAllConnectionHealth();
      const degraded = results.filter(r => r.result !== "healthy");
      if (degraded.length > 0) {
        logger.warn({ degraded: degraded.map(d => ({ provider: d.provider, result: d.result })) }, "POS health: degraded connections");
      }
    } catch (err) {
      logger.error({ err }, "POS health monitor cycle failed");
    }
  }, CHECK_INTERVAL_MS);

  logger.info("POS health monitor started (5-min interval)");
}
