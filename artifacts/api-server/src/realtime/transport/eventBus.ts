/**
 * eventBus — transport-agnostic singleton.
 *
 * Selects the transport at startup via EVENT_BUS_TRANSPORT env var:
 *   postgres (default) — zero extra infra, uses LISTEN/NOTIFY
 *   redis              — high-throughput, requires REDIS_URL + ioredis
 *
 * All new intelligence services publish/subscribe through this singleton.
 * The existing pgPubSub instance is kept for backward-compat with legacy code;
 * eventBus is the canonical interface going forward.
 */

import { logger } from "../../lib/logger";
import type { IEventBus, BusChannel, BusPayload } from "./IEventBus";
import { postgresTransport } from "./postgresTransport";
import { redisTransport }    from "./redisTransport";
import { getIO }             from "../../lib/socketServer";

function buildBus(): IEventBus {
  const t = (process.env["EVENT_BUS_TRANSPORT"] ?? "postgres").toLowerCase();
  switch (t) {
    case "redis":    return redisTransport;
    case "postgres":
    default:         return postgresTransport;
  }
}

export const eventBus: IEventBus = buildBus();

/** Must be called once at startup (after pool is ready). */
export async function initEventBus(): Promise<void> {
  await (eventBus as { init?: () => Promise<void> }).init?.();
  bridgeToSocketIO(eventBus);
  logger.info({ transport: eventBus.transport }, "eventBus: initialised");
}

/**
 * Bridge all channels to Socket.IO venue rooms.
 * Venue-scoped events → ops:<venueId> + venue:<venueId>
 * Global events       → broadcast
 */
function bridgeToSocketIO(bus: IEventBus): void {
  const emit = (rooms: string[], event: string, payload: BusPayload) => {
    try {
      const io = getIO();
      for (const r of rooms) io.to(r).emit(event, payload);
    } catch { /* IO not yet ready */ }
  };

  const venueRooms = (venueId?: string) =>
    venueId ? [`venue:${venueId}`, `ops:${venueId}`, `intelligence:${venueId}`] : [];

  const channels: Array<[string, string]> = [
    ["intelligence",  "intelligence_update"],
    ["orchestration", "orchestration_event"],
    ["ambient",       "ambient_update"],
    ["twin",          "twin_update"],
    ["telemetry",     "telemetry_update"],
    ["cognition",     "cognition_update"],
    ["social",        "social_update"],
    ["temporal",      "temporal_update"],
    ["staff",         "staff_update"],
    ["awareness",     "awareness_update"],
  ];

  for (const [channel, eventName] of channels) {
    bus.subscribe(channel, (payload) => {
      const venueId = payload["venueId"] as string | undefined;
      const rooms   = venueRooms(venueId);
      if (rooms.length) emit(rooms, eventName, payload);
      else {
        try { getIO().emit(eventName, payload); } catch { /* */ }
      }
    });
  }

  logger.info({ transport: bus.transport }, "eventBus: Socket.IO bridge active");
}

/** Convenience wrappers */
export const publish   = (ch: BusChannel | string, p: BusPayload) => eventBus.publish(ch, p);
export const subscribe = (ch: BusChannel | string, h: Parameters<IEventBus["subscribe"]>[1]) =>
  eventBus.subscribe(ch, h);
