/**
 * Lounge League routes
 *
 * GET  /api/lounge-league              — full leaderboard (all venues + scores)
 * GET  /api/lounge-league/:id          — single venue stats + user contribution rank
 * GET  /api/lounge-league/my-lounge    — stats for the logged-in user's venue
 */

import { Router, type IRouter, type Response } from "express";
import { eq, sql, desc, and, gte }             from "drizzle-orm";
import {
  db,
  venuesTable,
  ordersTable,
  loungeStatsTable,
  userProgressionTable,
}                                               from "@workspace/db";
import { requireAuth, type AuthRequest }        from "../middleware/auth";
import { logger }                               from "../lib/logger";

const router: IRouter = Router();

// ── Score calculation ──────────────────────────────────────────────────────────

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface RawStat {
  loungeId:            string;
  loungeName:          string;
  loungeType:          string;
  totalOrders:         number;
  totalVerifiedOrders: number;
  weeklyOrders:        number;
  totalUsers:          number;
  repeatCustomers:     number;
}

async function computeLeague(): Promise<RawStat[]> {
  const weekAgo = new Date(Date.now() - WEEK_MS);

  // Aggregate orders per venue
  const rows = await db.execute<{
    lounge_id:             string;
    lounge_name:           string;
    lounge_type:           string;
    total_orders:          string;
    total_verified_orders: string;
    weekly_orders:         string;
    total_users:           string;
    repeat_customers:      string;
  }>(sql`
    SELECT
      v.id                                                    AS lounge_id,
      v.name                                                  AS lounge_name,
      v.type                                                  AS lounge_type,
      COUNT(o.id)                                             AS total_orders,
      COUNT(o.id) FILTER (WHERE o.verified = true)            AS total_verified_orders,
      COUNT(o.id) FILTER (WHERE o.created_at >= ${weekAgo})   AS weekly_orders,
      COUNT(DISTINCT o.user_id)                               AS total_users,
      COUNT(DISTINCT o.user_id) FILTER (
        WHERE (
          SELECT COUNT(*) FROM orders o2
          WHERE o2.user_id = o.user_id AND o2.venue_id = v.id
        ) > 1
      )                                                        AS repeat_customers
    FROM venues v
    LEFT JOIN orders o ON o.venue_id = v.id
    GROUP BY v.id, v.name, v.type
    ORDER BY total_verified_orders DESC
  `);

  return rows.map((r) => ({
    loungeId:            r.lounge_id,
    loungeName:          r.lounge_name,
    loungeType:          r.lounge_type,
    totalOrders:         Number(r.total_orders),
    totalVerifiedOrders: Number(r.total_verified_orders),
    weeklyOrders:        Number(r.weekly_orders),
    totalUsers:          Number(r.total_users),
    repeatCustomers:     Number(r.repeat_customers),
  }));
}

function computeScore(s: RawStat): number {
  return (
    s.totalVerifiedOrders * 10 +
    s.weeklyOrders        * 25 +
    s.totalUsers          * 5  +
    s.repeatCustomers     * 8
  );
}

function assignBadges(stats: (RawStat & { score: number; rank: number })[]) {
  const badges: Record<string, string[]> = {};
  stats.forEach((s) => { badges[s.loungeId] = []; });

  // Top rated = #1 by score
  if (stats[0]) badges[stats[0].loungeId]!.push("top_rated");

  // Most active = most total verified orders
  const mostActive = [...stats].sort((a, b) => b.totalVerifiedOrders - a.totalVerifiedOrders)[0];
  if (mostActive) badges[mostActive.loungeId]!.push("most_active");

  // Trending venue = most weekly orders
  const trending = [...stats].sort((a, b) => b.weeklyOrders - a.weeklyOrders)[0];
  if (trending) badges[trending.loungeId]!.push("trending_venue");

  // Best experience = most repeat customers ratio
  const bestExp = [...stats].sort((a, b) => {
    const ra = a.totalUsers > 0 ? a.repeatCustomers / a.totalUsers : 0;
    const rb = b.totalUsers > 0 ? b.repeatCustomers / b.totalUsers : 0;
    return rb - ra;
  })[0];
  if (bestExp && bestExp.repeatCustomers > 0) badges[bestExp.loungeId]!.push("best_experience");

  return badges;
}

