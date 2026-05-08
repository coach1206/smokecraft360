/**
 * BlackBoxRecovery — Edge Memory Core.
 *
 * Phase 6: Atmospheric Failover.
 *
 * The venue soul MUST survive a cloud outage. This service:
 *   1. Writes a full venue state snapshot to disk every 60 seconds.
 *   2. On startup, restores all snapshots into VenueStateEngine.
 *   3. When the DB is unreachable, serves venue data from the edge cache.
 *   4. Emits foundation.blackbox_write events on each snapshot cycle.
 *
 * Storage: OS temp dir + /axiom-blackbox/ (survives process restarts,
 * not OS reboots — upgrade to a persistent volume in production).
 *
 * Edge guarantee: Even with no cloud, guests get:
 *   - Current atmospheric mode  (from VenueStateEngine snapshot)
 *   - Last known intent signals (from edge cache)
 *   - Sonic + haptic profiles   (from snapshot)
 */

import { writeFileSync, readFileSync, mkdirSync, readdirSync } from "fs";
import { join }               from "path";
import { logger }             from "../lib/logger";
import { VenueStateEngine }   from "./venueStateEngine";
import { NeuralEventBus }     from "./neuralEventBus";

const CACHE_DIR   = join("/tmp", "axiom-blackbox");
const INTERVAL_MS = 60_000;

let dbHealthy = true;

export class BlackBoxRecovery {

  static init(): void {
    try { mkdirSync(CACHE_DIR, { recursive: true }); } catch { /* exists */ }
    BlackBoxRecovery.restoreAll();
    setInterval(BlackBoxRecovery.snapshotAll, INTERVAL_MS);
    logger.info({ dir: CACHE_DIR }, "BlackBoxRecovery online — edge memory core active");
  }

  /** Signal DB health so the edge cache knows whether to serve as fallback. */
  static reportDbHealth(healthy: boolean): void {
    if (dbHealthy !== healthy) {
      logger.warn({ healthy }, healthy ? "DB reconnected — exiting edge-only mode" : "DB unreachable — BlackBox serving venue soul");
    }
    dbHealthy = healthy;
  }

  static isDbHealthy(): boolean {
    return dbHealthy;
  }

  /** Write all known venue snapshots to disk. */
  static snapshotAll(): void {
    const venueIds = VenueStateEngine.allVenueIds();
    for (const venueId of venueIds) {
      try {
        const snap = VenueStateEngine.snapshot(venueId);
        const path = join(CACHE_DIR, `venue_${venueId}.json`);
        writeFileSync(path, JSON.stringify(snap, null, 2), "utf8");
        NeuralEventBus.publish("foundation.blackbox_write", { venueId, path, keys: Object.keys(snap) }, venueId);
      } catch (err) {
        logger.warn({ err, venueId }, "BlackBox snapshot write failed");
      }
    }
    if (venueIds.length > 0) {
      logger.info({ count: venueIds.length }, "BlackBox snapshots written");
    }
  }

  /** On startup: read all snapshots from disk and restore into VenueStateEngine. */
  static restoreAll(): void {
    let restored = 0;
    try {
      const files = readdirSync(CACHE_DIR).filter(f => f.startsWith("venue_") && f.endsWith(".json"));
      for (const file of files) {
        try {
          const raw  = readFileSync(join(CACHE_DIR, file), "utf8");
          const snap = JSON.parse(raw) as Record<string, unknown>;
          VenueStateEngine.restore(snap);
          restored++;
        } catch { /* corrupted file — skip */ }
      }
    } catch { /* no cache dir yet */ }
    if (restored > 0) {
      logger.info({ restored }, "BlackBox venue souls restored from edge cache");
    }
  }

  /** Get a specific venue snapshot from disk (edge-only fallback). */
  static getEdgeSnapshot(venueId: string): Record<string, unknown> | null {
    try {
      const raw  = readFileSync(join(CACHE_DIR, `venue_${venueId}.json`), "utf8");
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  /** Force an immediate snapshot for a specific venue. */
  static snapshotVenue(venueId: string): boolean {
    try {
      const snap = VenueStateEngine.snapshot(venueId);
      const path = join(CACHE_DIR, `venue_${venueId}.json`);
      writeFileSync(path, JSON.stringify(snap, null, 2), "utf8");
      NeuralEventBus.publish("foundation.blackbox_write", { venueId, path, forced: true }, venueId);
      return true;
    } catch {
      return false;
    }
  }
}
