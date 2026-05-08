/**
 * sessionSnapshots.ts — Session Snapshot + Operational Mode Service
 *
 * Captures full guest session state before staff handoff and restores it
 * exactly when staff releases the experience. No reload, no progression loss.
 *
 * Routes:
 *   POST   /api/snapshots                  — capture snapshot
 *   GET    /api/snapshots/:id              — restore snapshot by ID
 *   GET    /api/snapshots/guest/:guestId   — latest snapshot for guest
 *   DELETE /api/snapshots/:id              — expire / dismiss snapshot
 *
 *   POST   /api/operational/start          — staff session start + ripple trigger
 *   POST   /api/operational/end            — staff session end + resume guest
 *   GET    /api/operational/status/:devId  — current mode for device
 */

import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { z } from "zod";
import { getIO } from "../lib/socketServer";
import { logger } from "../lib/logger";

const router = Router();

async function q(query: string, params: unknown[] = []): Promise<{ rows: unknown[] }> {
  return pool.query(query, params);
}

// ── POST /api/snapshots ───────────────────────────────────────────────────────

const SnapshotBody = z.object({
  guestProfileId:  z.string().uuid().nullable().optional(),
  sessionId:       z.string().uuid().nullable().optional(),
  craftType:       z.enum(["smoke", "pour", "brew", "vape"]),
  xpState:         z.record(z.unknown()).default({}),
  mentorContext:   z.record(z.unknown()).default({}),
  swipeState:      z.record(z.unknown()).default({}),
  challengeState:  z.record(z.unknown()).optional().default({}),
  environmentState: z.record(z.unknown()).optional().default({}),
  scrollPosition:  z.number().int().default(0),
  snapshotReason:  z.string().default("staff_handoff"),
});

router.post("/", async (req: Request, res: Response) => {
  const parsed = SnapshotBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid snapshot body", issues: parsed.error.issues });
    return;
  }
  const d = parsed.data;

  try {
    const { rows } = await q(
      `INSERT INTO session_snapshots
         (guest_profile_id, session_id, craft_type, xp_state, mentor_context, swipe_state,
          challenge_state, environment_state, scroll_position, snapshot_reason, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now() + interval '2 hours')
       RETURNING id, created_at`,
      [
        d.guestProfileId ?? null, d.sessionId ?? null, d.craftType,
        JSON.stringify(d.xpState), JSON.stringify(d.mentorContext), JSON.stringify(d.swipeState),
        JSON.stringify(d.challengeState), JSON.stringify(d.environmentState),
        d.scrollPosition, d.snapshotReason,
      ],
    );

    const snap = (rows as Array<{ id: string; created_at: string }>)[0];
    logger.info({ snapshotId: snap?.id, craftType: d.craftType }, "session snapshot captured");
    res.json({ snapshotId: snap?.id, capturedAt: snap?.created_at });
  } catch (err) {
    logger.error({ err }, "snapshot capture error");
    res.status(500).json({ error: "Snapshot failed" });
  }
});

// ── GET /api/snapshots/:id ────────────────────────────────────────────────────

router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  try {
    const { rows } = await q(
      `SELECT * FROM session_snapshots WHERE id = $1 AND expires_at > now() LIMIT 1`,
      [id],
    );
    const snap = (rows as Array<Record<string, unknown>>)[0];
    if (!snap) {
      res.status(404).json({ error: "Snapshot not found or expired" });
      return;
    }
    res.json(snap);
  } catch (err) {
    logger.error({ err }, "snapshot restore error");
    res.status(500).json({ error: "Restore failed" });
  }
});

// ── GET /api/snapshots/guest/:guestId ────────────────────────────────────────

router.get("/guest/:guestId", async (req: Request, res: Response) => {
  const { guestId } = req.params as { guestId: string };
  try {
    const { rows } = await q(
      `SELECT * FROM session_snapshots
       WHERE guest_profile_id = $1 AND expires_at > now()
       ORDER BY created_at DESC LIMIT 1`,
      [guestId],
    );
    const snap = (rows as Array<Record<string, unknown>>)[0];
    res.json(snap ?? null);
  } catch (err) {
    logger.error({ err }, "guest snapshot fetch error");
    res.status(500).json({ error: "Fetch failed" });
  }
});

// ── DELETE /api/snapshots/:id ─────────────────────────────────────────────────

