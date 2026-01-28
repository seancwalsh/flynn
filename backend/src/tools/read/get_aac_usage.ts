/**
 * get_aac_usage Tool
 * 
 * Get AAC symbol usage statistics for a child.
 * This tool uses the real usageLogs table to provide actual usage data.
 */

import { z } from "zod/v4";
import { eq, and, gte, lte, sql, count, countDistinct, desc, asc } from "drizzle-orm";
import { createReadOnlyTool } from "@/services/tool-executor";
import type { ToolContext } from "@/types/claude";
import { verifyChildAccess } from "../authorization";

// ============================================================================
// Types
// ============================================================================

export type GroupBy = "day" | "week" | "symbol" | "category";

export interface AACUsageResult {
  childId: string;
  period: {
    startDate: string;
    endDate: string;
  };
  summary: UsageSummary;
  breakdown: UsageBreakdown[];
  topSymbols: SymbolUsage[];
  trends: UsageTrend;
}

export interface UsageSummary {
  totalSelections: number;
  uniqueSymbols: number;
  averageSelectionsPerDay: number;
  activeDays: number;
}

export interface UsageBreakdown {
  label: string; // Date, week label, symbol name, or category
  count: number;
  uniqueSymbols?: number; // Only for day/week grouping
}

export interface SymbolUsage {
  symbolId: string;
  count: number;
  lastUsedAt: string;
  // Symbol metadata available after iOS CloudKit sync:
  // symbolName?: string;
  // category?: string;
  // imageUrl?: string;
}

export interface UsageTrend {
  direction: "increasing" | "decreasing" | "stable";
  percentChange: number;
  comparisonPeriod: string;
}

// ============================================================================
// Input Schema
// ============================================================================

const inputSchema = z.object({
  childId: z.uuid("Invalid child ID format"),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
  groupBy: z.enum(["day", "week", "symbol", "category"]).optional().default("day"),
});

type GetAACUsageInput = z.infer<typeof inputSchema>;

// ============================================================================
// Tool Implementation
// ============================================================================

async function getAACUsage(
  input: GetAACUsageInput,
  context: ToolContext
): Promise<AACUsageResult> {
  // Verify access
  await verifyChildAccess(input.childId, context);

  const { db } = await import("@/db");
  const { usageLogs } = await import("@/db/schema");

  // Calculate date range (default to last 30 days)
  const endDate = input.endDate 
    ? new Date(input.endDate + "T23:59:59.999Z")
    : new Date();
  const startDate = input.startDate
    ? new Date(input.startDate + "T00:00:00.000Z")
    : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Build base query conditions
  const conditions = [
    eq(usageLogs.childId, input.childId),
    gte(usageLogs.timestamp, startDate),
    lte(usageLogs.timestamp, endDate),
  ];

  // Get summary statistics
  const [summaryResult] = await db
    .select({
      totalSelections: count(usageLogs.id),
      uniqueSymbols: countDistinct(usageLogs.symbolId),
    })
    .from(usageLogs)
    .where(and(...conditions)) as [{ totalSelections: number; uniqueSymbols: number }];

  // Get active days count
  const activeDaysResult = await db
    .select({
      day: sql<string>`date_trunc('day', ${usageLogs.timestamp})`.as("day"),
    })
    .from(usageLogs)
    .where(and(...conditions))
    .groupBy(sql`date_trunc('day', ${usageLogs.timestamp})`) as Array<{ day: string }>;

  const activeDays = activeDaysResult.length;
  const daySpan = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
  const averageSelectionsPerDay = summaryResult.totalSelections / daySpan;

  // Get breakdown based on groupBy parameter
  const breakdown = await getBreakdown(
    db,
    usageLogs,
    conditions,
    input.groupBy ?? "day"
  );

  // Get top symbols
  const topSymbolsResult = await db
    .select({
      symbolId: usageLogs.symbolId,
      count: count(usageLogs.id),
      lastUsedAt: sql<Date>`max(${usageLogs.timestamp})`.as("last_used"),
    })
    .from(usageLogs)
    .where(and(...conditions))
    .groupBy(usageLogs.symbolId)
    .orderBy(desc(count(usageLogs.id)))
    .limit(10) as Array<{
      symbolId: string;
      count: number;
      lastUsedAt: Date;
    }>;

  const topSymbols: SymbolUsage[] = topSymbolsResult.map((s) => ({
    symbolId: s.symbolId,
    count: s.count,
    lastUsedAt: s.lastUsedAt ? new Date(s.lastUsedAt).toISOString() : new Date().toISOString(),
  }));

  // Calculate trend (compare first half vs second half of period)
  const trend = await calculateTrend(db, usageLogs, input.childId, startDate, endDate);

  return {
    childId: input.childId,
    period: {
      startDate: startDate.toISOString().split("T")[0] as string,
      endDate: endDate.toISOString().split("T")[0] as string,
    },
    summary: {
      totalSelections: summaryResult.totalSelections,
      uniqueSymbols: summaryResult.uniqueSymbols,
      averageSelectionsPerDay: Math.round(averageSelectionsPerDay * 10) / 10,
      activeDays,
    },
    breakdown,
    topSymbols,
    trends: trend,
  };
}

