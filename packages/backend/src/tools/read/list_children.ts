/**
 * list_children Tool
 * 
 * List all children the user has access to with basic summary statistics.
 */

import { z } from "zod/v4";
import { eq, inArray, sql, count, countDistinct } from "drizzle-orm";
import { createReadOnlyTool } from "@/services/tool-executor";
import type { ToolContext } from "@/types/claude";
import { getAccessibleChildIds } from "../authorization";
import { UserIdRequiredError } from "../errors";

// ============================================================================
// Types
// ============================================================================

export interface ChildSummary {
  id: string;
  name: string;
  birthDate: string | null;
  ageInMonths: number | null;
  familyId: string;
  familyName: string;
  
  // Quick stats
  totalUsageLogs: number;
  uniqueSymbolsUsed: number;
  lastActivityAt: string | null;
}

export interface ListChildrenResult {
  children: ChildSummary[];
  totalCount: number;
}

// ============================================================================
// Input Schema
// ============================================================================

const inputSchema = z.object({
  // No input needed - returns all accessible children
});

type ListChildrenInput = z.infer<typeof inputSchema>;

// ============================================================================
// Tool Implementation
// ============================================================================

async function listChildren(
  _input: ListChildrenInput,
  context: ToolContext
): Promise<ListChildrenResult> {
  if (!context.userId) {
    throw new UserIdRequiredError();
  }

  const { db } = await import("@/db");
  const { children, families, usageLogs } = await import("@/db/schema");

  // Get all child IDs the user can access
  const accessibleChildIds = await getAccessibleChildIds(context);

  if (accessibleChildIds.length === 0) {
    return { children: [], totalCount: 0 };
  }

  // Fetch children with family info
  const childrenWithFamily = await db
    .select({
      id: children.id,
      name: children.name,
      birthDate: children.birthDate,
      familyId: children.familyId,
      createdAt: children.createdAt,
      familyName: families.name,
    })
    .from(children)
    .innerJoin(families, eq(children.familyId, families.id))
    .where(inArray(children.id, accessibleChildIds)) as Array<{
      id: string;
      name: string;
      birthDate: string | null;
      familyId: string;
      createdAt: Date;
      familyName: string;
    }>;

  // Get usage statistics for each child
  // Using a subquery to get stats in one query
  const usageStats = await db
    .select({
      childId: usageLogs.childId,
      totalLogs: count(usageLogs.id),
      uniqueSymbols: countDistinct(usageLogs.symbolId),
      lastActivity: sql<Date>`max(${usageLogs.timestamp})`.as("last_activity"),
    })
    .from(usageLogs)
    .where(inArray(usageLogs.childId, accessibleChildIds))
    .groupBy(usageLogs.childId) as Array<{
      childId: string;
      totalLogs: number;
      uniqueSymbols: number;
      lastActivity: Date | null;
    }>;

  // Create a map for easy lookup
  const statsMap = new Map(usageStats.map((s) => [s.childId, s]));

  // Calculate age and assemble results
  const today = new Date();
  
  const results: ChildSummary[] = childrenWithFamily.map((child) => {
    const stats = statsMap.get(child.id);
    
    // Calculate age in months
    let ageInMonths: number | null = null;
    if (child.birthDate) {
      const birthDate = new Date(child.birthDate);
      ageInMonths = Math.floor(
        (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
      );
    }

    return {
      id: child.id,
      name: child.name,
      birthDate: child.birthDate,
      ageInMonths,
      familyId: child.familyId,
      familyName: child.familyName,
      totalUsageLogs: stats?.totalLogs ?? 0,
      uniqueSymbolsUsed: stats?.uniqueSymbols ?? 0,
      lastActivityAt: stats?.lastActivity ? new Date(stats.lastActivity).toISOString() : null,
    };
  });

  // Sort by name for consistent output
  results.sort((a, b) => a.name.localeCompare(b.name));

  return {
    children: results,
    totalCount: results.length,
  };
}

// ============================================================================
// Export
// ============================================================================

export const listChildrenTool = createReadOnlyTool(
  "list_children",
  "List all children you have access to, with basic statistics for each. Use this to see which children you can help with and get an overview of their activity levels.",
  inputSchema,
  listChildren
);
