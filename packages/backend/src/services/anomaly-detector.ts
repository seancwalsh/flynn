/**
 * Anomaly Detection Service
 * 
 * Detects unusual patterns in AAC usage by comparing daily metrics
 * against rolling baselines using Z-score analysis.
 * 
 * FLY-97: Basic anomaly detection (Z-score)
 */

import { db } from "../db";
import {
  dailyMetrics,
  metricBaselines,
  anomalies,
  children,
  type NewAnomaly,
  type DailyMetric,
  type MetricBaseline,
} from "../db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { logger } from "../utils/logger";

// ============================================================================
// TYPES
// ============================================================================

export type AnomalyType =
  | "usage_drop"
  | "usage_spike"
  | "vocabulary_regression"
  | "vocabulary_expansion"
  | "session_drop"
  | "session_spike";

export type AnomalySeverity = "info" | "warning" | "critical";

export interface DetectedAnomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  metricName: string;
  expectedValue: number;
  actualValue: number;
  zScore: number;
  context: AnomalyContext;
}

export interface AnomalyContext {
  baselineMean: number;
  baselineStdDev: number;
  baselinePeriodDays: number;
  dayOfWeekFactor?: number;
  previousDayValue?: number;
  weeklyTrend?: "increasing" | "decreasing" | "stable";
}

export interface AnomalyDetectorConfig {
  warningThreshold: number; // Z-score threshold for warning (default: 2.0)
  criticalThreshold: number; // Z-score threshold for critical (default: 3.0)
  minSampleDays: number; // Minimum days of baseline data required
  enableDayOfWeekAdjustment: boolean;
}

const DEFAULT_CONFIG: AnomalyDetectorConfig = {
  warningThreshold: 2.0,
  criticalThreshold: 3.0,
  minSampleDays: 7,
  enableDayOfWeekAdjustment: true,
};

// ============================================================================
// Z-SCORE CALCULATION
// ============================================================================

/**
 * Calculate Z-score with optional day-of-week adjustment
 */
function calculateZScore(
  value: number,
  mean: number,
  stdDev: number,
  dayOfWeekFactor?: number
): number {
  if (stdDev === 0 || stdDev === null) return 0;

  // Adjust mean for day-of-week pattern if available
  const adjustedMean = dayOfWeekFactor ? mean * dayOfWeekFactor : mean;

  return (value - adjustedMean) / stdDev;
}

/**
 * Determine severity based on Z-score magnitude
 */
function getSeverity(
  zScore: number,
  config: AnomalyDetectorConfig
): AnomalySeverity | null {
  const absZ = Math.abs(zScore);

  if (absZ >= config.criticalThreshold) return "critical";
  if (absZ >= config.warningThreshold) return "warning";

  return null; // Not significant enough
}

/**
 * Get day-of-week key from date
 */
function getDayOfWeekKey(date: Date): string {
  const days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return days[date.getUTCDay()];
}

// ============================================================================
// ANOMALY DETECTION
// ============================================================================

/**
 * Detect anomalies for a single child on a specific date
 */
