/**
 * Campaign Store — in-memory registry of active campaigns.
 *
 * Loaded from PostgreSQL at server startup.
 * Mutated in real-time as campaigns are activated / deactivated via API.
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
  id:              string;
  name:            string;
  type:            string;
  brandId:         string | null;
  distributorId:   string | null;
  venueId:         string | null;
  craftType:       string | null;
  boostMultiplier: number;
  xpMultiplier:    number;
  rewardBonus:     number;
  budgetCents:     number | null;
  budgetLimit:     number | null;
  impressionGoal:  number | null;
  maxRedemptions:  number | null;
  startDate:       Date | null;
  endDate:         Date | null;
  status:          string;
  active:          boolean;
}

const campaignMeta = new Map<string, CampaignMeta>();

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

// ── Startup load ──────────────────────────────────────────────────────────────

/** Called once at server startup to hydrate the campaign store from PostgreSQL. */
export async function loadCampaigns(): Promise<void> {
  try {
    const rows = await db.select().from(campaignsTable);
    for (const row of rows) {
      const meta: CampaignMeta = {
        id:              row.id,
        name:            row.name,
        type:            (row as any).type ?? "GENERAL",
        brandId:         row.brandId       ?? null,
        distributorId:   row.distributorId ?? null,
        venueId:         (row as any).venueId ?? null,
        craftType:       (row as any).craftType ?? null,
        boostMultiplier: (row as any).boostMultiplier ?? 1.0,
        xpMultiplier:    (row as any).xpMultiplier ?? 1.0,
        rewardBonus:     (row as any).rewardBonus ?? 0,
        budgetCents:     row.budgetCents   ?? null,
        budgetLimit:     (row as any).budgetLimit ?? null,
        impressionGoal:  row.impressionGoal ?? null,
        maxRedemptions:  (row as any).maxRedemptions ?? null,
        startDate:       row.startDate     ?? null,
        endDate:         row.endDate       ?? null,
        status:          row.status,
        active:          row.active,
      };
      setCampaign(meta);
    }
    logger.info({ count: rows.length, active: activeCampaignIds.size }, "Campaign store loaded");
  } catch (err) {
    logger.error({ err }, "Failed to load campaigns from DB — starting with empty store");
  }
}
