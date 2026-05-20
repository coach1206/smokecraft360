/**
 * adminPanelConfig — stores and broadcasts E.A.T module panel visibility state.
 *
 * GET  /api/admin/panel-config          — return current config (auth: manager+)
 * POST /api/admin/panel-config          — update config + broadcast panel_visibility (auth: manager+)
 * POST /api/admin/panel-config/announce — broadcast staff announcement to all kiosks (auth: manager+)
 * POST /api/admin/panel-config/lock     — emergency lock all kiosks (auth: venue_owner+)
 */

import { Router, type Response }      from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { requireRole }                  from "../middleware/roles";
import { getIO }                        from "../lib/socketServer";
import { db, auditLogTable }            from "@workspace/db";
import { logger }                       from "../lib/logger";

const router = Router();

export type PanelVisibility = "on" | "muted" | "hidden";
export interface PanelConfig {
  environment: PanelVisibility;
  asset:       PanelVisibility;
  transaction: PanelVisibility;
  updatedAt:   number;
}

/** In-memory panel config store keyed by venueId (or "global"). */
const configStore = new Map<string, PanelConfig>();

const DEFAULT_CONFIG: PanelConfig = {
  environment: "on",
  asset:       "on",
  transaction: "on",
  updatedAt:   Date.now(),
};

function getConfig(venueId: string): PanelConfig {
  return configStore.get(venueId) ?? { ...DEFAULT_CONFIG };
}

// ── GET /api/admin/panel-config ───────────────────────────────────────────────
router.get(
  "/",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  (req: AuthRequest, res: Response) => {
    const venueId = req.user?.venueId ?? "global";
    res.json(getConfig(venueId));
  },
);

// ── POST /api/admin/panel-config ──────────────────────────────────────────────
router.post(
  "/",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const { environment, asset, transaction } = req.body as Partial<PanelConfig>;
    const venueId = req.user?.venueId ?? "global";
    const current = getConfig(venueId);

    const VALID: PanelVisibility[] = ["on", "muted", "hidden"];
    if (environment !== undefined && !VALID.includes(environment)) {
      res.status(400).json({ error: "invalid environment value" }); return;
    }
    if (asset !== undefined && !VALID.includes(asset)) {
      res.status(400).json({ error: "invalid asset value" }); return;
    }
    if (transaction !== undefined && !VALID.includes(transaction)) {
      res.status(400).json({ error: "invalid transaction value" }); return;
    }

    const updated: PanelConfig = {
      environment: environment ?? current.environment,
      asset:       asset       ?? current.asset,
      transaction: transaction ?? current.transaction,
      updatedAt:   Date.now(),
    };
    configStore.set(venueId, updated);

    // Broadcast panel_visibility to all connected kiosks
    try {
      getIO().emit("panel_visibility", updated);
    } catch {
      // Socket not yet initialised in test env — non-fatal
    }

    // Audit log
    try {
      await db.insert(auditLogTable).values({
        actorId:    req.user?.id ?? null,
        actorRole:  req.user?.role ?? null,
        action:     "panel_config_update",
        entityType: "panel_config",
        entityId:   venueId,
        beforeState: current as unknown as Record<string, unknown>,
        afterState:  updated as unknown as Record<string, unknown>,
        venueId:     req.user?.venueId ?? null,
      });
    } catch (err) {
      logger.warn({ err }, "panel config audit log insert failed");
    }

    req.log.info({ venueId, updated, userId: req.user?.id }, "panel config updated");
    res.json(updated);
  },
);

// ── POST /api/admin/panel-config/announce ─────────────────────────────────────
router.post(
  "/announce",
  requireAuth,
  requireRole("manager", "venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const { message } = req.body as { message?: string };
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      res.status(400).json({ error: "message required" }); return;
    }
    const payload = { message: message.trim(), ts: Date.now(), actorId: req.user?.id };

    try { getIO().emit("staff_announcement", payload); } catch { /* non-fatal */ }

    try {
      await db.insert(auditLogTable).values({
        actorId:    req.user?.id ?? null,
        actorRole:  req.user?.role ?? null,
        action:     "staff_announcement",
        entityType: "broadcast",
        entityId:   "all",
        afterState:  { message: message.trim() },
        venueId:     req.user?.venueId ?? null,
      });
    } catch { /* non-fatal */ }

    req.log.info({ message: message.trim(), userId: req.user?.id }, "staff announcement broadcast");
    res.json({ ok: true, payload });
  },
);

// ── POST /api/admin/panel-config/lock ─────────────────────────────────────────
router.post(
  "/lock",
  requireAuth,
  requireRole("venue_owner", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const payload = { locked: true, ts: Date.now(), actorId: req.user?.id };

    try { getIO().emit("emergency_lock", payload); } catch { /* non-fatal */ }

    try {
      await db.insert(auditLogTable).values({
        actorId:    req.user?.id ?? null,
        actorRole:  req.user?.role ?? null,
        action:     "emergency_lock",
        entityType: "kiosk",
        entityId:   "all",
        afterState:  payload as unknown as Record<string, unknown>,
        venueId:     req.user?.venueId ?? null,
      });
    } catch { /* non-fatal */ }

    req.log.info({ userId: req.user?.id }, "emergency lock broadcast");
    res.json({ ok: true });
  },
);

export default router;