/**
 * Get usage breakdown based on groupBy parameter
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getBreakdown(
  db: any,
  usageLogs: any,
  conditions: any[],
  groupBy: GroupBy
): Promise<UsageBreakdown[]> {
  if (groupBy === "day") {
    const result = await db
      .select({
        label: sql<string>`to_char(date_trunc('day', ${usageLogs.timestamp}), 'YYYY-MM-DD')`.as("label"),
        count: count(usageLogs.id),
        uniqueSymbols: countDistinct(usageLogs.symbolId),
      })
      .from(usageLogs)
      .where(and(...conditions))
      .groupBy(sql`date_trunc('day', ${usageLogs.timestamp})`)
      .orderBy(asc(sql`date_trunc('day', ${usageLogs.timestamp})`)) as Array<{
        label: string;
        count: number;
        uniqueSymbols: number;
      }>;

    return result.map((r) => ({
      label: r.label,
      count: r.count,
      uniqueSymbols: r.uniqueSymbols,
    }));
  }

  if (groupBy === "week") {
    const result = await db
      .select({
        label: sql<string>`to_char(date_trunc('week', ${usageLogs.timestamp}), 'YYYY-"W"IW')`.as("label"),
        count: count(usageLogs.id),
        uniqueSymbols: countDistinct(usageLogs.symbolId),
      })
      .from(usageLogs)
      .where(and(...conditions))
      .groupBy(sql`date_trunc('week', ${usageLogs.timestamp})`)
      .orderBy(asc(sql`date_trunc('week', ${usageLogs.timestamp})`)) as Array<{
        label: string;
        count: number;
        uniqueSymbols: number;
      }>;

    return result.map((r) => ({
      label: r.label,
      count: r.count,
      uniqueSymbols: r.uniqueSymbols,
    }));
  }

  if (groupBy === "symbol") {
    const result = await db
      .select({
        label: usageLogs.symbolId,
        count: count(usageLogs.id),
      })
      .from(usageLogs)
      .where(and(...conditions))
      .groupBy(usageLogs.symbolId)
      .orderBy(desc(count(usageLogs.id)))
      .limit(50) as Array<{ label: string; count: number }>;

    return result;
  }

  // groupBy === "category"
  // Category grouping requires symbols table sync from iOS CloudKit
  // For now, extract category from symbolId if it contains a prefix
  const result = await db
    .select({
      symbolId: usageLogs.symbolId,
      count: count(usageLogs.id),
    })
    .from(usageLogs)
    .where(and(...conditions))
    .groupBy(usageLogs.symbolId) as Array<{ symbolId: string; count: number }>;

  // Group by category prefix (e.g., "food-apple" -> "food")
  const categoryMap = new Map<string, number>();
  for (const row of result) {
    const category = extractCategory(row.symbolId);
    categoryMap.set(category, (categoryMap.get(category) ?? 0) + row.count);
  }

  return Array.from(categoryMap.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Extract category from symbol ID (placeholder logic)
 */
function extractCategory(symbolId: string): string {
  // If symbol ID has a prefix like "food-apple" or "action-run", extract it
  const parts = symbolId.split("-");
  if (parts.length >= 2) {
    return parts[0] as string;
  }
  return "uncategorized";
}

/**
 * Calculate usage trend comparing periods
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function calculateTrend(
  db: any,
  usageLogs: any,
  childId: string,
  startDate: Date,
  endDate: Date
): Promise<UsageTrend> {
  const midPoint = new Date((startDate.getTime() + endDate.getTime()) / 2);

  // Count for first half
  const [firstHalf] = await db
    .select({ count: count(usageLogs.id) })
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.childId, childId),
        gte(usageLogs.timestamp, startDate),
        lte(usageLogs.timestamp, midPoint)
      )
    ) as [{ count: number }];

  // Count for second half
  const [secondHalf] = await db
    .select({ count: count(usageLogs.id) })
    .from(usageLogs)
    .where(
      and(
        eq(usageLogs.childId, childId),
        gte(usageLogs.timestamp, midPoint),
        lte(usageLogs.timestamp, endDate)
      )
    ) as [{ count: number }];

  const firstCount = firstHalf.count;
  const secondCount = secondHalf.count;

  let direction: "increasing" | "decreasing" | "stable" = "stable";
  let percentChange = 0;

  if (firstCount > 0) {
    percentChange = Math.round(((secondCount - firstCount) / firstCount) * 100);
    
    if (percentChange > 10) {
      direction = "increasing";
    } else if (percentChange < -10) {
      direction = "decreasing";
    }
  } else if (secondCount > 0) {
    direction = "increasing";
    percentChange = 100;
  }

  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));

  return {
    direction,
    percentChange,
    comparisonPeriod: `First ${Math.floor(daysDiff / 2)} days vs last ${Math.ceil(daysDiff / 2)} days`,
  };
}

// ============================================================================
// Export
// ============================================================================

export const getAACUsageTool = createReadOnlyTool(
  "get_aac_usage",
  "Get AAC symbol usage statistics for a child, including total selections, unique symbols, top used symbols, and trends. Supports grouping by day, week, symbol, or category. Use this to understand communication patterns and vocabulary growth.",
  inputSchema,
  getAACUsage
);
