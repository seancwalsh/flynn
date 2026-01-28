/**
 * list_goals Tool
 * 
 * List therapy goals for a child with optional status filtering.
 */

import { z } from "zod/v4";
import { createReadOnlyTool } from "@/services/tool-executor";
import type { ToolContext } from "@/types/claude";
import { verifyChildAccess } from "../authorization";
import { db } from "../../db";
import { goals } from "../../db/schema";
import { eq, and } from "drizzle-orm";

// ============================================================================
// Types
// ============================================================================

export type GoalStatus = "active" | "completed" | "paused" | "all";
export type TherapyType = "ABA" | "OT" | "SLP" | "other";

export interface Goal {
  id: string;
  childId: string;
  name: string;
  description: string;
  targetDescription: string;
  
  // Categorization
  therapyType: TherapyType;
  status: Exclude<GoalStatus, "all">;
  
  // Progress tracking
  targetValue: number;
  currentValue: number;
  progressPercent: number;
  
  // Dates
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  
  // Related data
  lastSessionDate: string | null;
  totalSessionsAddressed: number;
}

export interface ListGoalsResult {
  goals: Goal[];
  totalCount: number;
  countByStatus: {
    active: number;
    completed: number;
    paused: number;
  };
}

// ============================================================================
// Input Schema
// ============================================================================

const inputSchema = z.object({
  childId: z.uuid("Invalid child ID format"),
  status: z.enum(["active", "completed", "paused", "all"]).optional().default("all"),
});

type ListGoalsInput = z.infer<typeof inputSchema>;

// ============================================================================
// Tool Implementation
// ============================================================================

async function listGoals(
  input: ListGoalsInput,
  context: ToolContext
): Promise<ListGoalsResult> {
  // Verify access
  await verifyChildAccess(input.childId, context);

  // Query goals from database
  const conditions = [eq(goals.childId, input.childId)];
  
  if (input.status && input.status !== "all") {
    conditions.push(eq(goals.status, input.status));
  }

  const dbGoals = await db
    .select()
    .from(goals)
    .where(and(...conditions))
    .orderBy(goals.createdAt);

  // Get all goals for counting (regardless of filter)
  const allDbGoals = await db
    .select()
    .from(goals)
    .where(eq(goals.childId, input.childId));

  // Map to expected format
  const mappedGoals: Goal[] = dbGoals.map(g => ({
    id: g.id,
    childId: g.childId,
    name: g.title,
    description: g.description ?? "",
    targetDescription: g.description ?? "",
    therapyType: (g.therapyType?.toUpperCase() ?? "other") as TherapyType,
    status: g.status as Exclude<GoalStatus, "all">,
    targetValue: 100,
    currentValue: g.progressPercent ?? 0,
    progressPercent: g.progressPercent ?? 0,
    targetDate: g.targetDate,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
    completedAt: null,
    lastSessionDate: null,
    totalSessionsAddressed: 0,
  }));

  // Calculate counts
  const countByStatus = {
    active: allDbGoals.filter(g => g.status === "active").length,
    completed: allDbGoals.filter(g => g.status === "achieved").length,
    paused: allDbGoals.filter(g => g.status === "paused").length,
  };

  return {
    goals: mappedGoals,
    totalCount: mappedGoals.length,
    countByStatus,
  };
}

// ============================================================================
// Export
// ============================================================================

export const listGoalsTool = createReadOnlyTool(
  "list_goals",
  "List therapy goals for a child with optional status filtering (active, completed, paused, or all). Returns goal details including target description, current progress percentage, therapy type (ABA, OT, SLP), and related session information. Use this to understand what the child is working on and their progress.",
  inputSchema,
  listGoals
);
