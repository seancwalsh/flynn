/**
 * Dashboard API Routes
 * FLY-144: Backend Insight Caching System
 * 
 * Provides dashboard-specific endpoints for caregivers:
 * - GET /children/:id/dashboard - Get cached dashboard summary
 * - POST /children/:id/insights/refresh - Force refresh insights
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";
import { db } from "../../../db";
import { insights, usageLogs, dailyMetrics, children } from "../../../db/schema";
import { eq, and, gte, desc, sql, count, countDistinct } from "drizzle-orm";
import { AppError } from "../../../middleware/error-handler";
import { requireChildAccess } from "../../../middleware/authorization";
import { generateAndSaveDigest } from "../../../services/digest-generator";
import { logger } from "../../../utils/logger";

export const dashboardRoutes = new Hono();

// ============================================================================
// TYPES
// ============================================================================

interface TodayStats {
  sessionsLogged: number;
  wordsUsed: number;
  communicationAttempts: number;
  observation: string | undefined;
}

interface DashboardInsight {
  id: string;
  type: string;
  severity: string | null;
  title: string | null;
  body: string | null;
  createdAt: string;
}

interface DashboardSummary {
  child: {
    id: string;
    name: string;
    birthDate: string | null;
  };
  today: TodayStats;
  insights: DashboardInsight[];
  lastUpdated: string;
}

// ============================================================================
// DASHBOARD SUMMARY
// ============================================================================

/**
 * Get dashboard summary for a child
 * Returns today's stats and cached insights
 */
dashboardRoutes.get("/:childId/dashboard", requireChildAccess("childId"), async (c) => {
  const childId = c.req.param("childId");

  // Get child info
  const [child] = await db
    .select({
      id: children.id,
      name: children.name,
      birthDate: children.birthDate,
    })
    .from(children)
    .where(eq(children.id, childId));

  if (!child) {
    throw new AppError("Child not found", 404, "NOT_FOUND");
  }

  // Get today's date
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0] as string;
  const todayStart = new Date(todayStr + "T00:00:00.000Z");

  // Get today's stats from dailyMetrics (pre-computed) or calculate from usageLogs
  let sessionsLogged = 0;
  let wordsUsed = 0;
  let communicationAttempts = 0;

  // First try to get pre-computed metrics
  const [todayMetrics] = await db
    .select({
      totalTaps: dailyMetrics.totalTaps,
      sessionCount: dailyMetrics.sessionCount,
      totalSessionSeconds: dailyMetrics.totalSessionSeconds,
    })
    .from(dailyMetrics)
    .where(
      and(
        eq(dailyMetrics.childId, childId),
        eq(dailyMetrics.date, todayStr)
      )
    );

  if (todayMetrics) {
    sessionsLogged = todayMetrics.sessionCount || 0;
    wordsUsed = todayMetrics.totalTaps || 0;
    communicationAttempts = Math.ceil((todayMetrics.totalSessionSeconds || 0) / 60);
  } else {
    // Fallback: calculate from raw usage logs
    const [logStats] = await db
      .select({
        tapCount: count(),
        sessionCount: countDistinct(usageLogs.sessionId),
      })
      .from(usageLogs)
      .where(
        and(
          eq(usageLogs.childId, childId),
          gte(usageLogs.timestamp, todayStart)
        )
      );

    if (logStats) {
      sessionsLogged = Number(logStats.sessionCount) || 0;
      wordsUsed = Number(logStats.tapCount) || 0;
      // Estimate communication attempts as tap count / 5 (rough estimate)
      communicationAttempts = Math.ceil(wordsUsed / 5);
    }
  }

  // Get today's observation from daily digest if available
  const [latestDigest] = await db
    .select({
      body: insights.body,
      generatedAt: insights.generatedAt,
    })
    .from(insights)
    .where(
      and(
        eq(insights.childId, childId),
        eq(insights.type, "daily_digest"),
        gte(insights.generatedAt, todayStart)
      )
    )
    .orderBy(desc(insights.generatedAt))
    .limit(1);

  // Get observation - extract first sentence or short summary
  let observation: string | undefined;
  if (latestDigest?.body) {
    // Get first sentence or first 100 chars
    const sentences = latestDigest.body.split(/[.!?]/);
    const firstSentence = sentences[0];
    if (firstSentence) {
      observation = firstSentence.length > 100
        ? firstSentence.substring(0, 97) + "..."
        : firstSentence + ".";
    }
  }

  // Get recent insights (not daily digests, those are for observation)
  const recentInsights = await db
    .select({
      id: insights.id,
      type: insights.type,
      severity: insights.severity,
      title: insights.title,
      body: insights.body,
      generatedAt: insights.generatedAt,
    })
    .from(insights)
    .where(
      and(
        eq(insights.childId, childId),
        sql`${insights.dismissedAt} IS NULL`,
        sql`${insights.type} != 'daily_digest'`
      )
    )
    .orderBy(desc(insights.generatedAt))
    .limit(10);

  const summary: DashboardSummary = {
    child: {
      id: child.id,
      name: child.name,
      birthDate: child.birthDate,
    },
    today: {
      sessionsLogged,
      wordsUsed,
      communicationAttempts,
      observation,
    },
    insights: recentInsights.map((i) => ({
      id: i.id,
      type: i.type,
      severity: i.severity,
      title: i.title,
      body: i.body,
      createdAt: i.generatedAt?.toISOString() || new Date().toISOString(),
    })),
    lastUpdated: new Date().toISOString(),
  };

  return c.json({ data: summary });
});

