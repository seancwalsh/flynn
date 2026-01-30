/**
 * get_session Tool
 *
 * Get full details of a specific therapy session including notes,
 * and goals worked on.
 */

import { z } from "zod/v4";
import { createReadOnlyTool } from "@/services/tool-executor";
import type { ToolContext } from "@/types/claude";
import { SessionNotFoundError, UserIdRequiredError } from "../errors";
import { verifyChildAccess } from "../authorization";
import { db } from "../../db";
import { therapySessions, children, therapists, goals } from "../../db/schema";
import { eq, inArray } from "drizzle-orm";
import type { SessionType } from "./list_sessions";

// ============================================================================
// Types
// ============================================================================

export interface GoalDetail {
  id: string;
  title: string;
  description: string | null;
  therapyType: string;
  status: string;
  progressPercent: number;
  sessionProgress?: number;
  sessionNotes?: string;
}

export interface SessionDetail {
  id: string;
  childId: string;
  childName: string;
  type: SessionType;
  sessionDate: string;
  durationMinutes: number | null;

  // Therapist info
  therapistId: string | null;
  therapistName: string | null;
  therapistEmail: string | null;

  // Full content
  notes: string | null;

  // Goals worked on during this session
  goalsWorkedOn: GoalDetail[];

  // Metadata
  createdAt: string;
}

// ============================================================================
// Input Schema
// ============================================================================

const inputSchema = z.object({
  sessionId: z.uuid("Invalid session ID format"),
});

type GetSessionInput = z.infer<typeof inputSchema>;

// ============================================================================
// Tool Implementation
// ============================================================================

async function getSession(
  input: GetSessionInput,
  context: ToolContext
): Promise<SessionDetail> {
  if (!context.userId) {
    throw new UserIdRequiredError();
  }

  // Query the session
  const rows = await db
    .select({
      id: therapySessions.id,
      childId: therapySessions.childId,
      childName: children.name,
      therapyType: therapySessions.therapyType,
      sessionDate: therapySessions.sessionDate,
      durationMinutes: therapySessions.durationMinutes,
      therapistId: therapySessions.therapistId,
      therapistName: therapists.name,
      therapistEmail: therapists.email,
      notes: therapySessions.notes,
      goalsWorkedOn: therapySessions.goalsWorkedOn,
      createdAt: therapySessions.createdAt,
    })
    .from(therapySessions)
    .innerJoin(children, eq(therapySessions.childId, children.id))
    .leftJoin(therapists, eq(therapySessions.therapistId, therapists.id))
    .where(eq(therapySessions.id, input.sessionId))
    .limit(1);

  const session = rows[0];

  if (!session) {
    throw new SessionNotFoundError(input.sessionId);
  }

  // Verify user has access to this child
  await verifyChildAccess(session.childId, context);

  // Fetch goal details if there are goals worked on
  const goalsWorkedOnRaw = session.goalsWorkedOn as Array<{
    goalId: string;
    progress?: number;
    notes?: string;
  }> | null;

  let goalsWorkedOn: GoalDetail[] = [];

  if (goalsWorkedOnRaw && goalsWorkedOnRaw.length > 0) {
    const goalIds = goalsWorkedOnRaw.map((g) => g.goalId);
    const goalRows = await db
      .select({
        id: goals.id,
        title: goals.title,
        description: goals.description,
        therapyType: goals.therapyType,
        status: goals.status,
        progressPercent: goals.progressPercent,
      })
      .from(goals)
      .where(inArray(goals.id, goalIds));

    // Create a map for quick lookup
    const goalMap = new Map(goalRows.map((g) => [g.id, g]));

    goalsWorkedOn = goalsWorkedOnRaw
      .map((gw) => {
        const goal = goalMap.get(gw.goalId);
        if (!goal) return null;
        return {
          id: goal.id,
          title: goal.title,
          description: goal.description,
          therapyType: goal.therapyType,
          status: goal.status,
          progressPercent: goal.progressPercent ?? 0,
          sessionProgress: gw.progress,
          sessionNotes: gw.notes,
        };
      })
      .filter((g): g is GoalDetail => g !== null);
  }

  return {
    id: session.id,
    childId: session.childId,
    childName: session.childName,
    type: session.therapyType.toUpperCase() as SessionType,
    sessionDate: session.sessionDate,
    durationMinutes: session.durationMinutes,
    therapistId: session.therapistId,
    therapistName: session.therapistName,
    therapistEmail: session.therapistEmail,
    notes: session.notes,
    goalsWorkedOn,
    createdAt: session.createdAt.toISOString(),
  };
}

// ============================================================================
// Export
// ============================================================================

export const getSessionTool = createReadOnlyTool(
  "get_session",
  "Get full details of a specific therapy session including complete notes and goals that were worked on. Use this to review detailed session information for progress analysis or discussion with caregivers.",
  inputSchema,
  getSession
);
