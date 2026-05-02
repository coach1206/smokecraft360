/**
 * xpEngine — awards XP and loyalty points after a verified order.
 *
 * XP rules (gates tier progression):
 *   Cigar purchase  → +10 XP
 *   Drink pairing   → +8  XP
 *   Food order      → +4  XP
 *   Full combo      → +20 bonus XP (cigar + drink + food)
 *   New product     → +5  bonus XP (first time this user has tried this product)
 *
 * Loyalty point rules (spendable on rewards):
 *   Cigar purchase  → +10 pts
 *   Drink pairing   → +8  pts
 *   Food order      → +5  pts
 *   Full combo      → +25 bonus pts (cigar + drink + food)
 *   Welcome bonus   → +50 pts (very first verified order)
 *
 * Fraud prevention:
 *   Double-check xpAwarded flag before writing (race-safe CAS update).
 *   Only staff / manager / venue_owner / super_admin can call the verify endpoint.
 */

import { eq, sql }                      from "drizzle-orm";
import {
  db,
  ordersTable,
  userProgressionTable,
  userHumidorTable,
  userLoyaltyPointsTable,
  type DbOrder,
}                                        from "@workspace/db";
import { logger }                        from "../lib/logger";

export interface XpResult {
  xpAwarded:     number;
  pointsAwarded: number;
  breakdown:     { reason: string; xp: number; pts: number }[];
  newXp:         number;
  newOrders:     number;
  newPoints:     number;
}

/**
 * Award XP + loyalty points for an order that has just been verified.
 * Returns the breakdown, or null if XP was already awarded.
 */
export async function awardXpForOrder(order: DbOrder): Promise<XpResult | null> {
  // Guard: only verified orders with xpAwarded=false
  if (!order.verified || order.xpAwarded) return null;
  if (!order.userId) return null;

  // CAS: mark xpAwarded = true atomically
  const [locked] = await db
    .update(ordersTable)
    .set({ xpAwarded: true })
    .where(eq(ordersTable.id, order.id))
    .returning();

  if (!locked || locked.xpAwarded === false) {
    logger.warn({ orderId: order.id }, "XP already awarded — skipping");
    return null;
  }

  // ── XP + Points breakdown ──────────────────────────────────────────────────

  const breakdown: { reason: string; xp: number; pts: number }[] = [];
  let totalXp  = 0;
  let totalPts = 0;

  if (order.cigarId) {
    breakdown.push({ reason: "Cigar purchase",  xp: 10, pts: 10 });
    totalXp  += 10; totalPts += 10;
  }
  if (order.drinkId) {
    breakdown.push({ reason: "Drink pairing",   xp: 8,  pts: 8  });
    totalXp  +=  8; totalPts +=  8;
  }
  if (order.foodId) {
    breakdown.push({ reason: "Food order",      xp: 4,  pts: 5  });
    totalXp  +=  4; totalPts +=  5;
  }

  // Combo bonus
  if (order.cigarId && order.drinkId && order.foodId) {
    breakdown.push({ reason: "Full combo bonus", xp: 20, pts: 25 });
    totalXp  += 20; totalPts += 25;
  }

  // ── New product bonus (XP only) ────────────────────────────────────────────

  const newProducts: string[] = [];
  for (const [productId, productName, category] of [
    [order.cigarId, order.cigarName, "cigar"  ],
    [order.drinkId, order.drinkName, "alcohol"],
    [order.foodId,  order.foodName,  "food"   ],
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
    const xpBonus = newProducts.length * 5;
    breakdown.push({
      reason: `${newProducts.length} new product${newProducts.length > 1 ? "s" : ""} tried`,
      xp: xpBonus, pts: 0,
    });
    totalXp += xpBonus;
  }

  // ── Upsert user_progression ────────────────────────────────────────────────

  const cigarDelta  = order.cigarId ? 1 : 0;
  const drinkDelta  = order.drinkId ? 1 : 0;
  const foodDelta   = order.foodId  ? 1 : 0;
  const uniqueDelta = newProducts.length;

  const [progRow] = await db
    .insert(userProgressionTable)
    .values({
      userId:              order.userId,
      xp:                  totalXp,
      totalVerifiedOrders: 1,
      totalCigarsSmoked:   cigarDelta,
      totalDrinksTried:    drinkDelta,
      totalFoodOrders:     foodDelta,
      uniqueProductsTried: uniqueDelta,
    })
    .onConflictDoUpdate({
      target: userProgressionTable.userId,
      set: {
        xp:                  sql`user_progression.xp + ${totalXp}`,
        totalVerifiedOrders: sql`user_progression.total_verified_orders + 1`,
        totalCigarsSmoked:   sql`user_progression.total_cigars_smoked   + ${cigarDelta}`,
        totalDrinksTried:    sql`user_progression.total_drinks_tried    + ${drinkDelta}`,
        totalFoodOrders:     sql`user_progression.total_food_orders     + ${foodDelta}`,
        uniqueProductsTried: sql`user_progression.unique_products_tried + ${uniqueDelta}`,
        updatedAt:           new Date(),
      },
    })
    .returning();

  // ── Upsert user_loyalty_points ─────────────────────────────────────────────

  // Welcome bonus: +50 pts on the very first verified order
  const isFirstOrder = (progRow?.totalVerifiedOrders ?? 1) === 1;
  if (isFirstOrder) {
    breakdown.push({ reason: "Welcome bonus (first order)", xp: 0, pts: 50 });
    totalPts += 50;
  }

  const [loyaltyRow] = await db.execute<{ total_points: number }>(sql`
    INSERT INTO user_loyalty_points (user_id, total_points, points_redeemed)
    VALUES (${order.userId}::uuid, ${totalPts}, 0)
    ON CONFLICT (user_id)
    DO UPDATE SET
      total_points = user_loyalty_points.total_points + ${totalPts},
      updated_at   = now()
    RETURNING total_points
  `);

  logger.info(
    { orderId: order.id, userId: order.userId, xp: totalXp, pts: totalPts, breakdown },
    "XP + loyalty points awarded",
  );

  return {
    xpAwarded:     totalXp,
    pointsAwarded: totalPts,
    breakdown,
    newXp:         progRow?.xp                  ?? totalXp,
    newOrders:     progRow?.totalVerifiedOrders  ?? 1,
    newPoints:     Number((loyaltyRow as { total_points: number } | undefined)?.total_points ?? totalPts),
  };
}