router.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  try {
    await q(`DELETE FROM session_snapshots WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "snapshot delete error");
    res.status(500).json({ error: "Delete failed" });
  }
});

// ── Operational Mode ──────────────────────────────────────────────────────────

const operationalRouter = Router();

const StartBody = z.object({
  staffUserId:    z.string().uuid(),
  deviceId:       z.string().uuid().optional(),
  venueId:        z.string().uuid().optional(),
  triggerMethod:  z.enum(["pin", "nfc", "qr", "fingerprint", "badge"]).default("pin"),
  triggerX:       z.number().int().optional(),
  triggerY:       z.number().int().optional(),
  guestSnapshotId: z.string().uuid().optional(),
  operationalMode: z.string().default("floor_view"),
});

operationalRouter.post("/start", async (req: Request, res: Response) => {
  const parsed = StartBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body" });
    return;
  }
  const d = parsed.data;

  try {
    const { rows } = await q(
      `INSERT INTO staff_sessions
         (staff_user_id, device_id, venue_id, trigger_method, trigger_x, trigger_y,
          guest_snapshot_id, operational_mode)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, created_at`,
      [d.staffUserId, d.deviceId ?? null, d.venueId ?? null, d.triggerMethod,
       d.triggerX ?? null, d.triggerY ?? null, d.guestSnapshotId ?? null, d.operationalMode],
    );

    const sess = (rows as Array<{ id: string; created_at: string }>)[0];

    await q(
      `INSERT INTO operational_logs (staff_user_id, action, target_type, detail)
       VALUES ($1, 'staff_mode_started', 'device', $2)`,
      [d.staffUserId, JSON.stringify({ deviceId: d.deviceId, triggerMethod: d.triggerMethod })],
    );

    const io = getIO();
    io.emit("staff_mode_started", {
      staffSessionId: sess?.id,
      deviceId:       d.deviceId,
      triggerX:       d.triggerX ?? null,
      triggerY:       d.triggerY ?? null,
      triggerMethod:  d.triggerMethod,
      ts:             Date.now(),
    });

    logger.info({ staffSessionId: sess?.id, method: d.triggerMethod }, "staff operational mode started");
    res.json({ staffSessionId: sess?.id, startedAt: sess?.created_at });
  } catch (err) {
    logger.error({ err }, "operational start error");
    res.status(500).json({ error: "Could not start operational mode" });
  }
});

operationalRouter.post("/end", async (req: Request, res: Response) => {
  const { staffSessionId, staffUserId, snapshotId } = req.body as {
    staffSessionId: string; staffUserId: string; snapshotId?: string;
  };

  if (!staffSessionId || !staffUserId) {
    res.status(400).json({ error: "staffSessionId and staffUserId required" });
    return;
  }

  try {
    await q(
      `UPDATE staff_sessions SET ended_at = now() WHERE id = $1`,
      [staffSessionId],
    );

    await q(
      `INSERT INTO operational_logs (staff_user_id, action, target_type, detail)
       VALUES ($1, 'staff_mode_ended', 'device', $2)`,
      [staffUserId, JSON.stringify({ staffSessionId, snapshotId })],
    );

    let resumeContext: Record<string, unknown> | null = null;
    if (snapshotId) {
      const { rows } = await q(
        `SELECT * FROM session_snapshots WHERE id = $1 AND expires_at > now() LIMIT 1`,
        [snapshotId],
      );
      resumeContext = (rows as Array<Record<string, unknown>>)[0] ?? null;
    }

    const io = getIO();
    io.emit("staff_mode_ended", {
      staffSessionId,
      resumeContext,
      mentorMessage: pickResumeMessage(),
      ts: Date.now(),
    });

    res.json({ ok: true, resumeContext });
  } catch (err) {
    logger.error({ err }, "operational end error");
    res.status(500).json({ error: "Could not end operational mode" });
  }
});

operationalRouter.get("/status/:deviceId", async (req: Request, res: Response) => {
  const { deviceId } = req.params as { deviceId: string };
  try {
    const { rows } = await q(
      `SELECT id, operational_mode, created_at FROM staff_sessions
       WHERE device_id = $1 AND ended_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
      [deviceId],
    );
    const active = (rows as Array<Record<string, unknown>>)[0];
    res.json({ active: !!active, session: active ?? null });
  } catch (err) {
    logger.error({ err }, "operational status error");
    res.status(500).json({ error: "Status unavailable" });
  }
});

function pickResumeMessage(): string {
  const msgs = [
    "Your experience has been updated — where were we?",
    "Welcome back. The humidor remembers your preferences.",
    "The craft continues. Your selections have been preserved.",
    "Your session has been restored. Shall we continue?",
    "Everything is exactly as you left it.",
  ];
  return msgs[Math.floor(Math.random() * msgs.length)]!;
}

export { operationalRouter };
export default router;
