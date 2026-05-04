import { sql, eq, and } from "drizzle-orm";
import { db, ordersTable, redemptionsTable, rewardsTable } from "@workspace/db";
import { logger } from "./logger";

const INTERVAL_MS = 10 * 60 * 1000;
let interval: NodeJS.Timeout | null = null;

export interface RewardOptResult {
  rewardsAdjusted: number;
  avgOrderValueCents: number;
  rewardUsageRate: number;
  ranAt: string;
}

let lastResult: RewardOptResult | null = null;

async function runRewardOptimization(): Promise<RewardOptResult> {
  let rewardsAdjusted = 0;
  let avgOrderValueCents = 0;
  let rewardUsageRate = 0;

  try {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [avgRow] = await db
      .select({
        avg: sql<number>`COALESCE(AVG(${ordersTable.expectedAmountCents}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(ordersTable)
      .where(
        and(
          sql`${ordersTable.createdAt} > ${cutoff}`,
          sql`${ordersTable.expectedAmountCents} IS NOT NULL`,
        ),
      );

    avgOrderValueCents = Math.round(Number(avgRow?.avg ?? 0));
    const orderCount = Number(avgRow?.count ?? 0);

    const [redemptionRow] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(redemptionsTable)
      .where(sql`${redemptionsTable.createdAt} > ${cutoff}`);

    const redemptionCount = Number(redemptionRow?.count ?? 0);
    rewardUsageRate = orderCount > 0 ? redemptionCount / orderCount : 0;

    const activeRewards = await db
      .select()
      .from(rewardsTable)
      .where(eq(rewardsTable.active, true));

    for (const reward of activeRewards) {
      let newCost = reward.pointsCost;

      if (rewardUsageRate > 0.5) {
        newCost = Math.min(Math.round(reward.pointsCost * 1.1), 100_000);
      } else if (rewardUsageRate < 0.1 && rewardUsageRate > 0) {
        newCost = Math.max(Math.round(reward.pointsCost * 0.9), 1);
      } else {
        continue;
      }

      if (newCost !== reward.pointsCost) {
        await db
          .update(rewardsTable)
          .set({ pointsCost: newCost, updatedAt: new Date() })
          .where(eq(rewardsTable.id, reward.id));
        rewardsAdjusted++;

        logger.debug(
          { rewardId: reward.id, oldCost: reward.pointsCost, newCost, usageRate: rewardUsageRate },
          "reward cost adjusted",
        );
      }
    }

    if (rewardsAdjusted > 0) {
      logger.info(
        { rewardsAdjusted, avgOrderValueCents, rewardUsageRate, event: "reward_optimization_complete" },
        "reward optimization cycle completed",
      );
    }
  } catch (err) {
    logger.error({ err, event: "reward_optimization_failed" }, "reward optimization worker failed");
  }

  const result: RewardOptResult = {
    rewardsAdjusted,
    avgOrderValueCents,
    rewardUsageRate,
    ranAt: new Date().toISOString(),
  };
  lastResult = result;
  return result;
}

export function getRewardOptStatus() {
  return { lastResult, intervalMs: INTERVAL_MS };
}

export function startRewardOptimizationWorker(): void {
  if (interval) return;
  setTimeout(() => { void runRewardOptimization(); }, 45_000);
  interval = setInterval(() => { void runRewardOptimization(); }, INTERVAL_MS);
  logger.info("reward optimization worker scheduled (10m interval)");
}

export function stopRewardOptimizationWorker(): void {
  if (interval) clearInterval(interval);
  interval = null;
}
