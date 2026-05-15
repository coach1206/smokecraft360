/**
 * neuralBridge.ts — Cross-Engine Neural Bridge
 *
 * The Neural Bridge is the real-time pub-sub spine of NOVEE OS.
 * When a guest interacts (swipe order, enrollment, craft session), this module
 * fans out to all 4 engines in parallel, then broadcasts every result via
 * Socket.io so owner dashboards and the kiosk UI update within milliseconds.
 *
 * ─── Events emitted (server → clients) ───────────────────────────────────────
 *
 * neural:guest_interaction
 *   Fired on every guest action. Payload carries the raw trigger so clients
 *   can animate an incoming pulse without waiting for engine results.
 *   { type, guestId?, venueId?, craftType?, sessionId?, ts }
 *
 * neural:room_energy
 *   Room Energy result from ExecutiveIntelligenceService.
 *   { tableId, sessionId, energyScore, status, recommendation, ts }
 *   Scoped to `venue:<venueId>` room when venueId is known.
 *
 * neural:revenue_pressure
 *   Revenue Pressure snapshot for the venue.
 *   { venueId, criticalCount, highCount, watchCount, topItem?, ts }
 *   Scoped to `venue:<venueId>` room.
 *
 * neural:identity_evolved
 *   Identity Evolution update for a specific guest.
 *   { guestId, explorationConfidence, luxuryThreshold, evolutionDelta, ts }
 *   Broadcast globally (no PII — guestId only).
 *
 * neural:network_pulse
 *   Network-layer aggregate signal — cross-venue trend update.
 *   { activeSessions, guestCount, topCraft, ts }
 *   Broadcast globally.
 *
 * ─── Internal flow ───────────────────────────────────────────────────────────
 *
 *   GuestInteractionEvent
 *       │
 *       ├─▶ ExecutiveIntelligenceService  →  neural:room_energy
 *       ├─▶ IdentityEvolutionEngine       →  neural:identity_evolved
 *       ├─▶ Revenue pressure scan         →  neural:revenue_pressure
 *       └─▶ Network aggregation           →  neural:network_pulse
 *
 * All engine calls are fire-and-forget (never throws). If a specific engine
 * fails its result is simply not emitted — the rest still fire.
 */

import { getIO }                         from "./socketServer";
import { logger }                        from "./logger";
import { db }                            from "@workspace/db";
import { sql }                           from "drizzle-orm";
import {
  calculateRoomEnergy,
  identifyRevenuePressure,
}                                        from "../services/executiveIntelligenceService";

// ── Event types ───────────────────────────────────────────────────────────────

export interface GuestInteractionEvent {
  /** What triggered the bridge */
  type: "swipe_order" | "enrollment" | "craft_session" | "craft_complete" | "pos_order";
  guestId?:    string;   // guest_profiles.id (if known)
  userId?:     string;   // users.id (if authenticated)
  venueId?:    string;
  sessionId?:  string;
  craftType?:  string;
  /** Free-form metadata for engine consumers */
  meta?: Record<string, unknown>;
}

// ── Neural Bridge dispatcher ───────────────────────────────────────────────────

