/**
 * update_session Tool
 *
 * Update an existing therapy session.
 */

import { z } from "zod/v4";
import type { Tool, ToolContext, ToolResult } from "@/types/claude";
import { SessionNotFoundError, UnauthorizedError } from "../errors";
import { verifyChildAccess } from "../authorization";
import { db } from "../../db";
import { therapySessions, goals } from "../../db/schema";
import { eq, and, inArray } from "drizzle-orm";

// ============================================================================
// Types
// ============================================================================

export type SessionType = "ABA" | "OT" | "SLP" | "other";

export interface UpdatedSession {
  id: string;
  childId: string;
  type: SessionType;
  sessionDate: string;
  durationMinutes: number | null;
  notes: string | null;
  goalsWorkedOn: Array<{ goalId: string; progress?: number; notes?: string }>;
  createdAt: string;
}

// ============================================================================
// Input Schema
// ============================================================================

const inputSchema = z.object({
  sessionId: z.uuid("Invalid session ID format"),
  notes: z
    .string()
    .max(10000, "Notes cannot exceed 10,000 characters")
    .optional(),
  durationMinutes: z
    .number()
    .int("Duration must be a whole number of minutes")
    .min(1, "Duration must be at least 1 minute")
    .max(480, "Duration cannot exceed 8 hours (480 minutes)")
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
});

type UpdateSessionInput = z.infer<typeof inputSchema>;

// ============================================================================
// Tool Implementation
// ============================================================================

async function updateSession(
  input: UpdateSessionInput,
  context: ToolContext
): Promise<ToolResult> {
  // 1. Verify at least one field is being updated
  if (
    input.notes === undefined &&
    input.durationMinutes === undefined &&
    input.goalsWorkedOn === undefined
  ) {
    return {
      success: false,
      error:
        "At least one field (notes, durationMinutes, or goalsWorkedOn) must be provided to update",
    };
  }

  if (!context.userId) {
    throw new UnauthorizedError("User ID is required");
  }

  // 2. Fetch the session to verify it exists and get childId
  const [existingSession] = await db
    .select({
      id: therapySessions.id,
      childId: therapySessions.childId,
      therapyType: therapySessions.therapyType,
      sessionDate: therapySessions.sessionDate,
      durationMinutes: therapySessions.durationMinutes,
      notes: therapySessions.notes,
      goalsWorkedOn: therapySessions.goalsWorkedOn,
      createdAt: therapySessions.createdAt,
    })
    .from(therapySessions)
    .where(eq(therapySessions.id, input.sessionId))
    .limit(1);

  if (!existingSession) {
    throw new SessionNotFoundError(input.sessionId);
  }

  // 3. Verify authorization through session's child
  await verifyChildAccess(existingSession.childId, context);

  // 4. Validate goalsWorkedOn IDs exist and belong to the child
  if (input.goalsWorkedOn && input.goalsWorkedOn.length > 0) {
    const goalIds = input.goalsWorkedOn.map((g) => g.goalId);
    const existingGoals = await db
      .select({ id: goals.id })
      .from(goals)
      .where(
        and(eq(goals.childId, existingSession.childId), inArray(goals.id, goalIds))
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

  // 5. Build update object
  const updateData: Record<string, unknown> = {};

  if (input.notes !== undefined) {
    updateData.notes = input.notes;
  }
  if (input.durationMinutes !== undefined) {
    updateData.durationMinutes = input.durationMinutes;
  }
  if (input.goalsWorkedOn !== undefined) {
    updateData.goalsWorkedOn = input.goalsWorkedOn;
  }

  // 6. Update in database
  const [updated] = await db
    .update(therapySessions)
    .set(updateData)
    .where(eq(therapySessions.id, input.sessionId))
    .returning();

  const updatedFields: string[] = [];
  if (input.notes !== undefined) updatedFields.push("notes");
  if (input.durationMinutes !== undefined) updatedFields.push("duration");
  if (input.goalsWorkedOn !== undefined) updatedFields.push("goals worked on");

  return {
    success: true,
    data: {
      session: {
        id: updated.id,
        childId: updated.childId,
        type: updated.therapyType.toUpperCase() as SessionType,
        sessionDate: updated.sessionDate,
        durationMinutes: updated.durationMinutes,
        notes: updated.notes,
        goalsWorkedOn:
          (updated.goalsWorkedOn as UpdatedSession["goalsWorkedOn"]) ?? [],
        createdAt: updated.createdAt.toISOString(),
      },
      message: `Successfully updated session: ${updatedFields.join(", ")}`,
    },
  };
}

// ============================================================================
// Export
// ============================================================================

export const updateSessionTool: Tool<UpdateSessionInput> = {
  name: "update_session",
  description:
    "Update an existing therapy session. Can modify notes, duration, or goals worked on. The AI should confirm changes with the user before calling this.",
  inputSchema,
  execute: updateSession,
};
