/**
 * update_goal Tool
 *
 * Update goal status or details.
 */

import { z } from "zod/v4";
import type { Tool, ToolContext, ToolResult } from "@/types/claude";
import { GoalNotFoundError, UnauthorizedError } from "../errors";
import { verifyChildAccess } from "../authorization";
import { db } from "../../db";
import { goals, children } from "../../db/schema";
import { eq } from "drizzle-orm";

// ============================================================================
// Types
// ============================================================================

export type GoalType = "ABA" | "OT" | "SLP" | "communication" | "other";
export type GoalStatus = "active" | "achieved" | "paused" | "discontinued";

export interface UpdatedGoal {
  id: string;
  childId: string;
  type: GoalType;
  title: string;
  description: string | null;
  targetDate: string | null;
  status: GoalStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Input Schema
// ============================================================================

const inputSchema = z.object({
  goalId: z.uuid("Invalid goal ID format"),
  status: z.enum(["active", "achieved", "paused", "discontinued"]).optional(),
  progress: z
    .number()
    .int("Progress must be a whole number")
    .min(0, "Progress cannot be negative")
    .max(100, "Progress cannot exceed 100%")
    .optional(),
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(255, "Title cannot exceed 255 characters")
    .optional(),
  description: z
    .string()
    .max(2000, "Description cannot exceed 2,000 characters")
    .optional(),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .nullish(),
});

type UpdateGoalInput = z.infer<typeof inputSchema>;

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
    input.title === undefined &&
    input.description === undefined &&
    input.targetDate === undefined
  ) {
    return {
      success: false,
      error:
        "At least one field (status, progress, title, description, or targetDate) must be provided to update",
    };
  }

  if (!context.userId) {
    throw new UnauthorizedError("User ID is required");
  }

  // 2. Fetch the goal to verify it exists and get childId
  const [existingGoal] = await db
    .select({
      id: goals.id,
      childId: goals.childId,
      therapyType: goals.therapyType,
      title: goals.title,
      description: goals.description,
      targetDate: goals.targetDate,
      status: goals.status,
      progressPercent: goals.progressPercent,
      createdAt: goals.createdAt,
    })
    .from(goals)
    .where(eq(goals.id, input.goalId))
    .limit(1);

  if (!existingGoal) {
    throw new GoalNotFoundError(input.goalId);
  }

  // 3. Verify authorization through goal's child
  await verifyChildAccess(existingGoal.childId, context);

  // 4. Business logic validation
  if (
    input.status === "achieved" &&
    input.progress !== undefined &&
    input.progress !== 100
  ) {
    return {
      success: false,
      error: "When marking a goal as achieved, progress should be 100%",
    };
  }

  // If setting progress to 100, suggest marking as achieved
  const autoComplete = input.progress === 100 && input.status === undefined;

  // 5. Build update object
  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (input.status !== undefined) {
    updateData.status = input.status;
    if (input.status === "achieved") {
      updateData.progressPercent = 100;
    }
  }
  if (input.progress !== undefined) {
    updateData.progressPercent = input.progress;
  }
  if (input.title !== undefined) {
    updateData.title = input.title;
  }
  if (input.description !== undefined) {
    updateData.description = input.description;
  }
  if (input.targetDate !== undefined) {
    updateData.targetDate = input.targetDate;
  }

  // 6. Update in database
  const [updated] = await db
    .update(goals)
    .set(updateData)
    .where(eq(goals.id, input.goalId))
    .returning();

  const updatedFields: string[] = [];
  if (input.status !== undefined) updatedFields.push(`status → ${input.status}`);
  if (input.progress !== undefined)
    updatedFields.push(`progress → ${input.progress}%`);
  if (input.title !== undefined) updatedFields.push("title updated");
  if (input.description !== undefined) updatedFields.push("description updated");
  if (input.targetDate !== undefined) updatedFields.push("target date updated");

  let message = `Successfully updated goal "${updated.title}": ${updatedFields.join(", ")}`;

  if (autoComplete) {
    message +=
      ". Consider marking this goal as 'achieved' since progress is at 100%.";
  }

  return {
    success: true,
    data: {
      goal: {
        id: updated.id,
        childId: updated.childId,
        type: updated.therapyType.toUpperCase() as GoalType,
        title: updated.title,
        description: updated.description,
        targetDate: updated.targetDate,
        status: updated.status as GoalStatus,
        progress: updated.progressPercent ?? 0,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
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
    "Update goal status or progress. Can change status (active/achieved/paused/discontinued), update progress percentage (0-100), or modify title/description/targetDate. The AI should confirm changes with the user before calling this.",
  inputSchema,
  execute: updateGoal,
};