export async function detectAnomalies(
  childId: string,
  date: Date,
  config: AnomalyDetectorConfig = DEFAULT_CONFIG
): Promise<DetectedAnomaly[]> {
  const dateStr = date.toISOString().split("T")[0];
  const anomaliesFound: DetectedAnomaly[] = [];

  logger.info(`Detecting anomalies for child ${childId} on ${dateStr}`);

  // Get today's metrics
  const [todayMetrics] = await db
    .select()
    .from(dailyMetrics)
    .where(
      and(eq(dailyMetrics.childId, childId), eq(dailyMetrics.date, dateStr))
    )
    .limit(1);

  if (!todayMetrics) {
    logger.info(`No metrics found for child ${childId} on ${dateStr}`);
    return [];
  }

  // Get baselines for all metrics
  const baselines = await db
    .select()
    .from(metricBaselines)
    .where(eq(metricBaselines.childId, childId));

  if (baselines.length === 0) {
    logger.info(`No baselines found for child ${childId} - skipping detection`);
    return [];
  }

  // Map baselines by metric name
  const baselineMap = new Map<string, MetricBaseline>();
  baselines.forEach((b) => baselineMap.set(b.metricName, b));

  // Get day-of-week factor
  const dayKey = getDayOfWeekKey(date);

  // Check total_taps
  const tapsBaseline = baselineMap.get("total_taps");
  if (tapsBaseline && tapsBaseline.sampleDays >= config.minSampleDays) {
    const anomaly = checkMetricAnomaly(
      "total_taps",
      todayMetrics.totalTaps || 0,
      tapsBaseline,
      dayKey,
      config
    );
    if (anomaly) anomaliesFound.push(anomaly);
  }

  // Check unique_symbols
  const symbolsBaseline = baselineMap.get("unique_symbols");
  if (symbolsBaseline && symbolsBaseline.sampleDays >= config.minSampleDays) {
    const anomaly = checkMetricAnomaly(
      "unique_symbols",
      todayMetrics.uniqueSymbols || 0,
      symbolsBaseline,
      dayKey,
      config
    );
    if (anomaly) anomaliesFound.push(anomaly);
  }

  // Check session_count
  const sessionsBaseline = baselineMap.get("session_count");
  if (sessionsBaseline && sessionsBaseline.sampleDays >= config.minSampleDays) {
    const anomaly = checkMetricAnomaly(
      "session_count",
      todayMetrics.sessionCount || 0,
      sessionsBaseline,
      dayKey,
      config
    );
    if (anomaly) anomaliesFound.push(anomaly);
  }

  logger.info(
    `Found ${anomaliesFound.length} anomalies for child ${childId} on ${dateStr}`
  );

  return anomaliesFound;
}

/**
 * Check a single metric for anomalies
 */
function checkMetricAnomaly(
  metricName: string,
  actualValue: number,
  baseline: MetricBaseline,
  dayKey: string,
  config: AnomalyDetectorConfig
): DetectedAnomaly | null {
  const mean = parseFloat(baseline.mean);
  const stdDev = parseFloat(baseline.stdDev);

  // Get day-of-week factor if available
  let dayOfWeekFactor: number | undefined;
  if (config.enableDayOfWeekAdjustment && baseline.dayOfWeekFactors) {
    const factors = baseline.dayOfWeekFactors as Record<string, number>;
    dayOfWeekFactor = factors[dayKey];
  }

  // Calculate Z-score
  const zScore = calculateZScore(actualValue, mean, stdDev, dayOfWeekFactor);

  // Check if significant
  const severity = getSeverity(zScore, config);
  if (!severity) return null;

  // Determine anomaly type based on direction
  const isDecrease = zScore < 0;
  let type: AnomalyType;

  switch (metricName) {
    case "total_taps":
      type = isDecrease ? "usage_drop" : "usage_spike";
      break;
    case "unique_symbols":
      type = isDecrease ? "vocabulary_regression" : "vocabulary_expansion";
      break;
    case "session_count":
      type = isDecrease ? "session_drop" : "session_spike";
      break;
    default:
      type = isDecrease ? "usage_drop" : "usage_spike";
  }

  const expectedValue = dayOfWeekFactor ? mean * dayOfWeekFactor : mean;

  return {
    type,
    severity,
    metricName,
    expectedValue,
    actualValue,
    zScore,
    context: {
      baselineMean: mean,
      baselineStdDev: stdDev,
      baselinePeriodDays: baseline.sampleDays,
      dayOfWeekFactor,
    },
  };
}

// ============================================================================
// ANOMALY PERSISTENCE
// ============================================================================

/**
 * Detect and save anomalies for a child
 */
