/**
 * Regression Detection Engine
 * 
 * Advanced regression detection beyond basic anomalies:
 * - Vocabulary regression (words disappearing)
 * - Multi-day trend analysis
 * - Context-aware detection (illness, vacation)
 * - Configurable alert thresholds
 * 
 * FLY-102: Regression detection engine
 */

import { db } from "../db";
import {
  dailyMetrics,
  weeklyMetrics,
  usageLogs,
  anomalies,
  children,
  insights,
} from "../db/schema";
import { eq, and, gte, lt, desc, sql, not, inArray } from "drizzle-orm";
import { logger } from "../utils/logger";

// ============================================================================
// TYPES
// ============================================================================

export type RegressionType =
  | "vocabulary_regression"
  | "usage_decline"
  | "session_decline"
  | "skill_stall"
  | "engagement_drop";

export type AlertLevel = "yellow" | "orange" | "red";

export interface RegressionAlert {
  type: RegressionType;
  level: AlertLevel;
  title: string;
  description: string;
  recommendation: string;
  data: RegressionData;
  detectedAt: Date;
}

export interface RegressionData {
  metric?: string;
  currentValue?: number;
  baselineValue?: number;
  changePercent?: number;
  trendDays?: number;
  affectedSymbols?: string[];
  context?: ChildContext;
}

export interface ChildContext {
  isIll?: boolean;
  isOnVacation?: boolean;
  hasTherapyToday?: boolean;
  recentLifeEvent?: string;
}

export interface RegressionConfig {
  // Vocabulary regression
  vocabularyLookbackDays: number; // How far back to check for missing words
  minUsesBeforeTracking: number; // Minimum uses before a word is "established"
  daysAbsentForAlert: number; // Days a word must be absent for alert
  
  // Usage decline
  usageDeclineThreshold: number; // % decline to trigger alert
  consecutiveDaysForTrend: number; // Days of decline to confirm trend
  
  // Alert thresholds
  yellowThreshold: number; // % change for yellow alert
  orangeThreshold: number; // % change for orange alert
  redThreshold: number; // % change for red alert
}

const DEFAULT_CONFIG: RegressionConfig = {
  vocabularyLookbackDays: 30,
  minUsesBeforeTracking: 3,
  daysAbsentForAlert: 7,
  usageDeclineThreshold: 25,
  consecutiveDaysForTrend: 3,
  yellowThreshold: 20,
  orangeThreshold: 35,
  redThreshold: 50,
};

// ============================================================================
// VOCABULARY REGRESSION
// ============================================================================

/**
 * Detect vocabulary regression - words that were used regularly but have disappeared
 */
export async function detectVocabularyRegression(
  childId: string,
  config: RegressionConfig = DEFAULT_CONFIG
): Promise<RegressionAlert[]> {
  const alerts: RegressionAlert[] = [];
  const today = new Date();
  
  // Get words used 15-30 days ago (established vocabulary)
  const establishedPeriodStart = new Date(today.getTime() - config.vocabularyLookbackDays * 24 * 60 * 60 * 1000);
  const establishedPeriodEnd = new Date(today.getTime() - (config.vocabularyLookbackDays / 2) * 24 * 60 * 60 * 1000);
  
  const establishedWords = await db
    .select({
      symbolId: usageLogs.symbolId,
      count: sql<number>`count(*)::int`,
    })
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.childId, childId),
        gte(usageLogs.timestamp, establishedPeriodStart),
        lt(usageLogs.timestamp, establishedPeriodEnd)
      )
    )
    .groupBy(usageLogs.symbolId)
    .having(sql`count(*) >= ${config.minUsesBeforeTracking}`);

  if (establishedWords.length === 0) {
    return alerts;
  }

  const establishedSymbolIds = establishedWords.map(w => w.symbolId);

  // Get words used in last 7 days
  const recentStart = new Date(today.getTime() - config.daysAbsentForAlert * 24 * 60 * 60 * 1000);
  
  const recentWords = await db
    .selectDistinct({ symbolId: usageLogs.symbolId })
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.childId, childId),
        gte(usageLogs.timestamp, recentStart),
        inArray(usageLogs.symbolId, establishedSymbolIds)
      )
    );

  const recentSymbolSet = new Set(recentWords.map(w => w.symbolId));
  
  // Find missing words
  const missingWords = establishedWords.filter(w => !recentSymbolSet.has(w.symbolId));

  if (missingWords.length > 0) {
    // Determine alert level based on number of missing words
    const missingPercent = (missingWords.length / establishedWords.length) * 100;
    let level: AlertLevel = "yellow";
    
    if (missingPercent >= config.redThreshold) {
      level = "red";
    } else if (missingPercent >= config.orangeThreshold) {
      level = "orange";
    }

    alerts.push({
      type: "vocabulary_regression",
      level,
      title: `${missingWords.length} words haven't been used recently`,
      description: `Words like "${missingWords.slice(0, 3).map(w => w.symbolId).join('", "')}" were used regularly but haven't appeared in the last ${config.daysAbsentForAlert} days.`,
      recommendation: level === "red"
        ? "Consider scheduling a team meeting to discuss. This may indicate regression."
        : level === "orange"
        ? "Worth mentioning to the therapist at the next session."
        : "Keep an eye on this. Try modeling these words during daily activities.",
      data: {
        affectedSymbols: missingWords.map(w => w.symbolId),
        changePercent: missingPercent,
        trendDays: config.daysAbsentForAlert,
      },
      detectedAt: new Date(),
    });
  }

  return alerts;
}

