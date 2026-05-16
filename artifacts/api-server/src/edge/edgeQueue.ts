/**
 * edgeQueue — local priority queue for events generated at the edge
 * before they can be forwarded to the cloud or central event bus.
 */

import { logger } from "../lib/logger";

export type Priority = "critical" | "high" | "normal" | "low";

const PRIORITY_ORDER: Record<Priority, number> = {
  critical: 0, high: 1, normal: 2, low: 3,
};

export interface QueueItem<T = unknown> {
  id:         string;
  venueId:    string;
  priority:   Priority;
  type:       string;
  payload:    T;
  enqueuedAt: number;
  expiresAt?: number;
}

class EdgeQueue {
  private readonly buckets: Map<Priority, QueueItem[]> = new Map([
    ["critical", []], ["high", []], ["normal", []], ["low", []],
  ]);
  private readonly maxSize: number;
  private _total = 0;

  constructor(maxSize = 10_000) {
    this.maxSize = maxSize;
  }

  enqueue<T>(
    venueId:  string,
    type:     string,
    payload:  T,
    priority: Priority = "normal",
    ttlMs?:   number,
  ): string {
    if (this._total >= this.maxSize) this.evictLow();

    const id = `eq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const item: QueueItem<T> = {
      id, venueId, priority, type, payload,
      enqueuedAt: Date.now(),
      expiresAt:  ttlMs ? Date.now() + ttlMs : undefined,
    };

    this.buckets.get(priority)!.push(item);
    this._total++;
    return id;
  }

  dequeue(venueId?: string, count = 1): QueueItem[] {
    this.pruneExpired();
    const results: QueueItem[] = [];

    for (const priority of ["critical", "high", "normal", "low"] as Priority[]) {
      const bucket = this.buckets.get(priority)!;
      let i = 0;
      while (i < bucket.length && results.length < count) {
        if (!venueId || bucket[i].venueId === venueId) {
          results.push(...bucket.splice(i, 1));
          this._total--;
        } else {
          i++;
        }
      }
      if (results.length >= count) break;
    }

    return results;
  }

  peek(venueId?: string): QueueItem | null {
    for (const priority of ["critical", "high", "normal", "low"] as Priority[]) {
      const bucket = this.buckets.get(priority)!;
      const item   = venueId ? bucket.find(i => i.venueId === venueId) : bucket[0];
      if (item) return item;
    }
    return null;
  }

  size(venueId?: string): number {
    if (!venueId) return this._total;
    let count = 0;
    for (const bucket of this.buckets.values())
      count += bucket.filter(i => i.venueId === venueId).length;
    return count;
  }

  stats(): Record<Priority, number> {
    return {
      critical: this.buckets.get("critical")!.length,
      high:     this.buckets.get("high")!.length,
      normal:   this.buckets.get("normal")!.length,
      low:      this.buckets.get("low")!.length,
    };
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const bucket of this.buckets.values()) {
      let i = bucket.length;
      while (i--) {
        if (bucket[i].expiresAt && bucket[i].expiresAt! < now) {
          bucket.splice(i, 1);
          this._total--;
        }
      }
    }
  }

  private evictLow(): void {
    const low = this.buckets.get("low")!;
    if (low.length > 0) { low.shift(); this._total--; return; }
    const normal = this.buckets.get("normal")!;
    if (normal.length > 0) { normal.shift(); this._total--; return; }
    logger.warn("edgeQueue: max size reached — evicting high-priority item");
    const high = this.buckets.get("high")!;
    if (high.length > 0) { high.shift(); this._total--; }
  }
}

export const edgeQueue = new EdgeQueue();
