/**
 * tournamentWorker — auto-closes expired tournaments and spawns replacements.
 *
 * Schedule:
 *   live      — checked every 5 minutes
 *   daily     — checked every hour
 *   weekly    — checked every hour
 *   venue/grand — not auto-replaced (long-running; managed manually)
 */

import { and, eq, lt, lte, or, inArray, gte, isNull } from "drizzle-orm";
import { db, tournamentsTable } from "@workspace/db";
import { logger } from "./logger";
import { getIO } from "./socketServer";

const LIVE_INTERVAL_MS    =  5 * 60 * 1000;
const CYCLIC_INTERVAL_MS  = 60 * 60 * 1000;

export interface TournamentWorkerResult {
  scannedCount:   number;
  completedCount: number;
  spawnedCount:   number;
  errors:         number;
  durationMs:     number;
  ranAt:          string;
}

let lastResult: TournamentWorkerResult | null = null;
let running = false;
let liveInterval:    NodeJS.Timeout | null = null;
let cyclicInterval:  NodeJS.Timeout | null = null;

// ── Duration helpers ──────────────────────────────────────────────────────────

type CyclicType = "live" | "daily" | "weekly";

function nextWindow(type: CyclicType): { startAt: Date; endAt: Date } {
  const now = new Date();
  switch (type) {
    case "live": {
      const endAt = new Date(now.getTime() + 30 * 60 * 1000);
      return { startAt: now, endAt };
    }
    case "daily": {
      const startAt = new Date(now);
      startAt.setHours(0, 0, 0, 0);
      const endAt = new Date(now);
      endAt.setHours(23, 59, 59, 999);
      return { startAt, endAt };
    }
    case "weekly": {
      const startAt = new Date(now);
      startAt.setDate(now.getDate() - now.getDay() + 1);
      startAt.setHours(0, 0, 0, 0);
      const endAt = new Date(startAt);
      endAt.setDate(startAt.getDate() + 6);
      endAt.setHours(23, 59, 59, 999);
      return { startAt, endAt };
    }
  }
}

function defaultPrizes(type: CyclicType): { prizeFirst: string; prizeSecond: string; prizeThird: string } {
  switch (type) {
    case "live":   return { prizeFirst: "Free Craft Session",   prizeSecond: "10% Off Next Visit",  prizeThird: "Badge: Speed Crafter" };
    case "daily":  return { prizeFirst: "Daily Champion Badge", prizeSecond: "Free Pairing",         prizeThird: "5% Off" };
    case "weekly": return { prizeFirst: "$50 Lounge Credit",    prizeSecond: "$25 Lounge Credit",    prizeThird: "$10 Lounge Credit" };
  }
}

function defaultTitle(type: CyclicType): string {
  switch (type) {
    case "live":   return "Lightning Craft Sprint";
    case "daily":  return "Daily Smoke Masters";
    case "weekly": return "Weekly Craft League";
  }
}

function defaultDescription(type: CyclicType): string {
  switch (type) {
    case "live":   return "30-minute live showdown. Fastest build with the highest score wins.";
    case "daily":  return "24-hour daily rolling competition. One score per crafter.";
    case "weekly": return "Seven-day weekly battle across all craft types. Top 3 win lounge credit.";
  }
}

// ── Core enforcement ──────────────────────────────────────────────────────────

