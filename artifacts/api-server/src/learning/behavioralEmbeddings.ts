/**
 * behavioralEmbeddings — generates and stores dense vector representations
 * of guest behavior for similarity search and clustering.
 *
 * Uses simple TF-IDF-style hand-crafted features (no GPU required).
 * Embeddings are 32-dimensional float arrays stored as JSONB.
 */

import { logger } from "../lib/logger";
import { pool }   from "@workspace/db";

export type EmbeddingVector = number[]; // fixed 32-dim

export interface BehavioralProfile {
  guestId:        string;
  venueId?:       string;
  visitCount:     number;
  avgSpend:       number;
  preferredCraft: string;
  topCategories:  string[];
  sessionLengths: number[];
  socialScore:    number;
  loyaltyTier:    number;   // 0–4
}

function normalise(x: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (x - min) / (max - min || 1)));
}

export function generateBehavioralEmbedding(profile: BehavioralProfile): EmbeddingVector {
  const craftMap: Record<string, number> = { smoke: 0, pour: 1, brew: 2, vape: 3 };
  const craftIdx = craftMap[profile.preferredCraft] ?? 0;

  const avgSessionLen = profile.sessionLengths.length
    ? profile.sessionLengths.reduce((a, b) => a + b, 0) / profile.sessionLengths.length : 0;

  const base = [
    normalise(profile.visitCount,   0, 100),
    normalise(profile.avgSpend,     0, 500),
    normalise(craftIdx,             0, 3),
    normalise(profile.socialScore,  0, 1),
    normalise(profile.loyaltyTier,  0, 4),
    normalise(avgSessionLen,        0, 180),
    normalise(profile.topCategories.length, 0, 10),
    profile.topCategories.includes("premium")      ? 1 : 0,
    profile.topCategories.includes("aged")         ? 1 : 0,
    profile.topCategories.includes("limited")      ? 1 : 0,
    profile.topCategories.includes("house")        ? 1 : 0,
    profile.topCategories.includes("cocktail")     ? 1 : 0,
    profile.visitCount > 10 ? 1 : 0,   // loyal flag
    profile.avgSpend    > 150 ? 1 : 0, // high-value flag
    profile.socialScore > 0.7 ? 1 : 0, // social flag
  ];

  // Pad / expand to 32 dims with interaction terms
  const padded: EmbeddingVector = [...base];
  for (let i = base.length; i < 32; i++) {
    const j = i % base.length;
    const k = (i + 1) % base.length;
    padded.push(Math.sin(base[j] * Math.PI) * base[k]);
  }

  return padded.map(v => Math.round(v * 10000) / 10000);
}

export function cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot  += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export async function persistEmbedding(guestId: string, embedding: EmbeddingVector): Promise<void> {
  await pool.query(
    `INSERT INTO ai_behavior_memory
       (user_id, memory_type, memory_key, memory_value, confidence_score, decay_factor)
     VALUES ($1, 'behavioral_embedding', 'embedding_v1', $2::jsonb, 0.9, 0.01)
     ON CONFLICT (user_id, memory_type, memory_key) DO UPDATE
       SET memory_value = EXCLUDED.memory_value, updated_at = NOW()`,
    [guestId, JSON.stringify(embedding)],
  ).catch(err => logger.warn({ err }, "behavioralEmbeddings: persist failed"));
}

export async function loadEmbedding(guestId: string): Promise<EmbeddingVector | null> {
  const { rows } = await pool.query(
    `SELECT memory_value FROM ai_behavior_memory
     WHERE user_id = $1 AND memory_type = 'behavioral_embedding' AND memory_key = 'embedding_v1'
     ORDER BY updated_at DESC LIMIT 1`,
    [guestId],
  );
  if (!rows[0]) return null;
  return rows[0].memory_value as EmbeddingVector;
}
