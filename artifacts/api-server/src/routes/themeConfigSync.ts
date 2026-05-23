/**
 * /api/theme-config — live operational-mode broadcasting.
 *
 *   POST /api/theme-config/broadcast
 *     Body: { venueId: string; config: ThemeConfigPayload }
 *     Emits `theme_config_changed` to the venue:<venueId> Socket.io room.
 *     Requires auth (staff level minimum).
 *
 *   GET  /api/theme-config/defaults
 *     Returns the three preset payloads (standard / senior / rush) for
 *     client bootstrapping without an auth requirement.
 */

import { Router }       from "express";
import { z }            from "zod";
import { requireAuth }  from "../middleware/auth";
import { getIO }        from "../lib/socketServer";
import { logger }       from "../lib/logger";

const router = Router();

const ThemeConfigSchema = z.object({
  operationalMode:    z.enum(["standard", "senior", "rush"]),
  fontScale:          z.number().min(0.5).max(3.0),
  touchScale:         z.number().min(0.5).max(3.0),
  contrastMode:       z.enum(["standard", "luminous"]),
  animationIntensity: z.enum(["full", "reduced", "none"]),
});

const BroadcastSchema = z.object({
  venueId: z.string().min(1),
  config:  ThemeConfigSchema,
});

const PRESETS = {
  standard: { operationalMode: "standard", fontScale: 1.0,  touchScale: 1.0, contrastMode: "standard", animationIntensity: "full"    },
  senior:   { operationalMode: "senior",   fontScale: 1.45, touchScale: 1.3, contrastMode: "luminous", animationIntensity: "reduced"  },
  rush:     { operationalMode: "rush",     fontScale: 0.9,  touchScale: 1.0, contrastMode: "standard", animationIntensity: "full"    },
} as const;

router.get("/defaults", (_req, res) => {
  res.json({ presets: PRESETS });
});

router.post("/broadcast", requireAuth, (req, res) => {
  const parsed = BroadcastSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload", details: parsed.error.flatten() });
    return;
  }

  const { venueId, config } = parsed.data;
  const io = getIO();

  const room = `venue:${venueId}`;
  io.to(room).emit("theme_config_changed", {
    venueId,
    config,
    ts: Date.now(),
  });

  logger.info({ venueId, operationalMode: config.operationalMode }, "theme_config_changed broadcast");
  res.json({ ok: true, room, ts: Date.now() });
});

export default router;
