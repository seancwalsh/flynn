/**
 * update_goal Tool
 *
 * Update goal status or details.
 *
 * NOTE: The goals table doesn't exist yet. This implementation returns
 * mock data and is structured to work correctly once the table is created.
 *
 * TODO: Create goals table (see create_goal.ts for schema)
 */

import { z } from "zod/v4";
import type { Tool, ToolContext, ToolResult } from "@/types/claude";
import { GoalNotFoundError, UnauthorizedError } from "../errors";

// ============================================================================
// Types
// ============================================================================

export type GoalType = "ABA" | "OT" | "SLP" | "communication" | "other";
export type GoalStatus = "active" | "completed" | "paused";

export interface UpdatedGoal {
  id: string;
  childId: string;
  type: GoalType;
  title: string;
  description: string | null;
  targetDate: string | null;
  criteria: string | null;
  status: GoalStatus;
  progress: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _mock: boolean;
}

// ============================================================================
// Input Schema
// ============================================================================

const inputSchema = z.object({
  goalId: z.uuid("Invalid goal ID format"),
  status: z.enum(["active", "completed", "paused"]).optional(),
  progress: z
    .number()
    .int("Progress must be a whole number")
    .min(0, "Progress cannot be negative")
    .max(100, "Progress cannot exceed 100%")
    .optional(),
  notes: z
    .string()
    .max(2000, "Notes cannot exceed 2,000 characters")
    .optional(),
});

type UpdateGoalInput = z.infer<typeof inputSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Mock function to get goal by ID
 * TODO: Replace with actual database query
 */
async function getGoalById(
  goalId: string,
  context: ToolContext
): Promise<{
  childId: string;
  familyId: string;
  type: GoalType;
  title: string;
  status: GoalStatus;
  progress: number;
} | null> {
  // In real implementation:
  // const { db } = await import("@/db");
  // const { goals, children } = await import("@/db/schema");
  //
  // const goal = await db.query.goals.findFirst({
  //   where: eq(goals.id, goalId),
  //   with: { child: { columns: { familyId: true } } }
  // });

  // For mock, we accept any goal ID and simulate finding a goal
  // if the user has a familyId in their context
  if (context.familyId) {
    return {
      childId: "mock-child-id",
      familyId: context.familyId,
      type: "ABA",
      title: "Sample Goal",
      status: "active",
      progress: 50,
    };
  }
  // If no familyId in context, return null to simulate goal not found
  return null;
}

/**
 * Verify user has access to a goal through its child
 */
async function verifyGoalAccess(
  goalId: string,
  context: ToolContext
): Promise<{
  childId: string;
  familyId: string;
  type: GoalType;
  title: string;
  status: GoalStatus;
  progress: number;
}> {
  if (!context.userId) {
    throw new UnauthorizedError("User ID is required");
  }

  const goal = await getGoalById(goalId, context);

  if (!goal) {
    throw new GoalNotFoundError(goalId);
  }

  // Verify user has access to the child's family
  // In real implementation, this would use verifyChildAccess
  // For mock, we trust the familyId from getGoalById
  if (context.familyId && goal.familyId !== context.familyId) {
    throw new UnauthorizedError("You don't have access to this goal");
  }

  return goal;
}

// ============================================================================
// Tool Implementation
// ============================================================================

async function updateGoal(
  input: UpdateGoalInput,
  context: ToolContext
): Promise<ToolResult> {
  // 1. Verify at least one field is being updated
  if (
    input.status === undefined &&
    input.progress === undefined &&
    input.notes === undefined
  ) {
    return {
      success: false,
      error: "At least one field (status, progress, or notes) must be provided to update",
    };
  }

  // 2. Verify authorization through goal's child
  const goalInfo = await verifyGoalAccess(input.goalId, context);

  // 3. Business logic validation
  // If marking as completed, progress should be 100
  if (input.status === "completed" && input.progress !== undefined && input.progress !== 100) {
    return {
      success: false,
      error: "When marking a goal as completed, progress should be 100%",
    };
  }

  // If setting progress to 100, suggest marking as completed
  const autoComplete = input.progress === 100 && input.status === undefined;

  // TODO: Update goal in database once table exists
  // const { db } = await import("@/db");
  // const { goals } = await import("@/db/schema");
  //
  // const updateData: Partial<typeof goals.$inferInsert> = {
  //   updatedAt: new Date(),
  // };
  // if (input.status !== undefined) {
  //   updateData.status = input.status;
  //   if (input.status === 'completed') {
  //     updateData.completedAt = new Date();
  //     updateData.progress = 100;
  //   }
  // }
  // if (input.progress !== undefined) updateData.progress = input.progress;
  // // Notes could be added to a separate goal_notes table or as an array in the goal
  //
  // const [updated] = await db
  //   .update(goals)
  //   .set(updateData)
  //   .where(eq(goals.id, input.goalId))
  //   .returning();

  // Return mock data for MVP
  const now = new Date().toISOString();
  const isCompleted = input.status === "completed";

  const mockUpdatedGoal: UpdatedGoal = {
    id: input.goalId,
    childId: goalInfo.childId,
    type: goalInfo.type,
    title: goalInfo.title,
    description: "Goal description",
    targetDate: null,
    criteria: null,
    status: input.status ?? goalInfo.status,
    progress: input.progress ?? (isCompleted ? 100 : goalInfo.progress),
    completedAt: isCompleted ? now : null,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    updatedAt: now,
    _mock: true,
  };

  const updatedFields = [];
  if (input.status !== undefined) updatedFields.push(`status → ${input.status}`);
  if (input.progress !== undefined) updatedFields.push(`progress → ${input.progress}%`);
  if (input.notes !== undefined) updatedFields.push("notes added");

  let message = `Successfully updated goal "${goalInfo.title}": ${updatedFields.join(", ")}`;

  if (autoComplete) {
    message += ". Consider marking this goal as 'completed' since progress is at 100%.";
  }

  return {
    success: true,
    data: {
      goal: mockUpdatedGoal,
      message,
      suggestCompletion: autoComplete,
    },
  };
}

// ============================================================================
// Export
// ============================================================================

export const updateGoalTool: Tool<UpdateGoalInput> = {
  name: "update_goal",
  description:
    "Update goal status or progress. Can change status (active/completed/paused), update progress percentage (0-100), or add notes. The AI should confirm changes with the user before calling this.",
  inputSchema,
  execute: updateGoal,
};
