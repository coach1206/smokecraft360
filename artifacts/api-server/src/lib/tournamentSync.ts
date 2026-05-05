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
  return Number.isNaN(scaled) ? 0 : scaled;
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
        tournamentId: tournamentEntriesTable.tournamentId,
        startAt:      tournamentsTable.startAt,
        endAt:        tournamentsTable.endAt,
        craftType:    tournamentsTable.craftType,
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
        await db
          .update(tournamentEntriesTable)
          .set({ score: newScore, updatedAt: new Date() })
          .where(eq(tournamentEntriesTable.id, entry.entryId));

        await rerank(entry.tournamentId).catch((err) =>
          logger.warn({ err, tournamentId: entry.tournamentId }, "auto-sync rerank failed"),
        );
      }
    }
  } catch (err) {
    // Fire-and-forget: log but never throw — must not break craft-builds response
    logger.warn({ err, userId, craft }, "syncActiveTournamentScores failed");
  }
}
