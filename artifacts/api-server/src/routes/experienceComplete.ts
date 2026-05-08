import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { z } from "zod";
import { generateSessionPersonality } from "../services/sessionPersonality";
import { rollReward, applyRewardToPrice } from "../services/variableRewards";
import { buildPsychologyBundle } from "../services/revenuePsychology";
import { pool } from "@workspace/db";

const router: IRouter = Router();

const completeSchema = z.object({
  mode: z.enum(["smoke", "pour", "brew", "vape"]),
  score: z.number().finite().min(0).max(10),
  choices: z.object({
    mood: z.string().optional(),
    strength: z.number().int().min(1).max(5).optional(),
    flavorPreferences: z.array(z.string()).optional(),
    category: z.string().optional(),
  }),
  interactions: z.number().int().min(0).default(0),
  completedExperience: z.boolean().default(true),
  isRepeatUser: z.boolean().default(false),
  basePriceCents: z.number().int().min(0).optional(),
  venueRewardIntensity: z.number().min(0.3).max(1.5).optional(),
});

router.post(
  "/complete",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const parsed = completeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues });
      return;
    }

    const data = parsed.data;
    const userId = req.user!.id;

    const [personality, reward, psychology] = await Promise.all([
      generateSessionPersonality(data.choices, userId),
      Promise.resolve(
        rollReward({
          score: data.score,
          interactions: data.interactions,
          completedExperience: data.completedExperience,
          isRepeatUser: data.isRepeatUser,
          venueRewardIntensity: data.venueRewardIntensity,
        }),
      ),
      buildPsychologyBundle(
        userId,
        data.score,
        data.basePriceCents,
        data.interactions,
      ),
    ]);

    const pricing = data.basePriceCents
      ? applyRewardToPrice(data.basePriceCents, reward)
      : null;

    req.log.info(
      { userId, mode: data.mode, score: data.score, archetype: personality.archetype, rewardTier: reward.tier },
      "experience completed",
    );

    res.json({
      personality,
      reward,
      pricing,
      psychology,
    });
  },
);

const psychologySchema = z.object({
  score: z.number().finite().min(0).max(10).default(5),
  basePriceCents: z.number().int().min(0).optional(),
  interactions: z.number().int().min(0).default(0),
});

router.post(
  "/psychology",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const parsed = psychologySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues });
      return;
    }

    const data = parsed.data;
    const userId = req.user!.id;

    const bundle = await buildPsychologyBundle(
      userId,
      data.score,
      data.basePriceCents,
      data.interactions,
    );

    res.json(bundle);
  },
);

// ── GET /api/experience/status ────────────────────────────────────────────────
// Live floor metrics derived from real guest_sessions + guest_profiles tables.
// Public endpoint — no auth required (kiosks poll this without a token).

router.get("/status", async (_req: Request, res: Response) => {
  try {
    const { rows } = await pool.query<{
      active_guests:    string;
      vip_guests:       string;
      ai_alerts:        string;
      pairings_pending: string;
      craft_breakdown:  Record<string, number>;
    }>(`
      SELECT
        COUNT(*)                                                         AS active_guests,
        COUNT(*) FILTER (WHERE gs.session_score >= 72)                  AS vip_guests,
        COUNT(*) FILTER (WHERE gs.in_handoff = true)                    AS ai_alerts,
        COUNT(*) FILTER (WHERE gs.in_handoff = true AND gs.mentor_id IS NOT NULL) AS pairings_pending
      FROM guest_sessions gs
      WHERE gs.status = 'active'
        AND gs.created_at > NOW() - INTERVAL '4 hours'
    `);

    const craftRows = await pool.query<{ craft_type: string; cnt: string }>(`
      SELECT craft_type, COUNT(*) AS cnt
      FROM guest_sessions
      WHERE status = 'active'
        AND created_at > NOW() - INTERVAL '4 hours'
        AND craft_type IS NOT NULL
      GROUP BY craft_type
    `);

    const craftBreakdown: Record<string, number> = {};
    for (const r of craftRows.rows) {
      craftBreakdown[r.craft_type] = parseInt(r.cnt, 10);
    }

    const row = rows[0];
    res.json({
      activeGuests:    parseInt(row?.active_guests    ?? "0", 10),
      vipGuests:       parseInt(row?.vip_guests       ?? "0", 10),
      aiAlerts:        parseInt(row?.ai_alerts        ?? "0", 10),
      pairingsPending: parseInt(row?.pairings_pending ?? "0", 10),
      craftBreakdown,
      ts:              new Date().toISOString(),
    });
  } catch {
    res.json({
      activeGuests: 0, vipGuests: 0, aiAlerts: 0, pairingsPending: 0,
      craftBreakdown: {}, ts: new Date().toISOString(),
    });
  }
});

export default router;
