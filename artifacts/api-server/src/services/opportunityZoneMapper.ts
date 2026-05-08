/**
 * OpportunityZoneMapper — Phase 6: Founder Intelligence.
 *
 * Identifies revenue and engagement opportunities from heatmap data.
 * Powers the What-If simulator — each opportunity zone has a simulated
 * revenue impact when the founder adjusts energy, mode, or pricing.
 */

import type { HeatmapSnapshot, HeatZone } from "./emotionalHeatmapEngine";

export interface OpportunityZone {
  zoneId:         string;
  label:          string;
  opportunityType: "revenue" | "engagement" | "conversion" | "recovery";
  currentScore:   number;
  potentialScore: number;
  revenueLiftPct: number;
  action:         string;
  priority:       "critical" | "high" | "medium" | "low";
}

export interface WhatIfSimulation {
  energyDelta:     number;    // -50 to +50
  modeSuggestion:  string;
  projectedLift:   { revenue: number; engagement: number; conversion: number };
  affectedZones:   string[];
  confidence:      number;
  narrative:       string;
}

export class OpportunityZoneMapper {

  static map(snapshot: HeatmapSnapshot): OpportunityZone[] {
    const opportunities: OpportunityZone[] = [];

    for (const zone of snapshot.zones) {
      const opp = OpportunityZoneMapper.analyzeZone(zone);
      if (opp) opportunities.push(opp);
    }

    return opportunities.sort((a, b) => {
      const priority = { critical: 0, high: 1, medium: 2, low: 3 };
      return priority[a.priority] - priority[b.priority];
    });
  }

  static simulate(snapshot: HeatmapSnapshot, energyDelta: number): WhatIfSimulation {
    const sign    = Math.sign(energyDelta);
    const mag     = Math.abs(energyDelta);
    const pct     = mag / 100;

    const revenueLift    = Math.round(pct * 35 * sign);
    const engagementLift = Math.round(pct * 28 * sign);
    const conversionLift = Math.round(pct * 18 * sign);

    const affected = snapshot.zones
      .filter(z => z.trend === "cooling" || z.opportunityScore > 55)
      .map(z => z.zoneId);

    const mode = energyDelta > 20 ? "peak_hour"
      : energyDelta > 5  ? "social"
      : energyDelta < -20 ? "relaxed_luxury"
      : energyDelta < -5  ? "lounge"
      : "default";

    const narrative = energyDelta > 0
      ? `Increasing venue energy by ${mag} points is projected to lift revenue ${revenueLift > 0 ? "+" : ""}${revenueLift}% and engagement ${engagementLift > 0 ? "+" : ""}${engagementLift}%. ${mode === "peak_hour" ? "Peak Hour mode recommended." : "Social mode activated."}`
      : energyDelta < 0
      ? `Reducing venue energy by ${mag} points shifts guests into a higher-dwell, lower-friction state. Projected conversion lift: ${conversionLift > 0 ? "+" : ""}${conversionLift}%. ${mode === "relaxed_luxury" ? "Relaxed Luxury mode recommended for fatigued guests." : "Lounge mode maintains premium atmosphere."}`
      : "Energy delta is neutral. Current venue configuration is at equilibrium.";

    return {
      energyDelta,
      modeSuggestion:  mode,
      projectedLift:   { revenue: revenueLift, engagement: engagementLift, conversion: conversionLift },
      affectedZones:   affected,
      confidence:      Math.round(60 + (mag / 100) * 20),
      narrative,
    };
  }

  private static analyzeZone(zone: HeatZone): OpportunityZone | null {
    if (zone.opportunityScore < 30) return null;

    let type: OpportunityZone["opportunityType"];
    let action:   string;
    let priority: OpportunityZone["priority"];
    const lift = Math.round(zone.opportunityScore * 0.6);

    if (zone.engagementScore > 70 && zone.conversionScore < 40) {
      type     = "conversion";
      action   = `High traffic, low conversion in ${zone.label}. Deploy mentor recommendation or challenge trigger.`;
      priority = "critical";

    } else if (zone.trend === "cooling" && zone.engagementScore > 50) {
      type     = "recovery";
      action   = `${zone.label} engagement cooling. Activate acoustic shift or staff pairing push.`;
      priority = "high";

    } else if (zone.guestCount === 0 && zone.topCraft) {
      type     = "engagement";
      action   = `${zone.label} is empty. Consider a spotlight moment or featured pairing to draw guests.`;
      priority = "medium";

    } else if (zone.conversionScore > 70) {
      type     = "revenue";
      action   = `${zone.label} is converting well. Surface premium tier to increase basket value.`;
      priority = "medium";

    } else {
      type     = "engagement";
      action   = `${zone.label} has untapped potential. Increase atmospheric intensity.`;
      priority = "low";
    }

    return {
      zoneId:          zone.zoneId,
      label:           zone.label,
      opportunityType: type,
      currentScore:    zone.opportunityScore,
      potentialScore:  Math.min(100, zone.opportunityScore + lift),
      revenueLiftPct:  Math.round(lift * 0.4),
      action,
      priority,
    };
  }
}
