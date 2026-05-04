import { buildBehaviorContext } from "./experienceDecisionEngine";
import { logger } from "../lib/logger";

const OPTIMIZE_INTERVAL_MS = 1000 * 60 * 30;

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export async function runExperienceOptimization(): Promise<{ ok: true; timestamp: string }> {
  const ctx = buildBehaviorContext("experience-optimization");

  logger.info(
    { identity: ctx.identity, context: ctx.context },
    "running experience optimization pass",
  );

  return { ok: true, timestamp: new Date().toISOString() };
}

export function startExperienceAutomation(): void {
  if (intervalHandle) return;
  logger.info("experience automation started (30m interval)");
  intervalHandle = setInterval(() => {
    runExperienceOptimization().catch((err) =>
      logger.error(err, "experience optimization failed"),
    );
  }, OPTIMIZE_INTERVAL_MS);
}

export function stopExperienceAutomation(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info("experience automation stopped");
  }
}
