/**
 * VenueBehaviorEngine — Phase 1: Venue DNA Profiles.
 *
 * Applies the venue's DNA profile to operational decisions.
 * Uses the personality type + trait vector to:
 *   - Adjust recommendation strategy
 *   - Tune pacing signals
 *   - Guide environmental mode selection
 *   - Surface behavior pattern alerts
 */

import { pool } from "@workspace/db";
import { PersonalityClassifierService } from "./personalityClassifierService";

export interface BehaviorDirective {
  recommendationStrategy: "bold" | "familiar" | "curated" | "exploratory";
  pacingSignal:           "slow" | "moderate" | "fast";
  suggestedMode:          "lounge" | "vip" | "social" | "exploration" | "default";
  engagementPressure:     number;
  upsellConfidence:       number;
  rationale:              string;
}

export class VenueBehaviorEngine {

  static async getDirective(venueId: string): Promise<BehaviorDirective> {
    const { rows } = await pool.query<{
      personality_type: string;
      energy_score:      number;
      luxury_score:      number;
      social_score:      number;
      exploration_score: number;
      conversion_score:  number;
      evolution_stage:   string;
    }>(`
      SELECT personality_type, energy_score, luxury_score, social_score,
             exploration_score, conversion_score, evolution_stage
      FROM venue_dna_profiles WHERE venue_id = $1
    `, [venueId]);

    if (!rows[0]) {
      return VenueBehaviorEngine.defaultDirective();
    }

    const p = rows[0];
    const type = p.personality_type as Parameters<typeof PersonalityClassifierService.describePersonality>[0];
    const desc = PersonalityClassifierService.describePersonality(type);

    const strategy: BehaviorDirective["recommendationStrategy"] =
      p.exploration_score > 70 ? "exploratory"
        : p.luxury_score > 75    ? "curated"
        : p.social_score > 70    ? "bold"
        : "familiar";

    const pacing: BehaviorDirective["pacingSignal"] =
      p.energy_score > 70 ? "fast"
        : p.energy_score < 35 ? "slow"
        : "moderate";

    const mode: BehaviorDirective["suggestedMode"] =
      type === "vip_centric"        ? "vip"
        : type === "high_energy_social" ? "social"
        : type === "sensory_exploration" ? "exploration"
        : type === "sophisticated_lounge" ? "lounge"
        : "default";

    return {
      recommendationStrategy: strategy,
      pacingSignal:           pacing,
      suggestedMode:          mode,
      engagementPressure:     Math.round(p.energy_score * 0.6 + p.social_score * 0.4),
      upsellConfidence:       Math.round(p.conversion_score * 0.7 + p.luxury_score * 0.3),
      rationale:              desc.description,
    };
  }

  static async detectPatterns(venueId: string): Promise<void> {
    const { rows: recent } = await pool.query<{
      event_type: string; avg_dwell: number | null; avg_hesitation: number | null; cnt: string;
    }>(`
      SELECT event_type, AVG(dwell_ms) AS avg_dwell, AVG(hesitation_ms) AS avg_hesitation, COUNT(*) AS cnt
      FROM neural_ingestion_events
      WHERE venue_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
      GROUP BY event_type
    `, [venueId]);

    for (const r of recent) {
      const freq      = parseInt(r.cnt, 10);
      const hesitation = r.avg_hesitation ?? 0;

      if (hesitation > 3000 && freq > 5) {
        await pool.query(`
          INSERT INTO behavior_patterns
            (venue_id, pattern_key, pattern_family, description, confidence, frequency, strength, sample_size, trigger_conditions)
          VALUES ($1,'hesitation_cliff','engagement','Guests show significant hesitation before commitment',0.7,$2,0.8,$3,$4)
          ON CONFLICT DO NOTHING
        `, [venueId, freq / 100, freq, JSON.stringify({ avg_hesitation_ms: hesitation })]);
      }
    }
  }

  static async getPatterns(venueId: string) {
    const { rows } = await pool.query(`
      SELECT * FROM behavior_patterns WHERE venue_id = $1 AND active = true ORDER BY strength DESC
    `, [venueId]);
    return rows;
  }

  private static defaultDirective(): BehaviorDirective {
    return {
      recommendationStrategy: "familiar",
      pacingSignal:           "moderate",
      suggestedMode:          "default",
      engagementPressure:     50,
      upsellConfidence:       50,
      rationale:              "Insufficient DNA data — default behavioral mode active.",
    };
  }
}
