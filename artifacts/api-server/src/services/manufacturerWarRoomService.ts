/**
 * ManufacturerWarRoomService — product sentiment + shadow test engine.
 *
 * getProductSentiment(productId, regionId?)
 *   Pulls interaction signals from behavior_event_logs and
 *   recommendation_events, computes five KPIs per the spec:
 *     revealRate       — PRODUCT_VIEWED / total interactions (0–1)
 *     hesitationMetric — avg dwell ms where guest viewed but did NOT select
 *                        (high dwell + no select = confusion / price friction)
 *     emotionalMatch   — avg sentimentScore from event metadata (0–100)
 *     pairingSuccess   — accepted / shown in recommendation_events (0–1)
 *     competitiveRank  — this product's order share vs regional total (0–1)
 *
 * initiateShadowTest(productId, demographic)
 *   Creates a shadow_tests row with status = INVISIBLE_ACTIVE.
 *   Returns the full row for audit confirmation.
 */

import { db, shadowTestsTable, type ShadowTestDemographic } from "@workspace/db";
import { sql, eq }                                           from "drizzle-orm";
import { logger }                                            from "../lib/logger";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ProductSentiment {
  productId:       string;
  regionId:        string | null;
  computedAt:      string;
  sampleSize:      number;
  revealRate:      number;   // 0–1
  hesitationMetric: number;  // avg ms (0 = no hesitation data)
  emotionalMatch:  number;   // 0–100
  pairingSuccess:  number;   // 0–1
  competitiveRank: number;   // 0–1 market share
  signals: {
    revealCount:     number;
    totalEvents:     number;
    hesitationCount: number;   // views without subsequent select
    shownCount:      number;
    acceptedCount:   number;
    productOrders:   number;
    totalOrders:     number;
  };
}

// ── getProductSentiment ───────────────────────────────────────────────────────

