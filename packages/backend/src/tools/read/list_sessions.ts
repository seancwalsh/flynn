/**
 * list_sessions Tool
 *
 * List therapy sessions with optional filters.
 */

import { z } from "zod/v4";
import { createReadOnlyTool } from "@/services/tool-executor";
import type { ToolContext } from "@/types/claude";
import { verifyChildAccess, getAccessibleChildIds } from "../authorization";
import { UserIdRequiredError } from "../errors";
import { db } from "../../db";
import { therapySessions, children, therapists } from "../../db/schema";
import { eq, inArray, gte, lte, desc, and, sql, count } from "drizzle-orm";

// ============================================================================
// Types
// ============================================================================

export type SessionType = "ABA" | "OT" | "SLP" | "other";

export interface SessionSummary {
  id: string;
  childId: string;
  childName: string;
  type: SessionType;
  sessionDate: string;
  durationMinutes: number | null;
  therapistId: string | null;
  therapistName: string | null;
  notesPreview: string | null;
  goalsWorkedOnCount: number;
}

export interface ListSessionsResult {
  sessions: SessionSummary[];
  totalCount: number;
  hasMore: boolean;
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
  offset: z.number().int().min(0).optional().default(0),
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
    };
  }

  // Build conditions
  const conditions = [inArray(therapySessions.childId, accessibleChildIds)];

  if (input.type) {
    conditions.push(eq(therapySessions.therapyType, input.type.toLowerCase()));
  }
  if (input.startDate) {
    conditions.push(gte(therapySessions.sessionDate, input.startDate));
  }
  if (input.endDate) {
    conditions.push(lte(therapySessions.sessionDate, input.endDate));
  }

  const whereClause = and(...conditions);

  // Get total count
  const [{ total }] = await db
    .select({ total: count() })
    .from(therapySessions)
    .where(whereClause);

  // Get sessions with joins
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
      notes: therapySessions.notes,
      goalsWorkedOn: therapySessions.goalsWorkedOn,
    })
    .from(therapySessions)
    .innerJoin(children, eq(therapySessions.childId, children.id))
    .leftJoin(therapists, eq(therapySessions.therapistId, therapists.id))
    .where(whereClause)
    .orderBy(desc(therapySessions.sessionDate))
    .limit(input.limit ?? 20)
    .offset(input.offset ?? 0);

  const sessions: SessionSummary[] = rows.map((row) => {
    const goalsWorkedOn = row.goalsWorkedOn as Array<{ goalId: string }> | null;
    return {
      id: row.id,
      childId: row.childId,
      childName: row.childName,
      type: row.therapyType.toUpperCase() as SessionType,
      sessionDate: row.sessionDate,
      durationMinutes: row.durationMinutes,
      therapistId: row.therapistId,
      therapistName: row.therapistName,
      notesPreview: row.notes ? row.notes.slice(0, 200) : null,
      goalsWorkedOnCount: goalsWorkedOn?.length ?? 0,
    };
  });

  const limit = input.limit ?? 20;
  const offset = input.offset ?? 0;

  return {
    sessions,
    totalCount: total,
    hasMore: offset + sessions.length < total,
  };
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
