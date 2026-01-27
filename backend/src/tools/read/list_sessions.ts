/**
 * list_sessions Tool
 * 
 * List therapy sessions with optional filters.
 * 
 * NOTE: The sessions table doesn't exist yet. This implementation returns
 * mock data and is structured to work correctly once the table is created.
 * 
 * TODO: Create sessions table with schema:
 * - id: UUID
 * - childId: UUID (FK to children)
 * - therapistId: UUID (FK to therapists, nullable for parent sessions)
 * - type: enum('ABA', 'OT', 'SLP', 'other')
 * - startedAt: timestamp
 * - endedAt: timestamp
 * - notes: text
 * - goalsAddressed: UUID[] (FK to goals)
 * - createdAt: timestamp
 */

import { z } from "zod/v4";
import { createReadOnlyTool } from "@/services/tool-executor";
import type { ToolContext } from "@/types/claude";
import { verifyChildAccess, getAccessibleChildIds } from "../authorization";
import { UserIdRequiredError } from "../errors";

// ============================================================================
// Types
// ============================================================================

export type SessionType = "ABA" | "OT" | "SLP" | "other";

export interface SessionSummary {
  id: string;
  childId: string;
  childName: string;
  type: SessionType;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  therapistId: string | null;
  therapistName: string | null;
  notesPreview: string | null; // First 200 chars of notes
  goalsAddressedCount: number;
}

export interface ListSessionsResult {
  sessions: SessionSummary[];
  totalCount: number;
  hasMore: boolean;
  // Metadata
  _mock: boolean; // Indicates this is mock data (for transparency)
}

// ============================================================================
// Input Schema
// ============================================================================

const inputSchema = z.object({
  childId: z.uuid("Invalid child ID format").optional(),
  type: z.enum(["ABA", "OT", "SLP", "other"]).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

type ListSessionsInput = z.infer<typeof inputSchema>;

// ============================================================================
// Tool Implementation
// ============================================================================

async function listSessions(
  input: ListSessionsInput,
  context: ToolContext
): Promise<ListSessionsResult> {
  if (!context.userId) {
    throw new UserIdRequiredError();
  }

  // If a specific child is requested, verify access
  if (input.childId) {
    await verifyChildAccess(input.childId, context);
  }

  // Get accessible children for filtering
  const accessibleChildIds = input.childId
    ? [input.childId]
    : await getAccessibleChildIds(context);

  if (accessibleChildIds.length === 0) {
    return {
      sessions: [],
      totalCount: 0,
      hasMore: false,
      _mock: true,
    };
  }

  // TODO: Query the sessions table once it exists
  // For now, return mock data to demonstrate the interface
  
  // const { db } = await import("@/db");
  // const { sessions, children, therapists } = await import("@/db/schema");
  //
  // let query = db
  //   .select({...})
  //   .from(sessions)
  //   .innerJoin(children, eq(sessions.childId, children.id))
  //   .leftJoin(therapists, eq(sessions.therapistId, therapists.id))
  //   .where(inArray(sessions.childId, accessibleChildIds));
  //
  // if (input.type) {
  //   query = query.where(eq(sessions.type, input.type));
  // }
  // if (input.startDate) {
  //   query = query.where(gte(sessions.startedAt, new Date(input.startDate)));
  // }
  // if (input.endDate) {
  //   query = query.where(lte(sessions.startedAt, new Date(input.endDate + 'T23:59:59')));
  // }

  // Return mock data for MVP
  const mockSessions: SessionSummary[] = generateMockSessions(
    accessibleChildIds,
    input.type,
    input.startDate,
    input.endDate,
    input.limit ?? 20
  );

  return {
    sessions: mockSessions,
    totalCount: mockSessions.length,
    hasMore: false,
    _mock: true, // Flag to indicate mock data
  };
}

/**
 * Generate mock session data for MVP
 */
function generateMockSessions(
  childIds: string[],
  typeFilter?: SessionType,
  startDate?: string,
  endDate?: string,
  limit: number = 20
): SessionSummary[] {
  const sessionTypes: SessionType[] = ["ABA", "OT", "SLP", "other"];
  const sessions: SessionSummary[] = [];
  
  const startTs = startDate ? new Date(startDate).getTime() : Date.now() - 30 * 24 * 60 * 60 * 1000;
  const endTs = endDate ? new Date(endDate + "T23:59:59").getTime() : Date.now();

  // Generate a few mock sessions per child
  for (const childId of childIds.slice(0, 3)) { // Limit to 3 children for mock data
    for (let i = 0; i < Math.min(5, limit); i++) {
      const type = typeFilter ?? sessionTypes[i % sessionTypes.length] as SessionType;
      if (typeFilter && type !== typeFilter) continue;

      const sessionStart = new Date(startTs + Math.random() * (endTs - startTs));
      const durationMinutes = 30 + Math.floor(Math.random() * 60);

      sessions.push({
        id: `mock-session-${childId.slice(0, 8)}-${i}`,
        childId,
        childName: "Mock Child",
        type,
        startedAt: sessionStart.toISOString(),
        endedAt: new Date(sessionStart.getTime() + durationMinutes * 60 * 1000).toISOString(),
        durationMinutes,
        therapistId: i % 2 === 0 ? `mock-therapist-${i}` : null,
        therapistName: i % 2 === 0 ? "Dr. Mock Therapist" : null,
        notesPreview: `Mock session notes for ${type} therapy. This is placeholder data...`,
        goalsAddressedCount: Math.floor(Math.random() * 4),
      });

      if (sessions.length >= limit) break;
    }
    if (sessions.length >= limit) break;
  }

  // Sort by date descending (most recent first)
  sessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  return sessions.slice(0, limit);
}

// ============================================================================
// Export
// ============================================================================

export const listSessionsTool = createReadOnlyTool(
  "list_sessions",
  "List therapy sessions with optional filters for child, session type (ABA, OT, SLP, other), and date range. Returns session summaries including duration, therapist, and notes preview. Use this to review therapy history and patterns.",
  inputSchema,
  listSessions
);