export async function runTournamentEnforcement(
  types: CyclicType[],
): Promise<TournamentWorkerResult> {
  if (running) {
    logger.warn("tournament enforcement skipped: previous run still in progress");
    return lastResult ?? {
      scannedCount: 0, completedCount: 0, spawnedCount: 0,
      errors: 0, durationMs: 0, ranAt: new Date().toISOString(),
    };
  }

  running = true;
  const start = Date.now();
  let scannedCount   = 0;
  let completedCount = 0;
  let spawnedCount   = 0;
  let errors         = 0;

  try {
    const now = new Date();

    const expired = await db
      .select()
      .from(tournamentsTable)
      .where(
        and(
          or(
            eq(tournamentsTable.status, "active"),
            eq(tournamentsTable.status, "upcoming"),
          ),
          inArray(tournamentsTable.type, types),
          lt(tournamentsTable.endAt, now),
        ),
      );

    scannedCount = expired.length;

    for (const tournament of expired) {
      try {
        await db
          .update(tournamentsTable)
          .set({ status: "completed", updatedAt: now })
          .where(eq(tournamentsTable.id, tournament.id));

        completedCount++;
        logger.info(
          { tournamentId: tournament.id, type: tournament.type, title: tournament.title },
          "Tournament auto-completed by worker",
        );

        try {
          getIO().emit("tournament_completed", {
            tournamentId: tournament.id,
            type: tournament.type,
            title: tournament.title,
            ts: Date.now(),
          });
        } catch {
          // Socket.io may not be initialised in test environments
        }

        const type = tournament.type as CyclicType;
        if (type === "live" || type === "daily" || type === "weekly") {
          const window = nextWindow(type);
          const prizes = defaultPrizes(type);

          // Idempotency guard: skip spawning if an active/upcoming tournament of
          // the same type and venue scope already overlaps the replacement window.
          // Window-overlap condition: existing.startAt <= window.endAt AND
          // existing.endAt >= window.startAt, ensuring a far-future tournament
          // (e.g. next day's slot) does not incorrectly suppress this window's spawn.
          // This prevents duplicate rows when multiple stale expired entries of
          // the same type are processed in one run, or when multiple API
          // instances race to complete the same expired tournament.
          const venueFilter = tournament.venueId
            ? eq(tournamentsTable.venueId, tournament.venueId)
            : isNull(tournamentsTable.venueId);

          const [existing] = await db
            .select({ id: tournamentsTable.id })
            .from(tournamentsTable)
            .where(
              and(
                eq(tournamentsTable.type, tournament.type),
                or(
                  eq(tournamentsTable.status, "active"),
                  eq(tournamentsTable.status, "upcoming"),
                ),
                // existing tournament overlaps the replacement window
                lte(tournamentsTable.startAt, window.endAt),
                gte(tournamentsTable.endAt, window.startAt),
                venueFilter,
              ),
            )
            .limit(1);

          if (existing) {
            logger.info(
              { existingId: existing.id, type, venueId: tournament.venueId },
              "Replacement tournament already exists — spawn skipped",
            );
            continue;
          }

          const [spawned] = await db
            .insert(tournamentsTable)
            .values({
              title:       tournament.title ?? defaultTitle(type),
              description: tournament.description ?? defaultDescription(type),
              type:        tournament.type,
              craftType:   tournament.craftType,
              venueId:     tournament.venueId,
              status:      window.startAt <= now ? "active" : "upcoming",
              startAt:     window.startAt,
              endAt:       window.endAt,
              maxEntrants: tournament.maxEntrants,
              prizeFirst:  tournament.prizeFirst  ?? prizes.prizeFirst,
              prizeSecond: tournament.prizeSecond ?? prizes.prizeSecond,
              prizeThird:  tournament.prizeThird  ?? prizes.prizeThird,
              featured:    tournament.featured,
            })
            .returning({ id: tournamentsTable.id });

          spawnedCount++;
          logger.info(
            { newTournamentId: spawned?.id, type, title: tournament.title ?? defaultTitle(type) },
            "Replacement tournament spawned by worker",
          );

          try {
            getIO().emit("tournament_spawned", {
              tournamentId: spawned?.id,
              type,
              title: tournament.title ?? defaultTitle(type),
              endAt: window.endAt.toISOString(),
              ts: Date.now(),
            });
          } catch {
            // Socket.io may not be initialised in test environments
          }
        }
      } catch (err) {
        errors++;
        logger.error({ err, tournamentId: tournament.id }, "Error processing expired tournament");
      }
    }
  } catch (err) {
    errors++;
    logger.error({ err }, "Tournament enforcement worker failed");
  } finally {
    running = false;
  }

  const result: TournamentWorkerResult = {
    scannedCount,
    completedCount,
    spawnedCount,
    errors,
    durationMs: Date.now() - start,
    ranAt: new Date().toISOString(),
  };

  lastResult = result;

  if (scannedCount > 0 || errors > 0) {
    logger.info(result, "Tournament enforcement complete");
  }

  return result;
}

export function getTournamentWorkerStatus() {
  return { running, lastResult, liveIntervalMs: LIVE_INTERVAL_MS, cyclicIntervalMs: CYCLIC_INTERVAL_MS };
}

export function startTournamentWorker(): void {
  if (liveInterval && cyclicInterval) return;

  // Stagger initial runs to avoid thundering herd at startup
  setTimeout(() => {
    runTournamentEnforcement(["live"]).catch(() => {});
  }, 30_000);

  setTimeout(() => {
    runTournamentEnforcement(["daily", "weekly"]).catch(() => {});
  }, 45_000);

  liveInterval = setInterval(() => {
    runTournamentEnforcement(["live"]).catch(() => {});
  }, LIVE_INTERVAL_MS);

  cyclicInterval = setInterval(() => {
    runTournamentEnforcement(["daily", "weekly"]).catch(() => {});
  }, CYCLIC_INTERVAL_MS);

  logger.info("tournament enforcement worker scheduled (live: 5m, daily/weekly: 1h)");
}

export function stopTournamentWorker(): void {
  if (liveInterval) {
    clearInterval(liveInterval);
    liveInterval = null;
  }
  if (cyclicInterval) {
    clearInterval(cyclicInterval);
    cyclicInterval = null;
  }
}
