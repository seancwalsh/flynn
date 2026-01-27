/**
 * update_session Tool
 *
 * Update an existing therapy session.
 *
 * NOTE: The sessions table doesn't exist yet. This implementation returns
 * mock data and is structured to work correctly once the table is created.
 *
 * TODO: Create sessions table (see create_session.ts for schema)
 */

import { z } from "zod/v4";
import type { Tool, ToolContext, ToolResult } from "@/types/claude";
import { SessionNotFoundError, UnauthorizedError } from "../errors";

// ============================================================================
// Types
// ============================================================================

export type SessionType = "ABA" | "OT" | "SLP" | "other";

export interface UpdatedSession {
  id: string;
  childId: string;
  type: SessionType;
  date: string;
  duration: number | null;
  notes: string | null;
  goalsAddressed: string[];
  createdAt: string;
  updatedAt: string;
  _mock: boolean;
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
  duration: z
    .number()
    .int("Duration must be a whole number of minutes")
    .min(1, "Duration must be at least 1 minute")
    .max(480, "Duration cannot exceed 8 hours (480 minutes)")
    .optional(),
  goalsAddressed: z
    .array(z.uuid("Invalid goal ID format"))
    .max(20, "Cannot address more than 20 goals in a single session")
    .optional(),
});

type UpdateSessionInput = z.infer<typeof inputSchema>;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Mock function to get session by ID
 * TODO: Replace with actual database query
 */
async function getSessionById(
  sessionId: string,
  context: ToolContext
): Promise<{ childId: string; familyId: string } | null> {
  // In real implementation:
  // const { db } = await import("@/db");
  // const { sessions, children } = await import("@/db/schema");
  //
  // const session = await db.query.sessions.findFirst({
  //   where: eq(sessions.id, sessionId),
  //   with: { child: { columns: { familyId: true } } }
  // });

  // For mock, we accept any session ID and simulate finding a session
  // if the user has a familyId in their context
  if (context.familyId) {
    return {
      childId: "mock-child-id",
      familyId: context.familyId,
    };
  }
  // If no familyId in context, return null to simulate session not found
  return null;
}

/**
 * Verify user has access to a session through its child
 */
async function verifySessionAccess(
  sessionId: string,
  context: ToolContext
): Promise<{ childId: string; familyId: string }> {
  if (!context.userId) {
    throw new UnauthorizedError("User ID is required");
  }

  const session = await getSessionById(sessionId, context);
  
  if (!session) {
    throw new SessionNotFoundError(sessionId);
  }

  // Verify user has access to the child's family
  // In real implementation, this would use verifyChildAccess
  // For mock, we trust the familyId from getSessionById
  if (context.familyId && session.familyId !== context.familyId) {
    throw new UnauthorizedError("You don't have access to this session");
  }

  return session;
}

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
    input.duration === undefined &&
    input.goalsAddressed === undefined
  ) {
    return {
      success: false,
      error: "At least one field (notes, duration, or goalsAddressed) must be provided to update",
    };
  }

  // 2. Verify authorization through session's child
  const sessionInfo = await verifySessionAccess(input.sessionId, context);

  // TODO: Validate goalsAddressed IDs exist and belong to the child
  // This will be implemented when the goals table exists

  // TODO: Update session in database once table exists
  // const { db } = await import("@/db");
  // const { sessions } = await import("@/db/schema");
  //
  // const updateData: Partial<typeof sessions.$inferInsert> = {
  //   updatedAt: new Date(),
  // };
  // if (input.notes !== undefined) updateData.notes = input.notes;
  // if (input.duration !== undefined) updateData.duration = input.duration;
  // if (input.goalsAddressed !== undefined) updateData.goalsAddressed = input.goalsAddressed;
  //
  // const [updated] = await db
  //   .update(sessions)
  //   .set(updateData)
  //   .where(eq(sessions.id, input.sessionId))
  //   .returning();

  // Return mock data for MVP
  const now = new Date().toISOString();
  const mockUpdatedSession: UpdatedSession = {
    id: input.sessionId,
    childId: sessionInfo.childId,
    type: "ABA", // Mock value
    date: new Date().toISOString().split("T")[0] as string,
    duration: input.duration ?? 45,
    notes: input.notes ?? "Previous notes",
    goalsAddressed: input.goalsAddressed ?? [],
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
    updatedAt: now,
    _mock: true,
  };

  const updatedFields = [];
  if (input.notes !== undefined) updatedFields.push("notes");
  if (input.duration !== undefined) updatedFields.push("duration");
  if (input.goalsAddressed !== undefined) updatedFields.push("goals addressed");

  return {
    success: true,
    data: {
      session: mockUpdatedSession,
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
    "Update an existing therapy session. Can modify notes, duration, or goals addressed. The AI should confirm changes with the user before calling this.",
  inputSchema,
  execute: updateSession,
};
