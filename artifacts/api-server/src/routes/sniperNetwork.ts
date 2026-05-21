/**
 * Sniper Network API
 * GET  /api/sniper/status          — latest result per agent
 * GET  /api/sniper/:agentId/results — paginated history for one agent
 * POST /api/sniper/:agentId/trigger — manually trigger a scan (management+)
 */

import { Router }      from "express";
import { pool }        from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole } from "../middleware/roles";
import { enqueue }     from "../distributed/distributedQueues";
import { logger }      from "../lib/logger";
import type { SniperAgentId } from "../workers/sniperNetworkWorker";

const router = Router();

const VALID_AGENTS: SniperAgentId[] = ["grant_sniper_360", "parts_sniper", "tee_time_sniper"];

// GET /api/sniper/status — most recent scan per agent
router.get("/status", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT DISTINCT ON (agent_id)
        agent_id, status, summary, targets_found, details, scanned_at
      FROM  sniper_jobs
      ORDER BY agent_id, scanned_at DESC
    `);

    const statusMap = Object.fromEntries(
      VALID_AGENTS.map(id => {
        const row = rows.find(r => r.agent_id === id);
        return [id, row ?? { agent_id: id, status: "idle", summary: "No scan data yet", targets_found: 0, details: {}, scanned_at: null }];
      })
    );

    res.json({ ok: true, agents: statusMap });
  } catch (err) {
    req.log.error({ err }, "sniper status error");
    res.status(500).json({ ok: false, error: "Failed to fetch sniper status" });
  }
});

// GET /api/sniper/:agentId/results — history
router.get("/:agentId/results", async (req, res): Promise<void> => {
  const agentId = req.params.agentId as SniperAgentId;
  if (!VALID_AGENTS.includes(agentId)) {
    res.status(400).json({ ok: false, error: "Invalid agent ID" });
    return;
  }

  const limit = Math.min(parseInt(String(req.query.limit ?? "20"), 10), 100);
  const offset = parseInt(String(req.query.offset ?? "0"), 10);

  try {
    const { rows } = await pool.query(
      `SELECT agent_id, status, summary, targets_found, details, scanned_at
       FROM   sniper_jobs
       WHERE  agent_id = $1
       ORDER  BY scanned_at DESC
       LIMIT  $2 OFFSET $3`,
      [agentId, limit, offset],
    );
    res.json({ ok: true, results: rows, limit, offset });
  } catch (err) {
    req.log.error({ err }, "sniper results error");
    res.status(500).json({ ok: false, error: "Failed to fetch results" });
  }
});

// POST /api/sniper/:agentId/trigger — manual trigger (requires management role)
router.post(
  "/:agentId/trigger",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req, res): Promise<void> => {
    const authReq = req as AuthRequest;
    const agentId = req.params.agentId as SniperAgentId;
    if (!VALID_AGENTS.includes(agentId)) {
      res.status(400).json({ ok: false, error: "Invalid agent ID" });
      return;
    }

    try {
      const itemId = await enqueue(`sniper_${agentId}`, { agentId, triggeredBy: authReq.user?.id ?? "manual" }, {
        priority:    "high",
        maxAttempts: 1,
      });
      logger.info({ agentId, itemId, triggeredBy: authReq.user?.id }, "Sniper manual trigger");
      res.json({ ok: true, queued: true, itemId });
    } catch (err) {
      req.log.error({ err }, "sniper trigger error");
      res.status(500).json({ ok: false, error: "Failed to enqueue scan" });
    }
  }
);

export default router;