// ── GET /api/lounge-league ─────────────────────────────────────────────────────

router.get(
  "/",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const raw   = await computeLeague();
    const scored = raw
      .map((s) => ({ ...s, score: computeScore(s) }))
      .sort((a, b) => b.score - a.score)
      .map((s, i) => ({ ...s, rank: i + 1 }));

    const badges = assignBadges(scored);

    // Anonymize: non-super_admin viewers never see other venues' real names.
    // Their own venue is shown by name; everyone else becomes "Lounge #N".
    const isAdmin   = req.user?.role === "super_admin";
    const myVenueId = req.user?.venueId;

    const result = scored.map((s) => {
      const isSelf      = s.loungeId === myVenueId;
      const showRealName = isAdmin || isSelf;
      return {
        ...s,
        loungeName: showRealName ? s.loungeName : `Lounge #${s.rank}`,
        loungeId:   showRealName ? s.loungeId   : null,           // strip ID for anonymized rows
        isSelf,
        badges:     badges[s.loungeId] ?? [],
      };
    });

    // Upsert lounge_stats rows (cache) — use real loungeIds from `scored`, not anonymized result
    for (const s of scored) {
      await db.execute(sql`
        INSERT INTO lounge_stats
          (lounge_id, total_orders, total_verified_orders, weekly_orders,
           total_users, repeat_customers, trending_score, weekly_rank, badges, updated_at)
        VALUES
          (${s.loungeId}::uuid, ${s.totalOrders}, ${s.totalVerifiedOrders},
           ${s.weeklyOrders}, ${s.totalUsers}, ${s.repeatCustomers},
           ${s.score}, ${s.rank}, ${(badges[s.loungeId] ?? []).join(",")}, now())
        ON CONFLICT (lounge_id)
        DO UPDATE SET
          total_orders           = EXCLUDED.total_orders,
          total_verified_orders  = EXCLUDED.total_verified_orders,
          weekly_orders          = EXCLUDED.weekly_orders,
          total_users            = EXCLUDED.total_users,
          repeat_customers       = EXCLUDED.repeat_customers,
          trending_score         = EXCLUDED.trending_score,
          weekly_rank            = EXCLUDED.weekly_rank,
          badges                 = EXCLUDED.badges,
          updated_at             = now()
      `).catch((err) => logger.warn({ err }, "lounge_stats upsert failed"));
    }

    res.json(result);
  },
);

// ── GET /api/lounge-league/my-lounge ──────────────────────────────────────────

router.get(
  "/my-lounge",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const venueId = req.user?.venueId;
    if (!venueId) {
      res.json(null);
      return;
    }

    const raw    = await computeLeague();
    const scored = raw
      .map((s) => ({ ...s, score: computeScore(s) }))
      .sort((a, b) => b.score - a.score)
      .map((s, i) => ({ ...s, rank: i + 1 }));

    const badges = assignBadges(scored);
    const mine   = scored.find((s) => s.loungeId === venueId);
    if (!mine) { res.json(null); return; }

    res.json({ ...mine, badges: badges[venueId] ?? [], totalVenues: scored.length });
  },
);

// ── GET /api/lounge-league/:id ─────────────────────────────────────────────────

router.get(
  "/:id",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    // Single-venue lookup: only allowed for the venue's own user or super_admin
    const isAdmin = req.user?.role === "super_admin";
    if (!isAdmin && req.user?.venueId !== req.params.id) {
      res.status(403).json({ error: "You can only view stats for your own venue" });
      return;
    }

    const raw    = await computeLeague();
    const scored = raw
      .map((s) => ({ ...s, score: computeScore(s) }))
      .sort((a, b) => b.score - a.score)
      .map((s, i) => ({ ...s, rank: i + 1 }));

    const badges = assignBadges(scored);
    const venueIdParam = String(req.params["id"] ?? "");
    const venue        = scored.find((s) => s.loungeId === venueIdParam);
    if (!venue) { res.status(404).json({ error: "Venue not found" }); return; }

    res.json({ ...venue, badges: badges[venueIdParam] ?? [], totalVenues: scored.length });
  },
);

export default router;
