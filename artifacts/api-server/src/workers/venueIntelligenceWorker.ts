/**
 * venueIntelligenceWorker — E.A.T. VI background intelligence loops.
 *
 * Schedules:
 *   15s — realtime evaluation (awareness + floor + attention)
 *    1m — predictive forecasting (occupancy + staff deployment)
 *    5m — behavioral learning (behavior patterns + pairing conversion)
 *   15m — environmental recalibration (environmental influence + momentum)
 *
 * Cluster-aware: only primary node runs workers (checked via CLUSTER_PRIMARY env).
 * Replay-safe: all writes are append-only with idempotent ON CONFLICT patterns.
 */

import { pool }                              from "@workspace/db";
import { logger }                            from "../lib/logger";
import { publish }                           from "../realtime/transport/eventBus";
import { computeVenueIntelligence }          from "../venueIntelligence/venueIntelligenceEngine";
import { getGuestAttentionAlerts }           from "../venueIntelligence/guestAttentionEngine";
import { computeFloorIntelligence }          from "../venueIntelligence/floorIntelligenceEngine";
import { computeOccupancy }                  from "../venueIntelligence/predictiveOccupancyEngine";
import { computeStaffDeployment }            from "../venueIntelligence/staffDeploymentEngine";
import { detectVenueBehaviorPatterns }       from "../venueIntelligence/venueBehaviorEngine";
import { computePairingConversion }          from "../venueIntelligence/pairingConversionEngine";
import { computeRevenueMomentumReport }      from "../venueIntelligence/revenueMomentumEngine";
import { computeEnvironmentalInfluence }     from "../venueIntelligence/environmentalInfluenceEngine";

async function getActiveVenueIds(): Promise<string[]> {
  const { rows } = await pool.query(
    `SELECT DISTINCT venue_id FROM guest_tabs
     WHERE status='open' AND created_at > now()-interval'2 hours'
     LIMIT 50`,
  ).catch(() => ({ rows: [] }));

  if (rows.length === 0) {
    const fallback = await pool.query(`SELECT id FROM venues LIMIT 10`).catch(() => ({ rows: [] }));
    return fallback.rows.map((r: { id: string }) => String(r.id));
  }

  return rows.map((r: { venue_id: string }) => String(r.venue_id));
}

async function runRealtimeEvaluation(): Promise<void> {
  const venueIds = await getActiveVenueIds();
  if (venueIds.length === 0) return;

  await Promise.all(venueIds.map(async (venueId) => {
    try {
      const [floor, attention] = await Promise.all([
        computeFloorIntelligence(venueId),
        getGuestAttentionAlerts(venueId),
      ]);

      const criticalAlerts = attention.filter(a => a.priority === "CRITICAL");
      if (criticalAlerts.length > 0) {
        await publish("guest-attention", { venueId, criticalAlerts }).catch(() => null);
      }

      await publish("floor-intelligence", { venueId, floor }).catch(() => null);
    } catch (err) {
      logger.warn({ err, venueId }, "VI realtime evaluation failed for venue");
    }
  }));
}

async function runPredictiveForecasting(): Promise<void> {
  const venueIds = await getActiveVenueIds();

  await Promise.all(venueIds.map(async (venueId) => {
    try {
      const [occupancy, staff] = await Promise.all([
        computeOccupancy(venueId),
        computeStaffDeployment(venueId),
      ]);

      await Promise.all([
        publish("occupancy-predictions", { venueId, occupancy }).catch(() => null),
        publish("staff-alerts",          { venueId, staff     }).catch(() => null),
      ]);
    } catch (err) {
      logger.warn({ err, venueId }, "VI predictive forecasting failed for venue");
    }
  }));
}

async function runBehavioralLearning(): Promise<void> {
  const venueIds = await getActiveVenueIds();

  await Promise.all(venueIds.map(async (venueId) => {
    try {
      const [behaviors, pairings, snapshot] = await Promise.all([
        detectVenueBehaviorPatterns(venueId),
        computePairingConversion(venueId),
        computeVenueIntelligence(venueId),
      ]);

      await publish("venue-intelligence", { venueId, snapshot, behaviors, pairings }).catch(() => null);
    } catch (err) {
      logger.warn({ err, venueId }, "VI behavioral learning failed for venue");
    }
  }));
}

async function runEnvironmentalRecalibration(): Promise<void> {
  const venueIds = await getActiveVenueIds();

  await Promise.all(venueIds.map(async (venueId) => {
    try {
      const [env, momentum] = await Promise.all([
        computeEnvironmentalInfluence(venueId),
        computeRevenueMomentumReport(venueId),
      ]);

      await Promise.all([
        publish("operational-pressure",    { venueId, env      }).catch(() => null),
        publish("revenue-momentum",        { venueId, momentum }).catch(() => null),
      ]);
    } catch (err) {
      logger.warn({ err, venueId }, "VI environmental recalibration failed for venue");
    }
  }));
}

export function startVenueIntelligenceWorker(): void {
  // Only run workers on the primary node to avoid distributed duplicates
  const isPrimary = process.env["CLUSTER_PRIMARY"] !== "false";
  if (!isPrimary) {
    logger.info("VI worker: non-primary node — skipping worker startup");
    return;
  }

  logger.info("VI worker: starting E.A.T. VI intelligence loops");

  // 15s — realtime evaluation
  const realtimeInterval = setInterval(() => {
    runRealtimeEvaluation().catch(err =>
      logger.warn({ err }, "VI realtime evaluation cycle error"),
    );
  }, 15_000);

  // 1m — predictive forecasting
  const forecastInterval = setInterval(() => {
    runPredictiveForecasting().catch(err =>
      logger.warn({ err }, "VI predictive forecasting cycle error"),
    );
  }, 60_000);

  // 5m — behavioral learning
  const behaviorInterval = setInterval(() => {
    runBehavioralLearning().catch(err =>
      logger.warn({ err }, "VI behavioral learning cycle error"),
    );
  }, 300_000);

  // 15m — environmental recalibration
  const envInterval = setInterval(() => {
    runEnvironmentalRecalibration().catch(err =>
      logger.warn({ err }, "VI environmental recalibration cycle error"),
    );
  }, 900_000);

  // Run initial evaluation on startup (non-fatal, delayed 5s)
  setTimeout(() => {
    runRealtimeEvaluation().catch(err =>
      logger.warn({ err }, "VI initial evaluation failed"),
    );
    runPredictiveForecasting().catch(err =>
      logger.warn({ err }, "VI initial forecast failed"),
    );
  }, 5_000);

  logger.info("VI worker: all intelligence loops active (15s / 1m / 5m / 15m)");

  // Graceful shutdown
  process.once("SIGTERM", () => {
    clearInterval(realtimeInterval);
    clearInterval(forecastInterval);
    clearInterval(behaviorInterval);
    clearInterval(envInterval);
    logger.info("VI worker: graceful shutdown complete");
  });
}
