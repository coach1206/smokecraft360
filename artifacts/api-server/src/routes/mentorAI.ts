/**
 * mentorAI — OpenAI-powered mentor conversations and challenge generation.
 *
 * POST /api/mentor/chat           — streams SSE mentor response
 * POST /api/mentor/generate-challenge — returns AI-generated question JSON
 */

import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db } from "@workspace/db";
import { challengeProgressTable } from "@workspace/db/schema";
import { logger } from "../lib/logger";
import { aiResponseCache } from "../services/productionHardening";

const router = Router();

// ── Mentor personality system prompts ────────────────────────────────────────

const MENTOR_PROMPTS: Record<string, string> = {
  traditionalist: `You are Master Rafael — a seasoned cigar and spirits connoisseur with 45 years of experience in the finest lounges of Havana, London, and Kyoto. You speak with quiet authority, deep reverence for craft heritage, and a historian's precision. Reference tobacco growing regions by name. Name specific barrel aging techniques. Use sophisticated vocabulary naturally, never pretentiously. Keep responses under 3 sentences — elegant and substantive. You are mentoring a guest in real time; be warm but exacting.`,

  scientist: `You are Dr. Elena Voss — a flavor chemist and sensory scientist who studied at the Universität München and consults for elite distilleries worldwide. You explain craft experiences through the lens of chemistry: terpenes, Maillard reactions, esterification, terroir compounds. Be analytically precise and genuinely fascinated. Reference specific molecular interactions when relevant. Keep responses under 3 sentences — dense with insight but never cold.`,

  collector: `You are Julian Ashworth — a rare spirits and cigar collector with a cellar worth over $2 million. You reference specific auction prices, limited edition releases, and estate vintages with the casual authority of someone who has actually owned them. Be enthusiastic about rarity, exclusivity, and investment value. Drop specific estate names, harvest years, and batch numbers. Keep responses under 3 sentences — passionate and knowledgeable.`,

  social_expert: `You are Sofia Reyes — a luxury hospitality specialist and sommelier who has curated experiences at the world's finest members-only lounges. You focus on the emotional and social dimensions of craft: the occasion, the company, the story a choice tells about someone. Be warm, celebratory, and emotionally resonant. Help guests see their choice as self-expression. Keep responses under 3 sentences — inviting and memorable.`,

  sommelier: `You are Alexei Durant — a Master Sommelier who extended their discipline to all fermented, distilled, and aged crafts. You speak of structure, balance, finish, mouthfeel, retronasal passage, and sensory progressions with elegant precision. Reference flavor compounds and tasting trajectories. Be refined and cerebral. Keep responses under 3 sentences — precise and sensory-rich.`,

  rebel: `You are Max Crane — a craft iconoclast who built a following by demolishing conventional wisdom in cigars and spirits. You are opinionated, direct, and delightfully irreverent. Praise unexpected combinations. Challenge overrated classics. Celebrate the guest's daring choices. Be provocative but deeply knowledgeable — you break rules because you know them. Keep responses under 3 sentences — punchy and memorable.`,
};

const CRAFT_CONTEXT: Record<string, string> = {
  smoke: "cigars and tobacco craftsmanship",
  pour:  "whiskey, bourbon, spirits, and cocktails",
  brew:  "craft beer, ales, and fermentation",
  vape:  "modern vaping, nicotine profiles, and device science",
};

// ── POST /api/mentor/chat ─────────────────────────────────────────────────────

const chatSchema = z.object({
  mentorId:        z.string().default("traditionalist"),
  craftType:       z.enum(["smoke","pour","brew","vape"]).default("smoke"),
  recentTags:      z.array(z.string()).default([]),
  guestLevel:      z.string().default("explorer"),
  swipeAction:     z.enum(["add","skip"]).optional(),
  itemName:        z.string().optional(),
  sessionContext:  z.string().optional(),
});

router.post("/chat", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.write(`data: ${JSON.stringify({ error: "Invalid request" })}\n\n`);
    res.end();
    return;
  }

  const { mentorId, craftType, recentTags, guestLevel, swipeAction, itemName } = parsed.data;
  const systemPrompt = MENTOR_PROMPTS[mentorId] ?? MENTOR_PROMPTS["traditionalist"]!;
  const craftContext = CRAFT_CONTEXT[craftType] ?? "craft beverages";

  const actionContext = swipeAction === "add" && itemName
    ? `The guest just selected "${itemName}" — react with genuine enthusiasm and insight.`
    : swipeAction === "skip" && itemName
    ? `The guest passed on "${itemName}" — offer a brief, non-judgmental observation.`
    : "Offer a brief observation about the guest's developing taste profile.";

  const tagsContext = recentTags.length > 0
    ? `Their profile shows interest in: ${recentTags.slice(0, 8).join(", ")}.`
    : "";

  const userMessage = `The guest (level: ${guestLevel}) is exploring ${craftContext}. ${tagsContext} ${actionContext}`;

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      max_completion_tokens: 100,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userMessage  },
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    logger.error({ err }, "mentor chat stream error");
    res.write(`data: ${JSON.stringify({ error: "AI mentor temporarily unavailable" })}\n\n`);
  }

  res.end();
});

// ── POST /api/mentor/generate-challenge ──────────────────────────────────────

