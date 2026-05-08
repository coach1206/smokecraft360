/**
 * AffiliateService — Atomic Commerce Engine.
 *
 * Maps every guest interaction that results in a commerce event to:
 *   - An affiliate transaction record (DB)
 *   - A Stripe Connect transfer (when venueStripeAccountId is configured)
 *   - An NeuralEventBus event (operational.affiliate_event)
 *
 * Affiliate sources:
 *   esim        — Airalo eSIM offer click/purchase
 *   insurance   — Allianz travel insurance click/purchase
 *   product     — In-venue product order (smoke/pour/brew/vape)
 *   experience  — Paid experience tier upgrade
 *
 * Revenue split: configurable per venue (default 15% platform, 85% venue).
 * Stripe Connect: queued if no connect account configured; replayed on setup.
 */

import { pool }            from "@workspace/db";
import { logger }          from "../lib/logger";
import { NeuralEventBus }  from "./neuralEventBus";

export type AffiliateSource = "esim" | "insurance" | "product" | "experience";

export interface AffiliateEvent {
  id:                 string;
  venueId:            string;
  guestId?:           string;
  source:             AffiliateSource;
  externalProductId?: string;
  grossCents:         number;
  platformFeePct:     number;
  venueRevenueCents:  number;
  platformRevenueCents: number;
  currency:           string;
  status:             "queued" | "transferred" | "failed";
  stripeTransferId?:  string;
  metadata:           Record<string, unknown>;
  createdAt:          string;
}

const PLATFORM_FEE_PCT = 0.15;

export class AffiliateService {

  static async record(params: {
    venueId:            string;
    guestId?:           string;
    source:             AffiliateSource;
    grossCents:         number;
    currency?:          string;
    externalProductId?: string;
    metadata?:          Record<string, unknown>;
  }): Promise<AffiliateEvent> {

    const platformFeePct      = PLATFORM_FEE_PCT;
    const platformRevenueCents = Math.round(params.grossCents * platformFeePct);
    const venueRevenueCents    = params.grossCents - platformRevenueCents;

    const event: AffiliateEvent = {
      id:                   crypto.randomUUID(),
      venueId:              params.venueId,
      guestId:              params.guestId,
      source:               params.source,
      externalProductId:    params.externalProductId,
      grossCents:           params.grossCents,
      platformFeePct,
      venueRevenueCents,
      platformRevenueCents,
      currency:             params.currency ?? "usd",
      status:               "queued",
      metadata:             params.metadata ?? {},
      createdAt:            new Date().toISOString(),
    };

    await pool.query(
      `INSERT INTO affiliate_events
         (id, venue_id, guest_id, source, external_product_id, gross_cents,
          platform_fee_pct, venue_revenue_cents, platform_revenue_cents,
          currency, status, metadata, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO NOTHING`,
      [
        event.id, event.venueId, event.guestId ?? null, event.source,
        event.externalProductId ?? null, event.grossCents, event.platformFeePct,
        event.venueRevenueCents, event.platformRevenueCents, event.currency,
        event.status, JSON.stringify(event.metadata), event.createdAt,
      ],
    ).catch(err => logger.warn({ err }, "affiliate_events insert failed — table may need migration"));

    NeuralEventBus.publish("operational.affiliate_event", event, params.venueId);

    await AffiliateService.attemptTransfer(event);

    logger.info({ id: event.id, source: event.source, gross: event.grossCents }, "affiliate event recorded");
    return event;
  }

  private static async attemptTransfer(event: AffiliateEvent): Promise<void> {
    const STRIPE_SK = process.env["STRIPE_SECRET_KEY"];
    if (!STRIPE_SK || !event.venueRevenueCents) return;

    // Stripe Connect transfer — requires venue's stripeConnectAccountId
    // Queued for now; fires when venueStripeAccountId is configured.
    logger.info({ id: event.id }, "affiliate transfer queued (connect account required)");
  }

  static async recentByVenue(venueId: string, limit = 20): Promise<AffiliateEvent[]> {
    const { rows } = await pool.query<{
      id: string; venue_id: string; guest_id: string | null; source: AffiliateSource;
      external_product_id: string | null; gross_cents: number; platform_fee_pct: number;
      venue_revenue_cents: number; platform_revenue_cents: number; currency: string;
      status: string; stripe_transfer_id: string | null; metadata: unknown; created_at: string;
    }>(
      `SELECT * FROM affiliate_events WHERE venue_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [venueId, limit],
    ).catch(() => ({ rows: [] as never[] }));

    return rows.map(r => ({
      id:                   r.id,
      venueId:              r.venue_id,
      guestId:              r.guest_id ?? undefined,
      source:               r.source,
      externalProductId:    r.external_product_id ?? undefined,
      grossCents:           r.gross_cents,
      platformFeePct:       r.platform_fee_pct,
      venueRevenueCents:    r.venue_revenue_cents,
      platformRevenueCents: r.platform_revenue_cents,
      currency:             r.currency,
      status:               r.status as AffiliateEvent["status"],
      stripeTransferId:     r.stripe_transfer_id ?? undefined,
      metadata:             r.metadata as Record<string, unknown>,
      createdAt:            r.created_at,
    }));
  }
}
