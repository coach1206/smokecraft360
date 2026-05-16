/**
 * contextBuilder — pulls raw signals from all source systems and assembles
 * a structured ContextSignals object consumed by contextAggregator.
 *
 * Sources:
 *   venue_context_state, environmental_states, orchestration_events,
 *   behavioral_momentum, swipe_orders, staff_context_profiles,
 *   social_engagement_state, temporal_behavior_patterns
 */

import { pool }   from "@workspace/db";
import { logger } from "../../lib/logger";

export interface ContextSignals {
  venueId:       string;
  capturedAt:    number;

  // Venue vitals
  activeGuests:  number;
  activeSessions:number;
  vipCount:      number;
  staffOnFloor:  number;

  // Engagement
  engagementLevel:    number;
  socialEnergy:       number;
  interactionMomentum:number;
  behavioralMomentum: number;

  // Revenue
  revenueMomentum:    number;
  conversionRate:     number;
  avgOrderValue:      number;

  // Environment
  moodScore:          number;
  atmosphereScore:    number;
  activeSceneId:      string | null;

  // Operational
  operationalLoad:    number;
  inventoryPressure:  number;
  staffResponsiveness:number;

  // Temporal
  hourOfDay:    number;
  dayOfWeek:    number;
  temporalAlignment: number;

  // Intelligence
  anomalyDetected: boolean;
  orchestrationLoad: number;

  // Signal quality
  signalAge:    number; // ms since last meaningful event
  dataQuality:  number; // 0-1
}

