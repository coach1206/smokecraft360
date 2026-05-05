/**
 * AI Insight Service — deterministic, threshold-based insight generation.
 *
 * No LLM calls. Insights are computed from real aggregation data and stored
 * in ai_insights table. "AI" here means: the system observes patterns and
 * generates actionable, human-readable recommendations automatically.
 *
 * Severity levels:
 *   INFO        — neutral observation worth noting
 *   OPPORTUNITY — revenue or engagement upside identified
 *   ALERT       — metric crossed a threshold that warrants attention
 */

import { db, aiInsightsTable } from "@workspace/db";
import { eq }                  from "drizzle-orm";
import { logger }              from "../lib/logger";
import {
  getVenueAnalytics,
  getFlavorTrends,
  getStrengthTrends,
  getTopProducts,
  getRevenueOverview,
} from "./analyticsAggregationService";

interface InsightDraft {
  insightType: string;
  title:       string;
  summary:     string;
  severity:    "INFO" | "OPPORTUNITY" | "ALERT";
  sourceData:  Record<string, unknown>;
}

export async function generateVenueInsights(venueId: string): Promise<InsightDraft[]> {
  const [analytics, flavors, strengths, topProducts, revenue] = await Promise.all([
    getVenueAnalytics(venueId),
    getFlavorTrends(venueId),
    getStrengthTrends(venueId),
    getTopProducts(venueId, 5),
    getRevenueOverview(venueId),
  ]);

  const a  = analytics as Record<string, unknown>;
  const r  = revenue   as Record<string, unknown>;
  const fl = flavors   as Array<Record<string, unknown>>;
  const st = strengths as Array<Record<string, unknown>>;
  const tp = topProducts as Array<Record<string, unknown>>;

  const productViews  = Number(a["product_views"]      ?? 0);
  const selections    = Number(a["product_selections"] ?? 0);
  const purchases     = Number(a["purchases"]          ?? 0);
  const upsells       = Number(a["upsells"]            ?? 0);
  const loyaltyUses   = Number(a["loyalty_uses"]       ?? 0);
  const totalSessions = Number(a["total_sessions"]     ?? 0);
  const convRate      = Number(a["conversion_rate"]    ?? 0);
  const avgOrderCents = Number(r["avg_order_cents"]    ?? 0);
  const totalRevCents = Number(r["total_revenue_cents"] ?? 0);

  const insights: InsightDraft[] = [];

  // ── Conversion rate ────────────────────────────────────────────────────────
  if (productViews > 0 && convRate < 10) {
    insights.push({
      insightType: "CONVERSION",
      severity:    "ALERT",
      title:       "Low Conversion Rate Detected",
      summary:     `Only ${convRate}% of product views result in a purchase. Consider improving product descriptions, adding staff prompts, or enabling upsell suggestions at the recommendation step.`,
      sourceData:  { product_views: productViews, purchases, conversion_rate: convRate },
    });
  } else if (productViews > 0 && convRate >= 30) {
    insights.push({
      insightType: "CONVERSION",
      severity:    "OPPORTUNITY",
      title:       "Strong Conversion Rate — Scale Recommendations",
      summary:     `${convRate}% conversion rate is above the platform average of 22%. Your recommendation flow is working — consider adding more products to the catalog to capture more revenue.`,
      sourceData:  { product_views: productViews, purchases, conversion_rate: convRate },
    });
  }

  // ── Flavor preference ──────────────────────────────────────────────────────
  if (fl.length > 0) {
    const top = fl[0]!;
    insights.push({
      insightType: "FLAVOR_TREND",
      severity:    "INFO",
      title:       `"${top["flavor"]}" is the Top Requested Flavor`,
      summary:     `${top["count"]} selections in the last 30 days. Ensure you're well-stocked in ${top["flavor"]} products. Consider featuring them prominently at the kiosk.`,
      sourceData:  { top_flavor: top["flavor"], count: top["count"] },
    });
  }

  // ── Strength preference ────────────────────────────────────────────────────
  if (st.length > 0) {
    const top = st[0]!;
    insights.push({
      insightType: "STRENGTH_TREND",
      severity:    "INFO",
      title:       `"${String(top["strength"]).charAt(0).toUpperCase()}${String(top["strength"]).slice(1)}" Strength Profile Dominates`,
      summary:     `${top["count"]} purchases were ${top["strength"]} strength. Stock accordingly and prime your recommendation engine toward this preference.`,
      sourceData:  { top_strength: top["strength"], count: top["count"] },
    });
  }

  // ── Upsell opportunity ─────────────────────────────────────────────────────
  if (purchases > 0) {
    const upsellRate = Math.round((upsells / purchases) * 100);
    if (upsellRate < 15 && purchases >= 5) {
      insights.push({
        insightType: "UPSELL",
        severity:    "OPPORTUNITY",
        title:       "Upsell Acceptance Below Target",
        summary:     `Only ${upsellRate}% of purchases include an upsell. Enable pairing suggestions (spirit with cigar) to increase average order value.`,
        sourceData:  { purchases, upsells, upsell_rate: upsellRate },
      });
    } else if (upsellRate >= 40) {
      insights.push({
        insightType: "UPSELL",
        severity:    "INFO",
        title:       `Excellent Upsell Rate: ${upsellRate}%`,
        summary:     `Customers are accepting upsell suggestions at a high rate. Your staff prompts and AI pairing recommendations are working well.`,
        sourceData:  { purchases, upsells, upsell_rate: upsellRate },
      });
    }
  }

  // ── Loyalty usage ──────────────────────────────────────────────────────────
  if (totalSessions > 10 && loyaltyUses === 0) {
    insights.push({
      insightType: "LOYALTY",
      severity:    "ALERT",
      title:       "Loyalty Program Not Being Used",
      summary:     `${totalSessions} sessions recorded but zero loyalty points redeemed. Promote the loyalty program at the kiosk check-in screen to drive repeat visits.`,
      sourceData:  { sessions: totalSessions, loyalty_uses: loyaltyUses },
    });
  }

  // ── Revenue benchmark ──────────────────────────────────────────────────────
  if (totalRevCents > 0 && avgOrderCents > 0) {
    const avgDollars = (avgOrderCents / 100).toFixed(2);
    if (avgOrderCents > 5000) {
      insights.push({
        insightType: "REVENUE",
        severity:    "OPPORTUNITY",
        title:       `High AOV: $${avgDollars} Average Order`,
        summary:     `Your average order value is above $50 — indicating a premium clientele. Consider introducing a premium membership tier or exclusive product drops to further increase LTV.`,
        sourceData:  { avg_order_cents: avgOrderCents, total_revenue_cents: totalRevCents },
      });
    }
  }

  // ── Top product spotlight ──────────────────────────────────────────────────
  if (tp.length > 0) {
    const star = tp[0]!;
    insights.push({
      insightType: "PRODUCT_STAR",
      severity:    "INFO",
      title:       `Star Product: ${star["product_id"]}`,
      summary:     `${star["purchases"]} purchases, ${star["views"]} views in 30 days. Feature this product prominently in your kiosk layout and consider a staff sales pitch card.`,
      sourceData:  { product_id: star["product_id"], views: star["views"], purchases: star["purchases"] },
    });
  }

  return insights;
}

/**
 * Persist freshly generated insights into the DB.
 * Deletes previous insights for the venue first (rolling window).
 */
export async function saveVenueInsights(venueId: string): Promise<void> {
  try {
    const insights = await generateVenueInsights(venueId);
    // Clear previous auto-generated insights for this venue
    await db.delete(aiInsightsTable).where(eq(aiInsightsTable.venueId, venueId));
    if (insights.length > 0) {
      await db.insert(aiInsightsTable).values(insights.map(i => ({ ...i, venueId })));
    }
    logger.info({ venueId, count: insights.length }, "AI insights saved");
  } catch (err) {
    logger.error({ err, venueId }, "saveVenueInsights failed");
  }
}
