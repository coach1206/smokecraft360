/**
 * Progression & Leaderboard routes
 *
 * GET /api/progression         — current user's XP, level, humidor, stats
 * GET /api/progression/humidor — current user's personal humidor
 * GET /api/leaderboard         — top users by XP, verified orders, and blends
 */

import { Router, type IRouter, type Response } from "express";
import { desc, eq, sql }                        from "drizzle-orm";
import {
  db,
  userProgressionTable,
  userHumidorTable,
  usersTable,
  ordersTable,
}                                               from "@workspace/db";
import { requireAuth, type AuthRequest }        from "../middleware/auth";
import { getAllInventory }                       from "../services/boostService";

const router: IRouter = Router();

// ── Level computation (mirrors client lib/levels.ts) ─────────────────────────

const TIERS = [
  { index: 0, title: "Explorer",          minOrders: 0,  minXp: 0   },
  { index: 1, title: "Enthusiast",        minOrders: 5,  minXp: 50  },
  { index: 2, title: "Aficionado",        minOrders: 15, minXp: 150 },
  { index: 3, title: "Connoisseur",       minOrders: 30, minXp: 350 },
  { index: 4, title: "Maestro del Fuego", minOrders: 60, minXp: 700 },
];

function computeLevel(verifiedOrders: number, xp: number) {
  let tier = TIERS[0]!;
  for (const t of TIERS) {
    if (verifiedOrders >= t.minOrders && xp >= t.minXp) tier = t;
  }
  const next = TIERS[tier.index + 1];
  const pct  = next
    ? Math.round(Math.min(
        verifiedOrders / next.minOrders,
        xp / next.minXp,
      ) * 100)
    : 100;
  return { ...tier, nextTier: next ?? null, progressPercent: pct };
}

// ── GET /api/progression ──────────────────────────────────────────────────────

router.get(
  "/",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const [prog, humidor, recentOrders] = await Promise.all([
      db.select()
        .from(userProgressionTable)
        .where(eq(userProgressionTable.userId, userId))
        .limit(1),

      db.select()
        .from(userHumidorTable)
        .where(eq(userHumidorTable.userId, userId))
        .orderBy(desc(userHumidorTable.lastPurchasedAt))
        .limit(20),

      db.select()
        .from(ordersTable)
        .where(eq(ordersTable.userId, userId))
        .orderBy(desc(ordersTable.createdAt))
        .limit(10),
    ]);

    const p = prog[0] ?? {
      xp: 0, totalVerifiedOrders: 0, totalCigarsSmoked: 0,
      totalDrinksTried: 0, totalFoodOrders: 0, blendsCreated: 0,
      uniqueProductsTried: 0,
    };

    const level = computeLevel(p.totalVerifiedOrders, p.xp);

    // Enrich humidor with product metadata
    const inventory = getAllInventory();
    const productMap = new Map(inventory.map((p) => [p.id, p]));

    const enrichedHumidor = humidor.map((h) => ({
      ...h,
      imageUrl: productMap.get(h.productId)?.imageUrl ?? null,
    }));

    res.json({
      userId,
      xp:                  p.xp,
      totalVerifiedOrders: p.totalVerifiedOrders,
      totalCigarsSmoked:   p.totalCigarsSmoked,
      totalDrinksTried:    p.totalDrinksTried,
      totalFoodOrders:     p.totalFoodOrders,
      blendsCreated:       p.blendsCreated,
      uniqueProductsTried: p.uniqueProductsTried,
      level,
      humidor:             enrichedHumidor,
      recentOrders:        recentOrders.map((o) => ({
        id:                 o.id,
        cigarName:          o.cigarName,
        drinkName:          o.drinkName,
        foodName:           o.foodName,
        orderType:          o.orderType,
        status:             o.status,
        verified:           o.verified,
        verifiedAt:         o.verifiedAt,
        verificationMethod: o.verificationMethod,
        xpAwarded:          o.xpAwarded,
        createdAt:          o.createdAt,
      })),
    });
  },
);

// ── GET /api/leaderboard ──────────────────────────────────────────────────────

router.get(
  "/leaderboard",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    // Top by XP
    const topXp = await db
      .select({
        userId:              userProgressionTable.userId,
        name:                usersTable.name,
        xp:                  userProgressionTable.xp,
        totalVerifiedOrders: userProgressionTable.totalVerifiedOrders,
        uniqueProductsTried: userProgressionTable.uniqueProductsTried,
        blendsCreated:       userProgressionTable.blendsCreated,
      })
      .from(userProgressionTable)
      .innerJoin(usersTable, eq(userProgressionTable.userId, usersTable.id))
      .orderBy(desc(userProgressionTable.xp))
      .limit(10);

    // Top by verified orders (most active smokers)
    const topSmokers = await db
      .select({
        userId:              userProgressionTable.userId,
        name:                usersTable.name,
        xp:                  userProgressionTable.xp,
        totalVerifiedOrders: userProgressionTable.totalVerifiedOrders,
        totalCigarsSmoked:   userProgressionTable.totalCigarsSmoked,
        totalDrinksTried:    userProgressionTable.totalDrinksTried,
      })
      .from(userProgressionTable)
      .innerJoin(usersTable, eq(userProgressionTable.userId, usersTable.id))
      .orderBy(desc(userProgressionTable.totalVerifiedOrders))
      .limit(10);

    // Trending (most recently active — last 7 days verified orders)
    const trending = await db.execute<{
      user_id: string; name: string; order_count: number;
    }>(sql`
      SELECT
        u.id            AS user_id,
        u.name          AS name,
        cast(count(*)   AS integer) AS order_count
      FROM   orders o
      JOIN   users u ON o.user_id = u.id
      WHERE  o.verified = true
        AND  o.verified_at >= now() - interval '7 days'
      GROUP  BY u.id, u.name
      ORDER  BY order_count DESC
      LIMIT  10
    `);

    // Enrich with level info
    const enrich = (row: {
      userId: string; name: string; xp: number; totalVerifiedOrders: number;
    }) => ({
      ...row,
      level: computeLevel(row.totalVerifiedOrders, row.xp),
    });

    res.json({
      generatedAt:  new Date().toISOString(),
      topCreators:  topXp.map(enrich),
      topSmokers:   topSmokers.map(enrich),
      trendingUsers: (trending.rows ?? []).map((r) => ({
        userId:     r.user_id,
        name:       r.name,
        orderCount: Number(r.order_count),
      })),
    });
  },
);

export default router;
