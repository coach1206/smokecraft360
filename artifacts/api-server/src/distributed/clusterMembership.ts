/**
 * clusterMembership — node registration and cluster topology tracking.
 *
 * Each API server instance registers itself on startup and sends heartbeats
 * every HEARTBEAT_INTERVAL_MS. Stale nodes are evicted after EVICTION_MS.
 *
 * Uses the `cluster_nodes` table as the shared membership registry.
 * No external coordinator required — Postgres is the source of truth.
 */

import { randomUUID }  from "node:crypto";
import { hostname }    from "node:os";
import { pool }        from "@workspace/db";
import { logger }      from "../lib/logger";

export type NodeRole = "worker" | "leader" | "standby";
export type NodeStatus = "active" | "draining" | "dead";

export interface ClusterNode {
  nodeId:      string;
  hostname:    string;
  pid:         number;
  role:        NodeRole;
  status:      NodeStatus;
  startedAt:   number;
  lastSeen:    number;
  capabilities:string[];
  metadata:    Record<string, unknown>;
}

const HEARTBEAT_INTERVAL_MS = 10_000;
const EVICTION_MS           = 45_000;
const DRAIN_TIMEOUT_MS      = 30_000;

// This node's identity
export const NODE_ID = process.env["NODE_ID"] ?? randomUUID();
const NODE_HOSTNAME  = hostname();
const NODE_PID       = process.pid;

let currentRole: NodeRole   = "worker";
let currentStatus: NodeStatus = "active";
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

// ─── Registration ─────────────────────────────────────────────────────────────

export async function registerNode(capabilities: string[] = []): Promise<void> {
  await pool.query(
    `INSERT INTO cluster_nodes
       (node_id, hostname, pid, role, status, started_at, last_seen, capabilities, metadata)
     VALUES ($1,$2,$3,'worker','active',NOW(),NOW(),$4,$5)
     ON CONFLICT (node_id) DO UPDATE SET
       hostname=EXCLUDED.hostname, pid=EXCLUDED.pid,
       status='active', last_seen=NOW(), capabilities=EXCLUDED.capabilities`,
    [NODE_ID, NODE_HOSTNAME, NODE_PID, JSON.stringify(capabilities), JSON.stringify({})],
  ).catch(err => logger.warn({ err }, "clusterMembership: register failed (table may not exist)"));

  logger.info({ nodeId: NODE_ID, hostname: NODE_HOSTNAME }, "clusterMembership: node registered");
  startHeartbeat();
}

export async function deregisterNode(): Promise<void> {
  stopHeartbeat();
  await pool.query(
    `UPDATE cluster_nodes SET status='dead', last_seen=NOW() WHERE node_id=$1`,
    [NODE_ID],
  ).catch(() => {});
  logger.info({ nodeId: NODE_ID }, "clusterMembership: node deregistered");
}

// ─── Heartbeat ────────────────────────────────────────────────────────────────

function startHeartbeat(): void {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
  heartbeatTimer.unref();
}

function stopHeartbeat(): void {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
}

async function sendHeartbeat(): Promise<void> {
  await pool.query(
    `UPDATE cluster_nodes SET last_seen=NOW(), role=$2, status=$3 WHERE node_id=$1`,
    [NODE_ID, currentRole, currentStatus],
  ).catch(err => logger.warn({ err }, "clusterMembership: heartbeat failed"));
}

// ─── Topology queries ─────────────────────────────────────────────────────────

export async function getActiveNodes(): Promise<ClusterNode[]> {
  const { rows } = await pool.query(
    `SELECT * FROM cluster_nodes
     WHERE last_seen > NOW() - ($1||' milliseconds')::interval
       AND status != 'dead'
     ORDER BY started_at ASC`,
    [EVICTION_MS],
  ).catch(() => ({ rows: [] }));
  return (rows as Record<string, unknown>[]).map(rowToNode);
}

export async function getLeaderNode(): Promise<ClusterNode | null> {
  const { rows } = await pool.query(
    `SELECT * FROM cluster_nodes
     WHERE role='leader' AND status='active'
       AND last_seen > NOW() - ($1||' milliseconds')::interval
     LIMIT 1`,
    [EVICTION_MS],
  ).catch(() => ({ rows: [] }));
  return rows.length > 0 ? rowToNode(rows[0] as Record<string, unknown>) : null;
}

export async function getNodeCount(): Promise<number> {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS cnt FROM cluster_nodes
     WHERE last_seen > NOW() - ($1||' milliseconds')::interval AND status != 'dead'`,
    [EVICTION_MS],
  ).catch(() => ({ rows: [{ cnt: 1 }] }));
  return Number((rows[0] as Record<string, unknown>)?.["cnt"] ?? 1);
}

export async function evictDeadNodes(): Promise<number> {
  const { rowCount } = await pool.query(
    `UPDATE cluster_nodes SET status='dead'
     WHERE last_seen < NOW() - ($1||' milliseconds')::interval AND status != 'dead'`,
    [EVICTION_MS],
  ).catch(() => ({ rowCount: 0 }));
  return rowCount ?? 0;
}

export function setNodeRole(role: NodeRole):   void { currentRole   = role; }
export function setNodeStatus(s: NodeStatus):  void { currentStatus = s; }
export function isLeader():                   boolean { return currentRole === "leader"; }
export function getNodeId():                  string  { return NODE_ID; }

function rowToNode(r: Record<string, unknown>): ClusterNode {
  return {
    nodeId:       String(r["node_id"]),
    hostname:     String(r["hostname"]),
    pid:          Number(r["pid"]),
    role:         String(r["role"]) as NodeRole,
    status:       String(r["status"]) as NodeStatus,
    startedAt:    new Date(r["started_at"] as string).getTime(),
    lastSeen:     new Date(r["last_seen"] as string).getTime(),
    capabilities: (r["capabilities"] as string[]) ?? [],
    metadata:     (r["metadata"] as Record<string, unknown>) ?? {},
  };
}
