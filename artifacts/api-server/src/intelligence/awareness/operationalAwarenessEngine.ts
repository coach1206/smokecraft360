/**
 * operationalAwarenessEngine — unified operational intelligence synthesis.
 *
 * Aggregates signals from all sub-engines (staff, social, temporal, context,
 * twin, engagement) into a single operational awareness score (0–1) with
 * risk classification and ranked recommendations. Persists to
 * operational_awareness_scores and publishes to "awareness" channel.
 */

import { pool }                                           from "@workspace/db";
import { logger }                                         from "../../lib/logger";
import { publish }                                        from "../../realtime/transport/eventBus";
import { computeStaffReadiness }                          from "../staff/staffContextEngine";
import { computeSocialMomentum }                          from "../social/socialEngagementEngine";
import { getCurrentTemporalAlignment }                    from "../temporal/temporalPatternEngine";
import { buildOperationalContext }                        from "../../cognition/context/contextEngine";

export interface AwarenessReport {
  venueId:           string;
  overallScore:      number;
  staffReadiness:    number;
  guestSatisfaction: number;
  inventoryHealth:   number;
  socialMomentum:    number;
  temporalAlignment: number;
  environmentalFit:  number;
  riskLevel:         "low" | "moderate" | "high" | "critical";
  activeAlerts:      number;
  recommendations:   string[];
}

function classify(score: number): AwarenessReport["riskLevel"] {
  if (score >= 0.75) return "low";
  if (score >= 0.55) return "moderate";
  if (score >= 0.35) return "high";
  return "critical";
}

function buildRecommendations(report: Omit<AwarenessReport, "recommendations" | "riskLevel">): string[] {
  const recs: string[] = [];
  if (report.staffReadiness    < 0.4) recs.push("Deploy additional floor staff — coverage is thin");
  if (report.inventoryHealth   < 0.3) recs.push("Trigger emergency reorder — critical stock depletion");
  if (report.socialMomentum    > 0.8) recs.push("Peak social moment — push group upsell recommendations");
  if (report.temporalAlignment < 0.3) recs.push("Off-peak period — reduce ambient intensity, focus on retention");
  if (report.temporalAlignment > 0.8) recs.push("Prime-time window — maximise recommendation velocity");
  if (report.environmentalFit  < 0.4) recs.push("Environmental mismatch — switch ambient scene for current crowd");
  if (report.guestSatisfaction < 0.4) recs.push("Low satisfaction signals — trigger proactive staff check-ins");
  if (report.overallScore      > 0.85)recs.push("Excellent operational state — excellent moment for premium upsells");
  return recs;
}

export async function computeAwarenessReport(venueId: string): Promise<AwarenessReport> {
  const [staffReadiness, socialMomentum, temporalAlignment, ctx] = await Promise.all([
    computeStaffReadiness(venueId).catch(() => 0.5),
    computeSocialMomentum(venueId).catch(() => 0),
    getCurrentTemporalAlignment(venueId).catch(() => 0.5),
    buildOperationalContext(venueId).catch(() => null),
  ]);

  const inventoryHealth   = ctx ? 1 - (ctx.inventoryPressure ?? 0) : 0.7;
  const guestSatisfaction = ctx ? (ctx.engagementLevel ?? 0.5) : 0.5;
  const environmentalFit  = ctx ? (ctx.moodScore ?? 0.5) : 0.5;
  const socialScore       = socialMomentum;

  const overallScore = (
    staffReadiness    * 0.20 +
    guestSatisfaction * 0.20 +
    inventoryHealth   * 0.20 +
    socialScore       * 0.15 +
    temporalAlignment * 0.15 +
    environmentalFit  * 0.10
  );

  const base: Omit<AwarenessReport, "recommendations" | "riskLevel"> = {
    venueId,
    overallScore,
    staffReadiness,
    guestSatisfaction,
    inventoryHealth,
    socialMomentum,
    temporalAlignment,
    environmentalFit,
    activeAlerts: overallScore < 0.4 ? 3 : overallScore < 0.6 ? 1 : 0,
  };

  return {
    ...base,
    riskLevel:       classify(overallScore),
    recommendations: buildRecommendations(base),
  };
}

export async function persistAwarenessReport(report: AwarenessReport): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO operational_awareness_scores
         (venue_id, overall_score, staff_readiness, guest_satisfaction,
          inventory_health, social_momentum, temporal_alignment,
          environmental_fit, risk_level, active_alerts,
          recommendations, factors, period, window_start, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'5m',NOW(),NOW())`,
      [
        report.venueId,
        report.overallScore,
        report.staffReadiness,
        report.guestSatisfaction,
        report.inventoryHealth,
        report.socialMomentum,
        report.temporalAlignment,
        report.environmentalFit,
        report.riskLevel,
        report.activeAlerts,
        JSON.stringify(report.recommendations),
        JSON.stringify({
          staffReadiness:    report.staffReadiness,
          guestSatisfaction: report.guestSatisfaction,
          inventoryHealth:   report.inventoryHealth,
          socialMomentum:    report.socialMomentum,
          temporalAlignment: report.temporalAlignment,
          environmentalFit:  report.environmentalFit,
        }),
      ],
    );
  } catch (err) {
    logger.warn({ err, venueId: report.venueId }, "operationalAwarenessEngine: persist failed");
  }
}

export async function runAwarenessCycle(venueId: string): Promise<AwarenessReport> {
  const report = await computeAwarenessReport(venueId);
  await persistAwarenessReport(report);

  await publish("awareness", {
    event:       "AWARENESS_SCORE_UPDATED",
    venueId,
    score:       report.overallScore,
    riskLevel:   report.riskLevel,
    alerts:      report.activeAlerts,
    recs:        report.recommendations,
  });

  if (report.riskLevel === "critical") {
    await publish("orchestration", {
      event:   "CRITICAL_AWARENESS_ALERT",
      venueId,
      score:   report.overallScore,
      factors: {
        staffReadiness:    report.staffReadiness,
        inventoryHealth:   report.inventoryHealth,
        guestSatisfaction: report.guestSatisfaction,
      },
    });
  }

  logger.info({ venueId, score: report.overallScore, risk: report.riskLevel }, "awarenessEngine: cycle complete");
  return report;
}
