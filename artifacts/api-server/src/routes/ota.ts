/**
 * /api/ota — OTA Update + Version Management Engine
 *
 * Manages deployment channels, version history, and remote update coordination
 * for all venue kiosks and devices. Devices report their version on heartbeat;
 * server flags mismatches and queues update commands via offlineQueue.
 *
 *   GET  /api/ota/channels              list all deployment channels
 *   GET  /api/ota/channels/:channel     get channel detail + version history
 *   POST /api/ota/channels/:channel/deploy  deploy a version to a channel
 *   POST /api/ota/channels/:channel/rollback  rollback to previous version
 *   GET  /api/ota/fleet                 device version compliance summary
 *   POST /api/ota/fleet/push            push update to all devices on a channel
 *   GET  /api/ota/history               full deployment history (super_admin)
 *
 * Auth: super_admin for deploy/rollback/push; venue_owner+ for reads.
 */

import { Router, type IRouter, type Response } from "express";
import { z }                                   from "zod/v4";
import { db, devicesTable, offlineQueueTable } from "@workspace/db";
import { eq, desc }                            from "drizzle-orm";
import { requireAuth, type AuthRequest }       from "../middleware/auth";
import { requireRole }                         from "../middleware/roles";
import { logAudit }                            from "../lib/audit";
import { logger }                              from "../lib/logger";

const router: IRouter = Router();

// ── In-memory deployment state ─────────────────────────────────────────────
// In a full production system these would be DB-backed. Modelled as a rich
// in-memory store since there is no dedicated OTA schema table.

type Channel = "production" | "staging" | "beta";

interface VersionEntry {
  version:     string;
  label:       string;
  notes:       string;
  deployedAt:  string;
  deployedBy:  string;
  status:      "active" | "rolled_back" | "superseded";
  riskLevel:   "low" | "medium" | "high";
  packs:       string[]; // feature packs included
}

interface ChannelState {
  channel:       Channel;
  currentVersion: string;
  previousVersion: string | null;
  minSupported:   string;
  autoPromote:    boolean; // auto-promote staging → production
  freezeWindow:   boolean; // block deploys during peak hours
  history:       VersionEntry[];
}

const CHANNELS: Record<Channel, ChannelState> = {
  production: {
    channel: "production", currentVersion: "2.4.1", previousVersion: "2.4.0",
    minSupported: "2.3.0", autoPromote: false, freezeWindow: false,
    history: [
      {
        version: "2.4.1", label: "Revenue Brain v2 + Governance Panel",
        notes: "Swipe Intelligence Dashboard, Enterprise Governance control layer, kill-switch hardening.",
        deployedAt: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
        deployedBy: "Platform", status: "active", riskLevel: "medium",
        packs: ["revenue-brain-v2", "governance-panel", "swipe-intelligence"],
      },
      {
        version: "2.4.0", label: "Human Foundation + Presence Engine",
        notes: "Guest enrollment flow, mentor reveal, geofence presence detection.",
        deployedAt: new Date(Date.now() - 9 * 24 * 3600000).toISOString(),
        deployedBy: "Platform", status: "superseded", riskLevel: "medium",
        packs: ["human-foundation", "presence-engine"],
      },
      {
        version: "2.3.5", label: "POS Security Hardening",
        notes: "PIN lockout, inactivity guards, PosAuditBridge, reward fraud protection.",
        deployedAt: new Date(Date.now() - 21 * 24 * 3600000).toISOString(),
        deployedBy: "Platform", status: "superseded", riskLevel: "high",
        packs: ["pos-security", "audit-bridge"],
      },
    ],
  },
  staging: {
    channel: "staging", currentVersion: "2.5.0-rc1", previousVersion: "2.4.1",
    minSupported: "2.4.0", autoPromote: false, freezeWindow: false,
    history: [
      {
        version: "2.5.0-rc1", label: "Central Command + OTA Engine",
        notes: "Axiom Central Command dashboard, OTA update infrastructure, remote device actions.",
        deployedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
        deployedBy: "Platform", status: "active", riskLevel: "medium",
        packs: ["central-command", "ota-engine", "remote-device-actions"],
      },
    ],
  },
  beta: {
    channel: "beta", currentVersion: "2.5.0-beta.3", previousVersion: "2.5.0-beta.2",
    minSupported: "2.4.0", autoPromote: false, freezeWindow: false,
    history: [
      {
        version: "2.5.0-beta.3", label: "Environmental Reaction Engine (Preview)",
        notes: "Ambient overlay system, atmosphere mood profiles, lounge energy detection.",
        deployedAt: new Date(Date.now() - 1 * 3600000).toISOString(),
        deployedBy: "Platform", status: "active", riskLevel: "low",
        packs: ["environmental-engine", "ambient-overlay"],
      },
      {
        version: "2.5.0-beta.2", label: "AI Social Engine (Preview)",
        notes: "Campaign content generation, slow-hour recovery, automated engagement.",
        deployedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
        deployedBy: "Platform", status: "superseded", riskLevel: "low",
        packs: ["ai-social", "campaign-gen"],
      },
    ],
  },
};

