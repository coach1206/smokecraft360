/**
 * memoryBrain — persistent taste-memory service.
 *
 * Upserts per-tag weights for a user whenever they swipe.
 * Swipe right (add):  each tag +3  (capped at 100)
 * Swipe left  (skip): each tag -1  (floor at -10)
 *
 * getTasteProfile returns a structured profile summary for downstream
 * use by the adaptive pairing engine and the revenue brain.
 */

import { eq, and, sql } from "drizzle-orm";
import { db, userTasteMemoryTable } from "@workspace/db";
import { logger } from "../lib/logger";

const WEIGHT_ADD  =  3;
const WEIGHT_SKIP = -1;
const WEIGHT_MAX  = 100;
const WEIGHT_MIN  = -10;

export interface TasteProfile {
  topTags:        string[];
  weakTags:       string[];
  avoidTags:      string[];
  profileSummary: string;
  tagWeights:     Record<string, number>;
}

export const EMPTY_TASTE_PROFILE: TasteProfile = {
  topTags:        [],
  weakTags:       [],
  avoidTags:      [],
  profileSummary: "No preference data yet",
  tagWeights:     {},
};

export async function updateTasteMemory(
  userId: string,
  tags: string[],
  action: "add" | "skip",
): Promise<void> {
  if (!tags.length) return;

  const delta = action === "add" ? WEIGHT_ADD : WEIGHT_SKIP;

  for (const tag of tags) {
    const normalised = tag.toLowerCase().trim();
    if (!normalised) continue;

    await db
      .insert(userTasteMemoryTable)
      .values({
        userId,
        tag:        normalised,
        weight:     Math.max(WEIGHT_MIN, Math.min(WEIGHT_MAX, delta)),
        lastAction: action,
        updatedAt:  new Date(),
      })
      .onConflictDoUpdate({
        target: [userTasteMemoryTable.userId, userTasteMemoryTable.tag],
        set: {
          weight: sql`GREATEST(${WEIGHT_MIN}, LEAST(${WEIGHT_MAX}, ${userTasteMemoryTable.weight} + ${delta}))`,
          lastAction: action,
          updatedAt:  new Date(),
        },
      });
  }

  logger.info({ userId, tags, action, delta }, "taste memory updated");
}

export async function getTasteProfile(userId: string): Promise<TasteProfile> {
  const rows = await db
    .select()
    .from(userTasteMemoryTable)
    .where(eq(userTasteMemoryTable.userId, userId));

  if (!rows.length) return EMPTY_TASTE_PROFILE;

  const tagWeights: Record<string, number> = {};
  for (const r of rows) tagWeights[r.tag] = r.weight;

  const sorted = rows.slice().sort((a, b) => b.weight - a.weight);
  const topTags   = sorted.filter(r => r.weight > 5).map(r => r.tag);
  const weakTags  = sorted.filter(r => r.weight > 0 && r.weight <= 5).map(r => r.tag);
  const avoidTags = sorted.filter(r => r.weight < 0).map(r => r.tag);

  let profileSummary = "No strong preferences yet";
  if (topTags.length) {
    profileSummary = `Prefers ${topTags.slice(0, 3).join(", ")} experiences`;
    if (avoidTags.length) profileSummary += `; tends to avoid ${avoidTags.slice(0, 2).join(", ")}`;
  }

  return { topTags, weakTags, avoidTags, profileSummary, tagWeights };
}

export async function getTagWeights(userId: string): Promise<Record<string, number>> {
  const rows = await db
    .select({ tag: userTasteMemoryTable.tag, weight: userTasteMemoryTable.weight })
    .from(userTasteMemoryTable)
    .where(eq(userTasteMemoryTable.userId, userId));

  return Object.fromEntries(rows.map(r => [r.tag, r.weight]));
}
