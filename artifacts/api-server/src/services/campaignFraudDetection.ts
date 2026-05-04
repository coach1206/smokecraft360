import { and, eq, gte, sql } from "drizzle-orm";
import { db, fraudFlagsTable, analyticsEventsTable, ordersTable, campaignsTable } from "@workspace/db";
import { setCampaign, getCampaignMeta } from "./campaignStore";
import { logger } from "../lib/logger";

interface FraudCheckContext {
  userId?: string | null;
  venueId?: string | null;
  campaignId: string;
  orderId?: string;
  deviceId?: string;
}

export async function checkCampaignFraud(ctx: FraudCheckContext): Promise<{ flagged: boolean; reasons: string[] }> {
  const reasons: string[] = [];
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  try {
    if (ctx.userId) {
      const [rapidCount] = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(ordersTable)
        .where(
          and(
            eq(ordersTable.userId, ctx.userId),
            eq(ordersTable.campaignId, ctx.campaignId),
            gte(ordersTable.createdAt, fiveMinutesAgo),
          ),
        );

      if ((rapidCount?.count ?? 0) >= 3) {
        reasons.push("rapid_redemption_velocity");
      }
    }

    if (ctx.userId) {
      const [hourlyCount] = await db
        .select({ count: sql<number>`cast(count(*) as integer)` })
        .from(ordersTable)
        .where(
          and(
            eq(ordersTable.userId, ctx.userId),
            eq(ordersTable.campaignId, ctx.campaignId),
            gte(ordersTable.createdAt, oneHourAgo),
          ),
        );

      if ((hourlyCount?.count ?? 0) >= 5) {
        reasons.push("campaign_abuse_spike");
      }
    }

    const [campaignWideCount] = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.campaignId, ctx.campaignId),
          gte(ordersTable.createdAt, fiveMinutesAgo),
        ),
      );

    if ((campaignWideCount?.count ?? 0) >= 20) {
      reasons.push("campaign_redemption_spike");
    }

    if (reasons.length > 0) {
      await db.insert(fraudFlagsTable).values({
        kind: "anomaly",
        severity: reasons.length >= 2 ? "high" : "medium",
        orderId: ctx.orderId ?? null,
        venueId: ctx.venueId ?? null,
        userId: ctx.userId ?? null,
        details: {
          campaignId: ctx.campaignId,
          deviceId: ctx.deviceId ?? null,
          reasons,
          detectedAt: new Date().toISOString(),
        },
      });

      db.insert(analyticsEventsTable)
        .values({
          eventType: "campaign_abuse_flagged",
          userId: ctx.userId ?? null,
          venueId: ctx.venueId ?? null,
          metadata: {
            campaignId: ctx.campaignId,
            reasons,
            orderId: ctx.orderId ?? null,
          },
        })
        .catch(() => {});

      if (reasons.includes("campaign_abuse_spike") || reasons.includes("campaign_redemption_spike")) {
        try {
          await db
            .update(campaignsTable)
            .set({ status: "paused" as any, updatedAt: new Date() })
            .where(eq(campaignsTable.id, ctx.campaignId));

          const meta = getCampaignMeta(ctx.campaignId);
          if (meta) {
            setCampaign({ ...meta, status: "paused" });
          }

          logger.warn(
            { campaignId: ctx.campaignId, reasons },
            "Campaign auto-paused due to abuse detection",
          );
        } catch (err) {
          logger.error({ err, campaignId: ctx.campaignId }, "Failed to auto-pause campaign");
        }
      }

      logger.warn({ ctx, reasons }, "Campaign fraud detected");
    }
  } catch (err) {
    logger.error({ err, ctx }, "Campaign fraud check failed");
  }

  return { flagged: reasons.length > 0, reasons };
}
