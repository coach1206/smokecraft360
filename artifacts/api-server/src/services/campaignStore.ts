/**
 * Campaign Store — in-memory registry of active campaigns.
 *
 * Loaded from PostgreSQL at server startup.
 * Mutated in real-time as campaigns are activated / deactivated via API.
 * TTL-based refresh: `refreshIfStale(maxAgeMs)` re-hydrates from DB when
 * the store is older than maxAgeMs (default 60 s). Call at the start of
 * read-heavy routes so stale data from manual DB edits eventually resolves.
 *
 * The scorer reads this store to add +CAMPAIGN_BOOST points to products
 * that have an active campaignId, without querying the DB per-request.
 */

import { eq } from "drizzle-orm";
import { db, campaignsTable } from "@workspace/db";
import { logger } from "../lib/logger";

/** Score bonus added for every product linked to an active campaign (on top of boost/sponsored). */
export const CAMPAIGN_BOOST = 2;

const activeCampaignIds = new Set<string>();

/** Type for campaign metadata kept in memory. */
export interface CampaignMeta {
  id:                  string;
  name:                string;
  type:                string;
  brandId:             string | null;
  distributorId:       string | null;
  venueId:             string | null;
  craftType:           string | null;
  boostMultiplier:     number;
  xpMultiplier:        number;
  rewardBonus:         number;
  budgetCents:         number | null;
  budgetLimit:         number | null;
  impressionGoal:      number | null;
  maxRedemptions:      number | null;
  currentSpendCents:   number;
  currentRedemptions:  number;
  startDate:           Date | null;
  endDate:             Date | null;
  status:              string;
  active:              boolean;
}

const campaignMeta = new Map<string, CampaignMeta>();

/** Timestamp of last full DB load (ms since epoch, 0 = never). */
let _lastLoaded = 0;

// ── Public read API ────────────────────────────────────────────────────────────

/** Returns true if a campaignId is currently active and within its date window. */
export function isActiveCampaign(id: string | undefined): boolean {
  if (!id) return false;
  if (!activeCampaignIds.has(id)) return false;
  const meta = campaignMeta.get(id);
  if (!meta) return false;
  const now = Date.now();
  if (meta.startDate && meta.startDate.getTime() > now) return false;
  if (meta.endDate   && meta.endDate.getTime()   < now) return false;
  return true;
}

/** All currently active campaign IDs. */
export function getActiveCampaignIds(): Set<string> {
  return activeCampaignIds;
}

/** Get metadata for a single campaign (undefined if not found). */
export function getCampaignMeta(id: string): CampaignMeta | undefined {
  return campaignMeta.get(id);
}

/** All campaign metadata for listing. */
export function getAllCampaigns(): CampaignMeta[] {
  return Array.from(campaignMeta.values());
}

// ── Mutation API (called by routes on create/update) ─────────────────────────

export function setCampaign(meta: CampaignMeta): void {
  campaignMeta.set(meta.id, meta);
  if (meta.active && meta.status === "active") {
    activeCampaignIds.add(meta.id);
  } else {
    activeCampaignIds.delete(meta.id);
  }
}

export function removeCampaign(id: string): void {
  campaignMeta.delete(id);
  activeCampaignIds.delete(id);
}

// ── DB → meta mapping (shared by loadCampaigns + campaignToMeta in routes) ──

export function rowToMeta(row: typeof campaignsTable.$inferSelect): CampaignMeta {
  return {
    id:                 row.id,
    name:               row.name,
    type:               row.type ?? "GENERAL",
    brandId:            row.brandId        ?? null,
    distributorId:      row.distributorId  ?? null,
    venueId:            row.venueId        ?? null,
    craftType:          row.craftType      ?? null,
    boostMultiplier:    row.boostMultiplier ?? 1.0,
    xpMultiplier:       row.xpMultiplier   ?? 1.0,
    rewardBonus:        row.rewardBonus    ?? 0,
    budgetCents:        row.budgetCents    ?? null,
    budgetLimit:        row.budgetLimit    ?? null,
    impressionGoal:     row.impressionGoal ?? null,
    maxRedemptions:     row.maxRedemptions ?? null,
    currentSpendCents:  row.currentSpendCents  ?? 0,
    currentRedemptions: row.currentRedemptions ?? 0,
    startDate:          row.startDate      ?? null,
    endDate:            row.endDate        ?? null,
    status:             row.status,
    active:             row.active,
  };
}

// ── Startup load ──────────────────────────────────────────────────────────────

/** Called once at server startup to hydrate the campaign store from PostgreSQL. */
export async function loadCampaigns(): Promise<void> {
  try {
    const rows = await db.select().from(campaignsTable);
    for (const row of rows) {
      setCampaign(rowToMeta(row));
    }
    _lastLoaded = Date.now();
    logger.info({ count: rows.length, active: activeCampaignIds.size }, "Campaign store loaded");
  } catch (err) {
    logger.error({ err }, "Failed to load campaigns from DB — starting with empty store");
  }
}

/**
 * Re-hydrates the store from DB if it is older than `maxAgeMs` (default 60 s).
 * Call at the top of read-heavy admin routes so stale out-of-band DB edits
 * eventually surface without requiring a server restart.
 * Failures are non-fatal and logged.
 */
export async function refreshIfStale(maxAgeMs = 60_000): Promise<void> {
  if (Date.now() - _lastLoaded < maxAgeMs) return;
  try {
    const rows = await db.select().from(campaignsTable);
    // Clear existing state and fully rebuild so deleted campaigns are removed.
    campaignMeta.clear();
    activeCampaignIds.clear();
    for (const row of rows) {
      setCampaign(rowToMeta(row));
    }
    _lastLoaded = Date.now();
    logger.info({ count: rows.length, active: activeCampaignIds.size }, "Campaign store refreshed (stale)");
  } catch (err) {
    logger.warn({ err }, "Campaign store stale refresh failed (non-fatal)");
  }
}
