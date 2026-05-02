/**
 * Offline event queue.
 *
 * When the app is offline, `enqueueEvent` saves analytics events to
 * localStorage instead of dropping them. `flushEventQueue` is called
 * automatically by `useOnlineStatus` when connectivity is restored.
 *
 * The queue is capped at MAX_SIZE to prevent unbounded growth.
 */

const QUEUE_KEY = "smokecraft_event_queue_v1";
const MAX_SIZE  = 100;

interface QueuedEvent {
  eventType: string;
  productId?: string;
  queuedAt:  number;
}

function readQueue(): QueuedEvent[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]") as QueuedEvent[];
  } catch {
    return [];
  }
}

function writeQueue(q: QueuedEvent[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(0, MAX_SIZE)));
  } catch {
    // Storage quota exceeded — fail silently
  }
}

/** Add an event to the offline queue. */
export function enqueueEvent(event: Omit<QueuedEvent, "queuedAt">): void {
  const q = readQueue();
  q.push({ ...event, queuedAt: Date.now() });
  writeQueue(q);
}

/** Return number of events currently queued. */
export function queueSize(): number {
  return readQueue().length;
}

/**
 * Attempt to send all queued events to the backend.
 * Successfully sent events are removed from the queue.
 * Failed events remain so they can be retried next time.
 */
export async function flushEventQueue(): Promise<void> {
  const q = readQueue();
  if (q.length === 0) return;

  const sent = new Set<number>();

  await Promise.allSettled(
    q.map(async (event, i) => {
      try {
        const res = await fetch("/api/events", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ eventType: event.eventType, productId: event.productId }),
        });
        if (res.ok) sent.add(i);
      } catch {
        // Keep in queue — will retry on next reconnect
      }
    }),
  );

  writeQueue(q.filter((_, i) => !sent.has(i)));
}
