/**
 * Tournament scoring utilities shared by competitions.ts and craftBuilds.ts.
 *
 * Score authority rules:
 *  - Only craft builds created WITHIN the tournament window (startAt → endAt) count.
 *  - craftType on the tournament is matched to craftBuildsTable.craft.
 *  - No client-supplied scores are accepted.
 */

import { and, desc, eq, gte, isNotNull, lte, sql } from "drizzle-orm";
import {
  craftBuildsTable,
  db,
  tournamentEntriesTable,
  tournamentsTable,
} from "@workspace/db";
import { logger } from "./logger";
import { getIO } from "./socketServer";

export type ResyncResult = {
  tournamentId: string;
  entriesChecked: number;
  entriesUpdated: number;
};

/**
 * Return the user's best craft score within [startAt, endAt].
 * Returns 0 if no qualifying builds exist.
 * Result is scaled to integer points (0–500, matching the entry `score` column).
 */
export async function getUserBestCraftScore(
  userId: string,
  craftType: string | null | undefined,
  startAt: Date,
  endAt: Date,
): Promise<number> {
  const conditions = [
    eq(craftBuildsTable.userId, userId),
    isNotNull(craftBuildsTable.score),
    gte(craftBuildsTable.createdAt, startAt),
    lte(craftBuildsTable.createdAt, endAt),
  ];

  if (craftType) {
    const mapped = craftType.toLowerCase() as "smoke" | "brew" | "pour" | "vape";
    const valid = ["smoke", "brew", "pour", "vape"];
    if (valid.includes(mapped)) {
      conditions.push(eq(craftBuildsTable.craft, mapped));
    }
  }

  const [row] = await db
    .select({ best: sql<number>`MAX(CAST(${craftBuildsTable.score} AS NUMERIC))` })
    .from(craftBuildsTable)
    .where(and(...conditions));

  const scaled = Math.round(Number(row?.best ?? 0) * 100); // scale 0–5 float → 0–500 int pts
  return Number.isFinite(scaled) ? scaled : 0;
}

/**
 * Re-rank all entries in a tournament by descending score.
 * Called after any score update that might change positions.
 */
export async function rerank(tournamentId: string): Promise<void> {
  const entries = await db
    .select({ id: tournamentEntriesTable.id })
    .from(tournamentEntriesTable)
    .where(eq(tournamentEntriesTable.tournamentId, tournamentId))
    .orderBy(desc(tournamentEntriesTable.score));

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry) continue;
    await db
      .update(tournamentEntriesTable)
      .set({ rank: i + 1 })
      .where(eq(tournamentEntriesTable.id, entry.id));
  }
}

/**
 * Automatically propagate a new craft build score to any active tournament
 * entries this user holds that match the craft type.
 *
 * Called fire-and-forget from the craft-builds PATCH/POST handlers whenever
 * a score field is present — ensures the leaderboard stays live without
 * requiring an explicit sync-score call.
 *
 * After a rank change, emits a `tournament_rank_changed` socket event so the
 * frontend can show a real-time toast notification.
 */
