#!/usr/bin/env bun
/**
 * Manual Job Runner
 * 
 * Usage: bun run job:run <job-name>
 * 
 * Available jobs:
 *   - daily-metrics-aggregation
 *   - weekly-metrics-rollup
 *   - anomaly-detection
 *   - daily-digest-generation
 *   - regression-detection
 */

import { runJobNow, getJobStatus } from "./scheduler";

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  console.log("Flynn AAC Manual Job Runner");
  console.log("");
  console.log("Usage: bun run job:run <job-name>");
  console.log("");
  console.log("Available jobs:");
  
  const jobs = getJobStatus();
  for (const job of jobs) {
    console.log(`  - ${job.name} (${job.schedule})`);
  }
  
  process.exit(0);
}

const jobName = args[0];

console.log(`Running job: ${jobName}`);

try {
  await runJobNow(jobName as string);
  console.log("Job completed successfully");
  process.exit(0);
} catch (error) {
  console.error("Job failed:", error);
  process.exit(1);
}
