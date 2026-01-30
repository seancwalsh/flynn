/**
 * get_progress_summary Tool
 * 
 * Get progress metrics and trends for a child over a specified period.
 * Combines AAC usage data with goals and session information.
 */

import { z } from "zod/v4";
import { eq, and, gte, lte, sql, count, countDistinct } from "drizzle-orm";
import { createReadOnlyTool } from "@/services/tool-executor";
import type { ToolContext } from "@/types/claude";
import { verifyChildAccess } from "../authorization";

// ============================================================================
// Types
// ============================================================================

export type Period = "week" | "month" | "quarter" | "year";

export interface ProgressSummary {
  childId: string;
  childName: string;
  period: Period;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  
  // AAC Usage Progress
  aacProgress: AACProgress;
  
  // Goals Progress (mock until goals table exists)
  goalsProgress: GoalsProgress;
  
  // Session Metrics (mock until sessions table exists)
  sessionMetrics: SessionMetrics;
  
  // Milestones achieved
  milestones: Milestone[];
  
  // Overall summary for quick understanding
  overallSummary: string;
  
  // Flag for mock data
  _partiallyMock: boolean;
}

export interface AACProgress {
  totalSelections: number;
  previousPeriodSelections: number;
  percentChange: number;
  
  uniqueSymbols: number;
  previousPeriodUniqueSymbols: number;
  newSymbolsLearned: number;
  
  averageSelectionsPerDay: number;
  mostActiveDay: string | null;
  mostUsedSymbols: Array<{ symbolId: string; count: number }>;
  
  vocabularyGrowthRate: number; // New symbols per week
}

export interface GoalsProgress {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  
  // Average progress across active goals
  averageProgress: number;
  
  // Goals with most improvement
  topImproving: Array<{
    goalId: string;
    goalName: string;
    progressChange: number;
  }>;
  
  // Note: This is mock data
  _mock: boolean;
}

export interface SessionMetrics {
  totalSessions: number;
  totalMinutes: number;
  
  sessionsByType: Array<{
    type: string;
    count: number;
    totalMinutes: number;
  }>;
  
  averageSessionsPerWeek: number;
  
  // Note: This is mock data
  _mock: boolean;
}

export interface Milestone {
  id: string;
  type: "vocabulary" | "usage" | "goal" | "streak";
  title: string;
  description: string;
  achievedAt: string;
}

// ============================================================================
// Input Schema
// ============================================================================

const inputSchema = z.object({
  childId: z.uuid("Invalid child ID format"),
  period: z.enum(["week", "month", "quarter", "year"]),
});

type GetProgressSummaryInput = z.infer<typeof inputSchema>;

// ============================================================================
// Period Calculation
// ============================================================================

