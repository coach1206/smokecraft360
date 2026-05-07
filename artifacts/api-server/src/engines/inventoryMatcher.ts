/**
 * Inventory Matching Engine — Service Sage Revenue Intelligence
 *
 * Compares a guest's Draft Profile (flavor tags, body, boldness) against
 * the venue_inventory table and returns ranked match results.
 *
 * Scoring formula (max ≈ 90):
 *   flavorOverlap  +8 per matching note tag   (max 40)
 *   bodyMatch      +20 exact / +10 adjacent    (max 20)
 *   premiumBonus   premiumTier × 6             (max 30)
 *   availability   skip qty=0 items
 *
 * Design intent: premium_tier intentionally weighted to maximize venue ROI
 * while still requiring genuine flavor alignment (>0 overlap required for
 * ultra-premium items to surface).
 */

import { eq, gt }         from "drizzle-orm";
import { db, venueInventoryTable, productsTable } from "@workspace/db";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GuestDraftProfile {
  /** Flavor tags from the Craft Draft (e.g. ["cocoa", "earth", "cedar"]) */
  flavorTags:  string[];
  /** Body descriptor: "light" | "medium" | "full" */
  body?:       string;
  /** Boldness 1–5 from EnrollmentFlow */
  boldness?:   number;
  /** Craft type for category filtering */
  craftType?:  "smoke" | "pour" | "brew" | "vape";
}

export interface MatchResult {
  productId:           string;
  name:                string;
  category:            string;
  score:               number;
  premiumTier:         number;
  quantity:            number;
  flavorOverlap:       string[];
  sagesRecommendation: string;
}

// ── Body adjacency map ────────────────────────────────────────────────────────

const BODY_ORDER = ["light", "medium", "full"];

function bodyScore(guestBody: string | undefined, itemBody: string | undefined): number {
  if (!guestBody || !itemBody) return 0;
  const gi = BODY_ORDER.indexOf(guestBody.toLowerCase());
  const ii = BODY_ORDER.indexOf(itemBody.toLowerCase());
  if (gi === -1 || ii === -1) return 0;
  if (gi === ii) return 20;
  if (Math.abs(gi - ii) === 1) return 10;
  return 0;
}

// ── Craft → category map ──────────────────────────────────────────────────────

const CRAFT_CATEGORIES: Record<string, string[]> = {
  smoke: ["cigar"],
  pour:  ["alcohol", "wine", "cocktail"],
  brew:  ["beer"],
  vape:  [],   // no category restriction
};

// ── Sage's Recommendation generator ──────────────────────────────────────────

function buildSagesRecommendation(
  guestProfile: GuestDraftProfile,
  match: { name: string; flavorOverlap: string[]; premiumTier: number },
): string {
  const tierLabel = ["", "House Select", "Standard", "Premium Reserve", "Aged Reserve", "Ultra-Premium"][match.premiumTier] ?? "Select";
  const overlap   = match.flavorOverlap.slice(0, 2).join(" & ");
  const bodyNote  = guestProfile.body ? `, ${guestProfile.body}-bodied` : "";

  if (match.flavorOverlap.length === 0) {
    return `Offer the ${match.name} — a ${tierLabel}${bodyNote} selection that complements their palate.`;
  }
  if (match.premiumTier >= 4) {
    return `Suggest the ${match.name} — our ${tierLabel}${bodyNote} with ${overlap} notes. A prestige step up worth every dollar.`;
  }
  return `Recommend the ${match.name} — their ${overlap} draft aligns perfectly with this ${tierLabel}${bodyNote} selection.`;
}

// ── Main matcher ──────────────────────────────────────────────────────────────

export async function matchInventory(
  venueId: string,
  guestProfile: GuestDraftProfile,
  limit = 3,
): Promise<MatchResult[]> {
  // Fetch venue inventory that has stock > 0
  const rows = await db
    .select({
      productId:     venueInventoryTable.productId,
      quantity:      venueInventoryTable.quantity,
      premiumTier:   venueInventoryTable.premiumTier,
      flavorProfile: venueInventoryTable.flavorProfile,
      name:          productsTable.name,
      category:      productsTable.category,
    })
    .from(venueInventoryTable)
    .innerJoin(productsTable, eq(venueInventoryTable.productId, productsTable.id))
    .where(
      eq(venueInventoryTable.venueId, venueId),
    );

  const allowedCategories = guestProfile.craftType ? CRAFT_CATEGORIES[guestProfile.craftType] : null;

  const scored: MatchResult[] = [];

  for (const row of rows) {
    // Skip out-of-stock
    if (row.quantity <= 0) continue;

    // Skip wrong craft category
    if (allowedCategories && allowedCategories.length > 0 && !allowedCategories.includes(row.category)) {
      continue;
    }

    const itemNotes   = (row.flavorProfile as { notes?: string[] } | null)?.notes ?? [];
    const itemBody    = (row.flavorProfile as { body?: string } | null)?.body;
    const guestTags   = guestProfile.flavorTags.map(t => t.toLowerCase());
    const itemTagsNorm = itemNotes.map((n: string) => n.toLowerCase());

    // Flavor overlap
    const overlap     = guestTags.filter(t => itemTagsNorm.includes(t));
    const flavorScore = Math.min(40, overlap.length * 8);

    // Body match
    const bScore = bodyScore(guestProfile.body, itemBody);

    // Premium tier bonus — intentionally weighted for ROI
    const premiumBonus = (row.premiumTier ?? 1) * 6;

    // Ultra-premium guard: require ≥1 overlap for tier 4+
    if ((row.premiumTier ?? 1) >= 4 && overlap.length === 0) continue;

    const totalScore = flavorScore + bScore + premiumBonus;

    const sagesRecommendation = buildSagesRecommendation(guestProfile, {
      name:         row.name,
      flavorOverlap: overlap,
      premiumTier:  row.premiumTier ?? 1,
    });

    scored.push({
      productId:           row.productId,
      name:                row.name,
      category:            row.category,
      score:               totalScore,
      premiumTier:         row.premiumTier ?? 1,
      quantity:            row.quantity,
      flavorOverlap:       overlap,
      sagesRecommendation,
    });
  }

  // Sort descending by score, return top N
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
