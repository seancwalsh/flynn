/**
 * create_session Tool
 *
 * Log a new therapy session.
 *
 * NOTE: The sessions table doesn't exist yet. This implementation returns
 * mock data and is structured to work correctly once the table is created.
 *
 * TODO: Create sessions table with schema:
 * - id: UUID
 * - childId: UUID (FK to children)
 * - therapistId: UUID (FK to therapists, nullable for parent sessions)
 * - type: enum('ABA', 'OT', 'SLP', 'other')
 * - date: date
 * - duration: integer (minutes)
 * - notes: text
 * - goalsAddressed: UUID[] (FK to goals)
 * - createdAt: timestamp
 * - updatedAt: timestamp
 */

import { z } from "zod/v4";
import type { Tool, ToolContext, ToolResult } from "@/types/claude";
import { verifyChildAccess } from "../authorization";

// ============================================================================
// Types
// ============================================================================

export type SessionType = "ABA" | "OT" | "SLP" | "other";

export interface CreatedSession {
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
  childId: z.uuid("Invalid child ID format"),
  type: z.enum(["ABA", "OT", "SLP", "other"]),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  duration: z
    .number()
    .int("Duration must be a whole number of minutes")
    .min(1, "Duration must be at least 1 minute")
    .max(480, "Duration cannot exceed 8 hours (480 minutes)")
    .optional(),
  notes: z
    .string()
    .max(10000, "Notes cannot exceed 10,000 characters")
    .optional(),
  goalsAddressed: z
    .array(z.uuid("Invalid goal ID format"))
    .max(20, "Cannot address more than 20 goals in a single session")
    .optional(),
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

  // 2. Validate date is not in the future (sessions should be logged, not scheduled)
  const sessionDate = new Date(input.date);
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  
  if (sessionDate > today) {
    return {
      success: false,
      error: "Cannot create a session with a future date. Sessions should be logged after they occur.",
    };
  }

  // 3. Validate date is not too far in the past (configurable, default 1 year)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  if (sessionDate < oneYearAgo) {
    return {
      success: false,
      error: "Cannot create a session more than 1 year in the past.",
    };
  }

  // TODO: Validate goalsAddressed IDs exist and belong to the child
  // This will be implemented when the goals table exists

  // TODO: Create session in database once table exists
  // const { db } = await import("@/db");
  // const { sessions } = await import("@/db/schema");
  //
  // const [session] = await db.insert(sessions).values({
  //   childId: input.childId,
  //   type: input.type,
  //   date: input.date,
  //   duration: input.duration ?? null,
  //   notes: input.notes ?? null,
  //   goalsAddressed: input.goalsAddressed ?? [],
  // }).returning();

  // Return mock data for MVP
  const now = new Date().toISOString();
  const mockSession: CreatedSession = {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    childId: input.childId,
    type: input.type,
    date: input.date,
    duration: input.duration ?? null,
    notes: input.notes ?? null,
    goalsAddressed: input.goalsAddressed ?? [],
    createdAt: now,
    updatedAt: now,
    _mock: true,
  };

  return {
    success: true,
    data: {
      session: mockSession,
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
    "Log a new therapy session. The AI should confirm session details with the user before calling this. Creates a record of a therapy session including the date, type (ABA, OT, SLP, other), duration, notes, and which goals were addressed.",
  inputSchema,
  execute: createSession,
};