const challengeSchema = z.object({
  craftType:      z.enum(["smoke","pour","brew","vape"]),
  guestLevel:     z.string().default("explorer"),
  recentTags:     z.array(z.string()).default([]),
  sessionId:      z.string().uuid().optional(),
  guestProfileId: z.string().uuid().optional(),
});

const CHALLENGE_SYSTEM = `You are a luxury craft knowledge expert generating educational quiz questions for a sophisticated tasting experience.

Generate exactly ONE multiple-choice question as a JSON object with this exact structure:
{
  "question": "the question text",
  "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
  "correctIndex": 0,
  "explanation": "1-2 sentence elegant explanation of the correct answer"
}

Rules:
- correctIndex is 0-based (0=A, 1=B, 2=C, 3=D)
- Questions should be engaging and genuinely educational
- Difficulty scales with guestLevel: explorer=easy, enthusiast=moderate, specialist=hard, aficionado=expert
- Focus on the specific craft type and any tags provided
- Never use trivia — use knowledge that enhances appreciation
- Keep tone sophisticated and inviting`;

router.post("/generate-challenge", async (req, res) => {
  const parsed = challengeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request" });
    return;
  }

  const { craftType, guestLevel, recentTags, sessionId, guestProfileId } = parsed.data;

  const craftFocus: Record<string, string> = {
    smoke: "cigar tobacco — wrapper types, growing regions, vitolas, aging, blending, cutting, pairing",
    pour:  "whiskey and spirits — distillation, barrel aging, regions, mash bills, proof, cocktail craft",
    brew:  "craft beer — hop varieties, malt profiles, IBU, fermentation, yeast strains, beer styles",
    vape:  "vaping — nicotine salt vs freebase, airflow science, coil resistance, flavor distillation, device types",
  };

  const tagContext = recentTags.length > 0
    ? `The guest has been exploring: ${recentTags.slice(0, 6).join(", ")}.`
    : "";

  const userMessage = `Generate a ${guestLevel}-level question about ${craftFocus[craftType] ?? craftType}. ${tagContext} Make it specific, educational, and elegant.`;

  // Check TTL cache — cache key is deterministic on craftType + level + tags
  // (sessionId / guestProfileId are excluded so challenges are reusable across guests)
  const cacheKey = `challenge:${craftType}:${guestLevel}:${recentTags.slice(0, 6).sort().join(",")}`;
  const cached = aiResponseCache.get(cacheKey);
  if (cached) {
    logger.debug({ cacheKey }, "generate-challenge: cache hit");
    res.json({ ...JSON.parse(cached), cached: true });
    return;
  }

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      max_completion_tokens: 250,
      messages: [
        { role: "system", content: CHALLENGE_SYSTEM },
        { role: "user",   content: userMessage       },
      ],
    });

    const raw = response.choices[0]?.message?.content ?? "{}";

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const challenge = JSON.parse(jsonMatch[0]) as {
      question: string; options: string[]; correctIndex: number; explanation: string;
    };

    // Cache the raw challenge JSON for 10 min (excludes challengeId — added after)
    aiResponseCache.set(cacheKey, JSON.stringify(challenge));

    // Persist to DB
    let challengeId: string | undefined;
    try {
      const [row] = await db.insert(challengeProgressTable).values({
        guestProfileId: guestProfileId ?? null,
        sessionId:      sessionId ?? null,
        craftType,
        skillLevel:     guestLevel,
        question:       challenge.question,
        options:        challenge.options,
        correctIndex:   challenge.correctIndex,
        explanation:    challenge.explanation,
      }).returning({ id: challengeProgressTable.id });
      challengeId = row?.id;
    } catch (dbErr) {
      logger.warn({ dbErr }, "challenge persist failed (non-fatal)");
    }

    res.json({ ...challenge, challengeId });
  } catch (err) {
    logger.error({ err }, "challenge generation error");
    res.status(500).json({ error: "Challenge generation failed" });
  }
});

// ── POST /api/mentor/answer-challenge ────────────────────────────────────────

const answerSchema = z.object({
  challengeId:   z.string().uuid(),
  selectedIndex: z.number().int().min(0).max(3),
});

router.post("/answer-challenge", async (req, res) => {
  const parsed = answerSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid" }); return; }

  const { challengeId, selectedIndex } = parsed.data;

  const [row] = await db.select().from(challengeProgressTable)
    .where(eq(challengeProgressTable.id, challengeId))
    .limit(1)
    .catch(() => []);

  if (!row) { res.status(404).json({ error: "Challenge not found" }); return; }

  const challenge = row;
  const wasCorrect = selectedIndex === challenge.correctIndex;
  const xpAwarded  = wasCorrect ? (challenge.skillLevel === "aficionado" ? 40 : challenge.skillLevel === "specialist" ? 30 : 20) : -5;

  try {
    await db.update(challengeProgressTable)
      .set({ selectedIndex, wasCorrect, xpAwarded, answeredAt: new Date() })
      .where(eq(challengeProgressTable.id, challengeId));
  } catch (err) {
    logger.warn({ err }, "challenge answer update failed");
  }

  res.json({ wasCorrect, correctIndex: challenge.correctIndex, xpAwarded, explanation: challenge.explanation });
});

export default router;
