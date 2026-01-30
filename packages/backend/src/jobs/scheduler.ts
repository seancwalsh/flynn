/**
 * Flynn AAC Backend Job Scheduler
 * 
 * Runs scheduled jobs for:
 * - Daily metrics aggregation (6:00 AM UTC)
 * - Weekly metrics rollup (Sunday 8:00 AM UTC)
 * - Daily digest generation (7:00 AM UTC)
 * - Anomaly detection (6:30 AM UTC)
 * - Regression detection (7:30 AM UTC)
 */

import cron, { ScheduledTask } from "node-cron";
import { runDailyAggregationJob, runWeeklyAggregationJob } from "../services/metrics-aggregator";
import { runAnomalyDetectionJob } from "../services/anomaly-detector";
import { runRegressionDetectionJob } from "../services/regression-detector";
import { runDigestGenerationJob } from "../services/digest-generator";

// ============================================================================
// Configuration
// ============================================================================

interface JobConfig {
  name: string;
  schedule: string;
  handler: () => Promise<unknown>;
  enabled: boolean;
}

const jobs: JobConfig[] = [
  {
    name: "daily-metrics-aggregation",
    schedule: "0 6 * * *", // 6:00 AM UTC daily
    handler: runDailyAggregationJob,
    enabled: true,
  },
  {
    name: "weekly-metrics-rollup",
    schedule: "0 8 * * 0", // 8:00 AM UTC every Sunday
    handler: runWeeklyAggregationJob,
    enabled: true,
  },
  {
    name: "anomaly-detection",
    schedule: "30 6 * * *", // 6:30 AM UTC daily (after metrics aggregation)
    handler: runAnomalyDetectionJob,
    enabled: true,
  },
  {
    name: "daily-digest-generation",
    schedule: "0 7 * * *", // 7:00 AM UTC daily
    handler: runDigestGenerationJob,
    enabled: true,
  },
  {
    name: "regression-detection",
    schedule: "30 7 * * *", // 7:30 AM UTC daily (after digests)
    handler: runRegressionDetectionJob,
    enabled: true,
  },
];

// ============================================================================
// Scheduler
// ============================================================================

const scheduledTasks: ScheduledTask[] = [];

/**
 * Start all scheduled jobs
 */
export function startScheduler(): void {
  console.log("[Scheduler] Starting job scheduler...");

  for (const job of jobs) {
    if (!job.enabled) {
      console.log(`[Scheduler] Skipping disabled job: ${job.name}`);
      continue;
    }

    if (!cron.validate(job.schedule)) {
      console.error(`[Scheduler] Invalid cron schedule for ${job.name}: ${job.schedule}`);
      continue;
    }

    const task = cron.schedule(job.schedule, async () => {
      const startTime = Date.now();
      console.log(`[Scheduler] Starting job: ${job.name}`);

      try {
        await job.handler();
        const duration = Date.now() - startTime;
        console.log(`[Scheduler] Completed job: ${job.name} (${duration}ms)`);
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[Scheduler] Failed job: ${job.name} (${duration}ms)`, error);
      }
    });

    scheduledTasks.push(task);
    console.log(`[Scheduler] Scheduled job: ${job.name} (${job.schedule})`);
  }

  console.log(`[Scheduler] Started ${scheduledTasks.length} jobs`);
}

/**
 * Stop all scheduled jobs
 */
export function stopScheduler(): void {
  console.log("[Scheduler] Stopping job scheduler...");

  for (const task of scheduledTasks) {
    task.stop();
  }

  scheduledTasks.length = 0;
  console.log("[Scheduler] All jobs stopped");
}

/**
 * Run a specific job immediately (for testing/manual triggers)
 */
export async function runJobNow(jobName: string): Promise<void> {
  const job = jobs.find((j) => j.name === jobName);

  if (!job) {
    throw new Error(`Unknown job: ${jobName}`);
  }

  console.log(`[Scheduler] Running job manually: ${job.name}`);
  const startTime = Date.now();

  try {
    await job.handler();
    const duration = Date.now() - startTime;
    console.log(`[Scheduler] Completed manual job: ${job.name} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Scheduler] Failed manual job: ${job.name} (${duration}ms)`, error);
    throw error;
  }
}

/**
 * Get status of all jobs
 */
export function getJobStatus(): Array<{ name: string; schedule: string; enabled: boolean }> {
  return jobs.map((job) => ({
    name: job.name,
    schedule: job.schedule,
    enabled: job.enabled,
  }));
}

// ============================================================================
// CLI Entry Point
// ============================================================================

// When run directly, start the scheduler
if (import.meta.main) {
  console.log("[Scheduler] Flynn AAC Job Scheduler");
  console.log("[Scheduler] Press Ctrl+C to stop");
  
  startScheduler();

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    console.log("\n[Scheduler] Received SIGINT, shutting down...");
    stopScheduler();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\n[Scheduler] Received SIGTERM, shutting down...");
    stopScheduler();
    process.exit(0);
  });
}
