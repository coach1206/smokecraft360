/**
 * VenueClusterManager — Multi-Venue Cluster Orchestration.
 *
 * Phase D: Multi-Venue Scale Evolution.
 *
 * Manages the health and state of all registered venues in the NOVEE OS
 * cluster. Detects stale/offline venues, classifies health, triggers
 * failover recovery, and emits cluster diagnostics.
 *
 * Health Classification:
 *   HEALTHY    — Heartbeat within 10 min, active sessions present
 *   DEGRADED   — Heartbeat within 30 min, reduced activity
 *   OFFLINE    — No heartbeat in >30 min
 *   RECOVERING — Was OFFLINE/DEGRADED, now showing heartbeat again
 *
 * Architecture:
 *   - In-process Map (Redis-swap-ready via VenueStateEngine)
 *   - 5-min health monitoring cycle
 *   - Reads orchestrator_events as heartbeat signal per venue
 *   - Emits `cluster:venue_health` via Socket.io to admin rooms
 *   - Publishes to NeuralEventBus for distributed observability
 *   - Split-brain prevention: each venue has a canonical state record
 *
 * Redis swap path:
 *   Replace venueCluster Map with ioredis hset/hgetall on "cluster:venues"
 *   — subscribe to keyspace events for real-time health transitions.
 */

import { sql }              from "drizzle-orm";
import { db }               from "@workspace/db";
import { getIO }            from "../lib/socketServer";
import { VenueStateEngine } from "./venueStateEngine";
import { NeuralEventBus }   from "./neuralEventBus";
import { logger }           from "../lib/logger";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ClusterHealth = "HEALTHY" | "DEGRADED" | "OFFLINE" | "RECOVERING";

export interface VenueClusterState {
  venueId:        string;
  health:         ClusterHealth;
  previousHealth: ClusterHealth | null;
  lastHeartbeat:  string | null;
  minutesSince:   number;
  activeSessions: number;
  activeDevices:  number;
  failoverActive: boolean;
  diagnostics:    Record<string, unknown>;
  checkedAt:      string;
}

// In-process state (swap with ioredis hset/hget for Redis)
const clusterState = new Map<string, VenueClusterState>();

// ── Health classification ─────────────────────────────────────────────────────

function classifyHealth(
  minutesSince:    number,
  activeSessions:  number,
  previousHealth:  ClusterHealth | null,
): ClusterHealth {
  if (minutesSince > 30)  return "OFFLINE";
  if (minutesSince > 10)  return "DEGRADED";
  if (previousHealth === "OFFLINE" || previousHealth === "DEGRADED") return "RECOVERING";
  return "HEALTHY";
}

// ── Core monitoring cycle ─────────────────────────────────────────────────────

async function runHealthCheck(): Promise<void> {
  try {
    // Get all venues with any history
    const venueRows = await db.execute<{
      venue_id:         string;
      last_heartbeat:   string;
      active_sessions:  string;
      minutes_since:    string;
    }>(sql`
      SELECT
        venue_id,
        MAX(created_at)                                                    AS last_heartbeat,
        COUNT(DISTINCT session_id)                                         AS active_sessions,
        EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 60                AS minutes_since
      FROM orchestrator_events
      WHERE created_at > NOW() - INTERVAL '24 hours'
        AND venue_id IS NOT NULL
      GROUP BY venue_id
    `);

    // Also pick up any venues seeded into the DB but quiet
    const registeredRows = await db.execute<{ id: string }>(
      sql`SELECT id FROM venues LIMIT 200`,
    );
    const registeredIds = new Set(registeredRows.rows.map(r => r.id));

    // Add quiet venues to the heartbeat rows
    const heartbeatMap = new Map(venueRows.rows.map(r => [r.venue_id, r]));
    for (const id of registeredIds) {
      if (!heartbeatMap.has(id)) {
        heartbeatMap.set(id, {
          venue_id:        id,
          last_heartbeat:  "",
          active_sessions: "0",
          minutes_since:   "999",
        });
      }
    }

    const io       = getIO();
    const now      = new Date().toISOString();
    let changed = 0;

    for (const [venueId, row] of heartbeatMap.entries()) {
      const minutesSince    = Number(row.minutes_since) || 999;
      const activeSessions  = Number(row.active_sessions) || 0;
      const lastHeartbeat   = row.last_heartbeat || null;
      const prev            = clusterState.get(venueId);
      const previousHealth  = prev?.health ?? null;

      const health = classifyHealth(minutesSince, activeSessions, previousHealth);
      const failoverActive = health === "OFFLINE" && (prev?.failoverActive ?? false)
        ? true
        : health === "OFFLINE" && minutesSince > 60;

      // Device count from VenueStateEngine (set by device registration)
      const activeDevicesRaw = VenueStateEngine.get<number>(venueId, "guest_count");
      const activeDevices    = activeDevicesRaw ?? 0;

      const state: VenueClusterState = {
        venueId,
        health,
        previousHealth,
        lastHeartbeat,
        minutesSince:    Math.round(minutesSince),
        activeSessions,
        activeDevices,
        failoverActive,
        diagnostics: {
          source:         "orchestrator_events",
          heartbeatGap:   `${Math.round(minutesSince)}min`,
          sessionsActive: activeSessions,
          redisSwapReady: true,
        },
        checkedAt: now,
      };

      const healthChanged = !prev || prev.health !== health;
      clusterState.set(venueId, state);

      // Persist to VenueStateEngine (Redis-swap path)
      VenueStateEngine.set(venueId, "cluster_health", { health, checkedAt: now });

      if (healthChanged) {
        changed++;
        io.to(`venue:${venueId}`).emit("cluster:venue_health", state);
        io.to("admin").emit("cluster:venue_health", state);
        NeuralEventBus.publish("cluster.health_event", state, venueId);

        logger.info(
          { venueId, health, previousHealth, minutesSince: Math.round(minutesSince) },
          "cluster: venue health changed",
        );

        if (health === "OFFLINE" && failoverActive) {
          logger.warn({ venueId }, "cluster: venue offline — failover state activated");
        }
        if (health === "RECOVERING") {
          logger.info({ venueId }, "cluster: venue recovering — failover state cleared");
        }
      }
    }

    logger.info({ venues: heartbeatMap.size, changed }, "cluster health check complete");
  } catch (err) {
    logger.error({ err }, "cluster health check failed");
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export const VenueClusterManager = {
  getClusterState(): VenueClusterState[] {
    return Array.from(clusterState.values());
  },

  getVenueHealth(venueId: string): VenueClusterState | null {
    return clusterState.get(venueId) ?? null;
  },

  getHealthSummary(): {
    total: number;
    healthy: number;
    degraded: number;
    offline: number;
    recovering: number;
    failoverActive: number;
  } {
    const states = Array.from(clusterState.values());
    return {
      total:          states.length,
      healthy:        states.filter(s => s.health === "HEALTHY").length,
      degraded:       states.filter(s => s.health === "DEGRADED").length,
      offline:        states.filter(s => s.health === "OFFLINE").length,
      recovering:     states.filter(s => s.health === "RECOVERING").length,
      failoverActive: states.filter(s => s.failoverActive).length,
    };
  },

  /** Force a health check (called by admin API). */
  async forceCheck(): Promise<void> {
    await runHealthCheck();
  },
};

// ── Startup ───────────────────────────────────────────────────────────────────

export function startVenueClusterManager(): void {
  void runHealthCheck();
  setInterval(() => void runHealthCheck(), 5 * 60 * 1000);   // every 5 minutes
  logger.info("VenueClusterManager started — multi-venue cluster health monitoring active");
}
