/**
 * orchestrationReplay — replay-safe reconstruction of orchestration sequences
 * from the append-only orchestration_events log.
 *
 * Used for:
 *   - Auditing decisions made during a session
 *   - Replaying missed events after reconnect
 *   - Deterministic sequence reconstruction
 *   - Training temporal pattern models
 */

import { pool }   from "@workspace/db";
import { logger } from "../../lib/logger";
import { type OperationalContext } from "../../cognition/context/contextEngine";

export interface ReplaySequence {
  venueId:       string;
  fromTs:        number;
  toTs:          number;
  events:        ReplayEvent[];
  decisionsReplayed:number;
  actionsReplayed:  number;
  summary:       ReplaySummary;
}

export interface ReplayEvent {
  id:         string;
  ts:         number;
  eventType:  string;
  craftType:  string | null;
  payload:    Record<string, unknown>;
  score:      number | null;
  context:    Partial<OperationalContext> | null;
  replayKey:  string;
}

export interface ReplaySummary {
  topEventTypes:  { eventType: string; count: number }[];
  avgScore:       number;
  peakScore:      number;
  craftMix:       Record<string, number>;
  anomalyEvents:  number;
}

export async function replayOrchestrationSequence(
  venueId:  string,
  fromTs:   Date,
  toTs:     Date,
  limit =   500,
): Promise<ReplaySequence> {
  try {
    const { rows } = await pool.query(
      `SELECT id, event_type, craft_type, payload, score, created_at
       FROM orchestration_events
       WHERE venue_id = $1
         AND created_at BETWEEN $2 AND $3
       ORDER BY created_at ASC
       LIMIT $4`,
      [venueId, fromTs.toISOString(), toTs.toISOString(), limit],
    );

    const events: ReplayEvent[] = rows.map((r: Record<string, unknown>) => ({
      id:        String(r.id),
      ts:        new Date(r.created_at as string).getTime(),
      eventType: String(r.event_type),
      craftType: r.craft_type ? String(r.craft_type) : null,
      payload:   (r.payload ?? {}) as Record<string, unknown>,
      score:     r.score != null ? Number(r.score) : null,
      context:   (r.payload as Record<string, unknown>)?.context as Partial<OperationalContext> | null,
      replayKey: `${venueId}:${r.id}`,
    }));

    // Build summary
    const typeCounts = new Map<string, number>();
    const craftCounts = new Map<string, number>();
    let totalScore = 0, scoreCount = 0, peakScore = 0;
    let anomalies = 0;

    for (const ev of events) {
      typeCounts.set(ev.eventType, (typeCounts.get(ev.eventType) ?? 0) + 1);
      if (ev.craftType) craftCounts.set(ev.craftType, (craftCounts.get(ev.craftType) ?? 0) + 1);
      if (ev.score != null) {
        totalScore += ev.score;
        scoreCount++;
        if (ev.score > peakScore) peakScore = ev.score;
      }
      if (ev.eventType === "anomaly_detected") anomalies++;
    }

    const topEventTypes = [...typeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([eventType, count]) => ({ eventType, count }));

    const craftMix = Object.fromEntries(craftCounts);
    const decisionsReplayed = events.filter(e => e.eventType.startsWith("decision_")).length;
    const actionsReplayed   = events.filter(e => e.eventType.startsWith("action_")).length;

    logger.info(
      { venueId, eventCount: events.length, decisionsReplayed, actionsReplayed },
      "orchestrationReplay: sequence replayed",
    );

    return {
      venueId, fromTs: fromTs.getTime(), toTs: toTs.getTime(),
      events, decisionsReplayed, actionsReplayed,
      summary: {
        topEventTypes,
        avgScore:      scoreCount > 0 ? totalScore / scoreCount : 0,
        peakScore,
        craftMix,
        anomalyEvents: anomalies,
      },
    };
  } catch (err) {
    logger.error({ err, venueId }, "orchestrationReplay: failed");
    return {
      venueId, fromTs: fromTs.getTime(), toTs: toTs.getTime(),
      events: [], decisionsReplayed: 0, actionsReplayed: 0,
      summary: { topEventTypes:[], avgScore:0, peakScore:0, craftMix:{}, anomalyEvents:0 },
    };
  }
}

export async function getReplayCheckpoints(
  venueId: string,
  limit  = 20,
): Promise<{ ts: number; eventType: string; replayKey: string }[]> {
  try {
    const { rows } = await pool.query(
      `SELECT id, event_type, created_at
       FROM orchestration_events
       WHERE venue_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [venueId, limit],
    );
    return rows.map((r: Record<string, unknown>) => ({
      ts:        new Date(r.created_at as string).getTime(),
      eventType: String(r.event_type),
      replayKey: `${venueId}:${r.id}`,
    }));
  } catch (err) {
    logger.warn({ err, venueId }, "orchestrationReplay: getCheckpoints failed");
    return [];
  }
}
