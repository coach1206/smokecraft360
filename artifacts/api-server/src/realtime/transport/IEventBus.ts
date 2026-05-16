/**
 * IEventBus — transport-agnostic event bus interface.
 *
 * Current default: PostgreSQL LISTEN/NOTIFY (zero extra infra).
 * Swap to Redis by setting EVENT_BUS_TRANSPORT=redis and providing REDIS_URL.
 *
 * All implementations must be:
 *   - replay-safe (idempotent subscribers)
 *   - multi-tenant (venueId always present in payload)
 *   - reconnect-capable (hide transient failures from callers)
 */

export type BusPayload = Record<string, unknown>;
export type BusHandler = (payload: BusPayload) => void | Promise<void>;
export type Unsubscribe = () => void;

export const BUS_CHANNELS = [
  "intelligence",
  "orchestration",
  "ambient",
  "twin",
  "telemetry",
  "cognition",
  "social",
  "temporal",
  "staff",
  "awareness",
] as const;

export type BusChannel = typeof BUS_CHANNELS[number];

export interface IEventBus {
  /** Publish an event to a named channel. Resolves when enqueued. */
  publish(channel: BusChannel | string, payload: BusPayload): Promise<void>;

  /** Subscribe to a channel. Returns an unsubscribe function. */
  subscribe(channel: BusChannel | string, handler: BusHandler): Unsubscribe;

  /** Graceful shutdown — flush pending and release connections. */
  shutdown(): Promise<void>;

  /** Returns the transport identifier for observability. */
  readonly transport: string;
}
