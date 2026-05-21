/**
 * Global Provider Control Center — Phases 1–5
 *
 * Master API controls for super_admin:
 *  - Per-category global enable/disable (affects ALL venues)
 *  - Emergency shutdown (kills all integration requests globally)
 *  - Per-venue access control: enabled, demo_mode, demo expiry, locked, revoked
 *
 * Uses same pool.query pattern as credentialVault.ts (no Drizzle ORM).
 */

import { pool }   from "@workspace/db";
import { logger } from "../../lib/logger";

/* ─── Schema ────────────────────────────────────────────────────────────────── */

const CREATE_GLOBAL_CONTROLS = `
  CREATE TABLE IF NOT EXISTS kernel_global_controls (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    control_key varchar(80) UNIQUE NOT NULL,
    is_enabled  boolean     NOT NULL DEFAULT true,
    updated_by  varchar(120),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    reason      text
  );
`;

const CREATE_VENUE_ACCESS = `
  CREATE TABLE IF NOT EXISTS kernel_venue_access (
    id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    venue_id            varchar(120) UNIQUE NOT NULL,
    is_enabled          boolean     NOT NULL DEFAULT true,
    is_demo_mode        boolean     NOT NULL DEFAULT false,
    demo_expires_at     timestamptz,
    is_locked           boolean     NOT NULL DEFAULT false,
    locked_reason       text,
    allowed_categories  text[],
    updated_by          varchar(120),
    updated_at          timestamptz NOT NULL DEFAULT now()
  );
`;

let schemaReady = false;

export async function ensureGlobalControlsSchema(): Promise<void> {
  if (schemaReady) return;
  await pool.query(CREATE_GLOBAL_CONTROLS);
  await pool.query(CREATE_VENUE_ACCESS);
  schemaReady = true;
}

/* ─── Types ─────────────────────────────────────────────────────────────────── */

export interface GlobalControlRow {
  id:         string;
  controlKey: string;
  isEnabled:  boolean;
  updatedBy:  string | null;
  updatedAt:  string;
  reason:     string | null;
}

export interface VenueAccessRow {
  id:                string;
  venueId:           string;
  isEnabled:         boolean;
  isDemoMode:        boolean;
  demoExpiresAt:     string | null;
  isLocked:          boolean;
  lockedReason:      string | null;
  allowedCategories: string[] | null;
  updatedBy:         string | null;
  updatedAt:         string;
}

/* ─── Category definitions ───────────────────────────────────────────────────── */

export const PROVIDER_CATEGORIES = [
  "ai", "pos", "payment", "music", "lighting",
  "sensor", "crm", "booking", "voice", "analytics", "device", "custom",
] as const;

export type ManagedCategory = typeof PROVIDER_CATEGORIES[number];

/* ─── Global Controls ───────────────────────────────────────────────────────── */

export async function getAllGlobalControls(): Promise<GlobalControlRow[]> {
  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT id, control_key, is_enabled, updated_by, updated_at, reason
     FROM kernel_global_controls ORDER BY control_key`,
  );
  return rows.map(mapControlRow);
}

export async function getGlobalControl(key: string): Promise<boolean> {
  const { rows } = await pool.query<{ is_enabled: boolean }>(
    `SELECT is_enabled FROM kernel_global_controls WHERE control_key = $1`,
    [key],
  );
  return rows[0]?.is_enabled ?? true; // missing = enabled
}

export async function setGlobalControl(
  key:       string,
  isEnabled: boolean,
  updatedBy?: string,
  reason?:   string,
): Promise<GlobalControlRow> {
  const { rows } = await pool.query<Record<string, unknown>>(
    `INSERT INTO kernel_global_controls (control_key, is_enabled, updated_by, reason)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (control_key) DO UPDATE SET
       is_enabled = EXCLUDED.is_enabled,
       updated_by = EXCLUDED.updated_by,
       reason     = EXCLUDED.reason,
       updated_at = now()
     RETURNING *`,
    [key, isEnabled, updatedBy ?? null, reason ?? null],
  );
  return mapControlRow(rows[0]!);
}

/** Disable every category + set emergency_shutdown flag. Idempotent. */
export async function emergencyShutdown(actorId?: string, reason?: string): Promise<void> {
  const msg = reason ?? "Emergency shutdown activated";
  for (const cat of PROVIDER_CATEGORIES) {
    await setGlobalControl(`category:${cat}`, false, actorId, msg);
  }
  await setGlobalControl("emergency_shutdown", false, actorId, msg);
  logger.warn({ actorId, reason: msg }, "integrationKernel: EMERGENCY SHUTDOWN activated");
}

/** Re-enable all categories and clear emergency_shutdown flag. */
export async function restoreFromShutdown(actorId?: string): Promise<void> {
  for (const cat of PROVIDER_CATEGORIES) {
    await setGlobalControl(`category:${cat}`, true, actorId, "Restored from emergency shutdown");
  }
  await setGlobalControl("emergency_shutdown", true, actorId, "Restored from emergency shutdown");
  logger.info({ actorId }, "integrationKernel: emergency shutdown cleared");
}

/** Returns true when emergency shutdown is active (flag = false). */
export async function isEmergencyShutdownActive(): Promise<boolean> {
  const enabled = await getGlobalControl("emergency_shutdown");
  return !enabled;
}

/* ─── Venue Access Controls ─────────────────────────────────────────────────── */

const VENUE_ACCESS_DEFAULT: Omit<VenueAccessRow, "id" | "updatedAt"> = {
  venueId:           "",
  isEnabled:         true,
  isDemoMode:        false,
  demoExpiresAt:     null,
  isLocked:          false,
  lockedReason:      null,
  allowedCategories: null,
  updatedBy:         null,
};

export async function getVenueAccess(venueId: string): Promise<VenueAccessRow> {
  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT * FROM kernel_venue_access WHERE venue_id = $1`,
    [venueId],
  );
  if (rows[0]) return mapVenueRow(rows[0]);
  return { ...VENUE_ACCESS_DEFAULT, id: "", venueId, updatedAt: new Date().toISOString() };
}

