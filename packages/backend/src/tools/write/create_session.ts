/**
 * create_session Tool
 *
 * Log a new therapy session.
 */

import { z } from "zod/v4";
import type { Tool, ToolContext, ToolResult } from "@/types/claude";
import { verifyChildAccess } from "../authorization";
import { db } from "../../db";
import { therapySessions, goals } from "../../db/schema";
import { and, eq, inArray } from "drizzle-orm";

// ============================================================================
// Types
// ============================================================================

export type SessionType = "ABA" | "OT" | "SLP" | "other";

export interface CreatedSession {
  id: string;
  childId: string;
  type: SessionType;
  date: string;
  durationMinutes: number | null;
  notes: string | null;
  goalsWorkedOn: Array<{ goalId: string; progress?: number; notes?: string }>;
  createdAt: string;
}

// ============================================================================
// Input Schema
// ============================================================================

const inputSchema = z.object({
  childId: z.uuid("Invalid child ID format"),
  type: z.enum(["ABA", "OT", "SLP", "other"]),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  durationMinutes: z
    .number()
    .int("Duration must be a whole number of minutes")
    .min(1, "Duration must be at least 1 minute")
    .max(480, "Duration cannot exceed 8 hours (480 minutes)")
    .optional(),
  notes: z
    .string()
    .max(10000, "Notes cannot exceed 10,000 characters")
    .optional(),
  goalsWorkedOn: z
    .array(
      z.object({
        goalId: z.uuid("Invalid goal ID format"),
        progress: z.number().int().min(0).max(100).optional(),
        notes: z.string().max(1000).optional(),
      })
    )
    .max(20, "Cannot address more than 20 goals in a single session")
    .optional(),
  therapistId: z.uuid("Invalid therapist ID format").optional(),
});

type CreateSessionInput = z.infer<typeof inputSchema>;

// ============================================================================
// Tool Implementation
// ============================================================================

async function createSession(
  input: CreateSessionInput,
  context: ToolContext
): Promise<ToolResult> {
  // 1. Verify authorization
  await verifyChildAccess(input.childId, context);

  // 2. Validate date is not in the future
  const sessionDate = new Date(input.date);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  if (sessionDate > today) {
    return {
      success: false,
      error:
        "Cannot create a session with a future date. Sessions should be logged after they occur.",
    };
  }

  // 3. Validate date is not too far in the past (1 year max)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  if (sessionDate < oneYearAgo) {
    return {
      success: false,
      error: "Cannot create a session more than 1 year in the past.",
    };
  }

  // 4. Validate goalsWorkedOn IDs exist and belong to the child
  if (input.goalsWorkedOn && input.goalsWorkedOn.length > 0) {
    const goalIds = input.goalsWorkedOn.map((g) => g.goalId);
    const existingGoals = await db
      .select({ id: goals.id })
      .from(goals)
      .where(
        and(eq(goals.childId, input.childId), inArray(goals.id, goalIds))
      );

    const foundIds = new Set(existingGoals.map((g) => g.id));
    const missingIds = goalIds.filter((id) => !foundIds.has(id));

    if (missingIds.length > 0) {
      return {
        success: false,
        error: `Goals not found or don't belong to this child: ${missingIds.join(", ")}`,
      };
    }
  }

  // 5. Create session in database
  const [session] = await db
    .insert(therapySessions)
    .values({
      childId: input.childId,
      therapistId: input.therapistId ?? null,
      therapyType: input.type.toLowerCase(),
      sessionDate: input.date,
      durationMinutes: input.durationMinutes ?? null,
      notes: input.notes ?? null,
      goalsWorkedOn: input.goalsWorkedOn ?? null,
    })
    .returning();

  return {
    success: true,
    data: {
      session: {
        id: session.id,
        childId: session.childId,
        type: input.type,
        date: session.sessionDate,
        durationMinutes: session.durationMinutes,
        notes: session.notes,
        goalsWorkedOn: (session.goalsWorkedOn as CreatedSession["goalsWorkedOn"]) ?? [],
        createdAt: session.createdAt.toISOString(),
      },
      message: `Successfully logged ${input.type} session for ${input.date}`,
    },
  };
}

// ============================================================================
// Export
// ============================================================================

export const createSessionTool: Tool<CreateSessionInput> = {
  name: "create_session",
  description:
    "Log a new therapy session. The AI should confirm session details with the user before calling this. Creates a record of a therapy session including the date, type (ABA, OT, SLP, other), duration, notes, and which goals were worked on.",
  inputSchema,
  execute: createSession,
};
