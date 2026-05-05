/**
 * /api/competitions — Competition Engine
 *
 *   GET  /api/competitions                    — list active/upcoming tournaments
 *   GET  /api/competitions/:id                — single tournament + leaderboard
 *   POST /api/competitions                    — create a tournament (admin/owner)
 *   POST /api/competitions/:id/enter          — enter a tournament
 *   POST /api/competitions/:id/sync-score     — recompute score from authoritative craft DB data
 *   GET  /api/competitions/:id/leaderboard    — ranked entries for a tournament
 *
 * Scoring source: craft build scores are pulled from craftBuildsTable (same data
 * source as /api/craft/leaderboard). No client-submitted scores are accepted.
 * Lounge-league context is consumed by the frontend directly via /api/lounge-league
 * (auth-protected, applies existing anonymization policy).
 */

import { Router, type IRouter, type Request, type Response } from "express";
import {
  eq, desc, asc, and, or, sql,
} from "drizzle-orm";
import { z } from "zod";
import {
  db,
  tournamentsTable,
  tournamentEntriesTable,
} from "@workspace/db";
import { requireAuth, optionalAuth, type AuthRequest } from "../middleware/auth";
import { logger } from "../lib/logger";
import { getUserBestCraftScore, rerank } from "../lib/tournamentSync";
import { getIO } from "../lib/socketServer";

const router: IRouter = Router();

// ── Types ──────────────────────────────────────────────────────────────────────

type TournamentType = "live" | "daily" | "weekly" | "venue" | "grand";

// ── Helpers ───────────────────────────────────────────────────────────────────

function tournamentDurationMs(type: TournamentType): number {
  switch (type) {
    case "live":    return 30   * 60 * 1000;
    case "daily":   return 24   * 60 * 60 * 1000;
    case "weekly":  return 7    * 24 * 60 * 60 * 1000;
    case "venue":   return 75   * 24 * 60 * 60 * 1000;
    case "grand":   return 180  * 24 * 60 * 60 * 1000;
  }
}

function defaultPrizes(type: TournamentType): { first: string; second: string; third: string } {
  switch (type) {
    case "live":   return { first: "Free Craft Session",    second: "10% Off Next Visit",   third: "Badge: Speed Crafter" };
    case "daily":  return { first: "Daily Champion Badge",  second: "Free Pairing",          third: "5% Off" };
    case "weekly": return { first: "$50 Lounge Credit",     second: "$25 Lounge Credit",     third: "$10 Lounge Credit" };
    case "venue":  return { first: "VIP Membership Month",  second: "$100 Lounge Credit",    third: "$50 Lounge Credit" };
    case "grand":  return { first: "Grand Master Trophy",   second: "Platinum Membership",   third: "Gold Membership" };
  }
}

// getUserBestCraftScore and rerank are imported from ../lib/tournamentSync.
// They are window-aware: scores are only counted if the craft build was
// created within the tournament's startAt → endAt window.

// ── GET /api/competitions ─────────────────────────────────────────────────────

router.get("/", optionalAuth, async (req: Request, res: Response) => {
  const mine = req.query.mine === "true" || req.query.createdBy === "me";

  if (mine) {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.id;
    const role   = authReq.user?.role;

    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (role !== "super_admin" && role !== "venue_owner" && role !== "manager") {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    const rows = await db
      .select()
      .from(tournamentsTable)
      .where(eq(tournamentsTable.createdBy, userId))
      .orderBy(desc(tournamentsTable.startAt));

    const withCounts = await Promise.all(rows.map(async (t) => {
      const [countRow] = await db
        .select({ cnt: sql<number>`COUNT(*)` })
        .from(tournamentEntriesTable)
        .where(eq(tournamentEntriesTable.tournamentId, t.id));
      return { ...t, entrantCount: Number(countRow?.cnt ?? 0) };
    }));

    res.json(withCounts);
    return;
  }

  const existing = await db
    .select({ id: tournamentsTable.id })
    .from(tournamentsTable)
    .limit(1);

  if (existing.length === 0) {
    await seedDefaultTournaments();
  }

  const rows = await db
    .select()
    .from(tournamentsTable)
    .where(
      or(
        eq(tournamentsTable.status, "active"),
        eq(tournamentsTable.status, "upcoming"),
      ),
    )
    .orderBy(asc(tournamentsTable.startAt));

  const withCounts = await Promise.all(rows.map(async (t) => {
    const [countRow] = await db
      .select({ cnt: sql<number>`COUNT(*)` })
      .from(tournamentEntriesTable)
      .where(eq(tournamentEntriesTable.tournamentId, t.id));
    return { ...t, entrantCount: Number(countRow?.cnt ?? 0) };
  }));

  res.json(withCounts);
});

// ── GET /api/competitions/:id ─────────────────────────────────────────────────

router.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };

  const [tournament] = await db
    .select()
    .from(tournamentsTable)
    .where(eq(tournamentsTable.id, id))
    .limit(1);

  if (!tournament) { res.status(404).json({ error: "Tournament not found" }); return; }

  const entries = await db
    .select()
    .from(tournamentEntriesTable)
    .where(eq(tournamentEntriesTable.tournamentId, id))
    .orderBy(asc(tournamentEntriesTable.rank), desc(tournamentEntriesTable.score))
    .limit(50);

  res.json({ tournament, leaderboard: entries });
});

