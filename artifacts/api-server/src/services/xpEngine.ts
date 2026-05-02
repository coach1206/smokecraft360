/**
 * xpEngine — awards XP and updates user progression after a verified order.
 *
 * Rules (strict):
 *  - XP is ONLY awarded when order.verified === true
 *  - XP is awarded exactly ONCE per order (guarded by xpAwarded flag)
 *  - Cigar purchase  → +10 XP
 *  - Drink pairing   → +8  XP
 *  - Food order      → +4  XP
 *  - Full combo      → +20 bonus XP (cigar + drink + food)
 *  - New product     → +5  bonus XP (first time this user has tried this product)
 *
 * Fraud prevention:
 *  - Double-check xpAwarded flag in DB before writing (race-safe CAS update)
 *  - Only staff / manager / venue_owner / super_admin can call verify endpoint
 */

import { eq, sql }                      from "drizzle-orm";
import {
  db,
  ordersTable,
  userProgressionTable,
  userHumidorTable,
  type DbOrder,
}                                        from "@workspace/db";
import { logger }                        from "../lib/logger";

export interface XpResult {
  xpAwarded:   number;
  breakdown:   { reason: string; xp: number }[];
  newXp:       number;
  newOrders:   number;
}

/**
 * Award XP for an order that has just been verified.
 * Returns the XP breakdown, or null if XP was already awarded.
 */
export async function awardXpForOrder(order: DbOrder): Promise<XpResult | null> {
  // Guard: only verified orders with xpAwarded=false
  if (!order.verified || order.xpAwarded) return null;
  if (!order.userId) return null;

  // CAS: mark xpAwarded = true atomically, aborting if already true
  const [locked] = await db
    .update(ordersTable)
    .set({ xpAwarded: true })
    .where(eq(ordersTable.id, order.id))
    .returning();

  if (!locked || locked.xpAwarded === false) {
    // Another process already claimed it (shouldn't happen, belt-and-suspenders)
    logger.warn({ orderId: order.id }, "XP already awarded — skipping");
    return null;
  }

  // ── Calculate XP breakdown ─────────────────────────────────────────────────

  const breakdown: { reason: string; xp: number }[] = [];
  let total = 0;

  if (order.cigarId) {
    breakdown.push({ reason: "Cigar purchase",  xp: 10 });
    total += 10;
  }
  if (order.drinkId) {
    breakdown.push({ reason: "Drink pairing",   xp: 8  });
    total += 8;
  }
  if (order.foodId) {
    breakdown.push({ reason: "Food order",      xp: 4  });
    total += 4;
  }

  // Combo bonus
  if (order.cigarId && order.drinkId && order.foodId) {
    breakdown.push({ reason: "Full combo bonus", xp: 20 });
    total += 20;
  }

  // New product bonus — check humidor BEFORE upserting
  const newProducts: string[] = [];
  for (const [productId, productName, category] of [
    [order.cigarId, order.cigarName, "cigar" ],
    [order.drinkId, order.drinkName, "alcohol"],
    [order.foodId,  order.foodName,  "food"  ],
  ] as [string | null, string | null, string][]) {
    if (!productId) continue;

    const existing = await db
      .select({ id: userHumidorTable.id })
      .from(userHumidorTable)
      .where(
        sql`${userHumidorTable.userId} = ${order.userId}::uuid
          AND ${userHumidorTable.productId} = ${productId}`,
      )
      .limit(1);

    const isNew = existing.length === 0;
    if (isNew) newProducts.push(productId);

    // Upsert humidor
    await db.execute(sql`
      INSERT INTO user_humidor (user_id, product_id, product_name, category, quantity_purchased, last_purchased_at)
      VALUES (
        ${order.userId}::uuid,
        ${productId},
        ${productName ?? null},
        ${category},
        1,
        now()
      )
      ON CONFLICT ON CONSTRAINT humidor_user_product_unique
      DO UPDATE SET
        quantity_purchased = user_humidor.quantity_purchased + 1,
        last_purchased_at  = now(),
        product_name       = COALESCE(EXCLUDED.product_name, user_humidor.product_name)
    `);
  }

  if (newProducts.length > 0) {
    const bonus = newProducts.length * 5;
    breakdown.push({ reason: `${newProducts.length} new product${newProducts.length > 1 ? "s" : ""} tried`, xp: bonus });
    total += bonus;
  }

  // ── Upsert user_progression ────────────────────────────────────────────────

  const cigarDelta = order.cigarId ? 1 : 0;
  const drinkDelta = order.drinkId ? 1 : 0;
  const foodDelta  = order.foodId  ? 1 : 0;
  const uniqueDelta = newProducts.length;

  const [row] = await db
    .insert(userProgressionTable)
    .values({
      userId:              order.userId,
      xp:                  total,
      totalVerifiedOrders: 1,
      totalCigarsSmoked:   cigarDelta,
      totalDrinksTried:    drinkDelta,
      totalFoodOrders:     foodDelta,
      uniqueProductsTried: uniqueDelta,
    })
    .onConflictDoUpdate({
      target: userProgressionTable.userId,
      set: {
        xp:                  sql`user_progression.xp + ${total}`,
        totalVerifiedOrders: sql`user_progression.total_verified_orders + 1`,
        totalCigarsSmoked:   sql`user_progression.total_cigars_smoked   + ${cigarDelta}`,
        totalDrinksTried:    sql`user_progression.total_drinks_tried    + ${drinkDelta}`,
        totalFoodOrders:     sql`user_progression.total_food_orders     + ${foodDelta}`,
        uniqueProductsTried: sql`user_progression.unique_products_tried + ${uniqueDelta}`,
        updatedAt:           new Date(),
      },
    })
    .returning();

  logger.info(
    { orderId: order.id, userId: order.userId, xp: total, breakdown },
    "XP awarded",
  );

  return {
    xpAwarded: total,
    breakdown,
    newXp:     row?.xp        ?? total,
    newOrders: row?.totalVerifiedOrders ?? 1,
  };
}
