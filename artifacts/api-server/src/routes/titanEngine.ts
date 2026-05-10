/**
 * Titan V Intervention Engine
 * 360 Enterprises Services LLC · Johnie Manuel Lee Collins
 *
 * Monitors biometric sync data and fires environmental interventions.
 *
 * STRESS_TRIGGER   — stress_index > 75  → SET_LIGHTING_CALM_BLUE + ENGAGE_SOVEREIGN_DND
 * VITALITY_TRIGGER — vitality < 20      → INITIATE_RECHARGE_PROTOCOL + NOTIFY_SOVEREIGN_OPERATOR
 * REVENUE_TRIGGER  — HR > 80 + STR < 40 → TRIGGER_UPSELL_PROMPT
 * SIGNAL_FAILSAFE  — signal lost > 60s  → OBSIDIAN_REAUTH_REQUIRED
 */

import { Router } from "express";
import { pool }   from "@workspace/db";
import { logger } from "../lib/logger";

const router = Router();

// ── Bootstrap ─────────────────────────────────────────────────────────────────

pool.query(`
  CREATE TABLE IF NOT EXISTS titan_interventions (
    id               SERIAL PRIMARY KEY,
    trigger_type     TEXT        NOT NULL,
    node_id          TEXT        NOT NULL,
    commands         JSONB       NOT NULL,
    payload_snapshot JSONB,
    status           TEXT        NOT NULL DEFAULT 'TRIGGERED',
    severity         TEXT        NOT NULL DEFAULT 'MEDIUM',
    triggered_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acked_at         TIMESTAMPTZ
  );
  CREATE INDEX IF NOT EXISTS idx_titan_interventions_node_type
    ON titan_interventions (node_id, trigger_type, triggered_at DESC);
`).catch(() => {});

// ── Types ─────────────────────────────────────────────────────────────────────

type TriggerType = "STRESS_TRIGGER" | "VITALITY_TRIGGER" | "REVENUE_TRIGGER" | "SIGNAL_FAILSAFE";
type Severity    = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface SyncPayload {
  heart_rate?:   number;
  temperature?:  number;
  stress_index?: number;
  signal_db?:    number;
  vitality?:     number;
  [key: string]: unknown;
}

// ── Dedup guard — suppresses re-fire within 5 minutes per node+type ───────────