// ── GET /api/competitions/:id/leaderboard ─────────────────────────────────────

router.get("/:id/leaderboard", async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };

  const entries = await db
    .select()
    .from(tournamentEntriesTable)
    .where(eq(tournamentEntriesTable.tournamentId, id))
    .orderBy(asc(tournamentEntriesTable.rank), desc(tournamentEntriesTable.score))
    .limit(100);

  res.json(entries);
});

// ── POST /api/competitions — create ──────────────────────────────────────────

const createSchema = z.object({
  title:       z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  type:        z.enum(["live", "daily", "weekly", "venue", "grand"]),
  craftType:   z.string().optional(),
  venueId:     z.string().uuid().optional(),
  startAt:     z.string().datetime().optional(),
  maxEntrants: z.number().int().positive().optional(),
  prizeFirst:  z.string().optional(),
  prizeSecond: z.string().optional(),
  prizeThird:  z.string().optional(),
  featured:    z.boolean().optional(),
});

router.post(
  "/",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const role = req.user?.role;
    if (role !== "super_admin" && role !== "venue_owner" && role !== "manager") {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload", issues: parsed.error.issues });
      return;
    }

    const d = parsed.data;
    const prizes  = defaultPrizes(d.type);
    const startAt = d.startAt ? new Date(d.startAt) : new Date();
    const endAt   = new Date(startAt.getTime() + tournamentDurationMs(d.type));

    const status = startAt <= new Date() ? "active" : "upcoming";

    const [tournament] = await db
      .insert(tournamentsTable)
      .values({
        title:       d.title,
        description: d.description,
        type:        d.type,
        craftType:   d.craftType,
        venueId:     d.venueId,
        status,
        startAt,
        endAt,
        maxEntrants: d.maxEntrants,
        prizeFirst:  d.prizeFirst  ?? prizes.first,
        prizeSecond: d.prizeSecond ?? prizes.second,
        prizeThird:  d.prizeThird  ?? prizes.third,
        featured:    d.featured ?? false,
        createdBy:   req.user?.id,
      })
      .returning();

    if (status === "active") {
      try {
        const io = getIO();
        const payload = {
          tournamentId: tournament.id,
          type:         tournament.type,
          title:        tournament.title,
          endAt:        tournament.endAt.toISOString(),
          venueId:      tournament.venueId ?? null,
          ts:           Date.now(),
        };
        if (tournament.venueId) {
          // Venue-specific tournament: only notify kiosks in that venue's room
          io.to(`venue:${tournament.venueId}`).emit("tournament_created", payload);
        } else {
          // Global/cross-venue tournament: notify all connected kiosks
          io.emit("tournament_created", payload);
        }
      } catch (err) {
        logger.warn({ err }, "tournament_created socket emit failed");
      }
    }

    res.status(201).json(tournament);
  },
);

// ── POST /api/competitions/:id/enter ─────────────────────────────────────────

router.post(
  "/:id/enter",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const { id }   = req.params as { id: string };
    const userId   = req.user?.id;
    const userName = req.user?.name ?? "Guest";

    if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

    const [tournament] = await db
      .select()
      .from(tournamentsTable)
      .where(eq(tournamentsTable.id, id))
      .limit(1);

    if (!tournament) { res.status(404).json({ error: "Tournament not found" }); return; }

    if (tournament.status !== "active" && tournament.status !== "upcoming") {
      res.status(409).json({ error: "Tournament is not open for entry" });
      return;
    }

    // Enforce maxEntrants
    if (tournament.maxEntrants) {
      const [{ cnt }] = await db
        .select({ cnt: sql<number>`COUNT(*)` })
        .from(tournamentEntriesTable)
        .where(eq(tournamentEntriesTable.tournamentId, id));
      if (Number(cnt) >= tournament.maxEntrants) {
        res.status(409).json({ error: "Tournament is full" });
        return;
      }
    }

    const [existing] = await db
      .select({ id: tournamentEntriesTable.id })
      .from(tournamentEntriesTable)
      .where(and(
        eq(tournamentEntriesTable.tournamentId, id),
        eq(tournamentEntriesTable.userId, userId),
      ))
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "Already entered", entryId: existing.id });
      return;
    }

    // Seed the initial score from builds created within the tournament window only
    const initialScore = await getUserBestCraftScore(
      userId,
      tournament.craftType,
      tournament.startAt,
      tournament.endAt,
    );

    const [entry] = await db
      .insert(tournamentEntriesTable)
      .values({ tournamentId: id, userId, userName, score: initialScore })
      .returning();

    if (initialScore > 0) {
      await rerank(id).catch((err) => logger.warn({ err }, "enter rerank failed"));
    }

    res.status(201).json(entry);
  },
);

