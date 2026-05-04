/**
 * visitTracker — record that userId showed up at venueId.
 *
 * Idempotent UPSERT: first call inserts a row with visitCount=1; every
 * subsequent call bumps visitCount and lastVisitAt. Always safe to call
 * fire-and-forget from any user-at-venue moment (currently
 * POST /api/sessions, future: any cross-venue interaction).
 *
 * Returns { visitCount, isReturn } so callers can trigger milestone bonuses
 * without a second DB query.
 *
 * Failures are logged but never thrown — visit tracking must NEVER block
 * the user-facing flow.
 */

import { eq, and, sql } from "drizzle-orm";
import { db, userVenueVisitsTable } from "@workspace/db";
import { logger } from "../lib/logger";

export interface VisitResult {
  visitCount: number;
  isReturn: boolean;
}

export async function recordVisit(
  userId: string,
  venueId: string | null | undefined,
): Promise<VisitResult> {
  if (!userId || !venueId) return { visitCount: 0, isReturn: false };
  try {
    const result = await db
      .insert(userVenueVisitsTable)
      .values({ userId, venueId })
      .onConflictDoUpdate({
        target: [userVenueVisitsTable.userId, userVenueVisitsTable.venueId],
        set: {
          visitCount:  sql`${userVenueVisitsTable.visitCount} + 1`,
          lastVisitAt: sql`now()`,
        },
      })
      .returning({ visitCount: userVenueVisitsTable.visitCount });

    const visitCount = result[0]?.visitCount ?? 1;
    return { visitCount, isReturn: visitCount > 1 };
  } catch (err) {
    logger.warn({ err, userId, venueId }, "visit tracker upsert failed (non-fatal)");
    return { visitCount: 0, isReturn: false };
  }
}

/** Read-only: fetch visit info for a user at a specific venue. */
export async function getVisitInfo(
  userId: string,
  venueId: string,
): Promise<{ visitCount: number; firstVisitAt: Date | null; lastVisitAt: Date | null }> {
  try {
    const [row] = await db
      .select()
      .from(userVenueVisitsTable)
      .where(
        and(
          eq(userVenueVisitsTable.userId, userId),
          eq(userVenueVisitsTable.venueId, venueId),
        ),
      )
      .limit(1);
    return {
      visitCount:   row?.visitCount   ?? 0,
      firstVisitAt: row?.firstVisitAt ?? null,
      lastVisitAt:  row?.lastVisitAt  ?? null,
    };
  } catch {
    return { visitCount: 0, firstVisitAt: null, lastVisitAt: null };
  }
}