// ── Deploy schema ──────────────────────────────────────────────────────────

const deploySchema = z.object({
  version:   z.string().min(1).max(50),
  label:     z.string().min(1).max(120),
  notes:     z.string().max(500).optional().default(""),
  riskLevel: z.enum(["low", "medium", "high"]).optional().default("medium"),
  packs:     z.array(z.string()).optional().default([]),
});

const VALID_CHANNELS = new Set<string>(["production", "staging", "beta"]);

// ── GET /api/ota/channels ──────────────────────────────────────────────────

router.get(
  "/channels",
  requireAuth,
  requireRole("venue_owner", "manager", "super_admin"),
  (_req: AuthRequest, res: Response) => {
    const summary = Object.values(CHANNELS).map(c => ({
      channel:        c.channel,
      currentVersion: c.currentVersion,
      previousVersion: c.previousVersion,
      deployCount:    c.history.length,
      lastDeployedAt: c.history[0]?.deployedAt ?? null,
      freezeWindow:   c.freezeWindow,
      autoPromote:    c.autoPromote,
    }));
    res.json({ channels: summary });
  },
);

// ── GET /api/ota/channels/:channel ────────────────────────────────────────

router.get(
  "/channels/:channel",
  requireAuth,
  requireRole("venue_owner", "manager", "super_admin"),
  (req: AuthRequest, res: Response) => {
    const ch = String(req.params["channel"] ?? "");
    if (!VALID_CHANNELS.has(ch)) {
      res.status(404).json({ error: "Unknown channel" });
      return;
    }
    res.json(CHANNELS[ch as Channel]);
  },
);

// ── POST /api/ota/channels/:channel/deploy ────────────────────────────────

router.post(
  "/channels/:channel/deploy",
  requireAuth,
  requireRole("super_admin"),
  async (req: AuthRequest, res: Response) => {
    const ch = String(req.params["channel"] ?? "");
    if (!VALID_CHANNELS.has(ch)) {
      res.status(404).json({ error: "Unknown channel" });
      return;
    }
    const state = CHANNELS[ch as Channel];

    if (state.freezeWindow) {
      res.status(409).json({ error: "Deployment blocked — freeze window active" });
      return;
    }

    const parsed = deploySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues });
      return;
    }

    const { version, label, notes, riskLevel, packs } = parsed.data;
    const prev = state.currentVersion;

    // Mark previous active entry as superseded
    for (const h of state.history) {
      if (h.status === "active") h.status = "superseded";
    }

    const entry: VersionEntry = {
      version, label, notes: notes ?? "", riskLevel,
      packs: packs ?? [],
      deployedAt: new Date().toISOString(),
      deployedBy: req.user!.name ?? req.user!.email,
      status: "active",
    };

    state.history.unshift(entry);
    state.previousVersion = prev;
    state.currentVersion  = version;

    await logAudit(req, {
      action:     "ota.deploy",
      entityType: "deployment",
      entityId:   null,
      before:     { channel: ch, version: prev },
      after:      { channel: ch, version, label, riskLevel },
      venueId:    req.user!.venueId ?? null,
    });

    logger.info({ channel: ch, version, deployedBy: req.user!.id }, "OTA deploy executed");
    res.status(201).json({ channel: ch, version, previous: prev, entry });
  },
);

// ── POST /api/ota/channels/:channel/rollback ──────────────────────────────

router.post(
  "/channels/:channel/rollback",
  requireAuth,
  requireRole("super_admin"),
  async (req: AuthRequest, res: Response) => {
    const ch = String(req.params["channel"] ?? "");
    if (!VALID_CHANNELS.has(ch)) {
      res.status(404).json({ error: "Unknown channel" });
      return;
    }
    const state = CHANNELS[ch as Channel];

    if (!state.previousVersion) {
      res.status(409).json({ error: "No previous version to roll back to" });
      return;
    }

    const current = state.currentVersion;
    const target  = state.previousVersion;

    // Mark current active as rolled_back
    for (const h of state.history) {
      if (h.status === "active") h.status = "rolled_back";
    }

    // Restore the previous version entry
    const prevEntry = state.history.find(h => h.version === target);
    if (prevEntry) prevEntry.status = "active";

    state.currentVersion  = target;
    state.previousVersion = null;

    await logAudit(req, {
      action:     "ota.rollback",
      entityType: "deployment",
      entityId:   null,
      before:     { channel: ch, version: current },
      after:      { channel: ch, version: target },
      venueId:    req.user!.venueId ?? null,
    });

    logger.warn({ channel: ch, rolledBackFrom: current, rolledBackTo: target }, "OTA rollback executed");
    res.json({ channel: ch, rolledBackFrom: current, restoredTo: target });
  },
);

