/**
 * conflictRecorder — single entry point for any code path that detects a
 * cross-source data mismatch (vendor vs POS price, distributor vs admin
 * inventory, etc). Callers invoke `recordConflict({...})` and the row
 * lands in `data_conflicts` for staff to resolve from the dashboard tab.
 *
 * Why a service (not just `db.insert`) — gives us a single place to add
 * de-duplication / suppression / notification fan-out in future briefs
 * without touching every caller.
 */

import {
  db, dataConflictsTable, type DbDataConflict,
  type ConflictEntityType, type ConflictSource,
} from "@workspace/db";
import { logger } from "../lib/logger";

/**
 * Strict input contract — uses the literal-union types directly so Drizzle's
 * `$type<>()` narrowing on entityType / sourceA / sourceB is satisfied
 * without per-call casting in route handlers.
 */
export interface RecordConflictInput {
  entityType:  ConflictEntityType;
  entityId:    string;
  venueId?:    string | null;
  fieldName:   string;
  sourceA:     ConflictSource;
  valueA:      string;
  sourceB:     ConflictSource;
  valueB:      string;
  detectedBy?: string | null;
  notes?:      string | null;
}

export async function recordConflict(input: RecordConflictInput): Promise<DbDataConflict> {
  const [row] = await db.insert(dataConflictsTable).values(input).returning();
  logger.info(
    {
      conflictId:  row.id,
      entityType:  row.entityType,
      entityId:    row.entityId,
      fieldName:   row.fieldName,
      sourceA:     row.sourceA,
      sourceB:     row.sourceB,
      venueId:     row.venueId,
    },
    "data conflict recorded",
  );
  return row;
}
