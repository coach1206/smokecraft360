/**
 * VenueDNAService — Phase 1: Venue DNA Profiles.
 *
 * Builds and evolves the operational personality of each venue.
 * Runs after ChaosAnalyticsService has established the baseline.
 * Aggregates trait scores, detects patterns, and updates the DNA profile.
 *
 * Evolution stages:
 *   seed (0-50 signals) → emerging (51-200) → established (201-1000) → evolved (1001+)
 */

import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import { getIO } from "../lib/socketServer";
import { PersonalityClassifierService } from "./personalityClassifierService";

export interface DnaSignal {
  venueId:     string;
  signalType:  "swipe" | "challenge" | "handoff" | "reward" | "session" | "purchase" | "hesitation";
  craftType?:  string;
  value:       number;
  metadata?:   Record<string, unknown>;
}

const TRAIT_WEIGHTS: Record<string, Record<string, number>> = {
  swipe:     { exploration: 0.3, social: 0.1 },
  challenge: { exploration: 0.4, luxury: 0.2 },
  handoff:   { luxury: 0.3, energy: 0.1 },
  reward:    { conversion: 0.4, luxury: 0.1 },
  session:   { energy: 0.2, social: 0.2 },
  purchase:  { conversion: 0.5, luxury: 0.3 },
  hesitation:{ exploration: -0.1, energy: -0.1 },
};

export class VenueDNAService {

  static async absorbSignal(signal: DnaSignal): Promise<void> {
    const weights = TRAIT_WEIGHTS[signal.signalType] ?? {};

    for (const [trait, weight] of Object.entries(weights)) {
      const delta = weight * signal.value;
      await pool.query(`
        INSERT INTO personality_traits
          (venue_id, trait_name, trait_category, score, confidence, sample_size, measured_at)
        VALUES ($1, $2, 'behavioral', 50 + $3, 0.1, 1, NOW())
        ON CONFLICT DO NOTHING
      `, [signal.venueId, trait, Math.min(50, Math.max(-50, delta * 50))]);

      await pool.query(`
        UPDATE personality_traits
        SET
          score       = LEAST(100, GREATEST(0, score + $1)),
          confidence  = LEAST(1.0, confidence + 0.01),
          sample_size = sample_size + 1,
          measured_at = NOW()
        WHERE venue_id = $2 AND trait_name = $3
      `, [delta * 10, signal.venueId, trait]);
    }

    await VenueDNAService.refreshProfile(signal.venueId);
  }

  static async refreshProfile(venueId: string): Promise<void> {
    const { rows: traits } = await pool.query<{
      trait_name: string; score: number; sample_size: number;
    }>(`
      SELECT trait_name, score, sample_size
      FROM personality_traits
      WHERE venue_id = $1
    `, [venueId]);

    const scoreMap: Record<string, number> = {};
    for (const t of traits) scoreMap[t.trait_name] = t.score;

    const energyScore      = scoreMap["energy"]      ?? 50;
    const luxuryScore      = scoreMap["luxury"]      ?? 50;
    const socialScore      = scoreMap["social"]      ?? 50;
    const explorationScore = scoreMap["exploration"] ?? 50;
    const conversionScore  = scoreMap["conversion"]  ?? 50;

    const traitVector = [energyScore, luxuryScore, socialScore, explorationScore, conversionScore];
    const totalSamples = traits.reduce((s, t) => s + t.sample_size, 0);

    const personalityType = PersonalityClassifierService.classify(traitVector);
    const evolutionStage  = totalSamples < 50 ? "seed"
      : totalSamples < 200  ? "emerging"
      : totalSamples < 1000 ? "established"
      : "evolved";

    const dnaSignature = PersonalityClassifierService.generateSignature(traitVector);

    await pool.query(`
      INSERT INTO venue_dna_profiles
        (venue_id, personality_type, energy_score, luxury_score, social_score,
         exploration_score, conversion_score, trait_vector, dna_signature,
         evolution_stage, last_signal_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
      ON CONFLICT (venue_id) DO UPDATE SET
        personality_type  = EXCLUDED.personality_type,
        energy_score      = EXCLUDED.energy_score,
        luxury_score      = EXCLUDED.luxury_score,
        social_score      = EXCLUDED.social_score,
        exploration_score = EXCLUDED.exploration_score,
        conversion_score  = EXCLUDED.conversion_score,
        trait_vector      = EXCLUDED.trait_vector,
        dna_signature     = EXCLUDED.dna_signature,
        evolution_stage   = EXCLUDED.evolution_stage,
        last_signal_at    = NOW(),
        updated_at        = NOW()
    `, [
      venueId, personalityType, energyScore, luxuryScore, socialScore,
      explorationScore, conversionScore,
      JSON.stringify(traitVector), dnaSignature, evolutionStage,
    ]);

    getIO().to(`venue:${venueId}`).emit("neural:dna_evolved", {
      venueId, personalityType, evolutionStage, traitVector,
      ts: new Date().toISOString(),
    });

    logger.info({ venueId, personalityType, evolutionStage }, "venue DNA refreshed");
  }

  static async getProfile(venueId: string) {
    const { rows } = await pool.query(`
      SELECT * FROM venue_dna_profiles WHERE venue_id = $1
    `, [venueId]);
    return rows[0] ?? null;
  }

  static async getTraits(venueId: string) {
    const { rows } = await pool.query(`
      SELECT * FROM personality_traits WHERE venue_id = $1 ORDER BY trait_name
    `, [venueId]);
    return rows;
  }
}