// ── GET /api/ota/fleet ────────────────────────────────────────────────────
// Returns version compliance for all devices the caller can see.

router.get(
  "/fleet",
  requireAuth,
  requireRole("venue_owner", "manager", "super_admin"),
  async (req: AuthRequest, res: Response) => {
    const isSuper = req.user!.role === "super_admin";
    const venueId = req.user!.venueId;

    const devices = isSuper
      ? await db.select().from(devicesTable).orderBy(desc(devicesTable.lastActiveAt))
      : venueId
        ? await db.select().from(devicesTable).where(eq(devicesTable.venueId, venueId))
        : [];

    const prodVersion = CHANNELS.production.currentVersion;

    const fleet = devices.map(d => {
      // Heartbeat updates nickname to `v<version>` — extract it
      const reportedVersion = d.nickname?.startsWith("v") ? d.nickname.slice(1) : null;
      const compliant = reportedVersion === prodVersion;
      const minutesSinceHeartbeat = d.lastActiveAt
        ? Math.floor((Date.now() - new Date(d.lastActiveAt).getTime()) / 60000)
        : null;

      return {
        id:                   d.id,
        venueId:              d.venueId,
        type:                 d.type,
        nickname:             d.nickname,
        status:               d.status,
        reportedVersion,
        targetVersion:        prodVersion,
        compliant,
        minutesSinceHeartbeat,
        lastActiveAt:         d.lastActiveAt,
      };
    });

    const compliantCount  = fleet.filter(d => d.compliant).length;
    const outdatedCount   = fleet.filter(d => !d.compliant && d.reportedVersion).length;
    const unknownCount    = fleet.filter(d => !d.reportedVersion).length;
    const offlineCount    = fleet.filter(d => d.status === "offline").length;

    res.json({
      targetVersion: prodVersion,
      total:          fleet.length,
      compliant:      compliantCount,
      outdated:       outdatedCount,
      unknown:        unknownCount,
      offline:        offlineCount,
      devices:        fleet,
    });
  },
);

// ── POST /api/ota/fleet/push ──────────────────────────────────────────────
// Queue an update command to all outdated devices on production channel.

router.post(
  "/fleet/push",
  requireAuth,
  requireRole("super_admin"),
  async (req: AuthRequest, res: Response) => {
    const devices = await db.select().from(devicesTable);
    const now     = new Date();
    let queued    = 0;

    for (const d of devices) {
      try {
        await db.insert(offlineQueueTable).values({
          idempotencyKey:  `ota_push_${d.id}_${now.getTime()}`,
          deviceId:        d.id,
          venueId:         d.venueId ?? undefined,
          kind:            "force_refresh",
          payload:         {
            action:     "ota_update",
            version:    CHANNELS.production.currentVersion,
            triggeredAt: now.toISOString(),
            triggeredBy: req.user!.id,
          },
          status:          "pending",
          clientCreatedAt: now,
        }).onConflictDoNothing();
        queued++;
      } catch { /* non-fatal — device may already have a pending refresh */ }
    }

    await logAudit(req, {
      action:     "ota.fleet_push",
      entityType: "deployment",
      entityId:   null,
      after:      { devicesQueued: queued, targetVersion: CHANNELS.production.currentVersion },
      venueId:    req.user!.venueId ?? null,
    });

    logger.info({ queued, version: CHANNELS.production.currentVersion }, "OTA fleet push queued");
    res.json({ queued, targetVersion: CHANNELS.production.currentVersion });
  },
);

// ── GET /api/ota/history ──────────────────────────────────────────────────

router.get(
  "/history",
  requireAuth,
  requireRole("super_admin"),
  (_req: AuthRequest, res: Response) => {
    const all: (VersionEntry & { channel: Channel })[] = [];
    for (const [ch, state] of Object.entries(CHANNELS)) {
      for (const h of state.history) {
        all.push({ ...h, channel: ch as Channel });
      }
    }
    all.sort((a, b) => new Date(b.deployedAt).getTime() - new Date(a.deployedAt).getTime());
    res.json({ deployments: all, total: all.length });
  },
);

export default router;
