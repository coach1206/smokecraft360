/**
 * orchestrationRollback — rollback support for failed or undesired
 * orchestration actions.
 *
 * Strategy: compensating actions (not undo-log based), meaning each
 * rollback emits the inverse action and records it in the audit log.
 *
 * Supported rollback types:
 *   - ambient_scene: revert to previous scene
 *   - feature_flag: restore previous flag value
 *   - orchestration_pause: lift emergency pause
 *   - custom: caller-provided compensating payload
 */

import { pool }    from "@workspace/db";
import { logger }  from "../../lib/logger";
import { publish } from "../../realtime/transport/eventBus";

export type RollbackType =
  | "ambient_scene"
  | "feature_flag"
  | "orchestration_pause"
  | "adaptive_optimization"
  | "custom";

export interface RollbackRequest {
  venueId:       string;
  rollbackType:  RollbackType;
  targetEventId: string;           // orchestration_event or adaptive_log id to roll back
  reason:        string;
  requestedBy:   string;           // staff_id or "system"
  compensating:  Record<string, unknown>;
}

export interface RollbackResult {
  success:       boolean;
  rollbackId:    string;
  venueId:       string;
  rollbackType:  RollbackType;
  compensatedAt: number;
  reason:        string;
  error?:        string;
}

export async function rollback(req: RollbackRequest): Promise<RollbackResult> {
  const rollbackId = `rb-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  try {
    logger.info(
      { venueId: req.venueId, rollbackType: req.rollbackType, targetEventId: req.targetEventId },
      "orchestrationRollback: initiating",
    );

    // Execute compensating action based on type
    switch (req.rollbackType) {
      case "ambient_scene":
        await rollbackAmbientScene(req);
        break;
      case "adaptive_optimization":
        await rollbackAdaptiveOptimization(req);
        break;
      case "orchestration_pause":
        await rollbackOrchestrationPause(req);
        break;
      case "feature_flag":
      case "custom":
        // Custom compensating payload — emit to orchestration channel
        await publish("orchestration", {
          event: "ROLLBACK_COMPENSATING_ACTION",
          venueId:      req.venueId,
          rollbackType: req.rollbackType,
          compensating: req.compensating,
          rollbackId,
          requestedBy:  req.requestedBy,
          reason:       req.reason,
        });
        break;
    }

    // Audit log
    await pool.query(
      `INSERT INTO orchestration_events
         (venue_id, event_type, payload, created_at)
       VALUES ($1,'orchestration_rollback',$2,NOW())`,
      [
        req.venueId,
        JSON.stringify({
          rollbackId, rollbackType: req.rollbackType,
          targetEventId: req.targetEventId, reason: req.reason,
          requestedBy: req.requestedBy, compensating: req.compensating,
        }),
      ],
    );

    // Mark adaptive log as rolled back if applicable
    if (req.rollbackType === "adaptive_optimization") {
      await pool.query(
        `UPDATE adaptive_optimization_logs
         SET rolled_back = TRUE, resolved_at = NOW()
         WHERE id = $1 AND venue_id = $2`,
        [req.targetEventId, req.venueId],
      ).catch(() => {});
    }

    return {
      success: true, rollbackId, venueId: req.venueId,
      rollbackType: req.rollbackType, compensatedAt: Date.now(), reason: req.reason,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "unknown";
    logger.error({ err, venueId: req.venueId, rollbackId }, "orchestrationRollback: failed");
    return {
      success: false, rollbackId, venueId: req.venueId,
      rollbackType: req.rollbackType, compensatedAt: Date.now(),
      reason: req.reason, error: errorMsg,
    };
  }
}

async function rollbackAmbientScene(req: RollbackRequest): Promise<void> {
  // Find the scene that was active before the target event
  const { rows } = await pool.query(
    `SELECT scene_id, scene_name FROM environmental_states
     WHERE venue_id = $1 AND deactivated_at IS NOT NULL
     ORDER BY deactivated_at DESC LIMIT 2`,
    [req.venueId],
  );
  const prev = (rows[1] ?? rows[0]) as Record<string, unknown> | undefined;
  const sceneId = prev?.scene_id ?? "standard";
  const sceneName = prev?.scene_name ?? "Standard";

  await pool.query(
    `UPDATE environmental_states SET is_active=FALSE, deactivated_at=NOW()
     WHERE venue_id=$1 AND is_active=TRUE`,
    [req.venueId],
  );
  await pool.query(
    `INSERT INTO environmental_states
       (venue_id, scene_id, scene_name, is_active, triggered_by, activated_at)
     VALUES ($1,$2,$3,TRUE,'rollback',NOW())`,
    [req.venueId, sceneId, sceneName],
  );
  await publish("ambient", {
    event:"SCENE_ROLLBACK", venueId:req.venueId, sceneId, sceneName, reason:req.reason,
  });
}

async function rollbackAdaptiveOptimization(req: RollbackRequest): Promise<void> {
  const { rows } = await pool.query(
    `SELECT before_state, optimization_type FROM adaptive_optimization_logs
     WHERE id=$1 AND venue_id=$2`,
    [req.targetEventId, req.venueId],
  );
  const log = rows[0] as Record<string, unknown> | undefined;
  if (!log) return;

  await publish("orchestration", {
    event:"ADAPTIVE_ROLLBACK", venueId:req.venueId,
    optimizationType: log.optimization_type,
    restoredState: log.before_state,
    reason: req.reason,
  });
}

async function rollbackOrchestrationPause(req: RollbackRequest): Promise<void> {
  await publish("orchestration", {
    event:"EMERGENCY_PAUSE_LIFTED", venueId:req.venueId,
    requestedBy: req.requestedBy, reason: req.reason,
  });
}
