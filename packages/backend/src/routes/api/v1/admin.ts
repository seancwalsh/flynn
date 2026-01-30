/**
 * Admin API Routes
 *
 * Provides administrative endpoints for:
 * - Manual job triggers
 * - System health checks
 * - Metrics force-refresh
 */

import { Hono } from "hono";
import { clerkMiddleware, getAuth } from "@hono/clerk-auth";
import { z } from "zod";
import { runJobNow, getJobStatus } from "../../../jobs/scheduler";

export const adminRoutes = new Hono();

// Require authentication for all admin routes
adminRoutes.use("*", clerkMiddleware());

// ============================================================================
// Manual Job Triggers
// ============================================================================

/**
 * POST /admin/jobs/:jobName/run
 * Manually trigger a scheduled job
 */
adminRoutes.post("/jobs/:jobName/run", async (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const jobName = c.req.param("jobName");

  try {
    await runJobNow(jobName);
    return c.json({
      success: true,
      message: `Job ${jobName} completed successfully`,
    });
  } catch (error) {
    console.error(`[Admin] Failed to run job ${jobName}:`, error);
    return c.json(
      {
        success: false,
        error: "Failed to run job",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * GET /admin/jobs
 * Get status of all scheduled jobs
 */
adminRoutes.get("/jobs", async (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const jobs = getJobStatus();
  return c.json({ jobs });
});

// ============================================================================
// Convenience Endpoints
// ============================================================================

/**
 * POST /admin/aggregate-metrics
 * Manually trigger daily metrics aggregation
 * Convenience endpoint for the most common admin operation
 */
adminRoutes.post("/aggregate-metrics", async (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    await runJobNow("daily-metrics-aggregation");
    return c.json({
      success: true,
      message: "Metrics aggregated successfully",
    });
  } catch (error) {
    console.error("[Admin] Failed to aggregate metrics:", error);
    return c.json(
      {
        success: false,
        error: "Failed to aggregate metrics",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * POST /admin/generate-digests
 * Manually trigger digest generation for all children
 */
adminRoutes.post("/generate-digests", async (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    await runJobNow("daily-digest-generation");
    return c.json({
      success: true,
      message: "Digests generated successfully",
    });
  } catch (error) {
    console.error("[Admin] Failed to generate digests:", error);
    return c.json(
      {
        success: false,
        error: "Failed to generate digests",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * POST /admin/detect-anomalies
 * Manually trigger anomaly detection
 */
adminRoutes.post("/detect-anomalies", async (c) => {
  const auth = getAuth(c);
  if (!auth?.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    await runJobNow("anomaly-detection");
    return c.json({
      success: true,
      message: "Anomaly detection completed successfully",
    });
  } catch (error) {
    console.error("[Admin] Failed to detect anomalies:", error);
    return c.json(
      {
        success: false,
        error: "Failed to detect anomalies",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});
