import { eq, sql } from "drizzle-orm";
import { db, campaignsTable, analyticsEventsTable, ordersTable } from "@workspace/db";
import { getCampaignMeta, isActiveCampaign, setCampaign } from "./campaignStore";
import { getBrandBoostForProduct } from "./brandPartnerStore";
import { getMeta } from "./boostService";
import { getVenueIntensityConfig } from "./venueIntensityConfig";
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

    await db
      .update(campaignsTable)
      .set({
        currentSpendCents: sql`${campaignsTable.currentSpendCents} + ${meta.rewardBonus || 0}`,
        currentRedemptions: sql`${campaignsTable.currentRedemptions} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(campaignsTable.id, campaignId));

    setCampaign({
      ...meta,
      currentSpendCents: (meta as any).currentSpendCents
        ? (meta as any).currentSpendCents + (meta.rewardBonus || 0)
        : meta.rewardBonus || 0,
      currentRedemptions: (meta as any).currentRedemptions
        ? (meta as any).currentRedemptions + 1
        : 1,
    } as any);

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
