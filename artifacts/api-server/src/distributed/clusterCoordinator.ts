/**
 * clusterCoordinator — master coordination loop for multi-node operation.
 *
 * Single entry point for all cluster-level coordination concerns:
 *   - Starts leader election worker
 *   - Registers this node in cluster membership
 *   - Runs leader-only tasks (partition maps, eviction, reconciliation)
 *   - Exposes cluster status for admin APIs
 *   - Graceful drain on SIGTERM
 *
 * Call startClusterCoordinator() from index.ts / app startup.
 */

import { logger }     from "../lib/logger";
import { publish }    from "../realtime/transport/eventBus";
import {
  registerNode, deregisterNode, evictDeadNodes,
  getActiveNodes, isLeader, NODE_ID,
} from "./clusterMembership";
import {
  startElectionWorker, stopElectionWorker, getElectionState,
} from "./workerLeaderElection";
import { evictExpiredLocks }           from "./distributedLocks";
import { publishPartitionMap }         from "./orchestrationCoordinator";
import { recoverStaleReplays }         from "./distributedReplay";
import { rescueExpiredClaims }         from "./distributedQueues";
import { getClusterHealthReport }      from "./nodeHealth";

const LEADER_CYCLE_MS  = 30_000;
const CLEANUP_CYCLE_MS = 60_000;

let leaderTimer:  ReturnType<typeof setInterval> | null = null;
let cleanupTimer: ReturnType<typeof setInterval> | null = null;
let running = false;

export async function startClusterCoordinator(capabilities: string[] = []): Promise<void> {
  if (running) return;
  running = true;

  logger.info({ nodeId: NODE_ID }, "clusterCoordinator: starting");

  // Register this node in the cluster
  await registerNode(capabilities);

  // Start election worker (all nodes participate)
  startElectionWorker();

  // Leader-only periodic tasks
  leaderTimer = setInterval(async () => {
    if (!isLeader()) return;

    try {
      await publishPartitionMap();
    } catch (err) {
      logger.warn({ err }, "clusterCoordinator: publishPartitionMap failed");
    }
  }, LEADER_CYCLE_MS);
  leaderTimer.unref();

  // Cluster cleanup (all nodes run, but operations are idempotent)
  cleanupTimer = setInterval(async () => {
    try {
      await Promise.allSettled([
        evictDeadNodes(),
        evictExpiredLocks(),
        rescueExpiredClaims(),
        recoverStaleReplays(),
      ]);
    } catch (err) {
      logger.warn({ err }, "clusterCoordinator: cleanup cycle failed");
    }
  }, CLEANUP_CYCLE_MS);
  cleanupTimer.unref();

  logger.info({ nodeId: NODE_ID }, "clusterCoordinator: started");
}

export async function stopClusterCoordinator(): Promise<void> {
  if (!running) return;
  running = false;

  if (leaderTimer)  { clearInterval(leaderTimer);  leaderTimer  = null; }
  if (cleanupTimer) { clearInterval(cleanupTimer); cleanupTimer = null; }

  stopElectionWorker();
  await deregisterNode();

  await publish("orchestration", { event:"NODE_DEREGISTERED", nodeId:NODE_ID, ts:Date.now() });
  logger.info({ nodeId: NODE_ID }, "clusterCoordinator: stopped");
}

export async function getClusterStatus(): Promise<{
  nodeId:         string;
  isLeader:       boolean;
  activeNodes:    number;
  health:         Awaited<ReturnType<typeof getClusterHealthReport>>;
  election:       Awaited<ReturnType<typeof getElectionState>>;
  nodes:          Awaited<ReturnType<typeof getActiveNodes>>;
}> {
  const [health, election, nodes] = await Promise.all([
    getClusterHealthReport(),
    getElectionState(),
    getActiveNodes(),
  ]);

  return {
    nodeId:      NODE_ID,
    isLeader:    isLeader(),
    activeNodes: nodes.length,
    health,
    election,
    nodes,
  };
}

// Graceful shutdown on SIGTERM
process.on("SIGTERM", async () => {
  logger.info("clusterCoordinator: SIGTERM received, draining");
  await stopClusterCoordinator();
});
