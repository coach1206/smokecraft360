/**
 * PostgresTransport — IEventBus implementation backed by pg LISTEN/NOTIFY.
 *
 * Uses a single dedicated pool client (not the shared pool) so LISTEN state
 * persists for the process lifetime.  Publishers use a short-lived pool
 * connection via pg_notify(), which is safe from any connection.
 */

import { pool } from "@workspace/db";
import { logger } from "../../lib/logger";
import type { IEventBus, BusChannel, BusPayload, BusHandler, Unsubscribe } from "./IEventBus";
import { BUS_CHANNELS } from "./IEventBus";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PoolClient = any;

class PostgresTransport implements IEventBus {
  readonly transport = "postgres";

  private client:         PoolClient | null = null;
  private handlers      = new Map<string, Set<BusHandler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isShuttingDown = false;

  async init(): Promise<void> {
    if (this.client) return;
    await this.connect();
  }

  private async connect(): Promise<void> {
    let client: PoolClient;
    try {
      client = await pool.connect();
    } catch (err) {
      logger.error({ err }, "PostgresTransport: pool.connect failed — will retry");
      this.scheduleReconnect();
      return;
    }

    try {
      for (const ch of BUS_CHANNELS) {
        await client.query(`LISTEN "${ch}"`);
      }

      client.on("notification", (msg: { channel: string; payload?: string }) => {
        if (!msg.payload) return;
        try {
          const parsed = JSON.parse(msg.payload) as BusPayload;
          const set    = this.handlers.get(msg.channel);
          if (!set) return;
          for (const h of set) {
            try { void h(parsed); } catch (e) {
              logger.warn({ err: e, channel: msg.channel }, "PostgresTransport: handler error");
            }
          }
        } catch {
          logger.warn({ channel: msg.channel }, "PostgresTransport: invalid JSON payload");
        }
      });

      client.on("error", (err: unknown) => {
        logger.error({ err }, "PostgresTransport: client error — reconnecting");
        try { client.release(true); } catch { /* */ }
        this.client = null;
        this.scheduleReconnect();
      });

      client.on("end", () => {
        if (this.isShuttingDown) return;
        logger.warn("PostgresTransport: connection ended — reconnecting");
        this.client = null;
        this.scheduleReconnect();
      });

      this.client = client;
      logger.info({ channels: [...BUS_CHANNELS] }, "PostgresTransport: LISTEN established");
    } catch (err) {
      logger.error({ err }, "PostgresTransport: LISTEN failed");
      try { client.release(true); } catch { /* */ }
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.isShuttingDown) return;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      await this.connect();
    }, 5_000);
  }

  async publish(channel: string, payload: BusPayload): Promise<void> {
    const json = JSON.stringify({ ...payload, _ts: Date.now(), _transport: "postgres" });
    try {
      await pool.query("SELECT pg_notify($1, $2)", [channel, json]);
    } catch (err) {
      logger.warn({ err, channel }, "PostgresTransport: publish failed");
    }
  }

  subscribe(channel: string, handler: BusHandler): Unsubscribe {
    if (!this.handlers.has(channel)) this.handlers.set(channel, new Set());
    this.handlers.get(channel)!.add(handler);
    return () => this.handlers.get(channel)?.delete(handler);
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.client) {
      try { this.client.release(true); } catch { /* */ }
      this.client = null;
    }
  }
}

export const postgresTransport = new PostgresTransport();
export { PostgresTransport };