async function recentlyFired(nodeId: string, type: TriggerType): Promise<boolean> {
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM titan_interventions
     WHERE node_id = $1 AND trigger_type = $2
       AND triggered_at > NOW() - INTERVAL '5 minutes'`,
    [nodeId, type],
  );
  return parseInt(rows[0]?.count ?? "0", 10) > 0;
}

// ── Fire ──────────────────────────────────────────────────────────────────────

async function fire(
  nodeId:   string,
  type:     TriggerType,
  commands: string[],
  severity: Severity,
  snapshot: SyncPayload = {},
): Promise<void> {
  if (await recentlyFired(nodeId, type)) return;
  await pool.query(
    `INSERT INTO titan_interventions
       (trigger_type, node_id, commands, payload_snapshot, severity)
     VALUES ($1, $2, $3, $4, $5)`,
    [type, nodeId, JSON.stringify(commands), JSON.stringify(snapshot), severity],
  );
  logger.info({ nodeId, type, commands, severity }, "TITAN V — intervention fired");
  if (type === "VITALITY_TRIGGER") {
    notifyOperator(nodeId, snapshot).catch(() => {});
  }
}

// ── Operator email ────────────────────────────────────────────────────────────

async function notifyOperator(nodeId: string, snap: SyncPayload): Promise<void> {
  const key  = process.env["SENDGRID_API_KEY"];
  const from = process.env["SENDGRID_FROM_EMAIL"] ?? "noreply@novee.os";
  if (!key) return;
  await fetch("https://api.sendgrid.com/v3/mail/send", {
    method:  "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: "jc@dayone360.com", name: "Johnie Collins" }] }],
      from: { email: from, name: "Titan V Kernel" },
      subject: "⚠ CRITICAL — Recharge Protocol Initiated",
      content: [{
        type: "text/html",
        value: `
<div style="font-family:monospace;background:#050505;color:#F5F2ED;padding:32px;border-radius:12px">
  <div style="color:#D4AF37;font-size:18px;font-weight:700;letter-spacing:0.14em;margin-bottom:16px">
    TITAN V KERNEL — VITALITY CRITICAL
  </div>
  <div style="color:#ef4444;font-size:14px;margin-bottom:16px">
    TITAN_EXEC: INITIATE_RECHARGE_PROTOCOL
  </div>
  <table style="border-collapse:collapse;margin-bottom:16px">
    <tr><td style="color:#B89030;padding:4px 12px 4px 0;font-size:11px">NODE</td>
        <td style="color:#F5F2ED;font-size:11px">${nodeId}</td></tr>
    <tr><td style="color:#B89030;padding:4px 12px 4px 0;font-size:11px">VITALITY</td>
        <td style="color:#ef4444;font-size:11px">${snap.vitality ?? "< 20"} / 100</td></tr>
    <tr><td style="color:#B89030;padding:4px 12px 4px 0;font-size:11px">HEART RATE</td>
        <td style="color:#F5F2ED;font-size:11px">${snap.heart_rate ?? "—"} BPM</td></tr>
    <tr><td style="color:#B89030;padding:4px 12px 4px 0;font-size:11px">TRIGGERED</td>
        <td style="color:#F5F2ED;font-size:11px">${new Date().toUTCString()}</td></tr>
  </table>
  <div style="color:rgba(245,242,237,0.45);font-size:10px">
    360 Enterprises Services LLC · Novee OS Titan V
  </div>
</div>`,
      }],
    }),
  });
  logger.info({ nodeId }, "TITAN V — operator notified via email");
}

// ── Core evaluator — exported; called by the sync endpoint ───────────────────

export async function evaluateAndFireInterventions(
  nodeId:  string,
  payload: SyncPayload,
): Promise<void> {
  const jobs: Promise<void>[] = [];

  if ((payload.stress_index ?? 0) > 75) {
    jobs.push(fire(nodeId, "STRESS_TRIGGER",
      ["SET_LIGHTING_CALM_BLUE", "ENGAGE_SOVEREIGN_DND"], "HIGH", payload));
  }

  if ((payload.vitality ?? 100) < 20) {
    jobs.push(fire(nodeId, "VITALITY_TRIGGER",
      ["INITIATE_RECHARGE_PROTOCOL", "NOTIFY_SOVEREIGN_OPERATOR"], "CRITICAL", payload));
  }

  // Engaged patron: elevated HR + calm stress
  if ((payload.heart_rate ?? 0) > 80 && (payload.stress_index ?? 100) < 40) {
    jobs.push(fire(nodeId, "REVENUE_TRIGGER",
      ["TRIGGER_UPSELL_PROMPT"], "MEDIUM", payload));
  }

  await Promise.allSettled(jobs);
}

// ── Signal loss monitor — exported; started in app.ts ────────────────────────

export function startSignalMonitor(): void {
  const run = async () => {
    try {
      const { rows } = await pool.query<{
        hardware_id: string;
        last_sync_payload: SyncPayload | null;
      }>(
        `SELECT hardware_id, last_sync_payload
         FROM sovereign_hardware_nodes
         WHERE authorized = TRUE
           AND last_sync_at IS NOT NULL
           AND last_sync_at < NOW() - INTERVAL '60 seconds'`,
      );
      for (const node of rows) {
        await fire(node.hardware_id, "SIGNAL_FAILSAFE",
          ["OBSIDIAN_REAUTH_REQUIRED"], "HIGH",
          { signal_db: node.last_sync_payload?.signal_db });
      }
    } catch (err) {
      logger.error({ err }, "Titan V — signal monitor error");
    }
  };
  setInterval(() => { run().catch(() => {}); }, 30_000);
  logger.info("Titan V — signal monitor armed (30 s interval)");
}

// ── GET /api/titan/interventions ─────────────────────────────────────────────

router.get("/titan/interventions", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, trigger_type, node_id, commands, payload_snapshot,
              status, severity, triggered_at, acked_at
       FROM titan_interventions
       ORDER BY triggered_at DESC
       LIMIT 50`,
    );
    res.json({ interventions: rows });
  } catch (err) {
    logger.error({ err }, "GET /titan/interventions error");
    res.status(500).json({ error: "Failed to fetch interventions" });
  }
});

// ── POST /api/titan/interventions/:id/acknowledge ────────────────────────────

router.post("/titan/interventions/:id/acknowledge", async (req, res) => {
  const id = parseInt(req.params["id"] ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    await pool.query(
      `UPDATE titan_interventions
       SET status = 'ACKNOWLEDGED', acked_at = NOW()
       WHERE id = $1`,
      [id],
    );
    res.json({ ok: true, acknowledged: id });
  } catch (err) {
    logger.error({ err }, "titan/interventions/:id/acknowledge error");
    res.status(500).json({ error: "Acknowledge failed" });
  }
});

// ── GET /api/titan/status ─────────────────────────────────────────────────────

router.get("/titan/status", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT trigger_type,
              COUNT(*)                                             AS total,
              COUNT(*) FILTER (WHERE status = 'TRIGGERED')        AS active,
              MAX(triggered_at)                                    AS last_fired
       FROM titan_interventions
       WHERE triggered_at > NOW() - INTERVAL '24 hours'
       GROUP BY trigger_type`,
    );
    res.json({ status: rows });
  } catch (err) {
    logger.error({ err }, "GET /titan/status error");
    res.status(500).json({ error: "Failed to fetch status" });
  }
});

export default router;
