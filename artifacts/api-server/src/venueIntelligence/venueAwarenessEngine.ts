/**
 * venueAwarenessEngine — unified awareness layer bridging all VI sub-engines.
 *
 * Wraps computeAwarenessReport with additional VI context: behavior patterns,
 * service flow, pairing conversion. Publishes to "venue-awareness" channel.
 * Persists composite results to venue_awareness_scores.
 */

import { pool }                          from "@workspace/db";
import { logger }                        from "../lib/logger";
import { publish }                       from "../realtime/transport/eventBus";
import { computeAwarenessReport, type AwarenessReport } from "../intelligence/awareness/operationalAwarenessEngine";
import { detectVenueBehaviorPatterns }   from "./venueBehaviorEngine";
import { analyseServiceFlow }            from "./serviceFlowIntelligence";
import { computePairingConversion }      from "./pairingConversionEngine";

export interface VenueAwarenessReport extends AwarenessReport {
  behaviorPattern:    string;
  serviceBottleneck:  string;
  pairingConversion:  number;
  awarenessVersion:   "VI";
}

export async function computeVenueAwareness(venueId: string): Promise<VenueAwarenessReport> {
  const [base, behaviors, serviceFlow, pairings] = await Promise.all([
    computeAwarenessReport(venueId),
    detectVenueBehaviorPatterns(venueId).catch(() => []),
    analyseServiceFlow(venueId).catch(() => null),
    computePairingConversion(venueId).catch(() => null),
  ]);

  const report: VenueAwarenessReport = {
    ...base,
    behaviorPattern:   behaviors[0]?.description ?? "Stable",
    serviceBottleneck: serviceFlow?.bottleneck    ?? "NONE",
    pairingConversion: pairings?.overallConversion ?? 0.45,
    awarenessVersion:  "VI",
  };

  await pool.query(
    `INSERT INTO venue_awareness_scores
       (venue_id, overall_score, risk_level, behavior_pattern, service_bottleneck, pairing_conversion)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [venueId, report.overallScore, report.riskLevel, report.behaviorPattern, report.serviceBottleneck, report.pairingConversion],
  ).catch(err => logger.warn({ err, venueId }, "Venue awareness score persist failed"));

  await publish("venue-awareness", { venueId, report }).catch(() => null);

  return report;
}
