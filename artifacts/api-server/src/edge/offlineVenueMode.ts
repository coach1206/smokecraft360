/**
 * offlineVenueMode — complete venue operation mode for when cloud
 * connectivity is fully lost. Activates all local service stubs.
 */

import { logger }          from "../lib/logger";
import { edgeCoordinator } from "./edgeCoordinator";
import { pool }            from "@workspace/db";

export type OfflineCapability =
  | "inference" | "ambient" | "ordering" | "loyalty" | "recommendations" | "telemetry";

interface VenueOfflineState {
  venueId:      string;
  activatedAt:  number;
  capabilities: Set<OfflineCapability>;
  guestCount:   number;
  orderCount:   number;
  telemetryBuf: Array<Record<string, unknown>>;
}

class OfflineVenueModeService {
  private readonly states = new Map<string, VenueOfflineState>();

  async activate(venueId: string): Promise<void> {
    if (this.states.has(venueId)) return;

    const state: VenueOfflineState = {
      venueId,
      activatedAt:  Date.now(),
      capabilities: new Set(["inference", "ambient", "ordering", "recommendations", "telemetry"]),
      guestCount:   0,
      orderCount:   0,
      telemetryBuf: [],
    };

    // Load last known guest count from DB if reachable
    await pool.query(
      `SELECT COUNT(*) AS n FROM guest_sessions WHERE venue_id = $1 AND ended_at IS NULL`,
      [venueId],
    ).then(r => { state.guestCount = Number(r.rows[0]?.n ?? 0); })
     .catch(() => {});

    this.states.set(venueId, state);
    edgeCoordinator.setQueueDepth(venueId, 0);
    logger.info({ venueId, capabilities: [...state.capabilities] }, "offlineVenueMode: activated");
  }

  async deactivate(venueId: string): Promise<void> {
    const state = this.states.get(venueId);
    if (!state) return;

    // Flush telemetry buffer
    if (state.telemetryBuf.length > 0) {
      for (const record of state.telemetryBuf) {
        await pool.query(
          `INSERT INTO operational_snapshots (type, venue_id, data) VALUES ('offline_telemetry', $1, $2::jsonb)`,
          [venueId, JSON.stringify(record)],
        ).catch(() => {});
      }
    }

    this.states.delete(venueId);
    logger.info({ venueId, ordersBuffered: state.orderCount }, "offlineVenueMode: deactivated");
  }

  isActive(venueId: string): boolean {
    return this.states.has(venueId);
  }

  hasCapability(venueId: string, cap: OfflineCapability): boolean {
    return this.states.get(venueId)?.capabilities.has(cap) ?? false;
  }

  bufferTelemetry(venueId: string, record: Record<string, unknown>): void {
    const state = this.states.get(venueId);
    if (!state) return;
    if (state.telemetryBuf.length < 10_000) {
      state.telemetryBuf.push({ ...record, _bufferedAt: Date.now() });
    }
  }

  incrementOrderCount(venueId: string): void {
    const state = this.states.get(venueId);
    if (state) state.orderCount++;
  }

  getState(venueId: string): VenueOfflineState | undefined {
    return this.states.get(venueId);
  }

  getAllActive(): string[] {
    return [...this.states.keys()];
  }
}

export const offlineVenueMode = new OfflineVenueModeService();