export async function syncActiveTournamentScores(
  userId: string,
  craft: string,
): Promise<void> {
  try {
    // Find all active tournaments the user has entered that match this craft type
    const entries = await db
      .select({
        entryId:      tournamentEntriesTable.id,
        entryScore:   tournamentEntriesTable.score,
        entryRank:    tournamentEntriesTable.rank,
        tournamentId: tournamentEntriesTable.tournamentId,
        startAt:      tournamentsTable.startAt,
        endAt:        tournamentsTable.endAt,
        craftType:    tournamentsTable.craftType,
        title:        tournamentsTable.title,
      })
      .from(tournamentEntriesTable)
      .innerJoin(
        tournamentsTable,
        eq(tournamentEntriesTable.tournamentId, tournamentsTable.id),
      )
      .where(and(
        eq(tournamentEntriesTable.userId, userId),
        eq(tournamentsTable.status, "active"),
      ));

    for (const entry of entries) {
      // Skip tournaments that are pinned to a different craft type
      if (entry.craftType && entry.craftType.toLowerCase() !== craft.toLowerCase()) {
        continue;
      }

      const newScore = await getUserBestCraftScore(
        userId,
        entry.craftType,
        entry.startAt,
        entry.endAt,
      );

      // Only write + rerank if score actually improved (never demote)
      if (newScore > entry.entryScore) {
        const oldRank = entry.entryRank;

        await db
          .update(tournamentEntriesTable)
          .set({ score: newScore, updatedAt: new Date() })
          .where(eq(tournamentEntriesTable.id, entry.entryId));

        await rerank(entry.tournamentId).catch((err) =>
          logger.warn({ err, tournamentId: entry.tournamentId }, "auto-sync rerank failed"),
        );

        // Fetch the user's new rank after the rerank
        const [updated] = await db
          .select({ rank: tournamentEntriesTable.rank })
          .from(tournamentEntriesTable)
          .where(eq(tournamentEntriesTable.id, entry.entryId));

        const newRank = updated?.rank ?? null;

        // Emit a socket event if the rank changed
        if (newRank !== null && newRank !== oldRank) {
          try {
            getIO().emit("tournament_rank_changed", {
              userId,
              tournamentId: entry.tournamentId,
              tournamentTitle: entry.title,
              newRank,
              oldRank,
              ts: Date.now(),
            });
            logger.info(
              { userId, tournamentId: entry.tournamentId, oldRank, newRank },
              "tournament_rank_changed emitted",
            );
          } catch (socketErr) {
            // Socket may not be initialised in test/worker contexts — non-fatal
            logger.warn({ socketErr }, "tournament_rank_changed emit skipped (no socket)");
          }
        }
      }
    }
  } catch (err) {
    // Fire-and-forget: log but never throw — must not break craft-builds response
    logger.warn({ err, userId, craft }, "syncActiveTournamentScores failed");
  }
}

/**
 * Re-derive the best score for every entrant of a single active tournament
 * from the craft_builds table and correct any stale ranks.
 *
 * Only ever raises scores — the existing Math.max guard prevents demotions.
 * Returns a summary of how many entries were checked and updated.
 */
export async function reconcileTournamentScores(
  tournamentId: string,
): Promise<ResyncResult> {
  const [tournament] = await db
    .select()
    .from(tournamentsTable)
    .where(eq(tournamentsTable.id, tournamentId))
    .limit(1);

  if (!tournament) {
    throw new Error(`Tournament ${tournamentId} not found`);
  }

  const entries = await db
    .select()
    .from(tournamentEntriesTable)
    .where(eq(tournamentEntriesTable.tournamentId, tournamentId));

  let entriesUpdated = 0;

  for (const entry of entries) {
    const bestScore = await getUserBestCraftScore(
      entry.userId,
      tournament.craftType,
      tournament.startAt,
      tournament.endAt,
    );

    // Never demote — only write if the recomputed score is strictly better
    const correctedScore = Math.max(entry.score, bestScore);
    if (correctedScore > entry.score) {
      await db
        .update(tournamentEntriesTable)
        .set({ score: correctedScore, updatedAt: new Date() })
        .where(eq(tournamentEntriesTable.id, entry.id));
      entriesUpdated++;
    }
  }

  if (entriesUpdated > 0) {
    await rerank(tournamentId);
  }

  return {
    tournamentId,
    entriesChecked: entries.length,
    entriesUpdated,
  };
}

/**
 * Startup reconciliation pass — re-derives scores for all active tournaments.
 * Called non-fatally during server boot so any scores lost due to in-flight
 * syncs at restart time are recovered before the first request is served.
 */
export async function reconcileActiveTournamentScores(): Promise<void> {
  try {
    const activeTournaments = await db
      .select({ id: tournamentsTable.id, title: tournamentsTable.title })
      .from(tournamentsTable)
      .where(eq(tournamentsTable.status, "active"));

    if (activeTournaments.length === 0) {
      logger.info("Tournament reconciliation: no active tournaments found");
      return;
    }

    logger.info(
      { count: activeTournaments.length },
      "Tournament reconciliation: starting startup pass",
    );

    for (const t of activeTournaments) {
      try {
        const result = await reconcileTournamentScores(t.id);
        logger.info(
          { title: t.title, ...result },
          "Tournament reconciliation: pass complete",
        );
      } catch (err) {
        logger.warn(
          { err, tournamentId: t.id, title: t.title },
          "Tournament reconciliation: failed for tournament — skipping",
        );
      }
    }

    logger.info("Tournament reconciliation: startup pass finished");
  } catch (err) {
    logger.warn({ err }, "Tournament reconciliation: startup pass failed");
  }
}