// ============================================================================
// USAGE TREND ANALYSIS
// ============================================================================

/**
 * Detect multi-day usage decline trends
 */
export async function detectUsageTrend(
  childId: string,
  config: RegressionConfig = DEFAULT_CONFIG
): Promise<RegressionAlert[]> {
  const alerts: RegressionAlert[] = [];
  
  // Get last 14 days of daily metrics
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  
  const metrics = await db
    .select()
    .from(dailyMetrics)
    .where(
      and(
        eq(dailyMetrics.childId, childId),
        gte(dailyMetrics.date, twoWeeksAgo.toISOString().split('T')[0])
      )
    )
    .orderBy(desc(dailyMetrics.date));

  if (metrics.length < config.consecutiveDaysForTrend + 1) {
    return alerts;
  }

  // Check for consecutive declining days
  let consecutiveDeclines = 0;
  let totalDeclinePercent = 0;
  
  for (let i = 0; i < metrics.length - 1 && i < 7; i++) {
    const today = metrics[i];
    const yesterday = metrics[i + 1];
    
    if (today.totalTaps < yesterday.totalTaps) {
      consecutiveDeclines++;
      if (yesterday.totalTaps > 0) {
        totalDeclinePercent += ((yesterday.totalTaps - today.totalTaps) / yesterday.totalTaps) * 100;
      }
    } else {
      break;
    }
  }

  if (consecutiveDeclines >= config.consecutiveDaysForTrend) {
    const avgDecline = totalDeclinePercent / consecutiveDeclines;
    
    let level: AlertLevel = "yellow";
    if (avgDecline >= config.redThreshold) {
      level = "red";
    } else if (avgDecline >= config.orangeThreshold) {
      level = "orange";
    }

    alerts.push({
      type: "usage_decline",
      level,
      title: `${consecutiveDeclines}-day usage decline detected`,
      description: `AAC usage has decreased for ${consecutiveDeclines} consecutive days, averaging ${avgDecline.toFixed(0)}% decline per day.`,
      recommendation: level === "red"
        ? "This is a significant decline. Check if there are external factors (illness, routine change) and consider reaching out to the team."
        : "Worth monitoring. Consider increasing AAC modeling opportunities.",
      data: {
        metric: "total_taps",
        changePercent: -avgDecline,
        trendDays: consecutiveDeclines,
        currentValue: metrics[0]?.totalTaps,
        baselineValue: metrics[consecutiveDeclines]?.totalTaps,
      },
      detectedAt: new Date(),
    });
  }

  return alerts;
}

// ============================================================================
// ENGAGEMENT ANALYSIS
// ============================================================================

/**
 * Detect drops in engagement (sessions, duration, variety)
 */
