/**
 * MarketplaceRevenueEngine — Platform Marketplace Rev Share.
 *
 * Manages plugin/environment pack listings, purchase transactions,
 * and developer payout calculations.
 *
 * Platform fee: 30% (configurable per listing).
 * Developer payout: 70% of gross.
 *
 * Categories: plugin, environment_pack, ai_module, operational_template
 */

import { pool }   from "@workspace/db";
import { logger } from "../../lib/logger";

export interface MarketplaceListing {
  id:             string;
  developerId:    string;
  title:          string;
  description?:   string;
  category:       "plugin" | "environment_pack" | "ai_module" | "operational_template";
  priceCents:     number;
  isSubscription: boolean;
  platformFeePct: number;
  status:         "pending" | "approved" | "rejected" | "suspended";
  downloadCount:  number;
  rating?:        number;
}

export class MarketplaceRevenueEngine {

  static async createListing(params: Omit<MarketplaceListing, "downloadCount" | "rating">): Promise<MarketplaceListing> {
    await pool.query(
      `INSERT INTO marketplace_listings
         (id, developer_id, title, description, category, price_cents, is_subscription, platform_fee_pct, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (id) DO NOTHING`,
      [params.id, params.developerId, params.title, params.description ?? null,
       params.category, params.priceCents, params.isSubscription, params.platformFeePct, params.status],
    );
    return { ...params, downloadCount: 0 };
  }

  static async approveListing(id: string): Promise<void> {
    await pool.query(`UPDATE marketplace_listings SET status = 'approved', updated_at = NOW() WHERE id = $1`, [id]);
  }

  static async purchase(listingId: string, venueId: string): Promise<{ grossCents: number; platformFeeCents: number; developerPayoutCents: number }> {
    const { rows } = await pool.query<{ price_cents: number; platform_fee_pct: number; status: string }>(
      `SELECT price_cents, platform_fee_pct, status FROM marketplace_listings WHERE id = $1`, [listingId],
    ).catch(() => ({ rows: [] as { price_cents: number; platform_fee_pct: number; status: string }[] }));

    const listing = rows[0];
    if (!listing) throw new Error("Listing not found");
    if (listing.status !== "approved") throw new Error("Listing not available");

    const platformFeeCents     = Math.round(listing.price_cents * listing.platform_fee_pct);
    const developerPayoutCents = listing.price_cents - platformFeeCents;

    await pool.query(
      `INSERT INTO marketplace_transactions (listing_id, venue_id, gross_cents, platform_fee_cents, developer_payout_cents, status)
       VALUES ($1,$2,$3,$4,$5,'completed')`,
      [listingId, venueId, listing.price_cents, platformFeeCents, developerPayoutCents],
    );

    await pool.query(`UPDATE marketplace_listings SET download_count = download_count + 1 WHERE id = $1`, [listingId]);

    logger.info({ listingId, venueId, grossCents: listing.price_cents, platformFeeCents }, "marketplace purchase");
    return { grossCents: listing.price_cents, platformFeeCents, developerPayoutCents };
  }

  static async getListings(status?: string): Promise<MarketplaceListing[]> {
    const { rows } = await pool.query<{
      id: string; developer_id: string; title: string; description: string | null;
      category: string; price_cents: number; is_subscription: boolean;
      platform_fee_pct: number; status: string; download_count: number; rating: number | null;
    }>(
      status
        ? `SELECT * FROM marketplace_listings WHERE status = $1 ORDER BY download_count DESC`
        : `SELECT * FROM marketplace_listings ORDER BY download_count DESC LIMIT 100`,
      status ? [status] : [],
    ).catch(() => ({ rows: [] as never[] }));

    return rows.map(r => ({
      id: r.id, developerId: r.developer_id, title: r.title,
      description: r.description ?? undefined,
      category: r.category as MarketplaceListing["category"],
      priceCents: r.price_cents, isSubscription: r.is_subscription,
      platformFeePct: r.platform_fee_pct,
      status: r.status as MarketplaceListing["status"],
      downloadCount: r.download_count, rating: r.rating ?? undefined,
    }));
  }
}