export async function listVenueAccess(): Promise<VenueAccessRow[]> {
  const { rows } = await pool.query<Record<string, unknown>>(
    `SELECT * FROM kernel_venue_access ORDER BY venue_id`,
  );
  return rows.map(mapVenueRow);
}

export async function setVenueAccess(
  venueId: string,
  patch:   Partial<Omit<VenueAccessRow, "id" | "venueId" | "updatedAt">>,
): Promise<VenueAccessRow> {
  const existing = await getVenueAccess(venueId);
  const { rows } = await pool.query<Record<string, unknown>>(
    `INSERT INTO kernel_venue_access
       (venue_id, is_enabled, is_demo_mode, demo_expires_at,
        is_locked, locked_reason, allowed_categories, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (venue_id) DO UPDATE SET
       is_enabled         = EXCLUDED.is_enabled,
       is_demo_mode       = EXCLUDED.is_demo_mode,
       demo_expires_at    = EXCLUDED.demo_expires_at,
       is_locked          = EXCLUDED.is_locked,
       locked_reason      = EXCLUDED.locked_reason,
       allowed_categories = EXCLUDED.allowed_categories,
       updated_by         = EXCLUDED.updated_by,
       updated_at         = now()
     RETURNING *`,
    [
      venueId,
      patch.isEnabled         ?? existing.isEnabled,
      patch.isDemoMode        ?? existing.isDemoMode,
      patch.demoExpiresAt     ?? existing.demoExpiresAt,
      patch.isLocked          ?? existing.isLocked,
      patch.lockedReason      ?? existing.lockedReason,
      patch.allowedCategories ?? existing.allowedCategories,
      patch.updatedBy         ?? null,
    ],
  );
  return mapVenueRow(rows[0]!);
}

/** Lock a venue and disable its access immediately. */
export async function revokeVenueAccess(
  venueId:  string,
  actorId?: string,
  reason?:  string,
): Promise<void> {
  await setVenueAccess(venueId, {
    isEnabled:    false,
    isLocked:     true,
    lockedReason: reason ?? "Access revoked by administrator",
    updatedBy:    actorId,
  });
  logger.warn({ venueId, actorId, reason }, "integrationKernel: venue access revoked");
}

/** Unlock a venue and restore access. */
export async function restoreVenueAccess(
  venueId:  string,
  actorId?: string,
): Promise<void> {
  await setVenueAccess(venueId, {
    isEnabled:    true,
    isLocked:     false,
    lockedReason: null,
    updatedBy:    actorId,
  });
  logger.info({ venueId, actorId }, "integrationKernel: venue access restored");
}

/* ─── Runtime guard ─────────────────────────────────────────────────────────── */

/**
 * Check whether a request from venueId for providerCategory is allowed.
 * Returns the blocking reason or null (= allowed).
 */
export async function checkGlobalAccess(
  venueId:          string,
  providerCategory: string,
): Promise<string | null> {
  const [shutdown, catEnabled, venueAccess] = await Promise.all([
    isEmergencyShutdownActive(),
    getGlobalControl(`category:${providerCategory}`),
    getVenueAccess(venueId),
  ]);

  if (shutdown)                 return "Integration kernel emergency shutdown is active";
  if (!catEnabled)              return `Provider category '${providerCategory}' is globally disabled`;
  if (!venueAccess.isEnabled)   return "Venue integration access is disabled";
  if (venueAccess.isLocked)     return `Venue access is locked: ${venueAccess.lockedReason ?? "contact support"}`;

  if (venueAccess.isDemoMode && venueAccess.demoExpiresAt) {
    if (new Date(venueAccess.demoExpiresAt) < new Date()) {
      return "Demo mode session has expired";
    }
  }

  if (venueAccess.allowedCategories && !venueAccess.allowedCategories.includes(providerCategory)) {
    return `Provider category '${providerCategory}' not permitted for this venue's package`;
  }

  return null;
}

/* ─── Row mappers ────────────────────────────────────────────────────────────── */

function mapControlRow(r: Record<string, unknown>): GlobalControlRow {
  return {
    id:         String(r["id"] ?? ""),
    controlKey: String(r["control_key"] ?? ""),
    isEnabled:  Boolean(r["is_enabled"]),
    updatedBy:  r["updated_by"] != null ? String(r["updated_by"]) : null,
    updatedAt:  String(r["updated_at"] ?? ""),
    reason:     r["reason"]     != null ? String(r["reason"])     : null,
  };
}

function mapVenueRow(r: Record<string, unknown>): VenueAccessRow {
  let cats: string[] | null = null;
  if (Array.isArray(r["allowed_categories"])) {
    cats = (r["allowed_categories"] as unknown[]).map(String);
  }
  return {
    id:                String(r["id"] ?? ""),
    venueId:           String(r["venue_id"] ?? ""),
    isEnabled:         Boolean(r["is_enabled"]),
    isDemoMode:        Boolean(r["is_demo_mode"]),
    demoExpiresAt:     r["demo_expires_at"]  != null ? String(r["demo_expires_at"])  : null,
    isLocked:          Boolean(r["is_locked"]),
    lockedReason:      r["locked_reason"]    != null ? String(r["locked_reason"])    : null,
    allowedCategories: cats,
    updatedBy:         r["updated_by"]       != null ? String(r["updated_by"])       : null,
    updatedAt:         String(r["updated_at"] ?? ""),
  };
}
