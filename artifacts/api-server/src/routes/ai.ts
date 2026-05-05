/**
 * /api/ai — AI image generation with Cloudinary caching.
 *
 *   POST /api/ai/generate-image
 *     Accepts { craft, styleId, moodId?, userInput? }
 *     Builds a brand-tuned prompt → checks DB cache → generates with
 *     gpt-image-1 → uploads to Cloudinary → stores URL in DB → returns URL.
 *     On cache hit the stored Cloudinary URL is returned immediately.
 *
 * Images are never regenerated for the same prompt — the hash acts as
 * the dedup key so you only pay for generation once per style+mood combo.
 */

import crypto                                    from "crypto";
import { Router, type IRouter }                  from "express";
import { eq }                                    from "drizzle-orm";
import { z }                                     from "zod";
import { db, aiImageCacheTable }                 from "@workspace/db";
import { generateImageBuffer }                   from "@workspace/integrations-openai-ai-server";
import cloudinary, { assertCloudinaryConfigured } from "../integrations/cloudinary";
import { requireAuth, type AuthRequest }         from "../middleware/auth";

const router: IRouter = Router();

// ── Prompt registry ────────────────────────────────────────────────────────────

type CraftId = "pour" | "brew" | "smoke" | "vape";
type StyleId = string;

const BASE_PROMPTS: Record<CraftId, Record<StyleId, string>> = {
  pour: {
    smooth: "premium whiskey old fashioned cocktail in a rocks glass with a large clear ice cube, amber golden liquid, orange peel garnish on the rim, warm candlelight bar reflections, cinematic luxury beverage photography, ultra-realistic, shallow depth of field, no logos, no text",
    spicy:  "spicy rye whiskey highball with maraschino cherry garnish, rustic amber bar lighting, condensation on the glass, cinematic beverage photography, ultra-realistic, no logos, no text",
    smoky:  "peated Scotch whisky in a crystal snifter glass, wisps of smoke curling above the liquid, dramatic dark moody chiaroscuro lighting, luxury spirits photography, ultra-realistic, no logos, no text",
    rich:   "aged cognac in an elegant coupe glass, rich mahogany bar setting, warm candlelight, deep amber hues, lemon twist garnish, cinematic fine-dining photography, ultra-realistic, no logos, no text",
  },
  brew: {
    light:  "crisp pale lager in a tall pilsner glass, golden carbonated liquid, frothy white foam head, citrus lemon wedge on the rim, bright airy pub setting, ultra-realistic craft beer photography, no logos, no text",
    amber:  "toasted amber ale in a classic pint glass, creamy foam head, warm golden-brown liquid, wooden bar backdrop, cozy pub lighting, ultra-realistic craft beer photography, no logos, no text",
    ipa:    "bold hoppy IPA in a tulip glass, bright orange-gold liquid, thick foam, citrus slice garnish, condensation on the glass, modern craft brewery aesthetic, ultra-realistic beer photography, no logos, no text",
    dark:   "rich imperial stout in a heavy mug, near-black opaque liquid with thick creamy foam head, roasted coffee and chocolate aroma, moody pub atmosphere, dramatic lighting, ultra-realistic beer photography, no logos, no text",
  },
  smoke: {
    mild:   "luxury cigar lounge scene, hand-rolled mild Connecticut-shade cigar on a crystal ashtray, warm amber lighting, leather chair, cinematic lifestyle photography, ultra-realistic, no logos, no text",
    medium: "premium cigar lounge, medium-bodied cigar with blue smoke curling upward, dark mahogany humidor in background, moody atmospheric lighting, ultra-realistic, no logos, no text",
    full:   "full-bodied maduro cigar in luxury lounge, bold rich smoke, sophisticated environment, diverse professionals relaxing, cinematic atmosphere, ultra-realistic, no logos, no text",
    exotic: "rare exotic cigar blend, artisanal luxury presentation on silver tray, dramatic spotlight, ultra-premium lifestyle photography, ultra-realistic, no logos, no text",
  },
  vape: {
    light:  "modern sleek vape device on marble surface, minimal design, soft cool lighting, premium lifestyle product photography, ultra-realistic, no logos, no text",
    fruity: "colorful vape clouds in neon-lit modern lounge, vibrant fruit flavors implied by subtle color gradients, premium nightlife atmosphere, ultra-realistic, no logos, no text",
    menthol:"cool mint vape pen, icy blue-white aesthetic, clean minimal styling, frost condensation effect, ultra-realistic product photography, no logos, no text",
    tobacco:"classic tobacco vape device in warm-toned sophisticated setting, leather accents, premium lifestyle photography, ultra-realistic, no logos, no text",
  },
};

