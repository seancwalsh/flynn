/**
 * Metrics Aggregator Service
 * 
 * Background job service that aggregates raw AAC usage data into
 * daily and weekly metrics for the Proactive Insights Engine.
 * 
 * FLY-95: Metrics aggregation database schema
 * FLY-96: Daily metrics aggregation job
 */

import { db } from "../db";
import {
  usageLogs,
  dailyMetrics,
  weeklyMetrics,
  metricBaselines,
  children,
  type NewDailyMetric,
  type NewWeeklyMetric,
  type NewMetricBaseline,
} from "../db/schema";
import { eq, and, gte, lt, sql, desc, count } from "drizzle-orm";
import { logger } from "../utils/logger";

// ============================================================================
// TYPES
// ============================================================================

interface HourlyDistribution {
  [hour: number]: number; // 0-23 -> count
}

interface TopSymbol {
  symbolId: string;
  count: number;
}

interface CategoryBreakdown {
  [category: string]: number;
}

interface DayOfWeekFactors {
  mon: number;
  tue: number;
  wed: number;
  thu: number;
  fri: number;
  sat: number;
  sun: number;
}

// ============================================================================
// DAILY METRICS AGGREGATION
// ============================================================================

/**
 * Aggregates usage data for a single child for a specific date.
 * Idempotent - safe to re-run for the same child/date.
 */
export async function aggregateDailyMetrics(
  childId: string,
  date: Date
): Promise<void> {
  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setUTCHours(23, 59, 59, 999);
  
  const dateStr = startOfDay.toISOString().split('T')[0];
  
  logger.info(`Aggregating daily metrics for child ${childId} on ${dateStr}`);

  // Fetch all usage logs for the day
  const logs = await db
    .select()
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.childId, childId),
        gte(usageLogs.timestamp, startOfDay),
        lt(usageLogs.timestamp, endOfDay)
      )
    );

  if (logs.length === 0) {
    logger.info(`No usage logs found for child ${childId} on ${dateStr}`);
    // Still insert a zero-metrics row so we know we processed this day
    await upsertDailyMetrics(childId, dateStr, {
      totalTaps: 0,
      uniqueSymbols: 0,
      uniqueCategories: 0,
      sessionCount: 0,
      phrasesBuilt: 0,
      bulgarianTaps: 0,
      englishTaps: 0,
    });
    return;
  }

  // Compute metrics
  const uniqueSymbolIds = new Set(logs.map(l => l.symbolId));
  const sessionIds = new Set(logs.filter(l => l.sessionId).map(l => l.sessionId));
  
  // Hourly distribution
  const hourlyDistribution: HourlyDistribution = {};
  for (let i = 0; i < 24; i++) hourlyDistribution[i] = 0;
  logs.forEach(log => {
    const hour = new Date(log.timestamp).getUTCHours();
    hourlyDistribution[hour]++;
  });

  // Top symbols (top 10)
  const symbolCounts = new Map<string, number>();
  logs.forEach(log => {
    symbolCounts.set(log.symbolId, (symbolCounts.get(log.symbolId) || 0) + 1);
  });
  const topSymbols: TopSymbol[] = Array.from(symbolCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([symbolId, count]) => ({ symbolId, count }));

  // Find new symbols (first-time uses)
  const newSymbols = await findNewSymbols(childId, uniqueSymbolIds, startOfDay);

  // Build metrics object
  const metrics: Partial<NewDailyMetric> = {
    totalTaps: logs.length,
    uniqueSymbols: uniqueSymbolIds.size,
    uniqueCategories: 0, // TODO: Would need category lookup
    sessionCount: sessionIds.size,
    phrasesBuilt: 0, // TODO: Would need phrase detection logic
    bulgarianTaps: 0, // TODO: Would need language detection
    englishTaps: 0,
    hourlyDistribution: hourlyDistribution as unknown as Record<string, unknown>,
    topSymbols: topSymbols as unknown as Record<string, unknown>[],
    newSymbolsUsed: newSymbols as unknown as Record<string, unknown>[],
  };

  await upsertDailyMetrics(childId, dateStr, metrics);
  
  logger.info(`Aggregated daily metrics for child ${childId}: ${logs.length} taps, ${uniqueSymbolIds.size} unique symbols`);
}

