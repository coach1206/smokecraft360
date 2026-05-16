/**
 * loungeHeatmap — real-time zone activity heatmap computation.
 *
 * Produces a grid of normalized activity scores per venue zone based on:
 *   - Staff zone assignments (staff_context_profiles)
 *   - Social clusters (social_engagement_state)
 *   - Swipe order activity (geographic proxy via session_id)
 *   - Ambient environmental state
 *
 * Output is emitted on the telemetry channel and consumed by the
 * Command Center's heatmap visualization.
 */

import { pool }    from "@workspace/db";
import { logger }  from "../../lib/logger";
import { publish } from "../transport/eventBus";

export interface HeatmapCell {
  zone:        string;
  activityScore:number;   // 0–1
  guestCount:  number;
  staffCount:  number;
  socialEnergy:number;
  orderRate:   number;
  trend:       "hot" | "warm" | "cool" | "cold";
}

export interface LoungeHeatmap {
  venueId:    string;
  ts:         number;
  cells:      HeatmapCell[];
  hotZone:    string | null;
  coldZone:   string | null;
  avgActivity:number;
}

const DEFAULT_ZONES = ["bar", "lounge", "terrace", "vip", "entrance"] as const;

function trendFromScore(score: number): HeatmapCell["trend"] {
  if (score >= 0.7) return "hot";
  if (score >= 0.4) return "warm";
  if (score >= 0.2) return "cool";
  return "cold";
}

export async function computeHeatmap(venueId: string): Promise<LoungeHeatmap> {
  try {
    const [staffRows, socialRows, orderRows] = await Promise.all([
      pool.query(
        `SELECT zone, COUNT(*) AS cnt, AVG(energy_level) AS avg_energy
         FROM staff_context_profiles
         WHERE venue_id=$1 AND is_on_floor=TRUE AND zone IS NOT NULL
         GROUP BY zone`,
        [venueId],
      ).catch(() => ({ rows: [] })),

      pool.query(
        `SELECT COALESCE(metadata->>'zone','lounge') AS zone,
                AVG(social_energy) AS avg_energy, SUM(group_size) AS guests
         FROM social_engagement_state
         WHERE venue_id=$1 AND updated_at > NOW() - INTERVAL '15 minutes'
         GROUP BY metadata->>'zone'`,
        [venueId],
      ).catch(() => ({ rows: [] })),

      pool.query(
        `SELECT COUNT(*) AS cnt
         FROM swipe_orders
         WHERE venue_id=$1 AND created_at > NOW() - INTERVAL '30 minutes'`,
        [venueId],
      ).catch(() => ({ rows: [{ cnt: 0 }] })),
    ]);

    const staffByZone  = new Map<string, { cnt: number; energy: number }>();
    for (const r of staffRows.rows as Record<string, unknown>[]) {
      staffByZone.set(String(r.zone), { cnt: Number(r.cnt), energy: Number(r.avg_energy) });
    }
    const socialByZone = new Map<string, { energy: number; guests: number }>();
    for (const r of socialRows.rows as Record<string, unknown>[]) {
      socialByZone.set(String(r.zone), { energy: Number(r.avg_energy), guests: Number(r.guests) });
    }

    const totalOrders = Number((orderRows.rows[0] as Record<string, unknown>)?.cnt ?? 0);

    const cells: HeatmapCell[] = DEFAULT_ZONES.map(zone => {
      const staff  = staffByZone.get(zone)  ?? { cnt:0, energy:0 };
      const social = socialByZone.get(zone) ?? { energy:0, guests:0 };
      const orderRate = zone === "bar" ? Math.min(1, totalOrders / 20) : 0;

      const activityScore = Math.min(1,
        staff.energy * 0.25 +
        social.energy * 0.4 +
        Math.min(social.guests / 10, 1) * 0.2 +
        Math.min(staff.cnt / 3, 1) * 0.1 +
        orderRate * 0.05,
      );

      return {
        zone, activityScore: Math.round(activityScore * 1000) / 1000,
        guestCount:  social.guests,
        staffCount:  staff.cnt,
        socialEnergy:Math.round(social.energy * 1000) / 1000,
        orderRate:   Math.round(orderRate * 1000) / 1000,
        trend:       trendFromScore(activityScore),
      };
    });

    const sorted     = [...cells].sort((a, b) => b.activityScore - a.activityScore);
    const hotZone    = sorted[0]?.activityScore  > 0.4  ? sorted[0].zone  : null;
    const coldZone   = sorted[sorted.length-1]?.activityScore < 0.2 ? sorted[sorted.length-1]!.zone : null;
    const avgActivity = cells.reduce((s, c) => s + c.activityScore, 0) / cells.length;

    const heatmap: LoungeHeatmap = {
      venueId, ts: Date.now(), cells, hotZone, coldZone,
      avgActivity: Math.round(avgActivity * 1000) / 1000,
    };

    await publish("telemetry", { event:"HEATMAP_UPDATE", venueId, hotZone, avgActivity });

    return heatmap;
  } catch (err) {
    logger.warn({ err, venueId }, "loungeHeatmap: compute failed");
    return {
      venueId, ts: Date.now(), cells: [], hotZone: null, coldZone: null, avgActivity: 0,
    };
  }
}
