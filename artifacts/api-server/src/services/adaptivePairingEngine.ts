/**
 * adaptivePairingEngine — scores and ranks swipe cards for a session.
 *
 * getAdaptiveCards:      returns the next batch of experience_items for swiping,
 *                        ranked by taste memory match, excluding already-swiped cards.
 *
 * getFinalRecommendations: reads a completed session's swipes, builds a taste
 *                          profile, matches against real inventory (products table),
 *                          and returns top-3 revenue-scored recommendations.
 */

import { eq, and, notInArray, inArray, sql } from "drizzle-orm";
import {
  db,
  experienceItemsTable,
  sessionSwipesTable,
  experienceSessionsTable,
  productsTable,
  venueInventoryTable,
} from "@workspace/db";
import { getTagWeights, getTasteProfile, EMPTY_TASTE_PROFILE } from "./memoryBrain";
import { rankRecommendations, type InventoryCandidate } from "./revenueBrain";
import { logger } from "../lib/logger";

const CARDS_PER_BATCH = 10;

// ── getAdaptiveCards ──────────────────────────────────────────────────────────

export async function getAdaptiveCards(
  userId: string | null,
  type: string,
  sessionId: string,
): Promise<typeof experienceItemsTable.$inferSelect[]> {
  // Fetch IDs already swiped in this session
  const swiped = await db
    .select({ itemId: sessionSwipesTable.itemId })
    .from(sessionSwipesTable)
    .where(eq(sessionSwipesTable.sessionId, sessionId));

  const swipedIds = swiped.map(r => r.itemId);

  // Fetch active items for this craft type (excluding already-swiped)
  const query = db
    .select()
    .from(experienceItemsTable)
    .where(
      swipedIds.length
        ? and(
            eq(experienceItemsTable.type, type),
            eq(experienceItemsTable.active, true),
            notInArray(experienceItemsTable.id, swipedIds),
          )
        : and(
            eq(experienceItemsTable.type, type),
            eq(experienceItemsTable.active, true),
          )
    );

  const items = await query;

  // If no user, return in default order
  if (!userId) return items.slice(0, CARDS_PER_BATCH);

  // Score by tag weights
  const tagWeights = await getTagWeights(userId);

  const scored = items.map(item => {
    const tags = item.tags ?? [];
    const score = tags.reduce((acc, t) => acc + (tagWeights[t.toLowerCase()] ?? 0), 0);
    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, CARDS_PER_BATCH).map(s => s.item);
}

// ── getFinalRecommendations ───────────────────────────────────────────────────

export interface FinalRecommendation {
  item:         InventoryCandidate;
  score:        number;
  reason:       string;
  revenueReason: string;
  tasteMatch:   number;
  marginPct:    number;
  stockStatus:  "ok" | "low" | "out";
  pairingNote?: string;
}

export async function getFinalRecommendations(
  sessionId: string,
  limit = 3,
): Promise<FinalRecommendation[]> {
  // Read all swipes in this session
  const swipes = await db
    .select()
    .from(sessionSwipesTable)
    .where(eq(sessionSwipesTable.sessionId, sessionId));

  const session = await db
    .select()
    .from(experienceSessionsTable)
    .where(eq(experienceSessionsTable.id, sessionId))
    .then(r => r[0] ?? null);

  if (!session) {
    logger.warn({ sessionId }, "getFinalRecommendations: session not found");
    return [];
  }

  // Build taste profile from swipes (or use stored user memory)
  const userId = session.userId;
  const tasteProfile = userId
    ? await getTasteProfile(userId)
    : EMPTY_TASTE_PROFILE;

  // Collect accepted tags from this session too
  const acceptedTags = swipes
    .filter(s => s.action === "add")
    .flatMap(s => s.tags ?? []);

  // Boost session tags in the profile
  const sessionBoosts: Record<string, number> = {};
  for (const tag of acceptedTags) {
    sessionBoosts[tag.toLowerCase()] = (sessionBoosts[tag.toLowerCase()] ?? 0) + 3;
  }
  const mergedWeights = { ...tasteProfile.tagWeights };
  for (const [tag, boost] of Object.entries(sessionBoosts)) {
    mergedWeights[tag] = (mergedWeights[tag] ?? 0) + boost;
  }
  const enrichedProfile = {
    ...tasteProfile,
    tagWeights: mergedWeights,
  };

  // Fetch matching inventory (products table) — filter by craft type category
  const craftCategory = typeToCraftCategory(session.experienceType);
  const products = await db
    .select({
      id:        productsTable.id,
      name:      productsTable.name,
      image:     productsTable.imageUrl,
      tags:      productsTable.flavorNotes,
      costCents: productsTable.costCents,
      category:  productsTable.category,
    })
    .from(productsTable)
    .where(
      and(
        eq(productsTable.active, true),
        craftCategory
          ? sql`${productsTable.category} = ${craftCategory}`
          : sql`true`,
      )
    )
    .limit(50);

  if (!products.length) {
    logger.info({ sessionId, craftCategory }, "No inventory found for craft type");
    return [];
  }

  // Get venue inventory for quantity data (use first row if no venueId)
  const venueInventory = await db
    .select({
      productId:  venueInventoryTable.productId,
      quantity:   venueInventoryTable.quantity,
      priceCents: venueInventoryTable.priceCents,
    })
    .from(venueInventoryTable)
    .where(
      inArray(venueInventoryTable.productId, products.map(p => p.id))
    );

  const invMap: Record<string, { quantity: number; priceCents: number | null }> = {};
  for (const inv of venueInventory) {
    invMap[inv.productId] = { quantity: inv.quantity, priceCents: inv.priceCents };
  }

  // Build candidates
  const candidates: InventoryCandidate[] = products.map(p => ({
    id:       p.id,
    name:     p.name,
    image:    p.image,
    tags:     (p.tags as string[]) ?? [],
    costCents: p.costCents ?? null,
    priceCents: invMap[p.id]?.priceCents ?? null,
    quantity: invMap[p.id]?.quantity ?? 999,
    category: p.category,
  }));

  return rankRecommendations(candidates, enrichedProfile, limit);
}

// ── helpers ───────────────────────────────────────────────────────────────────

function typeToCraftCategory(type: string): string | null {
  switch (type) {
    case "smoke": return "cigar";
    case "pour":  return "alcohol";
    case "brew":  return "beer";
    case "vape":  return null;  // no matching DB category yet
    default:      return null;
  }
}