export async function buildContextSignals(venueId: string): Promise<ContextSignals> {
  const now = Date.now();
  const h   = new Date().getHours();
  const d   = new Date().getDay();

  try {
    const [venueCtx, envState, momentum, orders, staff, social, temporal] = await Promise.all([
      pool.query(
        `SELECT * FROM venue_context_state WHERE venue_id = $1
         ORDER BY updated_at DESC LIMIT 1`,
        [venueId],
      ).catch(() => ({ rows: [] })),

      pool.query(
        `SELECT * FROM environmental_states
         WHERE venue_id = $1 AND is_active = TRUE
         ORDER BY activated_at DESC LIMIT 1`,
        [venueId],
      ).catch(() => ({ rows: [] })),

      pool.query(
        `SELECT value FROM behavioral_momentum
         WHERE venue_id = $1 AND momentum_type = 'venue'
         LIMIT 1`,
        [venueId],
      ).catch(() => ({ rows: [] })),

      pool.query(
        `SELECT COUNT(*) AS cnt,
                COALESCE(SUM(subtotal_cents),0) AS revenue,
                COUNT(CASE WHEN status = 'confirmed' THEN 1 END) AS confirmed
         FROM swipe_orders
         WHERE venue_id = $1 AND created_at > NOW() - INTERVAL '30 minutes'`,
        [venueId],
      ).catch(() => ({ rows: [{ cnt: 0, revenue: 0, confirmed: 0 }] })),

      pool.query(
        `SELECT COUNT(*) AS cnt, AVG(energy_level) AS avg_energy
         FROM staff_context_profiles
         WHERE venue_id = $1 AND is_on_floor = TRUE`,
        [venueId],
      ).catch(() => ({ rows: [{ cnt: 0, avg_energy: 0.5 }] })),

      pool.query(
        `SELECT COALESCE(AVG(social_energy),0) AS avg_energy,
                COALESCE(SUM(group_size),0) AS total_guests
         FROM social_engagement_state
         WHERE venue_id = $1 AND updated_at > NOW() - INTERVAL '15 minutes'`,
        [venueId],
      ).catch(() => ({ rows: [{ avg_energy: 0, total_guests: 0 }] })),

      pool.query(
        `SELECT avg_engagement, confidence
         FROM temporal_behavior_patterns
         WHERE venue_id = $1
           AND hour_of_day = $2
           AND day_of_week = $3
           AND pattern_type = 'hourly'
         LIMIT 1`,
        [venueId, h, d],
      ).catch(() => ({ rows: [] })),
    ]);

    const vc  = venueCtx.rows[0] as Record<string, unknown> | undefined;
    const env = envState.rows[0]  as Record<string, unknown> | undefined;
    const mom = momentum.rows[0]  as Record<string, unknown> | undefined;
    const ord = orders.rows[0]    as Record<string, number>  | undefined;
    const st  = staff.rows[0]     as Record<string, unknown> | undefined;
    const soc = social.rows[0]    as Record<string, unknown> | undefined;
    const tmp = temporal.rows[0]  as Record<string, unknown> | undefined;

    const totalOrders   = Number(ord?.cnt      ?? 0);
    const totalRevenue  = Number(ord?.revenue  ?? 0);
    const confirmedOrd  = Number(ord?.confirmed ?? 0);
    const convRate      = totalOrders > 0 ? confirmedOrd / totalOrders : 0;
    const avgOrderVal   = confirmedOrd > 0 ? totalRevenue / confirmedOrd / 100 : 0;

    const temporalAlign = tmp ? Number(tmp.avg_engagement) * Number(tmp.confidence) : 0.3;

    const lastEventAge = vc?.updated_at
      ? now - new Date(vc.updated_at as string).getTime()
      : 300_000;

    const dataQuality = Math.max(0.1,
      1 - Math.min(1, lastEventAge / 600_000) * 0.5 +
      (tmp ? Number((tmp.confidence as number) ?? 0) * 0.3 : 0),
    );

    return {
      venueId,
      capturedAt:    now,
      activeGuests:  Number(soc?.total_guests ?? vc?.active_guests  ?? 0),
      activeSessions:Number(vc?.active_sessions ?? 0),
      vipCount:      Number(vc?.vip_count ?? 0),
      staffOnFloor:  Number(st?.cnt ?? 0),
      engagementLevel:     Number(vc?.engagement_level   ?? 0.3),
      socialEnergy:        Number(soc?.avg_energy        ?? vc?.social_energy ?? 0),
      interactionMomentum: Number(vc?.interaction_momentum ?? 0),
      behavioralMomentum:  Number(mom?.value ?? 0),
      revenueMomentum:     Math.min(1, totalRevenue / 100 / 1000),
      conversionRate:      convRate,
      avgOrderValue:       avgOrderVal,
      moodScore:           Number(env?.mood_score   ?? vc?.mood_score   ?? 0.5),
      atmosphereScore:     Number(env?.atmosphere_index ?? 0.5),
      activeSceneId:       (env?.scene_id as string | null) ?? null,
      operationalLoad:     Number(vc?.operational_load ?? 0.3),
      inventoryPressure:   Number(vc?.inventory_pressure ?? 0),
      staffResponsiveness: Number(st?.avg_energy ?? 0.5),
      hourOfDay:           h,
      dayOfWeek:           d,
      temporalAlignment:   temporalAlign,
      anomalyDetected:     Boolean(vc?.anomaly_detected ?? false),
      orchestrationLoad:   Number(vc?.orchestration_load ?? 0),
      signalAge:           lastEventAge,
      dataQuality,
    };
  } catch (err) {
    logger.warn({ err, venueId }, "contextBuilder: signal build failed");
    return {
      venueId, capturedAt: now,
      activeGuests: 0, activeSessions: 0, vipCount: 0, staffOnFloor: 0,
      engagementLevel: 0, socialEnergy: 0, interactionMomentum: 0, behavioralMomentum: 0,
      revenueMomentum: 0, conversionRate: 0, avgOrderValue: 0,
      moodScore: 0.5, atmosphereScore: 0.5, activeSceneId: null,
      operationalLoad: 0, inventoryPressure: 0, staffResponsiveness: 0.5,
      hourOfDay: h, dayOfWeek: d, temporalAlignment: 0,
      anomalyDetected: false, orchestrationLoad: 0,
      signalAge: 300_000, dataQuality: 0.1,
    };
  }
}
