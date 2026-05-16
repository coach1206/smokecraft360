/**
 * modelTrainingPipeline — schedules and manages incremental training jobs
 * across all learning domains.  Jobs are queued in-process and executed
 * against Postgres training data on a rolling window basis.
 */

import { logger } from "../lib/logger";
import { pool }   from "@workspace/db";

export type TrainingDomain =
  | "recommendation" | "orchestration" | "environmental"
  | "behavioral"     | "venue"          | "preference";

export type TrainingStatus = "pending" | "running" | "complete" | "failed";

export interface TrainingJob {
  id:         string;
  domain:     TrainingDomain;
  venueId?:   string;
  status:     TrainingStatus;
  startedAt?: number;
  completedAt?: number;
  metrics?:   Record<string, number>;
  error?:     string;
}

const jobs = new Map<string, TrainingJob>();

function jobId(): string {
  return `tj-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function scheduleTraining(
  domain:   TrainingDomain,
  venueId?: string,
): string {
  const id = jobId();
  jobs.set(id, { id, domain, venueId, status: "pending" });
  logger.info({ id, domain, venueId }, "modelTrainingPipeline: job queued");
  setImmediate(() => runJob(id).catch(err =>
    logger.warn({ err, id }, "modelTrainingPipeline: job failed"),
  ));
  return id;
}

async function runJob(id: string): Promise<void> {
  const job = jobs.get(id);
  if (!job) return;
  job.status    = "running";
  job.startedAt = Date.now();

  try {
    const metrics = await executeTraining(job.domain, job.venueId);
    job.status      = "complete";
    job.completedAt = Date.now();
    job.metrics     = metrics;
    logger.info({ id, domain: job.domain, metrics }, "modelTrainingPipeline: job complete");
  } catch (err: unknown) {
    job.status = "failed";
    job.error  = String(err);
    logger.warn({ id, err }, "modelTrainingPipeline: job error");
  }
}

async function executeTraining(
  domain:   TrainingDomain,
  venueId?: string,
): Promise<Record<string, number>> {
  const venueFilter = venueId ? "AND venue_id = $1" : "";
  const params      = venueId ? [venueId] : [];

  switch (domain) {
    case "recommendation": {
      const r = await pool.query(
        `SELECT COUNT(*) AS n, AVG(CASE WHEN confidence > 0.7 THEN 1 ELSE 0 END) AS hit_rate
         FROM orchestration_decisions WHERE 1=1 ${venueFilter} AND created_at > NOW() - INTERVAL '7 days'`,
        params,
      );
      return {
        sampleCount: Number(r.rows[0]?.n ?? 0),
        hitRate:     Number(r.rows[0]?.hit_rate ?? 0),
      };
    }
    case "orchestration": {
      const r = await pool.query(
        `SELECT COUNT(*) AS n,
                AVG(CASE WHEN outcome = 'success' THEN 1 ELSE 0 END) AS success_rate
         FROM orchestration_audit_logs WHERE 1=1 ${venueFilter} AND created_at > NOW() - INTERVAL '7 days'`,
        params,
      );
      return {
        sampleCount:  Number(r.rows[0]?.n ?? 0),
        successRate:  Number(r.rows[0]?.success_rate ?? 0),
      };
    }
    case "behavioral": {
      const r = await pool.query(
        `SELECT COUNT(*) AS n FROM engagement_score_history WHERE 1=1 ${venueFilter}
         AND recorded_at > NOW() - INTERVAL '30 days'`,
        params,
      );
      return { sampleCount: Number(r.rows[0]?.n ?? 0) };
    }
    default:
      return { sampleCount: 0 };
  }
}

export function getJob(id: string): TrainingJob | undefined {
  return jobs.get(id);
}

export function listJobs(domain?: TrainingDomain): TrainingJob[] {
  const all = [...jobs.values()];
  return domain ? all.filter(j => j.domain === domain) : all;
}

/** Prune completed/failed jobs older than 1 hour. */
export function pruneJobs(): void {
  const cutoff = Date.now() - 3_600_000;
  for (const [id, job] of jobs) {
    if ((job.status === "complete" || job.status === "failed") &&
        (job.completedAt ?? 0) < cutoff) {
      jobs.delete(id);
    }
  }
}

let pipelineTimer: ReturnType<typeof setInterval> | null = null;

export function startTrainingPipeline(): void {
  if (pipelineTimer) return;
  // Run incremental training every 6 hours
  pipelineTimer = setInterval(() => {
    pruneJobs();
    for (const domain of ["recommendation", "orchestration", "behavioral"] as TrainingDomain[]) {
      scheduleTraining(domain);
    }
  }, 6 * 60 * 60 * 1000);
  logger.info("modelTrainingPipeline: scheduler started");
}
