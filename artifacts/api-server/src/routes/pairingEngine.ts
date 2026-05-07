/**
 * /api/pairing-engine — Post-Draft Pairing Suggestions + Server Pulse
 *
 * GET /suggest?guestId=&venueId=&tags=cedar,oak,bold&tableId=
 *   Queries live venue inventory for the 3 best-matching spirits/accompaniments,
 *   emits a BOH_PULSE Socket.io event to the staff dashboard, and logs the event
 *   to server_pulse_events.
 *
 * GET /pulse/recent?venueId=   — last 20 pulse events for the staff dashboard
 */

import { Router }                                       from "express";
import { desc, eq }                                     from "drizzle-orm";
import { db, productsTable, venueInventoryTable,
         serverPulseEventsTable, guestProfilesTable }   from "@workspace/db";
import { z }                                            from "zod";
import { getIO }                                        from "../lib/socketServer";
import { masteryTierFromScore, MASTERY_TIER_LABELS }    from "./mastery";

const router = Router();

// ── Flavor tag → pairing affinity ────────────────────────────────────────────
// Maps dominant draft tags to the categories of spirits/items that pair well.

const TAG_AFFINITIES: Record<string, string[]> = {
  cedar:    ["whiskey", "bourbon", "cognac", "rum"],
  oak:      ["bourbon", "scotch", "whiskey", "brandy"],
  peat:     ["scotch", "islay", "whiskey"],
  vanilla:  ["rum", "bourbon", "brandy", "cognac"],
  cocoa:    ["port", "stout", "dark rum", "cognac"],
  leather:  ["scotch", "aged rum", "brandy"],
  bold:     ["rye", "bourbon", "mezcal"],
  smooth:   ["rum", "vodka", "gin", "whiskey"],
  citrus:   ["gin", "tequila", "vodka", "champagne"],
  floral:   ["gin", "champagne", "prosecco"],
  malty:    ["bourbon", "beer", "stout"],
  hoppy:    ["ipa", "beer", "ale"],
  earthy:   ["mezcal", "scotch", "aged rum"],
  spicy:    ["rye", "mezcal", "tequila"],
};

function scoreProductForTags(productName: string, productDesc: string, tags: string[]): number {
  const text  = `${productName} ${productDesc}`.toLowerCase();
  let   score = 0;

  for (const tag of tags) {
    const affinities = TAG_AFFINITIES[tag.toLowerCase()] ?? [];
    for (const affinity of affinities) {
      if (text.includes(affinity)) score += 10;
    }
    if (text.includes(tag.toLowerCase())) score += 5;
  }

  return score;
}

// ── GET /suggest ──────────────────────────────────────────────────────────────

const suggestSchema = z.object({
  guestId:  z.string().uuid().optional(),
  venueId:  z.string().uuid().optional(),
  tags:     z.string().optional(),
  tableId:  z.string().optional(),
});