export async function getProductSentiment(
  productId: string,
  regionId?: string | null,
): Promise<ProductSentiment> {

  // venueId scope — if regionId is a UUID treat it as a venueId filter,
  // otherwise treat it as a named region tag (future: cross-venue region map).
  const isUuid = regionId
    ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(regionId)
    : false;
  const venueFilter = isUuid ? regionId! : null;

  // ── Interaction signals from behavior_event_logs ───────────────────────────
  const interactionRow = await db.execute<{
    reveal_count:     number;
    total_count:      number;
    hesitation_count: number;
    avg_dwell_ms:     number | null;
    avg_sentiment:    number | null;
  }>(sql`
    SELECT
      cast(count(*) FILTER (WHERE event_type = 'PRODUCT_VIEWED')                   as integer) AS reveal_count,
      cast(count(*)                                                                  as integer) AS total_count,
      -- Hesitation: sessions where PRODUCT_VIEWED but PRODUCT_SELECTED never followed
      cast(count(DISTINCT session_id) FILTER (WHERE event_type = 'PRODUCT_VIEWED') as integer)
        - cast(count(DISTINCT session_id) FILTER (WHERE event_type = 'PRODUCT_SELECTED') as integer)
                                                                                    AS hesitation_count,
      avg((metadata->>'dwellMs')::float)  FILTER (WHERE event_type = 'PRODUCT_VIEWED'
        AND (metadata->>'dwellMs') IS NOT NULL)                                     AS avg_dwell_ms,
      avg((metadata->>'sentimentScore')::float)
        FILTER (WHERE (metadata->>'sentimentScore') IS NOT NULL)                   AS avg_sentiment
    FROM behavior_event_logs
    WHERE product_id = ${productId}
      AND (${venueFilter}::text IS NULL OR venue_id = ${venueFilter})
  `);

  const ir = interactionRow.rows[0] ?? {};

  // ── Pairing success from recommendation_events ─────────────────────────────
  const pairingRow = await db.execute<{
    shown_count:    number;
    accepted_count: number;
  }>(sql`
    SELECT
      cast(count(*) FILTER (WHERE shown    = true) as integer) AS shown_count,
      cast(count(*) FILTER (WHERE accepted = true) as integer) AS accepted_count
    FROM recommendation_events
    WHERE inventory_item_id = ${productId}
  `);

  const pr = pairingRow.rows[0] ?? {};

  // ── Competitive rank (market share) from orders ────────────────────────────
  const marketRow = await db.execute<{
    product_orders: number;
    total_orders:   number;
  }>(sql`
    SELECT
      cast(count(*) FILTER (
        WHERE cigar_id = ${productId}
           OR drink_id = ${productId}
      ) as integer)                     AS product_orders,
      cast(count(*) as integer)         AS total_orders
    FROM orders
    WHERE (${venueFilter}::uuid IS NULL OR venue_id = ${venueFilter}::uuid)
  `);

  const mr = marketRow.rows[0] ?? {};

  // ── Derive KPIs ────────────────────────────────────────────────────────────
  const totalCount     = Number(ir.total_count    ?? 0);
  const revealCount    = Number(ir.reveal_count   ?? 0);
  const hesitationCount = Math.max(0, Number(ir.hesitation_count ?? 0));
  const shownCount     = Number(pr.shown_count    ?? 0);
  const acceptedCount  = Number(pr.accepted_count ?? 0);
  const productOrders  = Number(mr.product_orders ?? 0);
  const totalOrders    = Number(mr.total_orders   ?? 0);

  const revealRate      = totalCount > 0 ? revealCount / totalCount : 0;
  const hesitationMetric = Number(ir.avg_dwell_ms ?? 0);
  const emotionalMatch  = Math.min(100, Math.round(Number(ir.avg_sentiment ?? 50)));
  const pairingSuccess  = shownCount > 0 ? acceptedCount / shownCount : 0;
  const competitiveRank = totalOrders > 0 ? productOrders / totalOrders : 0;

  logger.info(
    { productId, regionId, totalCount, revealCount, shownCount, acceptedCount },
    "product sentiment computed",
  );

  return {
    productId,
    regionId:         regionId ?? null,
    computedAt:       new Date().toISOString(),
    sampleSize:       totalCount,
    revealRate:       Math.round(revealRate * 10000) / 10000,
    hesitationMetric: Math.round(hesitationMetric),
    emotionalMatch,
    pairingSuccess:   Math.round(pairingSuccess * 10000) / 10000,
    competitiveRank:  Math.round(competitiveRank * 10000) / 10000,
    signals: {
      revealCount, totalEvents: totalCount,
      hesitationCount, shownCount, acceptedCount,
      productOrders, totalOrders,
    },
  };
}

// ── initiateShadowTest ────────────────────────────────────────────────────────

export async function initiateShadowTest(
  productId:         string,
  targetDemographic: ShadowTestDemographic,
  createdBy?:        string,
) {
  const [row] = await db
    .insert(shadowTestsTable)
    .values({
      productId,
      demographic: targetDemographic,
      status:      "INVISIBLE_ACTIVE",
      createdBy:   createdBy ?? null,
    })
    .returning();

  logger.info(
    { shadowTestId: row!.id, productId, status: "INVISIBLE_ACTIVE" },
    "shadow test initiated",
  );

  return row!;
}

// ── concludeShadowTest ────────────────────────────────────────────────────────
// Called by admin when a test reaches its natural end or is manually stopped.

export async function concludeShadowTest(
  testId:  string,
  status:  "CONCLUDED" | "CANCELLED",
  results?: Record<string, unknown>,
) {
  const [row] = await db
    .update(shadowTestsTable)
    .set({
      status,
      endTime: new Date(),
      results: results
        ? { ...results, concludedAt: new Date().toISOString() }
        : undefined,
    })
    .where(eq(shadowTestsTable.id, testId))
    .returning();

  return row ?? null;
}
