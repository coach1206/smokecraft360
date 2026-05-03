/**
 * visitTracker — record that userId showed up at venueId.
 *
 * Idempotent UPSERT: first call inserts a row with visitCount=1; every
 * subsequent call bumps visitCount and lastVisitAt. Always safe to call
 * fire-and-forget from any user-at-venue moment (currently
 * POST /api/sessions, future: any cross-venue interaction).
 *
 * Failures are logged but never thrown — visit tracking must NEVER block
 * the user-facing flow.
 */

import { sql } from "drizzle-orm";
import { db, userVenueVisitsTable } from "@workspace/db";
import { logger } from "../lib/logger";

export async function recordVisit(userId: string, venueId: string | null | undefined): Promise<void> {
  if (!userId || !venueId) return;
  try {
    await db
      .insert(userVenueVisitsTable)
      .values({ userId, venueId })
      .onConflictDoUpdate({
        target: [userVenueVisitsTable.userId, userVenueVisitsTable.venueId],
        set: {
          visitCount:  sql`${userVenueVisitsTable.visitCount} + 1`,
          lastVisitAt: sql`now()`,
        },
      });
  } catch (err) {
    logger.warn({ err, userId, venueId }, "visit tracker upsert failed (non-fatal)");
  }
}