/**
 * Upsert daily metrics (insert or update on conflict)
 */
async function upsertDailyMetrics(
  childId: string,
  date: string,
  metrics: Partial<NewDailyMetric>
): Promise<void> {
  await db
    .insert(dailyMetrics)
    .values({
      childId,
      date,
      ...metrics,
      computedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [dailyMetrics.childId, dailyMetrics.date],
      set: {
        ...metrics,
        computedAt: new Date(),
      },
    });
}

/**
 * Find symbols that were used for the first time
 */
async function findNewSymbols(
  childId: string,
  currentSymbolIds: Set<string>,
  beforeDate: Date
): Promise<string[]> {
  // Get all symbols used before this date
  const previousSymbols = await db
    .selectDistinct({ symbolId: usageLogs.symbolId })
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.childId, childId),
        lt(usageLogs.timestamp, beforeDate)
      )
    );

  const previousSymbolSet = new Set(previousSymbols.map(s => s.symbolId));
  
  return Array.from(currentSymbolIds).filter(id => !previousSymbolSet.has(id));
}

// ============================================================================
// WEEKLY METRICS AGGREGATION
// ============================================================================

/**
 * Aggregates daily metrics into weekly summary.
 * Should run on Sunday/Monday to summarize the previous week.
 */
export async function aggregateWeeklyMetrics(
  childId: string,
  weekStart: Date
): Promise<void> {
  // Ensure weekStart is a Monday at 00:00:00
  const monday = getMonday(weekStart);
  const weekStartStr = monday.toISOString().split('T')[0];
  const weekEndStr = new Date(monday.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  logger.info(`Aggregating weekly metrics for child ${childId}, week of ${weekStartStr}`);

  // Fetch daily metrics for the week
  const dailyData = await db
    .select()
    .from(dailyMetrics)
    .where(
      and(
        eq(dailyMetrics.childId, childId),
        gte(dailyMetrics.date, weekStartStr),
        lt(dailyMetrics.date, weekEndStr)
      )
    );

  if (dailyData.length === 0) {
    logger.info(`No daily metrics found for child ${childId} week of ${weekStartStr}`);
    return;
  }

  // Calculate weekly aggregates
  const totalTaps = dailyData.reduce((sum, d) => sum + (d.totalTaps || 0), 0);
  const activeDays = dailyData.filter(d => (d.totalTaps || 0) > 0).length;
  const avgDailyTaps = activeDays > 0 ? totalTaps / activeDays : 0;
  
  // Unique symbols across the week
  const allSymbols = new Set<string>();
  dailyData.forEach(d => {
    const top = d.topSymbols as TopSymbol[] | null;
    top?.forEach(s => allSymbols.add(s.symbolId));
  });
  
  // New symbols this week
  const newSymbolsCount = dailyData.reduce((sum, d) => {
    const newSymbols = d.newSymbolsUsed as string[] | null;
    return sum + (newSymbols?.length || 0);
  }, 0);

  // Peak usage hour (most common across the week)
  const hourTotals: number[] = Array(24).fill(0);
  dailyData.forEach(d => {
    const dist = d.hourlyDistribution as HourlyDistribution | null;
    if (dist) {
      Object.entries(dist).forEach(([hour, count]) => {
        hourTotals[parseInt(hour)] += count;
      });
    }
  });
  const peakUsageHour = hourTotals.indexOf(Math.max(...hourTotals));

  // Total sessions
  const totalSessions = dailyData.reduce((sum, d) => sum + (d.sessionCount || 0), 0);
  const avgSessionsPerDay = activeDays > 0 ? totalSessions / activeDays : 0;

  // Get previous week for comparison
  const prevWeekStart = new Date(monday.getTime() - 7 * 24 * 60 * 60 * 1000);
  const prevWeekData = await db
    .select()
    .from(weeklyMetrics)
    .where(
      and(
        eq(weeklyMetrics.childId, childId),
        eq(weeklyMetrics.weekStart, prevWeekStart.toISOString().split('T')[0])
      )
    )
    .limit(1);

  let tapChangePercent: number | null = null;
  let vocabularyChangePercent: number | null = null;
  
  if (prevWeekData.length > 0 && prevWeekData[0].totalTaps) {
    const prevTaps = prevWeekData[0].totalTaps;
    if (prevTaps > 0) {
      tapChangePercent = ((totalTaps - prevTaps) / prevTaps) * 100;
    }
    
    const prevVocab = prevWeekData[0].totalUniqueSymbols;
    if (prevVocab && prevVocab > 0) {
      vocabularyChangePercent = ((allSymbols.size - prevVocab) / prevVocab) * 100;
    }
  }

  // Upsert weekly metrics
  await db
    .insert(weeklyMetrics)
    .values({
      childId,
      weekStart: weekStartStr,
      totalTaps,
      avgDailyTaps: avgDailyTaps.toFixed(2),
      activeDays,
      totalUniqueSymbols: allSymbols.size,
      newSymbolsThisWeek: newSymbolsCount,
      avgSessionsPerDay: avgSessionsPerDay.toFixed(2),
      totalSessions,
      peakUsageHour,
      tapChangePercent: tapChangePercent?.toFixed(2) ?? null,
      vocabularyChangePercent: vocabularyChangePercent?.toFixed(2) ?? null,
      computedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [weeklyMetrics.childId, weeklyMetrics.weekStart],
      set: {
        totalTaps,
        avgDailyTaps: avgDailyTaps.toFixed(2),
        activeDays,
        totalUniqueSymbols: allSymbols.size,
        newSymbolsThisWeek: newSymbolsCount,
        avgSessionsPerDay: avgSessionsPerDay.toFixed(2),
        totalSessions,
        peakUsageHour,
        tapChangePercent: tapChangePercent?.toFixed(2) ?? null,
        vocabularyChangePercent: vocabularyChangePercent?.toFixed(2) ?? null,
        computedAt: new Date(),
      },
    });

  logger.info(`Aggregated weekly metrics for child ${childId}: ${totalTaps} taps, ${activeDays} active days`);
}

// ============================================================================
// BASELINE CALCULATION
// ============================================================================

/**
 * Calculate rolling baseline for a specific metric.
 * Uses a 28-day window with day-of-week adjustments.
 */
export async function calculateBaseline(
  childId: string,
  metricName: 'total_taps' | 'unique_symbols' | 'session_count'
): Promise<void> {
  const LOOKBACK_DAYS = 28;
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  logger.info(`Calculating ${metricName} baseline for child ${childId}`);

  // Fetch daily metrics for the lookback period
  const dailyData = await db
    .select()
    .from(dailyMetrics)
    .where(
      and(
        eq(dailyMetrics.childId, childId),
        gte(dailyMetrics.date, startDate.toISOString().split('T')[0]),
        lt(dailyMetrics.date, endDate.toISOString().split('T')[0])
      )
    )
    .orderBy(dailyMetrics.date);

  if (dailyData.length < 7) {
    logger.info(`Not enough data for baseline calculation (need 7 days, have ${dailyData.length})`);
    return;
  }

  // Extract the metric values
  const values = dailyData.map(d => {
    switch (metricName) {
      case 'total_taps': return d.totalTaps || 0;
      case 'unique_symbols': return d.uniqueSymbols || 0;
      case 'session_count': return d.sessionCount || 0;
    }
  });

  // Calculate statistics
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const sortedValues = [...values].sort((a, b) => a - b);
  const median = sortedValues[Math.floor(sortedValues.length / 2)];
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  // Calculate day-of-week factors
  const dayOfWeekSums: Record<string, number[]> = {
    mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: []
  };
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  
  dailyData.forEach(d => {
    const date = new Date(d.date);
    const dayName = dayNames[date.getUTCDay()];
    const value = metricName === 'total_taps' ? d.totalTaps || 0 :
                  metricName === 'unique_symbols' ? d.uniqueSymbols || 0 :
                  d.sessionCount || 0;
    dayOfWeekSums[dayName].push(value);
  });

  const dayOfWeekFactors: DayOfWeekFactors = {} as DayOfWeekFactors;
  Object.entries(dayOfWeekSums).forEach(([day, vals]) => {
    if (vals.length > 0 && mean > 0) {
      const dayMean = vals.reduce((a, b) => a + b, 0) / vals.length;
      (dayOfWeekFactors as Record<string, number>)[day] = dayMean / mean;
    } else {
      (dayOfWeekFactors as Record<string, number>)[day] = 1;
    }
  });

  // Upsert baseline
  await db
    .insert(metricBaselines)
    .values({
      childId,
      metricName,
      mean: mean.toFixed(4),
      median: median.toFixed(4),
      stdDev: stdDev.toFixed(4),
      min: minValue.toFixed(4),
      max: maxValue.toFixed(4),
      dayOfWeekFactors: dayOfWeekFactors as unknown as Record<string, unknown>,
      sampleDays: dailyData.length,
      periodStart: startDate.toISOString().split('T')[0],
      periodEnd: endDate.toISOString().split('T')[0],
      computedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [metricBaselines.childId, metricBaselines.metricName],
      set: {
        mean: mean.toFixed(4),
        median: median.toFixed(4),
        stdDev: stdDev.toFixed(4),
        min: minValue.toFixed(4),
        max: maxValue.toFixed(4),
        dayOfWeekFactors: dayOfWeekFactors as unknown as Record<string, unknown>,
        sampleDays: dailyData.length,
        periodStart: startDate.toISOString().split('T')[0],
        periodEnd: endDate.toISOString().split('T')[0],
        computedAt: new Date(),
      },
    });

  logger.info(`Calculated baseline for ${metricName}: mean=${mean.toFixed(2)}, stdDev=${stdDev.toFixed(2)}`);
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Run daily aggregation for all children.
 * Typically called by a scheduled job at 6am.
 */
export async function runDailyAggregationJob(date?: Date): Promise<void> {
  const targetDate = date || new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday by default
  
  logger.info(`Starting daily aggregation job for ${targetDate.toISOString().split('T')[0]}`);

  // Get all children
  const allChildren = await db.select({ id: children.id }).from(children);
  
  logger.info(`Processing ${allChildren.length} children`);

  for (const child of allChildren) {
    try {
      await aggregateDailyMetrics(child.id, targetDate);
    } catch (error) {
      logger.error(`Failed to aggregate daily metrics for child ${child.id}:`, error);
    }
  }

  logger.info('Daily aggregation job complete');
}

/**
 * Run weekly aggregation for all children.
 * Typically called on Sunday at 8am.
 */
export async function runWeeklyAggregationJob(weekStart?: Date): Promise<void> {
  const targetWeek = weekStart || getMonday(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  
  logger.info(`Starting weekly aggregation job for week of ${targetWeek.toISOString().split('T')[0]}`);

  const allChildren = await db.select({ id: children.id }).from(children);

  for (const child of allChildren) {
    try {
      await aggregateWeeklyMetrics(child.id, targetWeek);
      // Also update baselines
      await calculateBaseline(child.id, 'total_taps');
      await calculateBaseline(child.id, 'unique_symbols');
      await calculateBaseline(child.id, 'session_count');
    } catch (error) {
      logger.error(`Failed to aggregate weekly metrics for child ${child.id}:`, error);
    }
  }

  logger.info('Weekly aggregation job complete');
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Get the Monday of the week containing the given date
 */
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setUTCDate(diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export const metricsAggregator = {
  aggregateDailyMetrics,
  aggregateWeeklyMetrics,
  calculateBaseline,
  runDailyAggregationJob,
  runWeeklyAggregationJob,
};
