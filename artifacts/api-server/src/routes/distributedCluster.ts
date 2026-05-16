/**
 * distributedCluster — API routes for multi-node cluster management.
 *
 * GET  /api/cluster/status           — full cluster state (nodes, leader, health)
 * GET  /api/cluster/nodes            — list active nodes
 * GET  /api/cluster/health           — cluster health score + degraded nodes
 * GET  /api/cluster/leader           — current leader info
 * POST /api/cluster/election/run     — trigger manual election (super_admin)
 * POST /api/cluster/leader/abdicate  — force leader abdication (super_admin)
 * GET  /api/cluster/locks            — active distributed locks
 * DELETE /api/cluster/locks/:key     — force-release a lock (super_admin)
 * GET  /api/cluster/queues/:name     — queue stats for a named queue
 * POST /api/cluster/queues/:name/rescue — rescue expired claims
 * GET  /api/cluster/replay/jobs      — pending replay jobs
 * POST /api/cluster/replay/jobs      — create replay job
 * GET  /api/cluster/replay/jobs/:id  — single replay job status
 * POST /api/cluster/replay/recover   — recover stale replay jobs
 * GET  /api/cluster/orchestration    — coordinator status + partition info
 * GET  /api/cluster/nodes/local      — this node's health + role
 *
 * Extended observability:
 * GET  /api/cluster/anomalies        — recent anomaly events
 * GET  /api/cluster/throughput       — per-stream throughput windows
 * GET  /api/cluster/websocket        — WS connection + room health
 * GET  /api/cluster/replay/backlog   — replay backlog stats
 * GET  /api/cluster/orchestration/health — orchestration pipeline health
 * GET  /api/cluster/system           — Node.js process snapshot
 *
 * Governance:
 * GET  /api/cluster/rollouts         — all rollout configs
 * POST /api/cluster/rollouts         — create/update rollout
 * DELETE /api/cluster/rollouts/:key  — disable rollout
 * GET  /api/cluster/constraints/:vid — automation budget status for venue
 * POST /api/cluster/automation/freeze   — freeze all automation
 * POST /api/cluster/automation/unfreeze — unfreeze automation
 * POST /api/cluster/policies/evaluate — evaluate orchestration policy
 *
 * Events + archive:
 * GET  /api/cluster/events/migration  — migration status
 * POST /api/cluster/events/migrate    — run batch migration
 * GET  /api/cluster/events/compat     — compatibility matrix
 * GET  /api/cluster/archive/replay    — replay archive stats
 * POST /api/cluster/archive/snapshots — run snapshot batch
 *
 * Stress testing / simulation:
 * GET  /api/cluster/stress/active     — active stress tests
 * POST /api/cluster/stress/run        — start stress test (non-prod only)
 * POST /api/cluster/stress/:id/stop   — stop a stress test
 * POST /api/cluster/simulation/ai     — run AI scenario simulation
 */

import { Router, type Request, type Response } from "express";
import { requireAuth, type AuthRequest }        from "../middleware/auth";
import { requireRole }                           from "../middleware/roles";

import { getClusterStatus }                from "../distributed/clusterCoordinator";
import { getActiveNodes, getLeaderNode, getNodeCount }  from "../distributed/clusterMembership";
import { runElection, abdicate, getElectionState }      from "../distributed/workerLeaderElection";
import { isLockHeld, getLockHolder, evictExpiredLocks } from "../distributed/distributedLocks";
import { getQueueStats, rescueExpiredClaims }           from "../distributed/distributedQueues";
import { getCoordinatorStatus }            from "../distributed/orchestrationCoordinator";
import { getLocalNodeHealth, getClusterHealthReport }   from "../distributed/nodeHealth";
import {
  getPendingReplays, getReplayJob, recoverStaleReplays, createReplayJob,
} from "../distributed/distributedReplay";

import { getRecentAnomalies }             from "../observability/monitoring/anomalyMonitor";
import { getAllThroughputs }              from "../observability/monitoring/throughputMonitor";
import { getWebsocketRecoveryStatus }    from "../observability/recovery/websocketRecovery";
import { getOpenCircuits, getRecoveryStatus } from "../observability/recovery/orchestrationRecovery";
import { getReplayBacklogStats }         from "../observability/monitoring/replayMonitor";
import { getOrchestrationHealth }        from "../observability/monitoring/orchestrationMonitor";
import { getSystemSnapshot }             from "../observability/metrics/systemMetrics";

import { getAllRolloutConfigs, createRollout, disableRollout, isInRollout } from "../governance/rolloutManager";
import { evaluateOrchestrationPolicy, getActionRisk, type OrchestrationAction } from "../governance/orchestrationPolicies";
import { checkAllConstraints, getBudgetStatus, freezeAutomation, unfreezeAutomation, isAutomationFrozen } from "../governance/automationConstraints";

import { getMigrationStatus, runEventMigration }  from "../events/eventMigration";
import { getCompatibilityMatrix }                  from "../events/replayCompatibility";
import { getArchiveStats }                         from "../archive/replayArchive";
import { runSnapshotBatch }                        from "../archive/operationalSnapshots";

