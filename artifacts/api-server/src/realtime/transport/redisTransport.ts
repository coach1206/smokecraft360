/**
 * RedisTransport — IEventBus stub backed by Redis Pub/Sub.
 *
 * Activate by setting EVENT_BUS_TRANSPORT=redis and REDIS_URL in environment.
 * Install `ioredis` when ready: pnpm add ioredis @types/ioredis
 *
 * This stub logs a warning if called without Redis credentials, ensuring
 * the system degrades gracefully rather than crashing.
 */

import { logger } from "../../lib/logger";
import type { IEventBus, BusPayload, BusHandler, Unsubscribe } from "./IEventBus";

class RedisTransport implements IEventBus {
  readonly transport = "redis";

  private handlers = new Map<string, Set<BusHandler>>();
  private ready    = false;

  async init(): Promise<void> {
    const url = process.env["REDIS_URL"];
    if (!url) {
      logger.warn("RedisTransport: REDIS_URL not set — transport will no-op. Set REDIS_URL or switch to EVENT_BUS_TRANSPORT=postgres");
      return;
    }

    try {
      // Dynamic import — only resolves when ioredis is installed
      const { default: Redis } = await import("ioredis" as string) as { default: new (url: string) => unknown };
      const pub = new Redis(url) as { publish: (ch: string, msg: string) => Promise<unknown> };
      const sub = new Redis(url) as {
        subscribe: (...ch: string[]) => Promise<unknown>;
        on: (ev: string, cb: (ch: string, msg: string) => void) => void;
      };

      await sub.subscribe(...[...this.handlers.keys()]);

      sub.on("message", (channel: string, message: string) => {
        try {
          const parsed = JSON.parse(message) as BusPayload;
          const set    = this.handlers.get(channel);
          if (!set) return;
          for (const h of set) {
            try { void h(parsed); } catch (e) {
              logger.warn({ err: e, channel }, "RedisTransport: handler error");
            }
          }
        } catch {
          logger.warn({ channel }, "RedisTransport: invalid JSON");
        }
      });

      // Monkey-patch publish to use the pub client
      this.publish = async (channel: string, payload: BusPayload) => {
        const json = JSON.stringify({ ...payload, _ts: Date.now(), _transport: "redis" });
        try { await pub.publish(channel, json); }
        catch (err) { logger.warn({ err, channel }, "RedisTransport: publish failed"); }
      };

      this.ready = true;
      logger.info({ url: url.replace(/:[^:@]+@/, ":***@") }, "RedisTransport: connected");
    } catch (err) {
      logger.error({ err }, "RedisTransport: failed to init (is ioredis installed?)");
    }
  }

  async publish(channel: string, payload: BusPayload): Promise<void> {
    if (!this.ready) {
      logger.warn({ channel }, "RedisTransport: not ready — event dropped");
    }
  }

  subscribe(channel: string, handler: BusHandler): Unsubscribe {
    if (!this.handlers.has(channel)) this.handlers.set(channel, new Set());
    this.handlers.get(channel)!.add(handler);
    return () => this.handlers.get(channel)?.delete(handler);
  }

  async shutdown(): Promise<void> {
    this.handlers.clear();
  }
}

export const redisTransport = new RedisTransport();
export { RedisTransport };
