/**
 * orchestrationCoordinator — distributes intelligence work across cluster nodes.
 *
 * Responsibilities:
 *   - Partitions venue set across active nodes (consistent hash ring)
 *   - Ensures each venue is evaluated by exactly one node per cycle
 *   - Leader-assigned ownership: leader publishes partition map to cluster
 *   - Workers claim their assigned venues and skip others' assignments
 *   - Rebalances when nodes join or leave
 *
 * This replaces the single-node "evaluate all venues" loop in intelligenceWorker
 * with a distributed claim-based pattern.
 */

import { pool }           from "@workspace/db";
import { logger }         from "../lib/logger";
import { publish }        from "../realtime/transport/eventBus";
import { NODE_ID, getActiveNodes, isLeader } from "./clusterMembership";
import { withLock }       from "./distributedLocks";
import { enqueue, claim, complete, fail } from "./distributedQueues";

export interface VenuePartition {
  venueId:   string;
  assignedTo:string;  // nodeId
  cycle:     number;
}

export interface OrchestrationClaim {
  venueId:   string;
  nodeId:    string;
  claimedAt: number;
  cycle:     number;
}

const QUEUE_NAME         = "venue_intelligence";
const PARTITION_LOCK_KEY = "orchestration_partition";
const PARTITION_TTL_MS   = 30_000;
let   currentCycle       = 0;

// ─── Partitioning (leader-only) ───────────────────────────────────────────────

export async function publishPartitionMap(): Promise<void> {
  if (!isLeader()) return;

  const { acquired } = await withLock(PARTITION_LOCK_KEY, PARTITION_TTL_MS, async () => {
    const [venues, nodes] = await Promise.all([
      getActiveVenues(),
      getActiveNodes(),
    ]);

    if (nodes.length === 0 || venues.length === 0) return null;

    currentCycle++;
    const nodeIds = nodes.map(n => n.nodeId);
    const partitions: VenuePartition[] = venues.map((venueId, i) => ({
      venueId,
      assignedTo: nodeIds[consistentHash(venueId, nodeIds.length)]!,
      cycle:      currentCycle,
    }));

    // Enqueue work items for this cycle
    for (const p of partitions) {
      await enqueue(QUEUE_NAME, p, {
        priority:   "normal",
        maxAttempts:2,
        ttlMs:      120_000,
        dedupeKey:  `${p.venueId}:${currentCycle}`,
      });
    }

    logger.info({ cycle: currentCycle, venues: venues.length, nodes: nodes.length }, "orchestrationCoordinator: partitions published");

    await publish("orchestration", {
      event:    "PARTITION_MAP_PUBLISHED",
      cycle:    currentCycle,
      venues:   venues.length,
      nodes:    nodes.length,
    });

    return partitions;
  });

  if (!acquired) {
    logger.debug("orchestrationCoordinator: partition lock held, skipping");
  }
}

export async function claimNextVenues(batchSize = 3): Promise<VenuePartition[]> {
  const items = await claim<VenuePartition>(QUEUE_NAME, batchSize);
  const mine  = items.filter(item => item.payload.assignedTo === NODE_ID);

  // Return other nodes' items to queue (we only process our own assignments)
  for (const item of items) {
    if (item.payload.assignedTo !== NODE_ID) {
      await fail(item.itemId, "not_my_partition", true);
    }
  }

  return mine.map(i => i.payload);
}

export async function completeVenueCycle(itemId: string): Promise<void> {
  await complete(itemId);
}

export async function failVenueCycle(itemId: string, error: string): Promise<void> {
  await fail(itemId, error, true);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getActiveVenues(): Promise<string[]> {
  const { rows } = await pool.query(
    `SELECT id FROM venues WHERE is_active = TRUE ORDER BY id`,
  ).catch(() => ({ rows: [] }));
  return (rows as Record<string, unknown>[]).map(r => String(r["id"]));
}

function consistentHash(venueId: string, nodeCount: number): number {
  let h = 5381;
  for (let i = 0; i < venueId.length; i++) {
    h = ((h << 5) + h) ^ venueId.charCodeAt(i);
    h = h >>> 0;
  }
  return h % nodeCount;
}

export async function getCoordinatorStatus(): Promise<{
  cycle:       number;
  isLeader:    boolean;
  nodeId:      string;
  activeNodes: number;
}> {
  const nodes = await getActiveNodes();
  return { cycle: currentCycle, isLeader: isLeader(), nodeId: NODE_ID, activeNodes: nodes.length };
}
