import { and, eq, lt, gt, isNotNull } from "drizzle-orm";
import { db, campaignsTable, analyticsEventsTable } from "@workspace/db";
import { logger } from "./logger";
import { setCampaign, type CampaignMeta } from "../services/campaignStore";

const INTERVAL_MS = 10 * 60 * 1000;

export interface BudgetEnforcementResult {
  scannedCount: number;
  budgetExhaustedCount: number;
  expiredCount: number;
  maxRedemptionCount: number;
  errors: number;
  durationMs: number;
  ranAt: string;
}

let lastResult: BudgetEnforcementResult | null = null;
let running = false;
let interval: NodeJS.Timeout | null = null;

export async function runCampaignBudgetEnforcement(): Promise<BudgetEnforcementResult> {
  if (running) {
    logger.warn("campaign budget enforcement skipped: previous run still in progress");
    return lastResult ?? { scannedCount: 0, budgetExhaustedCount: 0, expiredCount: 0, maxRedemptionCount: 0, errors: 0, durationMs: 0, ranAt: new Date().toISOString() };
  }

  running = true;
  const start = Date.now();
  let scannedCount = 0;
  let budgetExhaustedCount = 0;
  let expiredCount = 0;
  let maxRedemptionCount = 0;
  let errors = 0;

  try {
    const activeCampaigns = await db
      .select()
      .from(campaignsTable)
      .where(
        and(
          eq(campaignsTable.status, "active"),
          eq(campaignsTable.active, true),
        ),
      );

    scannedCount = activeCampaigns.length;
    const now = new Date();

    for (const campaign of activeCampaigns) {
      try {
        let newStatus: string | null = null;

        if (campaign.endDate && campaign.endDate < now) {
          newStatus = "completed";
          expiredCount++;
        } else if (
          campaign.budgetLimit &&
          campaign.budgetLimit > 0 &&
          campaign.currentSpendCents >= campaign.budgetLimit
        ) {
          newStatus = "paused";
          budgetExhaustedCount++;
        } else if (
          campaign.maxRedemptions &&
          campaign.maxRedemptions > 0 &&
          campaign.currentRedemptions >= campaign.maxRedemptions
        ) {
          newStatus = "paused";
          maxRedemptionCount++;
        }

        if (newStatus) {
          await db
            .update(campaignsTable)
            .set({
              status: newStatus as any,
              active: newStatus === "completed" ? false : campaign.active,
              updatedAt: now,
            })
            .where(eq(campaignsTable.id, campaign.id));

          setCampaign({
            id: campaign.id,
            name: campaign.name,
            type: campaign.type ?? "GENERAL",
            brandId: campaign.brandId ?? null,
            distributorId: campaign.distributorId ?? null,
            venueId: campaign.venueId ?? null,
            craftType: campaign.craftType ?? null,
            boostMultiplier: campaign.boostMultiplier ?? 1.0,
            xpMultiplier: campaign.xpMultiplier ?? 1.0,
            rewardBonus: campaign.rewardBonus ?? 0,
            budgetCents: campaign.budgetCents ?? null,
            budgetLimit: campaign.budgetLimit ?? null,
            impressionGoal: campaign.impressionGoal ?? null,
            maxRedemptions: campaign.maxRedemptions ?? null,
            startDate: campaign.startDate ?? null,
            endDate: campaign.endDate ?? null,
            status: newStatus,
            active: newStatus === "completed" ? false : campaign.active,
          });

          const eventType = newStatus === "completed"
            ? "campaign_budget_exhausted" as const
            : "campaign_budget_warning" as const;

          db.insert(analyticsEventsTable)
            .values({
              eventType,
              metadata: {
                campaignId: campaign.id,
                reason: newStatus === "completed" ? "expired"
                  : campaign.currentSpendCents >= (campaign.budgetLimit ?? Infinity) ? "budget_exhausted"
                  : "max_redemptions_reached",
                currentSpendCents: campaign.currentSpendCents,
                budgetLimit: campaign.budgetLimit,
                currentRedemptions: campaign.currentRedemptions,
                maxRedemptions: campaign.maxRedemptions,
              },
            })
            .catch(() => {});

          logger.info(
            {
              campaignId: campaign.id,
              campaignName: campaign.name,
              previousStatus: "active",
              newStatus,
              currentSpendCents: campaign.currentSpendCents,
              budgetLimit: campaign.budgetLimit,
              currentRedemptions: campaign.currentRedemptions,
              maxRedemptions: campaign.maxRedemptions,
            },
            "Campaign status changed by budget enforcement worker",
          );
        }
      } catch (err) {
        errors++;
        logger.error({ err, campaignId: campaign.id }, "Error enforcing campaign budget");
      }
    }
  } catch (err) {
    errors++;
    logger.error({ err }, "Campaign budget enforcement worker failed");
  } finally {
    running = false;
  }

  const result: BudgetEnforcementResult = {
    scannedCount,
    budgetExhaustedCount,
    expiredCount,
    maxRedemptionCount,
    errors,
    durationMs: Date.now() - start,
    ranAt: new Date().toISOString(),
  };

  lastResult = result;
  logger.info(result, "Campaign budget enforcement complete");
  return result;
}

export function getCampaignBudgetWorkerStatus() {
  return { running, lastResult, intervalMs: INTERVAL_MS };
}

export function startCampaignBudgetWorker(): void {
  if (interval) return;
  setTimeout(() => {
    runCampaignBudgetEnforcement().catch(() => {});
  }, 20_000);
  interval = setInterval(() => {
    runCampaignBudgetEnforcement().catch(() => {});
  }, INTERVAL_MS);
  logger.info("campaign budget enforcement worker scheduled (10m interval)");
}

export function stopCampaignBudgetWorker(): void {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}