import { getActiveStressTests, runStressTest, stopStressTest, type StressScenario } from "../simulation/stressTesting";
import { runAiSimulation, type SimulationScenario } from "../simulation/aiSimulation";

const router = Router();

// ─── Auth shorthand ───────────────────────────────────────────────────────────
const adminAuth = [requireAuth, requireRole("admin", "super_admin")] as const;
const superAuth = [requireAuth, requireRole("super_admin")] as const;

// ─── Cluster Status ───────────────────────────────────────────────────────────

router.get("/cluster/status", ...adminAuth, async (_req: Request, res: Response) => {
  const status = await getClusterStatus();
  res.json(status);
});

router.get("/cluster/nodes", ...adminAuth, async (_req: Request, res: Response) => {
  const nodes = await getActiveNodes();
  res.json({ nodes, count: nodes.length });
});

router.get("/cluster/health", ...adminAuth, async (_req: Request, res: Response) => {
  const health = await getClusterHealthReport();
  res.json(health);
});

router.get("/cluster/leader", ...adminAuth, async (_req: Request, res: Response) => {
  const [leader, election] = await Promise.all([getLeaderNode(), getElectionState()]);
  res.json({ leader, election });
});

router.get("/cluster/nodes/local", ...adminAuth, (_req: Request, res: Response) => {
  res.json(getLocalNodeHealth());
});

// ─── Election management ──────────────────────────────────────────────────────

router.post("/cluster/election/run", ...superAuth, async (_req: Request, res: Response) => {
  const won = await runElection();
  res.json({ triggered: true, thisNodeWon: won });
});

router.post("/cluster/leader/abdicate", ...superAuth, async (_req: Request, res: Response) => {
  await abdicate();
  res.json({ abdicated: true });
});

// ─── Distributed locks ────────────────────────────────────────────────────────

router.get("/cluster/locks", ...adminAuth, async (req: Request, res: Response) => {
  // List known lock keys and their current holders
  const knownKeys = [
    "leader_election", "orchestration_partition", "replay_archive_job",
    "operational_snapshot", "event_schema_migration", "reconciliation",
  ];
  const locks = await Promise.all(
    knownKeys.map(async key => ({
      key,
      held:   await isLockHeld(key),
      holder: await getLockHolder(key),
    })),
  );
  res.json({ locks });
});

router.delete("/cluster/locks/:key", ...superAuth, async (req: Request, res: Response) => {
  const key = req.params["key"] as string;
  const evicted = await evictExpiredLocks();
  res.json({ key, evicted });
});

// ─── Distributed queues ───────────────────────────────────────────────────────

router.get("/cluster/queues/:name", ...adminAuth, async (req: Request, res: Response) => {
  const name  = req.params["name"] as string;
  const stats = await getQueueStats(name);
  res.json({ queue: name, stats });
});

router.post("/cluster/queues/:name/rescue", ...adminAuth, async (req: Request, res: Response) => {
  const name    = req.params["name"] as string;
  const rescued = await rescueExpiredClaims(name);
  res.json({ queue: name, rescued });
});

// ─── Replay jobs ──────────────────────────────────────────────────────────────

router.get("/cluster/replay/jobs", ...adminAuth, async (_req: Request, res: Response) => {
  const jobs = await getPendingReplays(20);
  res.json({ jobs });
});

router.post("/cluster/replay/jobs", ...adminAuth, async (req: Request, res: Response) => {
  const { replayType, entityId, fromTs, toTs } = req.body as {
    replayType: string; entityId: string; fromTs?: number; toTs?: number;
  };
  const replayId = await createReplayJob(replayType as never, entityId, { fromTs, toTs });
  res.status(201).json({ replayId });
});

router.get("/cluster/replay/jobs/:id", ...adminAuth, async (req: Request, res: Response) => {
  const job = await getReplayJob(req.params["id"] as string);
  if (!job) { res.status(404).json({ error: "not_found" }); return; }
  res.json(job);
});

router.post("/cluster/replay/recover", ...adminAuth, async (_req: Request, res: Response) => {
  const recovered = await recoverStaleReplays();
  res.json({ recovered });
});

// ─── Orchestration coordinator ────────────────────────────────────────────────

router.get("/cluster/orchestration", ...adminAuth, async (_req: Request, res: Response) => {
  const status = await getCoordinatorStatus();
  res.json(status);
});

router.get("/cluster/orchestration/health", ...adminAuth, (_req: Request, res: Response) => {
  res.json(getOrchestrationHealth());
});

router.get("/cluster/orchestration/circuits", ...adminAuth, (_req: Request, res: Response) => {
  res.json({ openCircuits: getOpenCircuits() });
});

// ─── Extended observability ───────────────────────────────────────────────────

router.get("/cluster/anomalies", ...adminAuth, (req: Request, res: Response) => {
  const stream = typeof req.query["stream"] === "string" ? req.query["stream"] : undefined;
  res.json({ anomalies: getRecentAnomalies(stream, 50) });
});