const MOOD_MODIFIERS: Record<string, string> = {
  relaxed:     "calm soft lighting, relaxed intimate atmosphere",
  social:      "lively group energy, celebratory setting",
  bold:        "dramatic intense lighting, powerful bold composition",
  focused:     "quiet contemplative mood, precise elegant framing",
  celebratory: "festive warm glow, special occasion atmosphere",
};

const TIME_MODIFIERS: Record<string, string> = {
  morning:   "bright morning light, fresh daytime setting",
  afternoon: "golden afternoon light, relaxed daytime ambiance",
  evening:   "warm sunset tones, transitional hour mood",
  night:     "dark moody nighttime, dramatic bar lighting",
};

function buildPrompt(
  craft:    CraftId,
  styleId:  StyleId,
  moodId?:  string,
  userInput?: { mood?: string; strength?: string; timeOfDay?: string },
): string {
  const craftPrompts = BASE_PROMPTS[craft] ?? BASE_PROMPTS.pour;
  const base = craftPrompts[styleId] ?? Object.values(craftPrompts)[0] ?? "premium drink photography, ultra-realistic, cinematic, no logos, no text";

  const parts: string[] = [base];

  const mood = moodId ?? userInput?.mood;
  if (mood && MOOD_MODIFIERS[mood]) parts.push(MOOD_MODIFIERS[mood]);

  const tod = userInput?.timeOfDay;
  if (tod && TIME_MODIFIERS[tod]) parts.push(TIME_MODIFIERS[tod]);

  if (userInput?.strength === "strong" || userInput?.strength === "bold") {
    parts.push("bold intense character");
  }

  return parts.join(", ");
}

// ── Schema ─────────────────────────────────────────────────────────────────────

const GenerateImageSchema = z.object({
  craft:    z.enum(["pour", "brew", "smoke", "vape"]),
  styleId:  z.string().min(1).max(32),
  moodId:   z.string().max(32).optional(),
  userInput: z.object({
    mood:       z.string().max(32).optional(),
    strength:   z.string().max(32).optional(),
    timeOfDay:  z.string().max(16).optional(),
  }).optional(),
});

// ── Route ──────────────────────────────────────────────────────────────────────

router.post(
  "/ai/generate-image",
  requireAuth,
  async (req: AuthRequest, res) => {
    const parsed = GenerateImageSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request", details: parsed.error.issues });
      return;
    }
    const { craft, styleId, moodId, userInput } = parsed.data;

    const prompt     = buildPrompt(craft, styleId, moodId, userInput);
    const promptHash = crypto.createHash("sha256").update(prompt).digest("hex").slice(0, 48);

    try {
      // ── Cache check ────────────────────────────────────────────────────────
      const [cached] = await db
        .select({ cloudinaryUrl: aiImageCacheTable.cloudinaryUrl })
        .from(aiImageCacheTable)
        .where(eq(aiImageCacheTable.promptHash, promptHash))
        .limit(1);

      if (cached) {
        res.json({ url: cached.cloudinaryUrl, cached: true });
        return;
      }

      // ── Generate via OpenAI gpt-image-1 ───────────────────────────────────
      assertCloudinaryConfigured();
      const buffer = await generateImageBuffer(prompt, "1024x1024");

      // ── Upload to Cloudinary ───────────────────────────────────────────────
      const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder:         "smokecraft/ai_images",
            public_id:      `${craft}_${styleId}_${promptHash.slice(0, 12)}`,
            overwrite:      false,
            resource_type:  "image",
            format:         "webp",
            transformation: [{ quality: "auto:good", width: 1024, crop: "limit" }],
          },
          (err, result) => {
            if (err || !result) reject(err ?? new Error("Cloudinary upload failed"));
            else resolve(result as { secure_url: string });
          },
        );
        stream.end(buffer);
      });

      const cloudinaryUrl = uploadResult.secure_url;

      // ── Cache in DB ────────────────────────────────────────────────────────
      await db.insert(aiImageCacheTable).values({
        promptHash,
        promptText:   prompt,
        cloudinaryUrl,
        craft,
        styleId,
        moodId: moodId ?? null,
      }).onConflictDoNothing();

      res.json({ url: cloudinaryUrl, cached: false });
    } catch (err) {
      req.log.error({ err }, "AI image generation failed");
      res.status(500).json({ error: "Image generation failed" });
    }
  },
);

export default router;
