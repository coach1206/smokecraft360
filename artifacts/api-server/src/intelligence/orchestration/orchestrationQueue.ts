/**
 * orchestrationQueue — priority queue for orchestration actions.
 *
 * Features:
 *   - Priority-based ordering (1=lowest, 10=highest)
 *   - Deduplication via idempotency keys
 *   - TTL-based expiry (actions too old are dropped)
 *   - Per-venue isolation
 *   - Drain/flush for emergency pause
 */

import { logger } from "../../lib/logger";
import { publish } from "../../realtime/transport/eventBus";

export interface QueuedAction {
  id:             string;
  venueId:        string;
  actionType:     string;
  payload:        Record<string, unknown>;
  priority:       number;           // 1–10 (10=highest)
  idempotencyKey: string;
  enqueuedAt:     number;
  ttlMs:          number;
  attempts:       number;
  maxAttempts:    number;
}

interface Queue {
  actions: QueuedAction[];
  paused:  boolean;
}

const queues = new Map<string, Queue>();
const DEFAULT_TTL = 5 * 60 * 1000;  // 5 min
let   drainTimer: ReturnType<typeof setInterval> | null = null;

function getQueue(venueId: string): Queue {
  if (!queues.has(venueId)) queues.set(venueId, { actions: [], paused: false });
  return queues.get(venueId)!;
}

export function enqueue(
  venueId:        string,
  actionType:     string,
  payload:        Record<string, unknown>,
  opts: {
    priority?:       number;
    idempotencyKey?: string;
    ttlMs?:          number;
    maxAttempts?:    number;
  } = {},
): QueuedAction | null {
  const q    = getQueue(venueId);
  const ikey = opts.idempotencyKey ?? `${venueId}:${actionType}:${JSON.stringify(payload)}`;

  // Deduplication
  const existing = q.actions.find(a => a.idempotencyKey === ikey);
  if (existing) {
    // Bump priority if re-enqueued with higher priority
    if ((opts.priority ?? 5) > existing.priority) {
      existing.priority = opts.priority ?? 5;
    }
    return existing;
  }

  const action: QueuedAction = {
    id:             `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    venueId,
    actionType,
    payload,
    priority:       Math.max(1, Math.min(10, opts.priority ?? 5)),
    idempotencyKey: ikey,
    enqueuedAt:     Date.now(),
    ttlMs:          opts.ttlMs ?? DEFAULT_TTL,
    attempts:       0,
    maxAttempts:    opts.maxAttempts ?? 3,
  };

  q.actions.push(action);
  // Sort: highest priority first, then oldest first for same priority
  q.actions.sort((a, b) => b.priority - a.priority || a.enqueuedAt - b.enqueuedAt);

  return action;
}

export function dequeue(venueId: string): QueuedAction | null {
  const q = getQueue(venueId);
  if (q.paused) return null;

  const now = Date.now();
  // Drop expired actions
  q.actions = q.actions.filter(a => now - a.enqueuedAt < a.ttlMs);

  const action = q.actions.shift();
  if (!action) return null;

  action.attempts++;
  if (action.attempts < action.maxAttempts) {
    // Re-queue at lower priority for retry
    action.priority = Math.max(1, action.priority - 2);
    // Will be re-enqueued by caller on failure
  }
  return action;
}

export function requeue(action: QueuedAction): void {
  const q = getQueue(action.venueId);
  q.actions.push(action);
  q.actions.sort((a, b) => b.priority - a.priority || a.enqueuedAt - b.enqueuedAt);
}

export function pauseQueue(venueId: string): void {
  getQueue(venueId).paused = true;
  logger.warn({ venueId }, "orchestrationQueue: PAUSED");
  publish("orchestration", { event: "QUEUE_PAUSED", venueId }).catch(() => {});
}

export function resumeQueue(venueId: string): void {
  getQueue(venueId).paused = false;
  logger.info({ venueId }, "orchestrationQueue: resumed");
  publish("orchestration", { event: "QUEUE_RESUMED", venueId }).catch(() => {});
}

export function flushQueue(venueId: string): number {
  const q = getQueue(venueId);
  const count = q.actions.length;
  q.actions = [];
  logger.warn({ venueId, count }, "orchestrationQueue: flushed");
  return count;
}

export function getQueueDepth(venueId: string): number {
  return getQueue(venueId).actions.length;
}

export function getQueueStatus(venueId: string): {
  depth: number; paused: boolean; oldest: number | null; highest: number;
} {
  const q = getQueue(venueId);
  return {
    depth:   q.actions.length,
    paused:  q.paused,
    oldest:  q.actions.length > 0 ? q.actions[q.actions.length - 1]!.enqueuedAt : null,
    highest: q.actions.length > 0 ? q.actions[0]!.priority : 0,
  };
}

/** Global drain: remove expired items from all venue queues */
export function startQueueDrain(intervalMs = 60_000): void {
  if (drainTimer) return;
  drainTimer = setInterval(() => {
    const now = Date.now();
    for (const [, q] of queues.entries()) {
      const before = q.actions.length;
      q.actions = q.actions.filter(a => now - a.enqueuedAt < a.ttlMs);
      const dropped = before - q.actions.length;
      if (dropped > 0) logger.info({ dropped }, "orchestrationQueue: expired actions dropped");
    }
  }, intervalMs);
}

export function stopQueueDrain(): void {
  if (drainTimer) { clearInterval(drainTimer); drainTimer = null; }
}
