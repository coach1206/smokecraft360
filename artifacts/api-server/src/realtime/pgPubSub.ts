/**
 * pgPubSub — PostgreSQL LISTEN/NOTIFY event bus.
 *
 * Uses a single dedicated pg Client (not the pool) so the LISTEN state
 * is kept alive for the lifetime of the process.  Publishers use the
 * shared pool to execute pg_notify(), which is safe from any connection.
 *
 * Usage
 * ─────
 * import { pgPubSub } from "./pgPubSub";
 *
 * // Subscribe
 * pgPubSub.subscribe("intelligence", (payload) => { ... });
 *
 * // Publish (from anywhere — uses pool)
 * await pgPubSub.publish("intelligence", { venueId, event: "VIP_DETECTED" });
 */

import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import { getIO } from "../lib/socketServer";

type Handler = (payload: Record<string, unknown>) => void;

const CHANNELS = [
  "intelligence",
  "orchestration",
  "ambient",
  "twin",
  "telemetry",
  "cognition",
  "supply",
] as const;

export type PubSubChannel = typeof CHANNELS[number];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PoolClient = any;

class PgPubSub {
  private client: PoolClient | null = null;
  private handlers = new Map<string, Set<Handler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isShuttingDown = false;

  async init(): Promise<void> {
    if (this.client) return;
    await this.connect();
    this.bridgeToSocketIO();
  }

  private async connect(): Promise<void> {
    // Acquire a dedicated connection from the pool for LISTEN state
    const client = await pool.connect();
    try {
      this.client = client;

      for (const ch of CHANNELS) {
        await client.query(`LISTEN "${ch}"`);
      }

      client.on("notification", (msg) => {
        if (!msg.payload) return;
        try {
          const parsed = JSON.parse(msg.payload) as Record<string, unknown>;
          const handlers = this.handlers.get(msg.channel) ?? new Set();
          for (const h of handlers) {
            try { h(parsed); } catch (e) {
              logger.warn({ err: e, channel: msg.channel }, "pgPubSub handler error");
            }
          }
        } catch {
          logger.warn({ channel: msg.channel }, "pgPubSub: invalid JSON payload");
        }
      });

      client.on("error", (err) => {
        logger.error({ err }, "pgPubSub client error — will reconnect");
        this.client = null;
        this.scheduleReconnect();
      });

      client.on("end", () => {
        if (this.isShuttingDown) return;
        logger.warn("pgPubSub client ended — will reconnect");
        this.client = null;
        this.scheduleReconnect();
      });

      logger.info({ channels: CHANNELS }, "pgPubSub: LISTEN established");
    } catch (err) {
      logger.error({ err }, "pgPubSub: failed to connect — will retry");
      try { client.release(true); } catch { /* ignore */ }
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.isShuttingDown) return;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      await this.connect();
    }, 5000);
  }

  subscribe(channel: string, handler: Handler): () => void {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
    }
    this.handlers.get(channel)!.add(handler);
    return () => this.handlers.get(channel)?.delete(handler);
  }

  async publish(channel: PubSubChannel, payload: Record<string, unknown>): Promise<void> {
    const json = JSON.stringify({ ...payload, _ts: Date.now() });
    try {
      await pool.query(`SELECT pg_notify($1, $2)`, [channel, json]);
    } catch (err) {
      logger.warn({ err, channel }, "pgPubSub: publish failed");
    }
  }

  /**
   * Bridge pg NOTIFY events to Socket.IO venue rooms so every
   * connected kiosk or dashboard receives intelligence updates live.
   */
  private bridgeToSocketIO(): void {
    this.subscribe("intelligence", (payload) => {
      try {
        const io = getIO();
        const venueId = payload["venueId"] as string | undefined;
        const event = (payload["event"] as string | undefined) ?? "intelligence_update";
        if (venueId) {
          io.to(`venue:${venueId}`).emit(event, payload);
          io.to(`ops:${venueId}`).emit(event, payload);
        } else {
          io.emit(event, payload);
        }
      } catch { /* IO not yet initialised */ }
    });

    this.subscribe("orchestration", (payload) => {
      try {
        const io = getIO();
        const venueId = payload["venueId"] as string | undefined;
        if (venueId) {
          io.to(`ops:${venueId}`).emit("orchestration_event", payload);
        }
      } catch { /* */ }
    });

    this.subscribe("ambient", (payload) => {
      try {
        const io = getIO();
        const venueId = payload["venueId"] as string | undefined;
        if (venueId) {
          io.to(`venue:${venueId}`).emit("ambient_update", payload);
          io.to(`ops:${venueId}`).emit("ambient_update", payload);
        }
      } catch { /* */ }
    });

    this.subscribe("twin", (payload) => {
      try {
        const io = getIO();
        const venueId = payload["venueId"] as string | undefined;
        if (venueId) {
          io.to(`ops:${venueId}`).emit("twin_update", payload);
        }
      } catch { /* */ }
    });

    this.subscribe("telemetry", (payload) => {
      try {
        const io = getIO();
        const venueId = payload["venueId"] as string | undefined;
        if (venueId) {
          io.to(`ops:${venueId}`).emit("telemetry_update", payload);
        }
      } catch { /* */ }
    });

    this.subscribe("cognition", (payload) => {
      try {
        const io = getIO();
        const venueId = payload["venueId"] as string | undefined;
        if (venueId) {
          io.to(`ops:${venueId}`).emit("cognition_update", payload);
        }
      } catch { /* */ }
    });


    this.subscribe("supply", (payload) => {
      try {
        const io = getIO();
        const venueId = payload["venueId"] as string | undefined;
        if (venueId) {
          io.to(`ops:${venueId}`).emit("supply_update", payload);
        }
      } catch { /* */ }
    });

    logger.info("pgPubSub: Socket.IO bridge established");
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.client) {
      try { this.client.release(true); } catch { /* ignore */ }
      this.client = null;
    }
  }
}

export const pgPubSub = new PgPubSub();
