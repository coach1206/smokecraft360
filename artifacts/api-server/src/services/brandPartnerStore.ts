import { db, brandPartnersTable, brandProductsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";

export interface BrandPartnerBoost {
  brandId: string;
  boostWeight: number;
  isFeatured: boolean;
  campaignId: string | null;
  tier: string;
  placementPriority: number;
}

const productBrandBoosts = new Map<string, BrandPartnerBoost>();

export async function loadBrandPartnerStore(): Promise<void> {
  try {
    const partners = await db
      .select()
      .from(brandPartnersTable)
      .where(eq(brandPartnersTable.active, true));

    const links = await db.select().from(brandProductsTable);

    productBrandBoosts.clear();

    for (const link of links) {
      const partner = partners.find((p) => p.id === link.brandId);
      if (!partner) continue;

      const existing = productBrandBoosts.get(link.productId);
      if (existing && existing.placementPriority >= partner.placementPriority) continue;

      productBrandBoosts.set(link.productId, {
        brandId: partner.id,
        boostWeight: link.boostWeight,
        isFeatured: link.isFeatured,
        campaignId: link.campaignId,
        tier: partner.tier,
        placementPriority: partner.placementPriority,
      });
    }

    logger.info(
      { partners: partners.length, links: links.length, boostedProducts: productBrandBoosts.size },
      "Brand partner store loaded",
    );
  } catch (err) {
    logger.error({ err }, "Failed to load brand partner store");
  }
}

export function getBrandBoostForProduct(productId: string): BrandPartnerBoost | undefined {
  return productBrandBoosts.get(productId);
}

export function getAllBrandBoostedProducts(): Map<string, BrandPartnerBoost> {
  return productBrandBoosts;
}
