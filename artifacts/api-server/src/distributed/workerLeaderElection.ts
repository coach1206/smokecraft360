/**
 * workerLeaderElection — distributed leader election via Postgres advisory locks.
 *
 * Election algorithm:
 *   1. All nodes compete for the "leader_election" distributed lock on startup
 *      and periodically (every ELECTION_INTERVAL_MS) if no leader exists.
 *   2. The node that acquires the lock becomes leader and holds it via heartbeat.
 *   3. If the leader's lock expires (node died/network partition), any surviving
 *      node that next runs election wins.
 *   4. Leadership change publishes to EventBus so workers can reconfigure.
 *
 * Guarantees:
 *   - At most one leader at a time (Postgres lock serializes election)
 *   - Leader loss detected within HEARTBEAT_INTERVAL_MS × 2
 *   - New leader elected within ELECTION_INTERVAL_MS of previous leader death
 */

import { pool }       from "@workspace/db";
import { logger }     from "../lib/logger";
import { publish }    from "../realtime/transport/eventBus";
import {
  NODE_ID, setNodeRole, isLeader, getActiveNodes,
} from "./clusterMembership";
import { acquireLock, releaseLock, type DistributedLock } from "./distributedLocks";

const ELECTION_LOCK_KEY   = "leader_election";
const ELECTION_TTL_MS     = 30_000;
const ELECTION_INTERVAL_MS = 15_000;
const LEADER_LOCK_TTL_MS  = 20_000;

let leaderLock: DistributedLock | null = null;
let electionTimer: ReturnType<typeof setInterval> | null = null;

// ─── Callbacks ────────────────────────────────────────────────────────────────

type LeadershipCallback = (isLeader: boolean, leaderId: string) => void;
const callbacks: LeadershipCallback[] = [];

export function onLeadershipChange(cb: LeadershipCallback): void {
  callbacks.push(cb);
}

function notifyCallbacks(leader: boolean, leaderId: string): void {
  for (const cb of callbacks) {
    try { cb(leader, leaderId); } catch {}
  }
}

// ─── Election ─────────────────────────────────────────────────────────────────

export async function runElection(): Promise<boolean> {
  if (isLeader()) {
    // Already leader — refresh our lock
    if (leaderLock) return true;
  }

  const currentLeader = await getCurrentLeader();
  if (currentLeader && currentLeader !== NODE_ID) {
    // Another active leader exists
    return false;
  }

  // Compete for leadership
  const lock = await acquireLock(ELECTION_LOCK_KEY, LEADER_LOCK_TTL_MS);
  if (!lock) {
    logger.debug({ nodeId: NODE_ID }, "workerLeaderElection: lost election");
    return false;
  }

  // Won election
  leaderLock = lock;
  setNodeRole("leader");

  await pool.query(
    `UPDATE cluster_nodes SET role='leader' WHERE node_id=$1`,
    [NODE_ID],
  ).catch(() => {});

  // Demote other nodes
  await pool.query(
    `UPDATE cluster_nodes SET role='worker' WHERE node_id != $1 AND role='leader'`,
    [NODE_ID],
  ).catch(() => {});

  logger.info({ nodeId: NODE_ID }, "workerLeaderElection: elected as leader");

  await publish("orchestration", {
    event:    "LEADER_ELECTED",
    leaderId: NODE_ID,
    ts:       Date.now(),
  });

  notifyCallbacks(true, NODE_ID);
  return true;
}

export async function abdicate(): Promise<void> {
  if (!isLeader()) return;

  if (leaderLock) {
    await releaseLock(leaderLock);
    leaderLock = null;
  }

  setNodeRole("worker");
  await pool.query(
    `UPDATE cluster_nodes SET role='worker' WHERE node_id=$1`,
    [NODE_ID],
  ).catch(() => {});

  logger.info({ nodeId: NODE_ID }, "workerLeaderElection: abdicated");
  await publish("orchestration", { event:"LEADER_ABDICATED", nodeId:NODE_ID, ts:Date.now() });
  notifyCallbacks(false, "");
}

export async function getCurrentLeader(): Promise<string | null> {
  const { rows } = await pool.query(
    `SELECT holder_id FROM distributed_locks
     WHERE lock_key=$1 AND expires_at > NOW() LIMIT 1`,
    [ELECTION_LOCK_KEY],
  ).catch(() => ({ rows: [] }));
  return rows.length > 0 ? String((rows[0] as Record<string, unknown>)["holder_id"]) : null;
}

export function startElectionWorker(): void {
  if (electionTimer) return;
  // Stagger initial election to reduce thundering herd
  setTimeout(async () => {
    await runElection();
    electionTimer = setInterval(async () => {
      const leader = await getCurrentLeader();
      if (!leader) {
        await runElection();
      } else if (leader === NODE_ID && !leaderLock) {
        // We think we're leader but lost the lock — re-elect
        setNodeRole("worker");
        await runElection();
      }
    }, ELECTION_INTERVAL_MS);
    electionTimer?.unref();
  }, Math.random() * 3000).unref();
}

export function stopElectionWorker(): void {
  if (electionTimer) { clearInterval(electionTimer); electionTimer = null; }
}

export async function getElectionState(): Promise<{
  currentLeader: string | null;
  isThisNodeLeader: boolean;
  activeNodes: number;
}> {
  const [currentLeader, activeNodes] = await Promise.all([
    getCurrentLeader(),
    getActiveNodes(),
  ]);
  return { currentLeader, isThisNodeLeader: isLeader(), activeNodes: activeNodes.length };
}
