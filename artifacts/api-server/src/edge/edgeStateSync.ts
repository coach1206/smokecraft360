/**
 * edgeStateSync — synchronizes edge-accumulated state back to cloud
 * on reconnect. Handles conflict resolution for concurrent mutations.
 */

import { logger }          from "../lib/logger";
import { pool }            from "@workspace/db";
import { edgeQueue }       from "./edgeQueue";
import { edgeCoordinator } from "./edgeCoordinator";
import { replayToCloud, getBufferDepth } from "./localReplay";

export type ConflictStrategy = "cloud_wins" | "edge_wins" | "merge_latest" | "merge_additive";

export interface SyncManifest {
  venueId:     string;
  syncId:      string;
  startedAt:   number;
  completedAt?: number;
  itemsSynced: number;
  conflicts:   number;
  errors:      number;
}

const activeSyncs = new Map<string, SyncManifest>();

export function getSyncManifest(venueId: string): SyncManifest | null {
  return activeSyncs.get(venueId) ?? null;
}

export async function syncEdgeState(
  venueId:  string,
  strategy: ConflictStrategy = "merge_latest",
): Promise<SyncManifest> {
  const existing = activeSyncs.get(venueId);
  if (existing && !existing.completedAt) {
    logger.warn({ venueId }, "edgeStateSync: sync already in progress");
    return existing;
  }

  const manifest: SyncManifest = {
    venueId,
    syncId:      `sync-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    startedAt:   Date.now(),
    itemsSynced: 0,
    conflicts:   0,
    errors:      0,
  };
  activeSyncs.set(venueId, manifest);

  logger.info({ venueId, syncId: manifest.syncId, strategy }, "edgeStateSync: starting");

  try {
    // 1. Replay buffered events
    const replayResult = await replayToCloud(venueId);
    manifest.itemsSynced += replayResult.replayed;
    manifest.errors      += replayResult.failed;

    // 2. Flush the edge queue
    const queueItems = edgeQueue.dequeue(venueId, 500);
    for (const item of queueItems) {
      try {
        await syncQueueItem(item.type, item.payload as Record<string, unknown>, venueId, strategy);
        manifest.itemsSynced++;
      } catch {
        manifest.errors++;
      }
    }

    // 3. Reconcile ambient state
    await reconcileAmbientState(venueId, strategy);

    manifest.completedAt = Date.now();
    edgeCoordinator.setQueueDepth(venueId, getBufferDepth(venueId));
    logger.info({ ...manifest }, "edgeStateSync: complete");
  } catch (err) {
    manifest.errors++;
    logger.warn({ err, venueId }, "edgeStateSync: error during sync");
    manifest.completedAt = Date.now();
  }

  return manifest;
}

async function syncQueueItem(
  type:     string,
  payload:  Record<string, unknown>,
  venueId:  string,
  strategy: ConflictStrategy,
): Promise<void> {
  switch (type) {
    case "ambient_scene_change":
      if (strategy !== "cloud_wins") {
        await pool.query(
          `UPDATE venue_context_states SET current_scene_id = $1, updated_at = NOW() WHERE venue_id = $2`,
          [payload.scene, venueId],
        );
      }
      break;
    default:
      // Generic: log to operational snapshots
      await pool.query(
        `INSERT INTO operational_snapshots (type, venue_id, data, event_cursor)
         VALUES ($1, $2, $3::jsonb, $4)`,
        [type, venueId, JSON.stringify(payload), String(payload.ts ?? Date.now())],
      );
  }
}

async function reconcileAmbientState(venueId: string, strategy: ConflictStrategy): Promise<void> {
  if (strategy === "cloud_wins") return; // Cloud state is authoritative — no action
  await pool.query(
    `INSERT INTO operational_snapshots (type, venue_id, data)
     VALUES ('edge_reconcile', $1, $2::jsonb)`,
    [venueId, JSON.stringify({ strategy, ts: Date.now() })],
  ).catch(() => {});
}

export function startEdgeStateSync(): void {
  edgeCoordinator.register({
    name:       "edgeStateSync",
    onOffline:  async () => { /* accumulate — sync on recover */ },
    onDegraded: async () => {},
    onRecover:  (venueId) => syncEdgeState(venueId, "merge_latest").then(() => {}),
  });
  logger.info("edgeStateSync: registered");
}
