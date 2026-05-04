import { eq, sql } from "drizzle-orm";
import { db, campaignsTable, analyticsEventsTable } from "@workspace/db";
import { getCampaignMeta, isActiveCampaign, setCampaign } from "./campaignStore";
import { getBrandBoostForProduct } from "./brandPartnerStore";
import { logger } from "../lib/logger";

export interface OrderAttribution {
  brandId: string | null;
  brandName: string | null;
  campaignId: string | null;
  campaignType: string | null;
  sponsored: boolean;
  attributionSource: string | null;
  campaignDiscountCents: number | null;
  campaignXpMultiplier: string | null;
}

export function deriveOrderAttribution(
  productIds: string[],
): OrderAttribution {
  let brandId: string | null = null;
  let brandName: string | null = null;
  let campaignId: string | null = null;
  let campaignType: string | null = null;
  let sponsored = false;
  let attributionSource: string | null = null;
  let campaignDiscountCents: number | null = null;
  let campaignXpMultiplier: string | null = null;

  for (const pid of productIds) {
    const bp = getBrandBoostForProduct(pid);
    if (bp) {
      brandId = bp.brandId;
      sponsored = sponsored || bp.isFeatured;
      attributionSource = `brand_partner:${bp.tier}`;

      if (bp.campaignId && isActiveCampaign(bp.campaignId)) {
        const meta = getCampaignMeta(bp.campaignId);
        if (meta) {
          campaignId = meta.id;
          campaignType = meta.type;
          campaignDiscountCents = meta.rewardBonus > 0 ? meta.rewardBonus : null;
          campaignXpMultiplier = meta.xpMultiplier !== 1.0 ? String(meta.xpMultiplier) : null;
        }
      }
      break;
    }
  }

  return {
    brandId,
    brandName,
    campaignId,
    campaignType,
    sponsored,
    attributionSource,
    campaignDiscountCents,
    campaignXpMultiplier,
  };
}

export async function recordCampaignConversion(
  campaignId: string,
  orderValueCents: number,
  venueId?: string | null,
  userId?: string | null,
  productId?: string | null,
): Promise<void> {
  try {
    const meta = getCampaignMeta(campaignId);
    if (!meta) return;

    // ── Budget / redemption enforcement ──────────────────────────────────────
    // Stop recording once hard limits are hit so pacing metrics stay accurate.
    if (meta.maxRedemptions !== null && meta.currentRedemptions >= meta.maxRedemptions) {
      logger.info({ campaignId, currentRedemptions: meta.currentRedemptions }, "Campaign max redemptions reached — skipping conversion");
      return;
    }
    if (meta.budgetCents !== null && meta.currentSpendCents >= meta.budgetCents) {
      logger.info({ campaignId, currentSpendCents: meta.currentSpendCents }, "Campaign budget exhausted — skipping conversion");
      return;
    }

    const spendDelta = meta.rewardBonus || 0;

    await db
      .update(campaignsTable)
      .set({
        currentSpendCents: sql`${campaignsTable.currentSpendCents} + ${spendDelta}`,
        currentRedemptions: sql`${campaignsTable.currentRedemptions} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(campaignsTable.id, campaignId));

    // Sync in-memory counters so subsequent isActiveCampaign() checks and
    // budget enforcement use fresh numbers without waiting for a DB reload.
    setCampaign({
      ...meta,
      currentSpendCents:  meta.currentSpendCents  + spendDelta,
      currentRedemptions: meta.currentRedemptions + 1,
    });

    db.insert(analyticsEventsTable)
      .values({
        eventType: "campaign_conversion",
        venueId: venueId ?? null,
        userId: userId ?? null,
        productId: productId ?? null,
        metadata: {
          campaignId,
          campaignType: meta.type,
          orderValueCents,
          rewardBonus: meta.rewardBonus,
        },
      })
      .catch(() => {});
  } catch (err) {
    logger.error({ err, campaignId }, "Failed to record campaign conversion");
  }
}
