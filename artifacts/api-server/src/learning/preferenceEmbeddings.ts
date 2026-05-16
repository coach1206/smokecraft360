/**
 * preferenceEmbeddings — encodes guest preference signals into dense
 * vectors for affinity-based recommendation matching.
 */

import { pool }   from "@workspace/db";
import { logger } from "../lib/logger";

export type EmbeddingVector = number[];

export interface PreferenceSignals {
  guestId:       string;
  flavors:       string[];  // e.g. "sweet","earthy","smoky","floral"
  strengths:     string[];  // "mild","medium","full"
  moods:         string[];  // "relaxed","social","celebratory"
  priceRange:    "budget" | "mid" | "premium" | "ultra";
  repeatOrders:  string[];  // product IDs ordered >2×
  explicitRating: Record<string, number>; // productId → 1–5
}

const FLAVOR_IDX: Record<string, number> = {
  sweet: 0, earthy: 1, smoky: 2, floral: 3, spicy: 4,
  fruity: 5, woody: 6, herbal: 7, citrus: 8, bitter: 9,
};
const STRENGTH_IDX: Record<string, number> = { mild: 0, medium: 0.5, full: 1 };
const MOOD_IDX:     Record<string, number> = { relaxed: 0, social: 0.5, celebratory: 1, intimate: 0.75 };
const PRICE_IDX:    Record<string, number> = { budget: 0.25, mid: 0.5, premium: 0.75, ultra: 1.0 };

export function generatePreferenceEmbedding(sigs: PreferenceSignals): EmbeddingVector {
  // 10 flavor dims
  const flavorDims = Array(10).fill(0);
  for (const f of sigs.flavors) {
    const idx = FLAVOR_IDX[f];
    if (idx !== undefined) flavorDims[idx] = 1;
  }

  // 3 strength dims (soft encoding)
  const strengthVal = sigs.strengths.reduce((s, v) => s + (STRENGTH_IDX[v] ?? 0.5), 0)
                    / Math.max(1, sigs.strengths.length);

  // 1 mood dim
  const moodVal = sigs.moods.reduce((s, v) => s + (MOOD_IDX[v] ?? 0.5), 0)
                / Math.max(1, sigs.moods.length);

  // 1 price dim
  const priceVal = PRICE_IDX[sigs.priceRange] ?? 0.5;

  // Repeat loyalty signals
  const repeatSignal = Math.min(1, sigs.repeatOrders.length / 10);

  // Explicit rating signal
  const ratings = Object.values(sigs.explicitRating);
  const avgRating = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length / 5 : 0.5;

  const base = [...flavorDims, strengthVal, moodVal, priceVal, repeatSignal, avgRating];

  // Pad to 32 dims
  const padded = [...base];
  for (let i = base.length; i < 32; i++) {
    padded.push(base[i % base.length] * 0.5 + (base[(i + 5) % base.length] ?? 0) * 0.5);
  }

  return padded.map(v => Math.round(v * 10000) / 10000);
}

export async function persistPreferenceEmbedding(
  guestId:   string,
  embedding: EmbeddingVector,
): Promise<void> {
  await pool.query(
    `INSERT INTO ai_behavior_memory
       (user_id, memory_type, memory_key, memory_value, confidence_score, decay_factor)
     VALUES ($1, 'preference_embedding', 'pref_v1', $2::jsonb, 0.85, 0.02)
     ON CONFLICT (user_id, memory_type, memory_key) DO UPDATE
       SET memory_value = EXCLUDED.memory_value, updated_at = NOW()`,
    [guestId, JSON.stringify(embedding)],
  ).catch(err => logger.warn({ err }, "preferenceEmbeddings: persist failed"));
}

export async function loadPreferenceEmbedding(guestId: string): Promise<EmbeddingVector | null> {
  const { rows } = await pool.query(
    `SELECT memory_value FROM ai_behavior_memory
     WHERE user_id = $1 AND memory_type = 'preference_embedding' AND memory_key = 'pref_v1'
     ORDER BY updated_at DESC LIMIT 1`,
    [guestId],
  );
  return rows[0] ? (rows[0].memory_value as EmbeddingVector) : null;
}

export function dotProduct(a: EmbeddingVector, b: EmbeddingVector): number {
  return a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);
}
