/**
 * edgeCoordinator — master coordinator for venue-edge autonomy.
 *
 * Tracks cloud connectivity, activates/deactivates local mode,
 * and coordinates all other edge services through lifecycle hooks.
 */

import { EventEmitter } from "events";
import { logger } from "../lib/logger";
import { pgPubSub } from "../realtime/pgPubSub";

export type EdgeMode = "cloud" | "degraded" | "offline";

export interface EdgeStatus {
  mode:           EdgeMode;
  venueId:        string;
  nodeId:         string;
  lastCloudSync:  number;
  offlineSince:   number | null;
  queueDepth:     number;
  inferenceReady: boolean;
}

interface EdgeHook {
  name:       string;
  onOffline:  (venueId: string) => Promise<void>;
  onDegraded: (venueId: string) => Promise<void>;
  onRecover:  (venueId: string) => Promise<void>;
}

class EdgeCoordinator extends EventEmitter {
  private readonly nodeId = `edge-${process.pid}-${Date.now()}`;
  private readonly venues  = new Map<string, EdgeStatus>();
  private readonly hooks   = new Set<EdgeHook>();

  private pingIntervalMs  = 15_000;
  private offlineThreshMs = 30_000;
  private timer: ReturnType<typeof setInterval> | null = null;

  register(hook: EdgeHook): void {
    this.hooks.add(hook);
  }

  getStatus(venueId: string): EdgeStatus {
    return this.venues.get(venueId) ?? this.initVenue(venueId);
  }

  getAllStatuses(): EdgeStatus[] {
    return [...this.venues.values()];
  }

  /** Called by cloud-connected services when they successfully reach the DB. */
  markCloudReach(venueId: string): void {
    const s = this.venues.get(venueId) ?? this.initVenue(venueId);
    const wasOffline = s.mode !== "cloud";
    s.lastCloudSync = Date.now();
    s.offlineSince  = null;
    if (wasOffline) {
      s.mode = "cloud";
      this.emit("recover", venueId);
      this.runHooks("onRecover", venueId);
      logger.info({ venueId }, "edge: recovered to cloud mode");
    }
  }

  markCloudFail(venueId: string): void {
    const s = this.venues.get(venueId) ?? this.initVenue(venueId);
    if (s.mode === "cloud") {
      s.mode       = "degraded";
      s.offlineSince = Date.now();
      this.emit("degraded", venueId);
      this.runHooks("onDegraded", venueId);
      logger.warn({ venueId }, "edge: degraded — cloud unreachable");
    }
  }

  setQueueDepth(venueId: string, depth: number): void {
    const s = this.venues.get(venueId) ?? this.initVenue(venueId);
    s.queueDepth = depth;
  }

  setInferenceReady(venueId: string, ready: boolean): void {
    const s = this.venues.get(venueId) ?? this.initVenue(venueId);
    s.inferenceReady = ready;
  }

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => this.sweep(), this.pingIntervalMs);
    logger.info({ nodeId: this.nodeId }, "edgeCoordinator started");
  }

  stop(): void {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  private initVenue(venueId: string): EdgeStatus {
    const s: EdgeStatus = {
      mode: "cloud", venueId, nodeId: this.nodeId,
      lastCloudSync: Date.now(), offlineSince: null,
      queueDepth: 0, inferenceReady: false,
    };
    this.venues.set(venueId, s);
    return s;
  }

  private sweep(): void {
    const now = Date.now();
    for (const s of this.venues.values()) {
      if (s.mode === "cloud" && now - s.lastCloudSync > this.offlineThreshMs) {
        s.mode       = "offline";
        s.offlineSince = s.offlineSince ?? now;
        this.emit("offline", s.venueId);
        this.runHooks("onOffline", s.venueId);
        logger.warn({ venueId: s.venueId }, "edge: offline mode activated");
      }
      if (s.mode === "degraded" && now - (s.offlineSince ?? now) > this.offlineThreshMs) {
        s.mode = "offline";
        this.emit("offline", s.venueId);
        this.runHooks("onOffline", s.venueId);
      }
      // Publish status so ops dashboard can visualise
      pgPubSub.publish("intelligence", {
        event: "EDGE_STATUS", venueId: s.venueId,
        mode: s.mode, queueDepth: s.queueDepth, ts: now,
      }).catch(() => {});
    }
  }

  private runHooks(method: keyof EdgeHook, venueId: string): void {
    if (method === "name") return;
    for (const h of this.hooks) {
      (h[method] as (v: string) => Promise<void>)(venueId).catch(err =>
        logger.warn({ err, hook: h.name, method }, "edge hook error"),
      );
    }
  }
}

export const edgeCoordinator = new EdgeCoordinator();
