/**
 * staffContextEngine — real-time staff performance and context tracking.
 *
 * Maintains per-staff profiles during active shifts: interaction rate,
 * upsell effectiveness, zone coverage, and energy level. Publishes
 * to the "staff" channel for live dashboard consumption.
 */

import { pool }     from "@workspace/db";
import { logger }   from "../../lib/logger";
import { publish }  from "../../realtime/transport/eventBus";

export interface StaffContext {
  venueId:          string;
  staffId:          string;
  role:             string;
  zone:             string | null;
  isOnFloor:        boolean;
  activeGuests:     number;
  interactionRate:  number;
  upsellRate:       number;
  satisfactionScore:number;
  recommendations:  number;
  conversions:      number;
  energyLevel:      number;
}

export async function getStaffContext(venueId: string): Promise<StaffContext[]> {
  try {
    const { rows } = await pool.query<StaffContext>(
      `SELECT
         venue_id         AS "venueId",
         staff_id         AS "staffId",
         role,
         zone,
         is_on_floor      AS "isOnFloor",
         active_guests    AS "activeGuests",
         interaction_rate AS "interactionRate",
         upsell_rate      AS "upsellRate",
         satisfaction_score AS "satisfactionScore",
         recommendations,
         conversions,
         energy_level     AS "energyLevel"
       FROM staff_context_profiles
       WHERE venue_id = $1
         AND is_on_floor = TRUE
         AND updated_at > NOW() - INTERVAL '4 hours'`,
      [venueId],
    );
    return rows;
  } catch { return []; }
}

export async function upsertStaffContext(ctx: StaffContext): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO staff_context_profiles
         (venue_id, staff_id, role, zone, is_on_floor, active_guests,
          interaction_rate, upsell_rate, satisfaction_score,
          recommendations, conversions, energy_level, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
       ON CONFLICT (venue_id, staff_id)
       DO UPDATE SET
         role              = EXCLUDED.role,
         zone              = EXCLUDED.zone,
         is_on_floor       = EXCLUDED.is_on_floor,
         active_guests     = EXCLUDED.active_guests,
         interaction_rate  = EXCLUDED.interaction_rate,
         upsell_rate       = EXCLUDED.upsell_rate,
         satisfaction_score= EXCLUDED.satisfaction_score,
         recommendations   = EXCLUDED.recommendations,
         conversions       = EXCLUDED.conversions,
         energy_level      = EXCLUDED.energy_level,
         updated_at        = NOW()`,
      [
        ctx.venueId, ctx.staffId, ctx.role, ctx.zone, ctx.isOnFloor,
        ctx.activeGuests, ctx.interactionRate, ctx.upsellRate,
        ctx.satisfactionScore, ctx.recommendations, ctx.conversions, ctx.energyLevel,
      ],
    );

    await publish("staff", {
      event:   "STAFF_CONTEXT_UPDATED",
      venueId: ctx.venueId,
      staffId: ctx.staffId,
      metrics: {
        interactionRate:  ctx.interactionRate,
        upsellRate:       ctx.upsellRate,
        satisfactionScore:ctx.satisfactionScore,
        energyLevel:      ctx.energyLevel,
      },
    });
  } catch (err) {
    logger.warn({ err, venueId: ctx.venueId }, "staffContextEngine: upsert failed");
  }
}

export async function computeStaffReadiness(venueId: string): Promise<number> {
  try {
    const staff = await getStaffContext(venueId);
    if (staff.length === 0) return 0.5;
    const avg = staff.reduce((s, st) =>
      s + (st.energyLevel * 0.4 + st.satisfactionScore * 0.35 + Math.min(st.interactionRate / 10, 1) * 0.25)
    , 0) / staff.length;
    return Math.min(Math.max(avg, 0), 1);
  } catch { return 0.5; }
}

export async function synthesizeVenueStaffState(venueId: string): Promise<{
  readiness:    number;
  staffOnFloor: number;
  avgUpsellRate:number;
  zonesCovered: number;
}> {
  const staff = await getStaffContext(venueId);
  if (staff.length === 0) return { readiness: 0.5, staffOnFloor: 0, avgUpsellRate: 0, zonesCovered: 0 };

  const onFloor    = staff.filter(s => s.isOnFloor);
  const avgUpsell  = onFloor.length ? onFloor.reduce((s, st) => s + st.upsellRate, 0) / onFloor.length : 0;
  const zones      = new Set(onFloor.map(s => s.zone).filter(Boolean)).size;
  const readiness  = await computeStaffReadiness(venueId);

  return { readiness, staffOnFloor: onFloor.length, avgUpsellRate: avgUpsell, zonesCovered: zones };
}
