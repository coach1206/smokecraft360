/**
 * venueIntelligenceEngine — E.A.T. VI orchestration hub.
 *
 * Aggregates all sub-engine outputs into a unified VenueIntelligenceSnapshot,
 * persists to venue_intelligence_snapshots, and publishes to the
 * "venue-intelligence" realtime channel. Entry point for all VI consumers.
 */

import { pool }                              from "@workspace/db";
import { logger }                            from "../lib/logger";
import { publish }                           from "../realtime/transport/eventBus";
import { computeAwarenessReport }            from "../intelligence/awareness/operationalAwarenessEngine";
import { generateHospitalityRecommendations } from "./hospitalityRecommendationEngine";
import { computeOccupancy }                  from "./predictiveOccupancyEngine";
import { getGuestAttentionAlerts }           from "./guestAttentionEngine";
import { computeStaffDeployment }            from "./staffDeploymentEngine";
import { computeRevenueMomentum }            from "./revenueMomentumEngine";
import { computeOperationalPressure }        from "./operationalPressureEngine";
import { computeLoungeMomentum }             from "./loungeMomentumEngine";
import { computeFloorIntelligence }          from "./floorIntelligenceEngine";
import { computeEnvironmentalInfluence }     from "./environmentalInfluenceEngine";

export interface VenueIntelligenceSnapshot {
  venueId:                string;
  snapshotAt:             string;
  overallScore:           number;
  riskLevel:              "low" | "moderate" | "high" | "critical";
  engagementLevel:        "HIGH" | "BUILDING" | "LOW" | "CRITICAL";
  activeSessions:         number;
  recommendations:        string[];
  serviceSignals:         { table: string; signal: string; urgency: "HIGH" | "MED" | "LOW" }[];
  staffDeployment:        { zone: string; action: string; priority: "URGENT" | "STANDARD" | "NOMINAL" }[];
  occupancyForecast:      { table: string; forecast: string; eta: string }[];
  guestAlerts:            { guestRef: string; issue: string; minutesInactive: number }[];
  operationalPressure:    number;
  revenueMomentum:        number;
  loungeMomentum:         number;
  floorLoad:              number;
  environmentalFit:       number;
  revenueSignal:          string;
  orchestrationStatus:    string;
  activeScene:            string;
  sceneOptions:           string[];
  lastSync:               string;
}

function deriveEngagementLevel(satisfaction: number): VenueIntelligenceSnapshot["engagementLevel"] {
  if (satisfaction >= 0.75) return "HIGH";
  if (satisfaction >= 0.50) return "BUILDING";
  if (satisfaction >= 0.30) return "LOW";
  return "CRITICAL";
}

function deriveRevenueSignal(momentum: number, score: number): string {
  if (momentum > 0.70 && score > 0.55) return "PRIME UPSELL WINDOW";
  if (momentum > 0.50)                 return "UPSELL WINDOW";
  if (score < 0.40)                    return "RETENTION MODE";
  return "STANDARD";
}

export async function computeVenueIntelligence(venueId: string): Promise<VenueIntelligenceSnapshot> {
  const [
    awareness,
    recommendations,
    occupancy,
    guestAlerts,
    staffDeployment,
    revenueMomentum,
    operationalPressure,
    loungeMomentum,
    floorIntelligence,
    environmentalInfluence,
  ] = await Promise.all([
    computeAwarenessReport(venueId).catch(() => null),
    generateHospitalityRecommendations(venueId).catch(() => []),
    computeOccupancy(venueId).catch(() => ({ activeSessions: 0, forecast: [] as VenueIntelligenceSnapshot["occupancyForecast"] })),
    getGuestAttentionAlerts(venueId).catch(() => [] as VenueIntelligenceSnapshot["guestAlerts"]),
    computeStaffDeployment(venueId).catch(() => [] as VenueIntelligenceSnapshot["staffDeployment"]),
    computeRevenueMomentum(venueId).catch(() => 0.5),
    computeOperationalPressure(venueId).catch(() => 0.5),
    computeLoungeMomentum(venueId).catch(() => 0.5),
    computeFloorIntelligence(venueId).catch(() => ({ load: 0.5, signals: [] as VenueIntelligenceSnapshot["serviceSignals"] })),
    computeEnvironmentalInfluence(venueId).catch(() => 0.5),
  ]);

  const score           = awareness?.overallScore      ?? 0.5;
  const riskLevel       = awareness?.riskLevel         ?? "moderate";
  const satisfaction    = awareness?.guestSatisfaction ?? 0.5;
  const engagementLevel = deriveEngagementLevel(satisfaction);
  const revenueSignal   = deriveRevenueSignal(revenueMomentum, score);

  const snapshot: VenueIntelligenceSnapshot = {
    venueId,
    snapshotAt:          new Date().toISOString(),
    overallScore:        score,
    riskLevel,
    engagementLevel,
    activeSessions:      occupancy.activeSessions,
    recommendations:     awareness?.recommendations ?? recommendations.map(r => r.text),
    serviceSignals:      floorIntelligence.signals,
    staffDeployment,
    occupancyForecast:   occupancy.forecast,
    guestAlerts,
    operationalPressure,
    revenueMomentum,
    loungeMomentum,
    floorLoad:           floorIntelligence.load,
    environmentalFit:    environmentalInfluence,
    revenueSignal,
    orchestrationStatus: riskLevel === "critical" ? "CRITICAL" : "ACTIVE",
    activeScene:         "Smokecraft Dimmed Lounge",
    sceneOptions:        ["Deep Lounge", "VIP Reserve", "Bright Service", "Closing Ritual"],
    lastSync:            new Date().toISOString(),
  };

  await pool.query(
    `INSERT INTO venue_intelligence_snapshots
       (venue_id, overall_score, risk_level, engagement_level, active_sessions,
        operational_pressure, revenue_momentum, lounge_momentum, floor_load,
        environmental_fit, revenue_signal, orchestration_status, payload)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [
      venueId, score, riskLevel, engagementLevel, occupancy.activeSessions,
      operationalPressure, revenueMomentum, loungeMomentum, floorIntelligence.load,
      environmentalInfluence, revenueSignal, snapshot.orchestrationStatus,
      JSON.stringify(snapshot),
    ],
  ).catch(err => logger.warn({ err, venueId }, "VI snapshot persist failed"));

  await publish("venue-intelligence", { venueId, snapshot }).catch(() => null);

  return snapshot;
}