export async function detectEngagementDrop(
  childId: string,
  config: RegressionConfig = DEFAULT_CONFIG
): Promise<RegressionAlert[]> {
  const alerts: RegressionAlert[] = [];
  
  // Compare this week to last 4 weeks average
  const [latestWeek] = await db
    .select()
    .from(weeklyMetrics)
    .where(eq(weeklyMetrics.childId, childId))
    .orderBy(desc(weeklyMetrics.weekStart))
    .limit(1);

  if (!latestWeek) return alerts;

  const fourWeeksAgo = new Date(new Date(latestWeek.weekStart).getTime() - 28 * 24 * 60 * 60 * 1000);
  
  const previousWeeks = await db
    .select()
    .from(weeklyMetrics)
    .where(
      and(
        eq(weeklyMetrics.childId, childId),
        gte(weeklyMetrics.weekStart, fourWeeksAgo.toISOString().split('T')[0]),
        lt(weeklyMetrics.weekStart, latestWeek.weekStart)
      )
    );

  if (previousWeeks.length < 2) return alerts;

  // Calculate averages
  const avgSessions = previousWeeks.reduce((sum, w) => sum + w.totalSessions, 0) / previousWeeks.length;
  const avgActiveDays = previousWeeks.reduce((sum, w) => sum + w.activeDays, 0) / previousWeeks.length;

  // Check session drop
  if (avgSessions > 0 && latestWeek.totalSessions < avgSessions * (1 - config.yellowThreshold / 100)) {
    const dropPercent = ((avgSessions - latestWeek.totalSessions) / avgSessions) * 100;
    
    let level: AlertLevel = "yellow";
    if (dropPercent >= config.redThreshold) level = "red";
    else if (dropPercent >= config.orangeThreshold) level = "orange";

    alerts.push({
      type: "session_decline",
      level,
      title: "Fewer AAC sessions this week",
      description: `Only ${latestWeek.totalSessions} sessions this week compared to ${avgSessions.toFixed(0)} average.`,
      recommendation: "Try to find more opportunities for AAC use throughout the day.",
      data: {
        metric: "total_sessions",
        currentValue: latestWeek.totalSessions,
        baselineValue: avgSessions,
        changePercent: -dropPercent,
      },
      detectedAt: new Date(),
    });
  }

  // Check active days drop
  if (avgActiveDays > 0 && latestWeek.activeDays < avgActiveDays * 0.7) {
    const dropPercent = ((avgActiveDays - latestWeek.activeDays) / avgActiveDays) * 100;

    alerts.push({
      type: "engagement_drop",
      level: dropPercent >= config.orangeThreshold ? "orange" : "yellow",
      title: "Fewer active AAC days this week",
      description: `Only ${latestWeek.activeDays} active days compared to ${avgActiveDays.toFixed(0)} average.`,
      recommendation: "Consistency matters! Try to use AAC every day, even if briefly.",
      data: {
        metric: "active_days",
        currentValue: latestWeek.activeDays,
        baselineValue: avgActiveDays,
        changePercent: -dropPercent,
      },
      detectedAt: new Date(),
    });
  }

  return alerts;
}

// ============================================================================
// MAIN DETECTION
// ============================================================================

/**
 * Run all regression detection for a child
 */
export async function detectAllRegressions(
  childId: string,
  context?: ChildContext,
  config: RegressionConfig = DEFAULT_CONFIG
): Promise<RegressionAlert[]> {
  logger.info(`Running regression detection for child ${childId}`);

  // If child is ill or on vacation, skip detection
  if (context?.isIll || context?.isOnVacation) {
    logger.info(`Skipping regression detection - child context: ${JSON.stringify(context)}`);
    return [];
  }

  const [vocabularyAlerts, usageAlerts, engagementAlerts] = await Promise.all([
    detectVocabularyRegression(childId, config),
    detectUsageTrend(childId, config),
    detectEngagementDrop(childId, config),
  ]);

  const allAlerts = [...vocabularyAlerts, ...usageAlerts, ...engagementAlerts];

  // Add context to all alerts
  allAlerts.forEach(alert => {
    alert.data.context = context;
  });

  logger.info(`Found ${allAlerts.length} regression alerts for child ${childId}`);

  return allAlerts;
}

/**
 * Run regression detection and save as insights
 */
export async function detectAndSaveRegressions(
  childId: string,
  context?: ChildContext,
  config?: RegressionConfig
): Promise<number> {
  const alerts = await detectAllRegressions(childId, context, config);

  for (const alert of alerts) {
    // Map alert level to severity
    const severity = alert.level === "red" ? "critical" : 
                     alert.level === "orange" ? "warning" : "info";

    await db.insert(insights).values({
      childId,
      type: "regression_alert",
      severity,
      title: alert.title,
      body: `${alert.description}\n\n**Recommendation:** ${alert.recommendation}`,
      content: {
        alertType: alert.type,
        alertLevel: alert.level,
        data: alert.data,
        detectedAt: alert.detectedAt.toISOString(),
      },
      generatedAt: new Date(),
    });
  }

  return alerts.length;
}

/**
 * Run regression detection for all children
 */
export async function runRegressionDetectionJob(
  config?: RegressionConfig
): Promise<{ childrenProcessed: number; alertsGenerated: number }> {
  logger.info("Starting regression detection job");

  const allChildren = await db.select({ id: children.id }).from(children);
  let totalAlerts = 0;

  for (const child of allChildren) {
    try {
      // TODO: Load child context from database
      const alertCount = await detectAndSaveRegressions(child.id, undefined, config);
      totalAlerts += alertCount;
    } catch (error) {
      logger.error(`Regression detection failed for child ${child.id}:`, error);
    }
  }

  logger.info(`Regression detection complete: ${allChildren.length} children, ${totalAlerts} alerts`);

  return {
    childrenProcessed: allChildren.length,
    alertsGenerated: totalAlerts,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const regressionDetector = {
  detectVocabularyRegression,
  detectUsageTrend,
  detectEngagementDrop,
  detectAllRegressions,
  detectAndSaveRegressions,
  runRegressionDetectionJob,
  DEFAULT_CONFIG,
};
