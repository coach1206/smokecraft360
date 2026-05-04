import { Router, type IRouter, type Response } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { z } from "zod";
import { generateSessionPersonality } from "../services/sessionPersonality";
import { rollReward, applyRewardToPrice } from "../services/variableRewards";
import { buildPsychologyBundle } from "../services/revenuePsychology";

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

export default router;
