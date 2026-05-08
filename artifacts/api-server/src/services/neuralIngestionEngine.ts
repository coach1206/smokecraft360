/**
 * NeuralIngestionEngine — Phase 0: Neural Substrate.
 *
 * The "shadow mode" data capture pipeline. Every raw behavioral event
 * from kiosks and touchpoints flows through here BEFORE AXIOM processing.
 * This engine classifies events and marks them as processed once consumed
 * by the AI layer, preserving the unmanaged baseline forever.
 */

import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import { getIO } from "../lib/socketServer";

export interface RawIngestionEvent {
  venueId?:      string;
  sessionId?:    string;
  guestId?:      string;
  deviceId?:     string;
  eventType:     string;
  rawPayload?:   Record<string, unknown>;
  dwellMs?:      number;
  hesitationMs?: number;
  interactionX?: number;
  interactionY?: number;
  ingestionPhase?: "shadow" | "axiom" | "hybrid";
}

export class NeuralIngestionEngine {

  static async ingest(event: RawIngestionEvent): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(`
      INSERT INTO neural_ingestion_events
        (venue_id, session_id, guest_id, device_id, event_type,
         raw_payload, dwell_ms, hesitation_ms, interaction_x, interaction_y,
         axiom_processed, ingestion_phase)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',$11)
      RETURNING id
    `, [
      event.venueId     ?? null,
      event.sessionId   ?? null,
      event.guestId     ?? null,
      event.deviceId    ?? null,
      event.eventType,
      JSON.stringify(event.rawPayload ?? {}),
      event.dwellMs     ?? null,
      event.hesitationMs ?? null,
      event.interactionX ?? null,
      event.interactionY ?? null,
      event.ingestionPhase ?? "shadow",
    ]);

    const id = rows[0]!.id;

    getIO().emit("neural:ingestion_pulse", {
      id,
      venueId:   event.venueId,
      eventType: event.eventType,
      phase:     event.ingestionPhase ?? "shadow",
      ts:        new Date().toISOString(),
    });

    return id;
  }

  static async bulkIngest(events: RawIngestionEvent[]): Promise<number> {
    if (events.length === 0) return 0;
    let count = 0;
    for (const ev of events) {
      try {
        await NeuralIngestionEngine.ingest(ev);
        count++;
      } catch (err) {
        logger.warn({ err, ev }, "neural ingestion single event failed");
      }
    }
    return count;
  }

  static async markProcessed(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await pool.query(
      `UPDATE neural_ingestion_events
       SET axiom_processed = 'processed'
       WHERE id = ANY($1::uuid[])`,
      [ids],
    );
  }

  static async getPendingBatch(venueId: string, limit = 100): Promise<{ id: string; eventType: string; rawPayload: Record<string, unknown>; dwellMs: number | null; hesitationMs: number | null }[]> {
    const { rows } = await pool.query<{
      id: string; event_type: string; raw_payload: Record<string, unknown>;
      dwell_ms: number | null; hesitation_ms: number | null;
    }>(`
      SELECT id, event_type, raw_payload, dwell_ms, hesitation_ms
      FROM neural_ingestion_events
      WHERE venue_id = $1 AND axiom_processed = 'pending'
      ORDER BY created_at ASC
      LIMIT $2
    `, [venueId, limit]);

    return rows.map(r => ({
      id:           r.id,
      eventType:    r.event_type,
      rawPayload:   r.raw_payload ?? {},
      dwellMs:      r.dwell_ms,
      hesitationMs: r.hesitation_ms,
    }));
  }

  static async getStats(venueId: string) {
    const { rows } = await pool.query<{
      total: string; pending: string; processed: string; shadow: string; axiom: string;
    }>(`
      SELECT
        COUNT(*)                                        AS total,
        COUNT(*) FILTER (WHERE axiom_processed = 'pending')    AS pending,
        COUNT(*) FILTER (WHERE axiom_processed = 'processed')  AS processed,
        COUNT(*) FILTER (WHERE ingestion_phase = 'shadow')     AS shadow,
        COUNT(*) FILTER (WHERE ingestion_phase = 'axiom')      AS axiom
      FROM neural_ingestion_events
      WHERE venue_id = $1
    `, [venueId]);

    const r = rows[0]!;
    return {
      total:     parseInt(r.total,     10),
      pending:   parseInt(r.pending,   10),
      processed: parseInt(r.processed, 10),
      shadow:    parseInt(r.shadow,    10),
      axiom:     parseInt(r.axiom,     10),
    };
  }
}
