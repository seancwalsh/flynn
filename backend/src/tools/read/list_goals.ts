/**
 * list_goals Tool
 * 
 * List therapy goals for a child with optional status filtering.
 * 
 * NOTE: The goals table doesn't exist yet. This implementation returns
 * mock data and is structured to work correctly once the table is created.
 * 
 * TODO: Create goals table with schema:
 * - id: UUID
 * - childId: UUID (FK to children)
 * - name: varchar(255)
 * - description: text
 * - targetDescription: text
 * - therapyType: enum('ABA', 'OT', 'SLP', 'other')
 * - status: enum('active', 'completed', 'paused')
 * - targetValue: number (e.g., 80 for 80% accuracy)
 * - currentValue: number
 * - targetDate: date (optional)
 * - createdAt: timestamp
 * - updatedAt: timestamp
 * - completedAt: timestamp (nullable)
 */

import { z } from "zod/v4";
import { createReadOnlyTool } from "@/services/tool-executor";
import type { ToolContext } from "@/types/claude";
import { verifyChildAccess } from "../authorization";

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
  _mock: boolean;
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

  // TODO: Query the goals table once it exists
  // const { db } = await import("@/db");
  // const { goals } = await import("@/db/schema");
  //
  // let query = db
  //   .select()
  //   .from(goals)
  //   .where(eq(goals.childId, input.childId));
  //
  // if (input.status && input.status !== "all") {
  //   query = query.where(eq(goals.status, input.status));
  // }
  //
  // const results = await query.orderBy(asc(goals.createdAt));

  // Generate mock data for MVP
  const allGoals = generateMockGoals(input.childId);
  
  // Filter by status if specified
  const filteredGoals = input.status === "all" 
    ? allGoals
    : allGoals.filter(g => g.status === input.status);

  // Calculate counts
  const countByStatus = {
    active: allGoals.filter(g => g.status === "active").length,
    completed: allGoals.filter(g => g.status === "completed").length,
    paused: allGoals.filter(g => g.status === "paused").length,
  };

  return {
    goals: filteredGoals,
    totalCount: filteredGoals.length,
    countByStatus,
    _mock: true,
  };
}

/**
 * Generate mock goals for MVP
 */
function generateMockGoals(childId: string): Goal[] {
  const now = new Date();
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  return [
    {
      id: "goal-requesting-001",
      childId,
      name: "Request preferred items",
      description: "Child will independently request preferred items and activities using their AAC device",
      targetDescription: "Child will independently request preferred items using AAC device in 8/10 trials across 3 consecutive sessions",
      therapyType: "ABA",
      status: "active",
      targetValue: 80,
      currentValue: 60,
      progressPercent: 75,
      targetDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] as string,
      createdAt: twoMonthsAgo.toISOString(),
      updatedAt: now.toISOString(),
      completedAt: null,
      lastSessionDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] as string,
      totalSessionsAddressed: 12,
    },
    {
      id: "goal-greetings-002",
      childId,
      name: "Respond to social greetings",
      description: "Child will respond appropriately to greetings from peers and adults",
      targetDescription: "Child will respond to greetings within 5 seconds using verbal or AAC response in 7/10 opportunities",
      therapyType: "ABA",
      status: "active",
      targetValue: 70,
      currentValue: 45,
      progressPercent: 64,
      targetDate: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] as string,
      createdAt: twoMonthsAgo.toISOString(),
      updatedAt: now.toISOString(),
      completedAt: null,
      lastSessionDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] as string,
      totalSessionsAddressed: 10,
    },
    {
      id: "goal-articulation-003",
      childId,
      name: "/s/ sound in words",
      description: "Improve articulation of the /s/ sound in initial position of words",
      targetDescription: "Child will produce /s/ sound correctly in initial position of words in 80% of trials",
      therapyType: "SLP",
      status: "active",
      targetValue: 80,
      currentValue: 65,
      progressPercent: 81,
      targetDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] as string,
      createdAt: oneMonthAgo.toISOString(),
      updatedAt: now.toISOString(),
      completedAt: null,
      lastSessionDate: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] as string,
      totalSessionsAddressed: 6,
    },
    {
      id: "goal-fine-motor-004",
      childId,
      name: "Pencil grasp",
      description: "Develop appropriate pencil grasp for pre-writing activities",
      targetDescription: "Child will maintain tripod grasp on writing utensil for 5+ minutes during structured activities",
      therapyType: "OT",
      status: "paused",
      targetValue: 100,
      currentValue: 50,
      progressPercent: 50,
      targetDate: null,
      createdAt: threeMonthsAgo.toISOString(),
      updatedAt: oneMonthAgo.toISOString(),
      completedAt: null,
      lastSessionDate: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] as string,
      totalSessionsAddressed: 8,
    },
    {
      id: "goal-attention-005",
      childId,
      name: "Sustained attention",
      description: "Increase duration of sustained attention to preferred activities",
      targetDescription: "Child will maintain attention to a single activity for 10+ minutes without prompts",
      therapyType: "ABA",
      status: "completed",
      targetValue: 100,
      currentValue: 100,
      progressPercent: 100,
      targetDate: oneMonthAgo.toISOString().split("T")[0] as string,
      createdAt: threeMonthsAgo.toISOString(),
      updatedAt: oneMonthAgo.toISOString(),
      completedAt: oneMonthAgo.toISOString(),
      lastSessionDate: oneMonthAgo.toISOString().split("T")[0] as string,
      totalSessionsAddressed: 15,
    },
    {
      id: "goal-turn-taking-006",
      childId,
      name: "Turn-taking in play",
      description: "Engage in reciprocal play with turn-taking",
      targetDescription: "Child will take turns during play activities with a peer for 5+ exchanges",
      therapyType: "ABA",
      status: "completed",
      targetValue: 100,
      currentValue: 100,
      progressPercent: 100,
      targetDate: twoMonthsAgo.toISOString().split("T")[0] as string,
      createdAt: threeMonthsAgo.toISOString(),
      updatedAt: twoMonthsAgo.toISOString(),
      completedAt: twoMonthsAgo.toISOString(),
      lastSessionDate: twoMonthsAgo.toISOString().split("T")[0] as string,
      totalSessionsAddressed: 10,
    },
  ];
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
