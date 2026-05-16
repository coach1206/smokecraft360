/**
 * venueEmbeddings — 32-dim characteristic vectors for venues.
 * Used to find similar venues, cluster by profile, and transfer-learn.
 */

import { logger } from "../lib/logger";
import { pool }   from "@workspace/db";

export type EmbeddingVector = number[];

export interface VenueCharacteristics {
  venueId:          string;
  avgAtmosphere:    number;
  avgMoodScore:     number;
  avgSocialEnergy:  number;
  topCraftType:     string;
  avgRevenuePerSession: number;
  loyaltyDepth:     number;   // avg loyalty tier of guests
  staffCount:       number;
  peakHour:         number;   // 0–23
  weekendRatio:     number;   // 0–1
  premiumRatio:     number;   // fraction of premium orders
}

const craftIndex: Record<string, number> = { smoke: 0.25, pour: 0.5, brew: 0.75, vape: 1.0 };

function norm(v: number, lo: number, hi: number): number {
  return Math.max(0, Math.min(1, (v - lo) / (hi - lo || 1)));
}

export function generateVenueEmbedding(vc: VenueCharacteristics): EmbeddingVector {
  const base = [
    norm(vc.avgAtmosphere,          0, 1),
    norm(vc.avgMoodScore,           0, 1),
    norm(vc.avgSocialEnergy,        0, 1),
    craftIndex[vc.topCraftType] ?? 0.5,
    norm(vc.avgRevenuePerSession,   0, 1000),
    norm(vc.loyaltyDepth,           0, 4),
    norm(vc.staffCount,             0, 50),
    norm(vc.peakHour,               0, 23),
    norm(vc.weekendRatio,           0, 1),
    norm(vc.premiumRatio,           0, 1),
    vc.avgAtmosphere  > 0.7 ? 1 : 0,
    vc.avgSocialEnergy > 0.6 ? 1 : 0,
    vc.premiumRatio   > 0.4 ? 1 : 0,
    vc.weekendRatio   > 0.5 ? 1 : 0,
    vc.peakHour       > 20  ? 1 : 0,
  ];

  const padded = [...base];
  for (let i = base.length; i < 32; i++) {
    padded.push(Math.cos(base[i % base.length] * Math.PI) * (base[(i + 3) % base.length] ?? 0));
  }
  return padded.map(v => Math.round(v * 10000) / 10000);
}

export async function persistVenueEmbedding(venueId: string, embedding: EmbeddingVector): Promise<void> {
  await pool.query(
    `INSERT INTO operational_snapshots (type, venue_id, data)
     VALUES ('venue_embedding_v1', $1, $2::jsonb)`,
    [venueId, JSON.stringify({ embedding, ts: Date.now() })],
  ).catch(err => logger.warn({ err }, "venueEmbeddings: persist failed"));
}

export async function buildFromDB(venueId: string): Promise<EmbeddingVector | null> {
  const { rows } = await pool.query(
    `SELECT
       COALESCE(AVG(atmosphere_score), 0.5) AS avg_atm,
       COALESCE(AVG(mood_score), 0.5)       AS avg_mood,
       COALESCE(AVG(social_energy), 0.5)    AS avg_social,
       COALESCE(AVG(overall_score / 100.0), 0.5) AS avg_score
     FROM operational_awareness_scores WHERE venue_id = $1`,
    [venueId],
  );
  if (!rows[0]) return null;
  const r = rows[0];
  const vc: VenueCharacteristics = {
    venueId,
    avgAtmosphere:       Number(r.avg_atm),
    avgMoodScore:        Number(r.avg_mood),
    avgSocialEnergy:     Number(r.avg_social),
    topCraftType:        "smoke",
    avgRevenuePerSession: 0,
    loyaltyDepth:        0,
    staffCount:          0,
    peakHour:            20,
    weekendRatio:        0.4,
    premiumRatio:        Number(r.avg_score),
  };
  return generateVenueEmbedding(vc);
}
