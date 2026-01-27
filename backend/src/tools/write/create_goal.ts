/**
 * create_goal Tool
 *
 * Create a new therapy goal.
 *
 * NOTE: The goals table doesn't exist yet. This implementation returns
 * mock data and is structured to work correctly once the table is created.
 *
 * TODO: Create goals table with schema:
 * - id: UUID
 * - childId: UUID (FK to children)
 * - type: enum('ABA', 'OT', 'SLP', 'communication', 'other')
 * - title: varchar(255)
 * - description: text
 * - targetDate: date (optional)
 * - criteria: text (success criteria)
 * - status: enum('active', 'completed', 'paused') default 'active'
 * - progress: integer (0-100) default 0
 * - createdAt: timestamp
 * - updatedAt: timestamp
 */

import { z } from "zod/v4";
import type { Tool, ToolContext, ToolResult } from "@/types/claude";
import { verifyChildAccess } from "../authorization";

// ============================================================================
// Types
// ============================================================================

export type GoalType = "ABA" | "OT" | "SLP" | "communication" | "other";
export type GoalStatus = "active" | "completed" | "paused";

export interface CreatedGoal {
  id: string;
  childId: string;
  type: GoalType;
  title: string;
  description: string | null;
  targetDate: string | null;
  criteria: string | null;
  status: GoalStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
  _mock: boolean;
}

// ============================================================================
// Input Schema
// ============================================================================

const inputSchema = z.object({
  childId: z.uuid("Invalid child ID format"),
  type: z.enum(["ABA", "OT", "SLP", "communication", "other"]),
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(255, "Title cannot exceed 255 characters"),
  description: z
    .string()
    .max(2000, "Description cannot exceed 2,000 characters")
    .optional(),
  targetDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
  criteria: z
    .string()
    .max(2000, "Criteria cannot exceed 2,000 characters")
    .optional(),
});

type CreateGoalInput = z.infer<typeof inputSchema>;

// ============================================================================
// Tool Implementation
// ============================================================================

async function createGoal(
  input: CreateGoalInput,
  context: ToolContext
): Promise<ToolResult> {
  // 1. Verify authorization
  await verifyChildAccess(input.childId, context);

  // 2. Validate target date if provided
  if (input.targetDate) {
    const targetDate = new Date(input.targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Target date should be in the future (goals are forward-looking)
    if (targetDate < today) {
      return {
        success: false,
        error: "Target date should be in the future. Goals are forward-looking.",
      };
    }

    // Target date shouldn't be too far out (max 2 years)
    const twoYearsFromNow = new Date();
    twoYearsFromNow.setFullYear(twoYearsFromNow.getFullYear() + 2);
    
    if (targetDate > twoYearsFromNow) {
      return {
        success: false,
        error: "Target date cannot be more than 2 years in the future.",
      };
    }
  }

  // TODO: Create goal in database once table exists
  // const { db } = await import("@/db");
  // const { goals } = await import("@/db/schema");
  //
  // const [goal] = await db.insert(goals).values({
  //   childId: input.childId,
  //   type: input.type,
  //   title: input.title,
  //   description: input.description ?? null,
  //   targetDate: input.targetDate ?? null,
  //   criteria: input.criteria ?? null,
  //   status: 'active',
  //   progress: 0,
  // }).returning();

  // Return mock data for MVP
  const now = new Date().toISOString();
  const mockGoal: CreatedGoal = {
    id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    childId: input.childId,
    type: input.type,
    title: input.title,
    description: input.description ?? null,
    targetDate: input.targetDate ?? null,
    criteria: input.criteria ?? null,
    status: "active",
    progress: 0,
    createdAt: now,
    updatedAt: now,
    _mock: true,
  };

  return {
    success: true,
    data: {
      goal: mockGoal,
      message: `Successfully created ${input.type} goal: "${input.title}"`,
    },
  };
}

// ============================================================================
// Export
// ============================================================================

export const createGoalTool: Tool<CreateGoalInput> = {
  name: "create_goal",
  description:
    "Create a new therapy goal for a child. The AI should confirm goal details with the user before calling this. Goals track therapy objectives like communication targets, behavioral goals, or skill development milestones.",
  inputSchema,
  execute: createGoal,
};