router.get("/suggest", async (req, res) => {
  const query    = suggestSchema.parse(req.query);
  const tagList  = (query.tags ?? "").split(",").map(t => t.trim()).filter(Boolean);

  // Fetch available products (optionally filtered to venue inventory)
  // Products schema uses: id, name, category (enum), costCents, boostLevel, imageUrl
  let products: { id: string; name: string; category: string | null; costCents: number | null }[] = [];

  try {
    if (query.venueId) {
      const rows = await db
        .select({
          id:        productsTable.id,
          name:      productsTable.name,
          category:  productsTable.category,
          costCents: productsTable.costCents,
        })
        .from(productsTable)
        .innerJoin(venueInventoryTable, eq(productsTable.id, venueInventoryTable.productId))
        .where(eq(venueInventoryTable.venueId, query.venueId))
        .limit(200);
      products = rows.map(r => ({ ...r, category: r.category as string | null }));
    } else {
      const rows = await db
        .select({
          id:        productsTable.id,
          name:      productsTable.name,
          category:  productsTable.category,
          costCents: productsTable.costCents,
        })
        .from(productsTable)
        .limit(200);
      products = rows.map(r => ({ ...r, category: r.category as string | null }));
    }
  } catch {
    products = [];
  }

  // Score and rank — use name + category for tag affinity (no description column)
  const scored = products
    .map(p => ({
      ...p,
      price:        p.costCents != null ? `$${(p.costCents / 100).toFixed(2)}` : null,
      affinityScore: scoreProductForTags(p.name, p.category ?? "", tagList),
    }))
    .filter(p => p.affinityScore > 0)
    .sort((a, b) => b.affinityScore - a.affinityScore)
    .slice(0, 3);

  // Fallback if no strong matches — return top 3 by price desc (premium items)
  if (scored.length < 3) {
    const fallback = products
      .filter(p => !scored.some(s => s.id === p.id))
      .slice(0, 3 - scored.length)
      .map(p => ({
        ...p,
        price:        p.costCents != null ? `$${(p.costCents / 100).toFixed(2)}` : null,
        affinityScore: 0,
      }));
    scored.push(...fallback);
  }

  // Resolve guest profile for pulse message
  let guestName  = "Guest";
  let guestLevel = "Explorer";
  let masteryTier = "explorer";

  if (query.guestId) {
    try {
      const [profile] = await db
        .select({ firstName: guestProfilesTable.firstName, masteryTier: guestProfilesTable.masteryTier })
        .from(guestProfilesTable)
        .where(eq(guestProfilesTable.id, query.guestId))
        .limit(1);
      if (profile) {
        guestName   = profile.firstName;
        masteryTier = profile.masteryTier;
        guestLevel  = MASTERY_TIER_LABELS[masteryTier] ?? "Explorer";
      }
    } catch { /* non-fatal */ }
  }

  const topMatch   = scored[0];
  const draftLabel = tagList.slice(0, 3).join(" · ") || "craft session";

  // Dominant wrapper tag — primary flavor descriptor from the draft
  const wrapperTag = tagList[0] ?? "craft";
  const wrapperDesc = wrapperTag.charAt(0).toUpperCase() + wrapperTag.slice(1);
  const recommendedItem = topMatch?.name ?? "House Special Spirit";

  // Build REVENUE_OPPORTUNITY BOH_PULSE notification (AxiomBridge spec format)
  const pulse = {
    type:           "REVENUE_OPPORTUNITY",
    table:          query.tableId ?? "–",
    guestName,
    guestLevel,
    draftProfile:   draftLabel,
    topMatch:       recommendedItem,
    masteryBoost:   15,
    timestamp:      new Date().toISOString(),
    message:        `${guestName} (${guestLevel}) finalised a ${draftLabel} draft.`,
    action:         `Recommend ${recommendedItem} for a +15 Mastery Boost.`,
    recommendation: `Based on their ${wrapperDesc} draft, offer the ${recommendedItem} for a +15 Mastery Boost.`,
  };

  // Emit BOH_PULSE to staff dashboard via Socket.io
  const io = getIO();
  if (io) {
    const room = query.venueId ? `venue:${query.venueId}` : undefined;
    const emit = room ? io.to(room) : io;
    emit.emit("BOH_PULSE", pulse);
  }

  // Log pulse to DB (fire-and-forget)
  if (topMatch) {
    db.insert(serverPulseEventsTable).values({
      venueId:         query.venueId ?? undefined,
      tableId:         query.tableId ?? undefined,
      guestProfileId:  query.guestId ?? undefined,
      guestName,
      guestLevel,
      draftProfile:    draftLabel,
      recommendedItem: topMatch.name,
      masteryBoost:    15,
    }).catch(() => {});
  }

  res.json({ suggestions: scored, pulse });
});

// ── GET /pulse/recent ─────────────────────────────────────────────────────────

router.get("/pulse/recent", async (req, res) => {
  const venueId = z.string().uuid().optional().parse(req.query["venueId"]);

  let rows;
  if (venueId) {
    rows = await db
      .select()
      .from(serverPulseEventsTable)
      .where(eq(serverPulseEventsTable.venueId, venueId))
      .orderBy(desc(serverPulseEventsTable.sentAt))
      .limit(20);
  } else {
    rows = await db
      .select()
      .from(serverPulseEventsTable)
      .orderBy(desc(serverPulseEventsTable.sentAt))
      .limit(20);
  }

  res.json({ events: rows });
});

export default router;
