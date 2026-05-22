/**
 * guestAttentionEngine — inactive guest detection + attention priority scoring.
 *
 * Tracks guests who have been inactive, unattended, or showing engagement decline.
 * Generates attention alerts with priority scoring for floor staff.
 * Persists events to guest_attention_events.
 */

import { pool }   from "@workspace/db";
import { logger } from "../lib/logger";

export interface GuestAttentionAlert {
  guestRef:        string;
  issue:           string;
  minutesInactive: number;
  priority:        "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  action:          string;
}

export interface AttentionScore {
  venueId:       string;
  attentionIndex: number;
  criticalCount:  number;
  alerts:         GuestAttentionAlert[];
}

async function detectInactiveGuests(venueId: string): Promise<GuestAttentionAlert[]> {
  const { rows } = await pool.query(
    `SELECT gt.id AS tab_id,
            EXTRACT(EPOCH FROM (now() - COALESCE(
              (SELECT MAX(ae.created_at) FROM analytics_events ae WHERE ae.guest_tab_id=gt.id::text),
              gt.created_at
            )))/60 AS inactive_min,
            gt.created_at
     FROM guest_tabs gt
     WHERE gt.venue_id=$1 AND gt.status='open'
     ORDER BY inactive_min DESC LIMIT 15`,
    [venueId],
  ).catch(() => ({ rows: [] }));

  const alerts: GuestAttentionAlert[] = [];

  for (const row of rows) {
    const mins = parseFloat(String(row.inactive_min ?? 0));
    if (mins < 8) continue;

    const priority: GuestAttentionAlert["priority"] =
      mins > 30 ? "CRITICAL" :
      mins > 18 ? "HIGH"     :
      mins > 10 ? "MEDIUM"   : "LOW";

    const issue =
      mins > 30 ? "Stalled session — guest may need attention or departure assist" :
      mins > 18 ? `High-value guest inactive for ${Math.round(mins)} minutes` :
                  `Guest table quiet for ${Math.round(mins)} minutes`;

    alerts.push({
      guestRef:        `Tab-${String(row.tab_id).slice(-6)}`,
      issue,
      minutesInactive: Math.round(mins),
      priority,
      action: priority === "CRITICAL" ? "IMMEDIATE_VISIT" : priority === "HIGH" ? "PROACTIVE_CHECKIN" : "MONITOR",
    });
  }

  return alerts;
}

async function detectPairingAbandonment(venueId: string): Promise<GuestAttentionAlert[]> {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM analytics_events
     WHERE venue_id=$1 AND event_type='swipe_skip'
       AND created_at > now()-interval'30 minutes'`,
    [venueId],
  ).catch(() => ({ rows: [{ cnt: 0 }] }));

  const skips = parseInt(String(rows[0]?.cnt ?? 0), 10);
  if (skips < 5) return [];

  return [{
    guestRef:        "Swipe Cohort",
    issue:           `${skips} pairing skips in last 30 min — abandonment trend detected`,
    minutesInactive: 0,
    priority:        skips > 15 ? "HIGH" : "MEDIUM",
    action:          "ROTATE_RECOMMENDATIONS",
  }];
}

export async function getGuestAttentionAlerts(venueId: string): Promise<GuestAttentionAlert[]> {
  const [inactive, pairing] = await Promise.all([
    detectInactiveGuests(venueId),
    detectPairingAbandonment(venueId),
  ]);

  const all = [...inactive, ...pairing].sort((a, b) => {
    const rank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return rank[a.priority] - rank[b.priority];
  });

  if (all.length > 0) {
    const values = all.map((_, i) => {
      const b = i * 5;
      return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5})`;
    }).join(",");
    const params = all.flatMap(a => [venueId, a.guestRef, a.issue, a.minutesInactive, a.priority]);

    await pool.query(
      `INSERT INTO guest_attention_events (venue_id,guest_ref,issue,minutes_inactive,priority)
       VALUES ${values}`,
      params,
    ).catch(err => logger.warn({ err, venueId }, "Guest attention persist failed"));
  }

  return all.slice(0, 10);
}

export async function computeAttentionScore(venueId: string): Promise<AttentionScore> {
  const alerts       = await getGuestAttentionAlerts(venueId);
  const criticalCount = alerts.filter(a => a.priority === "CRITICAL").length;
  const attentionIndex = Math.min(1, (criticalCount * 0.3 + alerts.filter(a => a.priority === "HIGH").length * 0.15) / 1);

  return { venueId, attentionIndex, criticalCount, alerts };
}