export async function detectAndSaveAnomalies(
  childId: string,
  date: Date,
  config: AnomalyDetectorConfig = DEFAULT_CONFIG
): Promise<number> {
  const detected = await detectAnomalies(childId, date, config);
  const dateStr = date.toISOString().split("T")[0];

  for (const anomaly of detected) {
    await db.insert(anomalies).values({
      childId,
      type: anomaly.type,
      severity: anomaly.severity,
      metricName: anomaly.metricName,
      expectedValue: anomaly.expectedValue.toFixed(4),
      actualValue: anomaly.actualValue.toFixed(4),
      deviationScore: Math.abs(anomaly.zScore).toFixed(4),
      context: anomaly.context as unknown as Record<string, unknown>,
      detectedForDate: dateStr,
      detectedAt: new Date(),
    });

    logger.info(
      `Saved ${anomaly.severity} ${anomaly.type} anomaly for child ${childId}: ` +
        `expected ${anomaly.expectedValue.toFixed(1)}, got ${anomaly.actualValue} (Z=${anomaly.zScore.toFixed(2)})`
    );
  }

  return detected.length;
}

/**
 * Run anomaly detection for all children
 */
export async function runAnomalyDetectionJob(
  date?: Date,
  config?: AnomalyDetectorConfig
): Promise<{ childrenProcessed: number; anomaliesFound: number }> {
  const targetDate = date || new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday

  logger.info(
    `Starting anomaly detection job for ${targetDate.toISOString().split("T")[0]}`
  );

  const allChildren = await db.select({ id: children.id }).from(children);
  let totalAnomalies = 0;

  for (const child of allChildren) {
    try {
      const count = await detectAndSaveAnomalies(
        child.id,
        targetDate,
        config || DEFAULT_CONFIG
      );
      totalAnomalies += count;
    } catch (error) {
      logger.error(
        `Failed to detect anomalies for child ${child.id}:`,
        error
      );
    }
  }

  logger.info(
    `Anomaly detection complete: ${allChildren.length} children, ${totalAnomalies} anomalies found`
  );

  return {
    childrenProcessed: allChildren.length,
    anomaliesFound: totalAnomalies,
  };
}

// ============================================================================
// ANOMALY QUERIES
// ============================================================================

/**
 * Get unacknowledged anomalies for a child
 */
export async function getUnacknowledgedAnomalies(
  childId: string,
  limit = 20
): Promise<typeof anomalies.$inferSelect[]> {
  return db
    .select()
    .from(anomalies)
    .where(
      and(eq(anomalies.childId, childId), eq(anomalies.acknowledged, false))
    )
    .orderBy(desc(anomalies.detectedAt))
    .limit(limit);
}

/**
 * Get recent anomalies for a child (acknowledged or not)
 */
export async function getRecentAnomalies(
  childId: string,
  days = 7
): Promise<typeof anomalies.$inferSelect[]> {
  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sinceDateStr = sinceDate.toISOString().split("T")[0];

  return db
    .select()
    .from(anomalies)
    .where(
      and(
        eq(anomalies.childId, childId),
        gte(anomalies.detectedForDate, sinceDateStr)
      )
    )
    .orderBy(desc(anomalies.detectedAt));
}

/**
 * Acknowledge an anomaly
 */
export async function acknowledgeAnomaly(
  anomalyId: string,
  userId: string
): Promise<void> {
  await db
    .update(anomalies)
    .set({
      acknowledged: true,
      acknowledgedAt: new Date(),
      acknowledgedBy: userId,
    })
    .where(eq(anomalies.id, anomalyId));
}

/**
 * Resolve an anomaly with a note
 */
export async function resolveAnomaly(
  anomalyId: string,
  resolution: string
): Promise<void> {
  await db
    .update(anomalies)
    .set({
      resolvedAt: new Date(),
      resolution,
    })
    .where(eq(anomalies.id, anomalyId));
}

// ============================================================================
// EXPORTS
// ============================================================================

export const anomalyDetector = {
  detectAnomalies,
  detectAndSaveAnomalies,
  runAnomalyDetectionJob,
  getUnacknowledgedAnomalies,
  getRecentAnomalies,
  acknowledgeAnomaly,
  resolveAnomaly,
  DEFAULT_CONFIG,
};