function getPeriodDates(period: Period): { start: Date; end: Date; previousStart: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  
  let start: Date;
  let previousStart: Date;
  
  switch (period) {
    case "week":
      start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
      previousStart = new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      previousStart = new Date(start.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "quarter":
      start = new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);
      previousStart = new Date(start.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "year":
      start = new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000);
      previousStart = new Date(start.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
  }
  
  start.setHours(0, 0, 0, 0);
  previousStart.setHours(0, 0, 0, 0);
  
  return { start, end, previousStart };
}

// ============================================================================
// Tool Implementation
// ============================================================================

async function getProgressSummary(
  input: GetProgressSummaryInput,
  context: ToolContext
): Promise<ProgressSummary> {
  // Verify access
  await verifyChildAccess(input.childId, context);

  const { db } = await import("@/db");
  const { children, usageLogs } = await import("@/db/schema");

  // Get child info
  const child = await db.query.children.findFirst({
    where: eq(children.id, input.childId),
    columns: { name: true },
  }) as { name: string } | undefined;

  const childName = child?.name ?? "Unknown";

  // Calculate date ranges
  const { start, end, previousStart } = getPeriodDates(input.period);

  // Get AAC progress data
  const aacProgress = await calculateAACProgress(
    db,
    usageLogs,
    input.childId,
    start,
    end,
    previousStart,
    input.period
  );

  // Mock goals progress (until goals table exists)
  const goalsProgress = generateMockGoalsProgress();

  // Mock session metrics (until sessions table exists)
  const sessionMetrics = generateMockSessionMetrics(input.period);

  // Calculate milestones
  const milestones = calculateMilestones(aacProgress, goalsProgress, input.period);

  // Generate overall summary
  const overallSummary = generateOverallSummary(
    childName,
    input.period,
    aacProgress,
    goalsProgress
  );

  return {
    childId: input.childId,
    childName,
    period: input.period,
    dateRange: {
      startDate: start.toISOString().split("T")[0] as string,
      endDate: end.toISOString().split("T")[0] as string,
    },
    aacProgress,
    goalsProgress,
    sessionMetrics,
    milestones,
    overallSummary,
    _partiallyMock: true, // Goals and sessions are mock data
  };
}

/**
 * Calculate AAC usage progress (real data)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function calculateAACProgress(
  db: any,
  usageLogs: any,
  childId: string,
  start: Date,
  end: Date,
  previousStart: Date,
  _period: Period
): Promise<AACProgress> {
  // Current period stats
  const [currentStats] = await db
    .select({
      total: count(usageLogs.id),
      unique: countDistinct(usageLogs.symbolId),
    })
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.childId, childId),
        gte(usageLogs.timestamp, start),
        lte(usageLogs.timestamp, end)
      )
    ) as [{ total: number; unique: number }];

  // Previous period stats
  const [previousStats] = await db
    .select({
      total: count(usageLogs.id),
      unique: countDistinct(usageLogs.symbolId),
    })
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.childId, childId),
        gte(usageLogs.timestamp, previousStart),
        lte(usageLogs.timestamp, start)
      )
    ) as [{ total: number; unique: number }];

  // Get symbols used in current period but not in previous
  const currentSymbols = await db
    .select({ symbolId: usageLogs.symbolId })
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.childId, childId),
        gte(usageLogs.timestamp, start),
        lte(usageLogs.timestamp, end)
      )
    )
    .groupBy(usageLogs.symbolId) as Array<{ symbolId: string }>;

  const previousSymbols = await db
    .select({ symbolId: usageLogs.symbolId })
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.childId, childId),
        gte(usageLogs.timestamp, previousStart),
        lte(usageLogs.timestamp, start)
      )
    )
    .groupBy(usageLogs.symbolId) as Array<{ symbolId: string }>;

  const previousSymbolSet = new Set(previousSymbols.map((s) => s.symbolId));
  const newSymbols = currentSymbols.filter((s) => !previousSymbolSet.has(s.symbolId));

  // Most active day
  const dailyActivity = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${usageLogs.timestamp}), 'YYYY-MM-DD')`.as("day"),
      count: count(usageLogs.id),
    })
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.childId, childId),
        gte(usageLogs.timestamp, start),
        lte(usageLogs.timestamp, end)
      )
    )
    .groupBy(sql`date_trunc('day', ${usageLogs.timestamp})`)
    .orderBy(sql`count(${usageLogs.id}) desc`)
    .limit(1) as Array<{ day: string; count: number }>;

  // Top symbols
  const topSymbols = await db
    .select({
      symbolId: usageLogs.symbolId,
      count: count(usageLogs.id),
    })
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.childId, childId),
        gte(usageLogs.timestamp, start),
        lte(usageLogs.timestamp, end)
      )
    )
    .groupBy(usageLogs.symbolId)
    .orderBy(sql`count(${usageLogs.id}) desc`)
    .limit(5) as Array<{ symbolId: string; count: number }>;

  // Calculate days in period
  const daysInPeriod = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  const weeksInPeriod = daysInPeriod / 7;

  // Calculate percent change
  const percentChange = previousStats.total > 0
    ? Math.round(((currentStats.total - previousStats.total) / previousStats.total) * 100)
    : currentStats.total > 0 ? 100 : 0;

  return {
    totalSelections: currentStats.total,
    previousPeriodSelections: previousStats.total,
    percentChange,
    
    uniqueSymbols: currentStats.unique,
    previousPeriodUniqueSymbols: previousStats.unique,
    newSymbolsLearned: newSymbols.length,
    
    averageSelectionsPerDay: Math.round((currentStats.total / daysInPeriod) * 10) / 10,
    mostActiveDay: dailyActivity[0]?.day ?? null,
    mostUsedSymbols: topSymbols,
    
    vocabularyGrowthRate: Math.round((newSymbols.length / weeksInPeriod) * 10) / 10,
  };
}

/**
 * Generate mock goals progress
 */
function generateMockGoalsProgress(): GoalsProgress {
  return {
    totalGoals: 6,
    activeGoals: 4,
    completedGoals: 2,
    averageProgress: 58,
    topImproving: [
      {
        goalId: "goal-1",
        goalName: "Request preferred items",
        progressChange: 15,
      },
      {
        goalId: "goal-2",
        goalName: "Respond to greetings",
        progressChange: 10,
      },
    ],
    _mock: true,
  };
}

/**
 * Generate mock session metrics
 */
function generateMockSessionMetrics(period: Period): SessionMetrics {
  const multiplier = { week: 1, month: 4, quarter: 13, year: 52 }[period];
  
  return {
    totalSessions: 3 * multiplier,
    totalMinutes: 45 * 3 * multiplier,
    sessionsByType: [
      { type: "ABA", count: 2 * multiplier, totalMinutes: 60 * 2 * multiplier },
      { type: "SLP", count: 1 * multiplier, totalMinutes: 45 * multiplier },
    ],
    averageSessionsPerWeek: 3,
    _mock: true,
  };
}

/**
 * Calculate milestones based on progress data
 */
function calculateMilestones(
  aacProgress: AACProgress,
  _goalsProgress: GoalsProgress,
  period: Period
): Milestone[] {
  const milestones: Milestone[] = [];
  const today = new Date().toISOString();

  // Vocabulary milestones
  if (aacProgress.uniqueSymbols >= 100) {
    milestones.push({
      id: "vocab-100",
      type: "vocabulary",
      title: "100 Symbol Vocabulary!",
      description: `${aacProgress.uniqueSymbols} unique symbols in communication repertoire`,
      achievedAt: today,
    });
  } else if (aacProgress.uniqueSymbols >= 50) {
    milestones.push({
      id: "vocab-50",
      type: "vocabulary",
      title: "50 Symbol Milestone",
      description: "Building a solid vocabulary foundation",
      achievedAt: today,
    });
  }

  // Growth milestone
  if (aacProgress.newSymbolsLearned >= 10) {
    milestones.push({
      id: `new-symbols-${period}`,
      type: "vocabulary",
      title: `${aacProgress.newSymbolsLearned} New Symbols!`,
      description: `Learned ${aacProgress.newSymbolsLearned} new symbols this ${period}`,
      achievedAt: today,
    });
  }

  // Usage increase milestone
  if (aacProgress.percentChange >= 25) {
    milestones.push({
      id: `usage-increase-${period}`,
      type: "usage",
      title: "Communication Surge!",
      description: `${aacProgress.percentChange}% increase in AAC usage compared to previous ${period}`,
      achievedAt: today,
    });
  }

  return milestones;
}

/**
 * Generate human-readable overall summary
 */
function generateOverallSummary(
  childName: string,
  period: Period,
  aacProgress: AACProgress,
  goalsProgress: GoalsProgress
): string {
  const parts: string[] = [];

  // AAC usage summary
  if (aacProgress.totalSelections > 0) {
    const trend = aacProgress.percentChange > 0 
      ? `up ${aacProgress.percentChange}%` 
      : aacProgress.percentChange < 0 
        ? `down ${Math.abs(aacProgress.percentChange)}%`
        : "steady";
    
    parts.push(
      `This ${period}, ${childName} made ${aacProgress.totalSelections} symbol selections (${trend} from last ${period}).`
    );

    if (aacProgress.newSymbolsLearned > 0) {
      parts.push(`They learned ${aacProgress.newSymbolsLearned} new symbols!`);
    }
  } else {
    parts.push(`No AAC usage recorded for ${childName} this ${period}.`);
  }

  // Goals summary (mock)
  if (goalsProgress.activeGoals > 0) {
    parts.push(
      `Progress on ${goalsProgress.activeGoals} active goals averages ${goalsProgress.averageProgress}%.`
    );
  }

  return parts.join(" ");
}

// ============================================================================
// Export
// ============================================================================

export const getProgressSummaryTool = createReadOnlyTool(
  "get_progress_summary",
  "Get a comprehensive progress summary for a child including AAC usage growth, goals progress, session frequency, and achieved milestones. Available periods: week, month, quarter, or year. Use this for progress reports and identifying trends.",
  inputSchema,
  getProgressSummary
);