export async function dispatchNeuralBridge(event: GuestInteractionEvent): Promise<void> {
  const io  = getIO();
  const ts  = Date.now();
  const rid = `nb:${ts}:${Math.random().toString(36).slice(2, 7)}`;

  // 1. Immediate pulse — lets dashboards animate before engines respond
  io.emit("neural:guest_interaction", { ...event, ts });

  logger.info({ rid, type: event.type, venueId: event.venueId ?? null }, "Neural Bridge: dispatching");

  // Run all engines in parallel — non-fatal
  const engines: Promise<void>[] = [];

  // ── Engine A: Room Energy (Executive Intelligence) ──────────────────────────
  if (event.venueId) {
    engines.push(
      (async () => {
        try {
          // Pull active session signals from DB for this venue
          const sessionRows = await db.execute<{
            tableId: string; sessionId: string;
            interactions_per_min: number; hover_seconds: number; dwell_seconds: number;
          }>(sql`
            SELECT
              COALESCE(gs.venue_id, ${event.venueId})          AS "tableId",
              gs.id                                             AS "sessionId",
              COALESCE(gs.interactions_per_minute, 2.0)        AS "interactions_per_min",
              COALESCE(gs.high_tier_hover_seconds, 10.0)       AS "hover_seconds",
              EXTRACT(EPOCH FROM (NOW() - gs.created_at))      AS "dwell_seconds"
            FROM guest_sessions gs
            WHERE gs.venue_id = ${event.venueId}
              AND gs.created_at > NOW() - INTERVAL '4 hours'
            LIMIT 20
          `);

          const sessions = (sessionRows.rows ?? []).map(r => ({
            tableId:  String(r.tableId ?? event.venueId),
            sessionId: String(r.sessionId ?? event.sessionId ?? ""),
            interactions: { perMinute: Number(r.interactions_per_min) || 2 },
            engagement:   { highTierHoverTime: Number(r.hover_seconds) || 10 },
            dwell:        { current: Number(r.dwell_seconds) || 60 },
          }));

          // Use the current event as a synthetic session if no rows
          if (sessions.length === 0 && event.sessionId) {
            sessions.push({
              tableId: event.venueId!,
              sessionId: event.sessionId,
              interactions: { perMinute: 3 },
              engagement:   { highTierHoverTime: 15 },
              dwell:        { current: 90 },
            });
          }

          const results = calculateRoomEnergy(sessions);

          for (const r of results) {
            const payload = {
              tableId:        r.tableId,
              sessionId:      r.sessionId ?? event.sessionId,
              energyScore:    r.energyScore,
              status:         r.status,
              recommendation: r.recommendation,
              venueId:        event.venueId,
              triggeredBy:    event.type,
              ts,
            };
            io.to(`venue:${event.venueId}`).emit("neural:room_energy", payload);
            io.emit("neural:room_energy", payload); // also global for super_admin dashboards
          }

          logger.info({ rid, sessions: results.length }, "Neural Bridge: room_energy emitted");
        } catch (err) {
          logger.warn({ rid, err }, "Neural Bridge: room_energy engine failed (non-fatal)");
        }
      })()
    );

    // ── Engine B: Revenue Pressure ─────────────────────────────────────────────
    engines.push(
      (async () => {
        try {
          const inventoryRows = await db.execute<{
            id: string; name: string; category: string;
            quantity: number; trending_score: number;
          }>(sql`
            SELECT
              p.id, p.name, p.category,
              COALESCE(vi.quantity, p.quantity, 0)   AS quantity,
              COALESCE(p.trending_score, 1)          AS trending_score
            FROM products p
            LEFT JOIN venue_inventory vi
              ON vi.product_id = p.id AND vi.venue_id = ${event.venueId}
            WHERE COALESCE(vi.quantity, p.quantity, 0) > 0
            LIMIT 60
          `);

          const items = (inventoryRows.rows ?? []).map(r => ({
            id:         String(r.id),
            name:       String(r.name ?? ""),
            category:   String(r.category ?? ""),
            stockLevel: Number(r.quantity) || 0,
            velocity:   Number(r.trending_score) || 1,
          }));

          const pressure = identifyRevenuePressure(items);
          const critical = pressure.filter(p => p.urgency === "CRITICAL").length;
          const high     = pressure.filter(p => p.urgency === "HIGH").length;
          const watch    = pressure.filter(p => p.urgency === "WATCH").length;

          const payload = {
            venueId:      event.venueId,
            criticalCount: critical,
            highCount:     high,
            watchCount:    watch,
            topItem:       pressure[0] ? { name: pressure[0].name ?? pressure[0].id, urgency: pressure[0].urgency } : null,
            triggeredBy:   event.type,
            ts,
          };
          io.to(`venue:${event.venueId}`).emit("neural:revenue_pressure", payload);
          io.emit("neural:revenue_pressure", payload);

          logger.info({ rid, critical, high, watch }, "Neural Bridge: revenue_pressure emitted");
        } catch (err) {
          logger.warn({ rid, err }, "Neural Bridge: revenue_pressure engine failed (non-fatal)");
        }
      })()
    );
  }

  // ── Engine C: Identity Evolution ────────────────────────────────────────────
  if (event.guestId) {
    engines.push(
      (async () => {
        try {
          const rows = await db.execute<{
            exploration_confidence: number;
            luxury_threshold: number;
            evolution_cycle: number;
          }>(sql`
            SELECT exploration_confidence, luxury_threshold, evolution_cycle
            FROM guest_identity_evolution
            WHERE guest_id = ${event.guestId}
            LIMIT 1
          `);

          const row = rows.rows?.[0];
          if (!row) return;

          const payload = {
            guestId:              event.guestId,
            explorationConfidence: Number(row.exploration_confidence) || 0,
            luxuryThreshold:       Number(row.luxury_threshold) || 0,
            evolutionCycle:        Number(row.evolution_cycle) || 0,
            evolutionDelta:        event.type === "craft_complete" ? 1 : 0,
            triggeredBy:           event.type,
            ts,
          };
          io.emit("neural:identity_evolved", payload);

          logger.info({ rid, guestId: event.guestId }, "Neural Bridge: identity_evolved emitted");
        } catch (err) {
          logger.warn({ rid, err }, "Neural Bridge: identity_evolved engine failed (non-fatal)");
        }
      })()
    );
  }

  // ── Engine D: Network Pulse ─────────────────────────────────────────────────
  engines.push(
    (async () => {
      try {
        const [netRow] = (await db.execute<{
          active_sessions: number; guest_count: number; top_craft: string;
        }>(sql`
          SELECT
            COUNT(DISTINCT gs.id)        AS active_sessions,
            COUNT(DISTINCT gs.guest_id)  AS guest_count,
            MODE() WITHIN GROUP (ORDER BY gs.craft_type) AS top_craft
          FROM guest_sessions gs
          WHERE gs.created_at > NOW() - INTERVAL '2 hours'
        `)).rows;

        const payload = {
          activeSessions: Number(netRow?.active_sessions) || 0,
          guestCount:     Number(netRow?.guest_count) || 0,
          topCraft:       String(netRow?.top_craft ?? event.craftType ?? "smoke"),
          triggeredBy:    event.type,
          ts,
        };
        io.emit("neural:network_pulse", payload);

        logger.info({ rid, activeSessions: payload.activeSessions }, "Neural Bridge: network_pulse emitted");
      } catch (err) {
        logger.warn({ rid, err }, "Neural Bridge: network_pulse engine failed (non-fatal)");
      }
    })()
  );

  // Fire all engines — never await individually, non-blocking
  Promise.allSettled(engines).then(results => {
    const failed = results.filter(r => r.status === "rejected").length;
    if (failed > 0) {
      logger.warn({ rid, failed }, "Neural Bridge: some engines produced no result");
    }
    logger.info({ rid, engines: engines.length }, "Neural Bridge: dispatch complete");
  });
}