// ── POST /api/competitions/:id/sync-score ─────────────────────────────────────
// Refreshes the user's tournament score from their authoritative craft build
// history — no client-supplied score accepted.

router.post(
  "/:id/sync-score",
  requireAuth,
  async (req: AuthRequest, res: Response) => {
    const { id } = req.params as { id: string };
    const userId  = req.user?.id;

    if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

    const [tournament] = await db
      .select()
      .from(tournamentsTable)
      .where(eq(tournamentsTable.id, id))
      .limit(1);

    if (!tournament) { res.status(404).json({ error: "Tournament not found" }); return; }

    if (tournament.status !== "active") {
      res.status(409).json({ error: "Tournament is not active" });
      return;
    }

    const [entry] = await db
      .select()
      .from(tournamentEntriesTable)
      .where(and(
        eq(tournamentEntriesTable.tournamentId, id),
        eq(tournamentEntriesTable.userId, userId),
      ))
      .limit(1);

    if (!entry) {
      res.status(404).json({ error: "You have not entered this tournament" });
      return;
    }

    // Compute authoritative score from DB — never trust client payload
    // Score authority: best build within the tournament's own time window only
    const authoritativeScore = await getUserBestCraftScore(
      userId,
      tournament.craftType,
      tournament.startAt,
      tournament.endAt,
    );
    const newScore = Math.max(entry.score, authoritativeScore);

    const [updated] = await db
      .update(tournamentEntriesTable)
      .set({ score: newScore, updatedAt: new Date() })
      .where(eq(tournamentEntriesTable.id, entry.id))
      .returning();

    await rerank(id).catch((err) => logger.warn({ err }, "sync-score rerank failed"));

    res.json({ ...updated, scoreSource: "craft_builds" });
  },
);

// ── Seeder ────────────────────────────────────────────────────────────────────

async function seedDefaultTournaments(): Promise<void> {
  const now = new Date();

  type Seed = {
    title: string;
    description: string;
    type: TournamentType;
    craftType: string;
    featured: boolean;
    startAt: Date;
    endAt: Date;
  };

  const seeds: Seed[] = [
    {
      title:       "Lightning Craft Sprint",
      description: "30-minute live showdown. Fastest build with the highest score wins.",
      type:        "live",
      craftType:   "smoke",
      featured:    true,
      startAt:     now,
      endAt:       new Date(now.getTime() + 30 * 60 * 1000),
    },
    {
      title:       "Daily Smoke Masters",
      description: "24-hour daily rolling competition. One score per crafter.",
      type:        "daily",
      craftType:   "smoke",
      featured:    false,
      startAt:     new Date(new Date().setHours(0, 0, 0, 0)),
      endAt:       new Date(new Date().setHours(23, 59, 59, 999)),
    },
    {
      title:       "Weekly Craft League",
      description: "Seven-day weekly battle across all craft types. Top 3 win lounge credit.",
      type:        "weekly",
      craftType:   "smoke",
      featured:    true,
      startAt: (() => {
        const d = new Date();
        d.setDate(d.getDate() - d.getDay() + 1);
        d.setHours(0, 0, 0, 0);
        return d;
      })(),
      endAt: (() => {
        const d = new Date();
        d.setDate(d.getDate() - d.getDay() + 7);
        d.setHours(23, 59, 59, 999);
        return d;
      })(),
    },
    {
      title:       "Venue Championship Series",
      description: "75-day venue championship. Consistent crafters rise to the top.",
      type:        "venue",
      craftType:   "smoke",
      featured:    false,
      startAt:     new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      endAt:       new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
    },
    {
      title:       "Grand Master Championship",
      description: "The ultimate 6-month craft championship. Only the finest will claim the trophy.",
      type:        "grand",
      craftType:   "smoke",
      featured:    true,
      startAt:     new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      endAt:       new Date(now.getTime() + 120 * 24 * 60 * 60 * 1000),
    },
  ];

  for (const s of seeds) {
    const prizes = defaultPrizes(s.type);
    await db.insert(tournamentsTable).values({
      title:       s.title,
      description: s.description,
      type:        s.type,
      craftType:   s.craftType,
      status:      "active",
      startAt:     s.startAt,
      endAt:       s.endAt,
      featured:    s.featured,
      prizeFirst:  prizes.first,
      prizeSecond: prizes.second,
      prizeThird:  prizes.third,
    }).onConflictDoNothing();
  }
}

export default router;
