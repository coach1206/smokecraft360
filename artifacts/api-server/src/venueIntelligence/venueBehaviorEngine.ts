/**
 * venueBehaviorEngine — venue behavioral pattern modeling.
 *
 * Detects behavioral shifts: spending surges, group formation, pairing clustering.
 * Persists to venue_behavior_patterns.
 */

import { pool }   from "@workspace/db";
import { logger } from "../lib/logger";

export interface VenueBehaviorPattern {
  patternType:  "SURGE" | "CLUSTER" | "DECLINE" | "STABLE";
  confidence:   number;
  description:  string;
  triggeredAt:  string;
}

export async function detectVenueBehaviorPatterns(venueId: string): Promise<VenueBehaviorPattern[]> {
  const [recentRev, priorRev, groupRow] = await Promise.all([
    pool.query(
      `SELECT COALESCE(SUM(total_amount),0) AS rev
       FROM orders WHERE venue_id=$1 AND created_at > now()-interval'10 minutes'`,
      [venueId],
    ).catch(() => ({ rows: [{ rev: 0 }] })),
    pool.query(
      `SELECT COALESCE(SUM(total_amount),0) AS rev
       FROM orders WHERE venue_id=$1
         AND created_at BETWEEN now()-interval'20 minutes' AND now()-interval'10 minutes'`,
      [venueId],
    ).catch(() => ({ rows: [{ rev: 0 }] })),
    pool.query(
      `SELECT COALESCE(COUNT(*),0) AS cnt
       FROM multi_user_sessions WHERE venue_id=$1 AND created_at > now()-interval'30 minutes'`,
      [venueId],
    ).catch(() => ({ rows: [{ cnt: 0 }] })),
  ]);

  const recent  = parseFloat(String(recentRev.rows[0]?.rev ?? 0));
  const prior   = parseFloat(String(priorRev.rows[0]?.rev  ?? 0));
  const groups  = parseInt(String(groupRow.rows[0]?.cnt    ?? 0), 10);
  const patterns: VenueBehaviorPattern[] = [];
  const now = new Date().toISOString();

  if (prior > 0 && recent / prior > 1.3)
    patterns.push({ patternType:"SURGE",   confidence:0.85, description:"Spending surge detected — 30%+ revenue acceleration", triggeredAt: now });
  if (groups > 3)
    patterns.push({ patternType:"CLUSTER", confidence:0.75, description:"Group cluster forming — social pairing opportunity", triggeredAt: now });
  if (prior > 0 && recent / prior < 0.7)
    patterns.push({ patternType:"DECLINE", confidence:0.80, description:"Revenue deceleration — engagement intervention needed", triggeredAt: now });
  if (patterns.length === 0)
    patterns.push({ patternType:"STABLE",  confidence:0.90, description:"Venue behavior stable — standard operation", triggeredAt: now });

  const values = patterns.map((_, i) => {
    const b = i * 4;
    return `($${b+1},$${b+2},$${b+3},$${b+4})`;
  }).join(",");
  await pool.query(
    `INSERT INTO venue_behavior_patterns (venue_id, pattern_type, confidence, description)
     VALUES ${values}`,
    patterns.flatMap(p => [venueId, p.patternType, p.confidence, p.description]),
  ).catch(err => logger.warn({ err, venueId }, "Venue behavior pattern persist failed"));

  return patterns;
}
