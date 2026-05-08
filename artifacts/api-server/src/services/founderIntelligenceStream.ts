/**
 * FounderIntelligenceStream — High-Speed WebSocket Heatmap Feed.
 *
 * Pushes delta-compressed heatmap updates to Founder Intelligence subscribers
 * via Socket.io room: founder:{venueId}
 *
 * Update cadence: 5 seconds (configurable via FOUNDER_STREAM_INTERVAL_MS).
 * Delta compression: only sends zones whose scores changed ≥2 points.
 * Full snapshot on join: new subscribers receive complete heatmap immediately.
 *
 * Integrates: NeuralEventBus subscriptions so environmental mode changes
 * and intent predictions are reflected in the stream within one tick.
 */

import { getIO }                    from "../lib/socketServer";
import { logger }                   from "../lib/logger";
import { EmotionalHeatmapEngine }   from "./emotionalHeatmapEngine";
import { EnvironmentalModeEngine }  from "./environmentalModeEngine";
import { VenueStateEngine }         from "./venueStateEngine";
import { NeuralEventBus }           from "./neuralEventBus";
import type { HeatmapSnapshot }      from "./emotionalHeatmapEngine";

const INTERVAL_MS = parseInt(process.env["FOUNDER_STREAM_INTERVAL_MS"] ?? "5000", 10);

const lastSnapshots = new Map<string, HeatmapSnapshot>();
const activeVenues  = new Set<string>();

export class FounderIntelligenceStream {

  static init(): void {
    const io = getIO();

    io.on("connection", sock => {
      sock.on("founder:subscribe", (venueId: string) => {
        sock.join(`founder:${venueId}`);
        activeVenues.add(venueId);
        logger.info({ venueId, sockId: sock.id }, "founder stream subscribed");
        FounderIntelligenceStream.pushFull(venueId);
      });

      sock.on("founder:unsubscribe", (venueId: string) => {
        sock.leave(`founder:${venueId}`);
      });
    });

    // Subscribe to bus events that should trigger an immediate delta push
    NeuralEventBus.subscribe("venue.mode_changed", async event => {
      if (event.venueId && activeVenues.has(event.venueId)) {
        await FounderIntelligenceStream.pushDelta(event.venueId);
      }
    });

    NeuralEventBus.subscribe("intent.prediction", async event => {
      if (event.venueId && activeVenues.has(event.venueId)) {
        await FounderIntelligenceStream.pushDelta(event.venueId);
      }
    });

    // Scheduled full refresh cycle
    setInterval(async () => {
      for (const venueId of activeVenues) {
        await FounderIntelligenceStream.pushDelta(venueId).catch(() => {});
      }
    }, INTERVAL_MS);

    logger.info({ intervalMs: INTERVAL_MS }, "FounderIntelligenceStream active");
  }

  private static async pushFull(venueId: string): Promise<void> {
    const io      = getIO();
    const heatmap = await EmotionalHeatmapEngine.generate(venueId);
    const mode    = EnvironmentalModeEngine.getVenueMode(venueId);
    const intent  = VenueStateEngine.get(venueId, "intent");
    const mood    = VenueStateEngine.get(venueId, "mood");

    lastSnapshots.set(venueId, heatmap);

    io.to(`founder:${venueId}`).emit("founder:snapshot", {
      type:    "full",
      venueId,
      heatmap,
      mode,
      intent,
      mood,
      ts:      new Date().toISOString(),
    });
  }

  private static async pushDelta(venueId: string): Promise<void> {
    const io      = getIO();
    const current = await EmotionalHeatmapEngine.generate(venueId);
    const last    = lastSnapshots.get(venueId);
    const mode    = EnvironmentalModeEngine.getVenueMode(venueId);
    const intent  = VenueStateEngine.get(venueId, "intent");
    const mood    = VenueStateEngine.get(venueId, "mood");

    const changedZones = last
      ? current.zones.filter(z => {
          const prev = last.zones.find(p => p.zoneId === z.zoneId);
          return !prev || Math.abs(z.engagementScore - prev.engagementScore) >= 2
            || Math.abs(z.emotionalTemp - prev.emotionalTemp) >= 2;
        })
      : current.zones;

    lastSnapshots.set(venueId, current);

    if (changedZones.length === 0 && !intent && !mood) return;

    io.to(`founder:${venueId}`).emit("founder:snapshot", {
      type:         "delta",
      venueId,
      changedZones,
      globalTemp:   current.globalTemp,
      peakZone:     current.peakZone,
      mode,
      intent,
      mood,
      ts:           new Date().toISOString(),
    });
  }
}