// ============================================================================
// REFRESH INSIGHTS
// ============================================================================

const refreshSchema = z.object({
  types: z.array(z.enum(["daily_digest", "anomaly", "regression"])).optional(),
});

/**
 * Force refresh insights for a child
 * Triggers regeneration of specified insight types
 */
dashboardRoutes.post(
  "/:childId/insights/refresh",
  requireChildAccess("childId"),
  zValidator("json", refreshSchema),
  async (c) => {
    const childId = c.req.param("childId");
    const { types = ["daily_digest"] } = c.req.valid("json");

    const results: Record<string, { success: boolean; error?: string }> = {};

    for (const type of types) {
      try {
        switch (type) {
          case "daily_digest":
            await generateAndSaveDigest(childId, new Date());
            results[type] = { success: true };
            break;
          // Add other refresh handlers as needed
          default:
            results[type] = { success: false, error: "Unknown insight type" };
        }
      } catch (error) {
        logger.error(`Failed to refresh ${type} for child ${childId}:`, error);
        results[type] = {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    }

    return c.json({
      success: Object.values(results).every((r) => r.success),
      results,
    });
  }
);

// ============================================================================
// TODAY'S ACTIVITY (lightweight endpoint)
// ============================================================================

/**
 * Get just today's activity stats (lightweight)
 */
dashboardRoutes.get("/:childId/today", requireChildAccess("childId"), async (c) => {
  const childId = c.req.param("childId");

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0] as string;
  const todayStart = new Date(todayStr + "T00:00:00.000Z");

  // First try pre-computed metrics
  const [todayMetrics] = await db
    .select({
      totalTaps: dailyMetrics.totalTaps,
      sessionCount: dailyMetrics.sessionCount,
      totalSessionSeconds: dailyMetrics.totalSessionSeconds,
    })
    .from(dailyMetrics)
    .where(
      and(
        eq(dailyMetrics.childId, childId),
        eq(dailyMetrics.date, todayStr)
      )
    );

  if (todayMetrics) {
    return c.json({
      data: {
        sessionsLogged: todayMetrics.sessionCount || 0,
        wordsUsed: todayMetrics.totalTaps || 0,
        communicationAttempts: Math.ceil((todayMetrics.totalSessionSeconds || 0) / 60),
      },
    });
  }

  // Fallback: calculate from raw usage logs
  const [logStats] = await db
    .select({
      tapCount: count(),
      sessionCount: countDistinct(usageLogs.sessionId),
    })
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.childId, childId),
        gte(usageLogs.timestamp, todayStart)
      )
    );

  const tapCount = Number(logStats?.tapCount) || 0;
  
  return c.json({
    data: {
      sessionsLogged: Number(logStats?.sessionCount) || 0,
      wordsUsed: tapCount,
      communicationAttempts: Math.ceil(tapCount / 5),
    },
  });
});
