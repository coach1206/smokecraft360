/**
 * contextReplay — deterministically reconstructs historical context state
 * from the append-only orchestration_events log.
 *
 * Used for:
 *   - Orchestration replay / audit
 *   - Rollback decision support
 *   - Pattern learning from historical windows
 *   - Drift detection between predicted and actual state
 */

import { pool }   from "@workspace/db";
import { logger } from "../../lib/logger";
import { type ContextSignals } from "./contextBuilder";

export interface ReplayFrame {
  ts:       number;
  signals:  Partial<ContextSignals>;
  eventType:string;
  confidence:number;
}

export interface ReplayWindow {
  venueId:  string;
  fromTs:   number;
  toTs:     number;
  frames:   ReplayFrame[];
  summary:  {
    avgEngagement: number;
    avgSocial:     number;
    peakMoment:    number;
    eventCount:    number;
  };
}

export async function replayContextWindow(
  venueId:  string,
  fromTs:   Date,
  toTs:     Date,
): Promise<ReplayWindow> {
  try {
    const { rows } = await pool.query(
      `SELECT event_type, craft_type, payload, score, created_at
       FROM orchestration_events
       WHERE venue_id = $1
         AND created_at BETWEEN $2 AND $3
       ORDER BY created_at ASC
       LIMIT 500`,
      [venueId, fromTs.toISOString(), toTs.toISOString()],
    );

    let runningEngagement = 0;
    let runningScore      = 0;
    let peakMoment        = 0;

    const frames: ReplayFrame[] = rows.map((row: Record<string, unknown>) => {
      const score    = Number(row.score ?? 0);
      const payload  = (row.payload ?? {}) as Record<string, unknown>;
      const eventType = String(row.event_type ?? "unknown");

      // Reconstruct partial context signal from event payload
      const engagement = Number(payload["engagementLevel"] ?? payload["engagement"] ?? 0);
      const social     = Number(payload["socialEnergy"]    ?? 0);
      runningEngagement = engagement > 0 ? engagement : runningEngagement;
      runningScore      = score > peakMoment ? (peakMoment = score) : runningScore;

      return {
        ts:        new Date(row.created_at as string).getTime(),
        eventType,
        confidence: score > 0 ? Math.min(1, score) : 0.5,
        signals: {
          engagementLevel: engagement || runningEngagement,
          socialEnergy:    social,
          hourOfDay:       new Date(row.created_at as string).getHours(),
          dayOfWeek:       new Date(row.created_at as string).getDay(),
        },
      };
    });

    const avgEngagement = frames.length
      ? frames.reduce((s, f) => s + (f.signals.engagementLevel ?? 0), 0) / frames.length
      : 0;
    const avgSocial = frames.length
      ? frames.reduce((s, f) => s + (f.signals.socialEnergy ?? 0), 0) / frames.length
      : 0;

    return {
      venueId,
      fromTs: fromTs.getTime(),
      toTs:   toTs.getTime(),
      frames,
      summary: {
        avgEngagement,
        avgSocial,
        peakMoment,
        eventCount: frames.length,
      },
    };
  } catch (err) {
    logger.warn({ err, venueId }, "contextReplay: window replay failed");
    return {
      venueId, fromTs: fromTs.getTime(), toTs: toTs.getTime(),
      frames: [], summary: { avgEngagement:0, avgSocial:0, peakMoment:0, eventCount:0 },
    };
  }
}

export async function detectContextDrift(
  venueId:   string,
  predicted: Partial<ContextSignals>,
  actual:    Partial<ContextSignals>,
): Promise<{ drift: number; driftDimensions: Record<string, number> }> {
  const dims: Record<string, number> = {};
  let totalDrift = 0, count = 0;

  const keys: (keyof ContextSignals)[] = [
    "engagementLevel", "socialEnergy", "moodScore", "operationalLoad",
  ];
  for (const key of keys) {
    const p = Number(predicted[key] ?? 0);
    const a = Number(actual[key]   ?? 0);
    const d = Math.abs(p - a);
    dims[key] = d;
    totalDrift += d;
    count++;
  }

  const drift = count > 0 ? totalDrift / count : 0;

  if (drift > 0.25) {
    logger.warn({ venueId, drift, driftDimensions: dims }, "contextReplay: significant context drift");
  }

  return { drift, driftDimensions: dims };
}