router.get("/cluster/throughput", ...adminAuth, (_req: Request, res: Response) => {
  res.json({ throughputs: getAllThroughputs() });
});

router.get("/cluster/websocket", ...adminAuth, (_req: Request, res: Response) => {
  res.json(getWebsocketRecoveryStatus());
});

router.get("/cluster/replay/backlog", ...adminAuth, async (_req: Request, res: Response) => {
  const stats = await getReplayBacklogStats();
  res.json(stats);
});

router.get("/cluster/system", ...adminAuth, (_req: Request, res: Response) => {
  res.json(getSystemSnapshot());
});

// ─── Governance — rollouts ────────────────────────────────────────────────────

router.get("/cluster/rollouts", ...adminAuth, (_req: Request, res: Response) => {
  res.json({ rollouts: getAllRolloutConfigs() });
});

router.post("/cluster/rollouts", ...adminAuth, async (req: Request, res: Response) => {
  const cfg = req.body as Parameters<typeof createRollout>[0];
  await createRollout(cfg);
  res.status(201).json({ created: cfg.featureKey });
});

router.delete("/cluster/rollouts/:key", ...superAuth, async (req: Request, res: Response) => {
  await disableRollout(req.params["key"] as string);
  res.json({ disabled: req.params["key"] });
});

router.get("/cluster/rollouts/:key/check/:venueId", ...adminAuth, async (req: Request, res: Response) => {
  const inRollout = await isInRollout(req.params["key"] as string, req.params["venueId"] as string);
  res.json({ featureKey: req.params["key"], venueId: req.params["venueId"], inRollout });
});

// ─── Governance — constraints ─────────────────────────────────────────────────

router.get("/cluster/constraints/:venueId", ...adminAuth, (req: Request, res: Response) => {
  const budgets = getBudgetStatus(req.params["venueId"] as string);
  res.json({ venueId: req.params["venueId"], budgets });
});

router.post("/cluster/automation/freeze", ...superAuth, (req: Request, res: Response) => {
  const { reason } = req.body as { reason: string };
  freezeAutomation(reason ?? "admin_override");
  res.json({ frozen: true, reason });
});

router.post("/cluster/automation/unfreeze", ...superAuth, (_req: Request, res: Response) => {
  unfreezeAutomation();
  res.json({ frozen: false });
});

router.get("/cluster/automation/status", ...adminAuth, (_req: Request, res: Response) => {
  res.json(isAutomationFrozen());
});

router.post("/cluster/policies/evaluate", ...adminAuth, (req: Request, res: Response) => {
  const ctx = req.body as Parameters<typeof evaluateOrchestrationPolicy>[0];
  const decision = evaluateOrchestrationPolicy(ctx);
  res.json({ decision, risk: getActionRisk(ctx.action as OrchestrationAction) });
});

// ─── Events ───────────────────────────────────────────────────────────────────

router.get("/cluster/events/migration", ...adminAuth, async (_req: Request, res: Response) => {
  const status = await getMigrationStatus();
  res.json(status);
});

router.post("/cluster/events/migrate", ...superAuth, async (req: Request, res: Response) => {
  const { fromVersion = 1, limit = 1000 } = req.body as { fromVersion?: number; limit?: number };
  const report = await runEventMigration(fromVersion, 3, limit);
  res.json(report);
});

router.get("/cluster/events/compat", ...adminAuth, (_req: Request, res: Response) => {
  res.json(getCompatibilityMatrix());
});

// ─── Archive ──────────────────────────────────────────────────────────────────

router.get("/cluster/archive/replay", ...adminAuth, async (_req: Request, res: Response) => {
  const stats = await getArchiveStats();
  res.json(stats);
});

router.post("/cluster/archive/snapshots", ...adminAuth, async (_req: Request, res: Response) => {
  const result = await runSnapshotBatch();
  res.json(result);
});

// ─── Stress testing / simulation ─────────────────────────────────────────────

router.get("/cluster/stress/active", ...adminAuth, (_req: Request, res: Response) => {
  res.json({ tests: getActiveStressTests() });
});

router.post("/cluster/stress/run", ...superAuth, async (req: Request, res: Response) => {
  if (process.env["NODE_ENV"] === "production") {
    res.status(403).json({ error: "stress_tests_disabled_in_production" });
    return;
  }
  const config = req.body as Parameters<typeof runStressTest>[1];
  const testId  = `stress_${Date.now()}`;
  // Run async — return test ID immediately
  runStressTest(testId, config).catch(() => {});
  res.status(202).json({ testId, status: "started" });
});

router.post("/cluster/stress/:id/stop", ...superAuth, (req: Request, res: Response) => {
  const stopped = stopStressTest(req.params["id"] as string);
  res.json({ stopped });
});

router.post("/cluster/simulation/ai", ...adminAuth, async (req: Request, res: Response) => {
  const { venueId, scenario, seed } = req.body as {
    venueId: string; scenario: SimulationScenario; seed?: number;
  };
  const result = await runAiSimulation(venueId, scenario, seed);
  res.json(result);
});

export default router;
