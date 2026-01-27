/**
 * get_session Tool
 * 
 * Get full details of a specific therapy session including notes,
 * data points, and goals addressed.
 * 
 * NOTE: The sessions table doesn't exist yet. This implementation returns
 * mock data and is structured to work correctly once the table is created.
 * 
 * TODO: Create sessions table (see list_sessions.ts for schema)
 */

import { z } from "zod/v4";
import { createReadOnlyTool } from "@/services/tool-executor";
import type { ToolContext } from "@/types/claude";
import { SessionNotFoundError, UserIdRequiredError } from "../errors";
import type { SessionType } from "./list_sessions";

// ============================================================================
// Types
// ============================================================================

export interface SessionDetail {
  id: string;
  childId: string;
  childName: string;
  type: SessionType;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  
  // Therapist info
  therapistId: string | null;
  therapistName: string | null;
  therapistEmail: string | null;
  
  // Full content
  notes: string | null;
  
  // Goals addressed during this session
  goalsAddressed: GoalSummary[];
  
  // Data points collected (ABA-specific)
  dataPoints: DataPoint[];
  
  // Metadata
  createdAt: string;
  _mock: boolean;
}

export interface GoalSummary {
  id: string;
  name: string;
  targetDescription: string;
  currentProgress: number; // 0-100
  status: "active" | "completed" | "paused";
}

export interface DataPoint {
  id: string;
  type: string; // e.g., "trial", "prompt_level", "behavior_count"
  label: string;
  value: number | string | boolean;
  timestamp: string;
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

  // TODO: Query the sessions table once it exists
  // const { db } = await import("@/db");
  // const { sessions, children, therapists } = await import("@/db/schema");
  //
  // const session = await db.query.sessions.findFirst({
  //   where: eq(sessions.id, input.sessionId),
  //   with: {
  //     child: true,
  //     therapist: true,
  //     goalsAddressed: true,
  //     dataPoints: true,
  //   },
  // });
  //
  // if (!session) {
  //   throw new SessionNotFoundError(input.sessionId);
  // }
  //
  // // Verify user has access to this child
  // await verifyChildAccess(session.childId, context);

  // For MVP, sessions table doesn't exist yet
  // Return mock data for any valid UUID
  // In production, this would query the database
  
  // Return mock session data
  const mockSession = generateMockSessionDetail(input.sessionId);

  return mockSession;
}

/**
 * Generate mock session detail for MVP
 */
function generateMockSessionDetail(sessionId: string): SessionDetail {
  const types: SessionType[] = ["ABA", "OT", "SLP", "other"];
  const type = types[Math.floor(Math.random() * types.length)] as SessionType;
  
  const startDate = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
  const durationMinutes = 30 + Math.floor(Math.random() * 60);

  // Generate sample data points based on session type
  const dataPoints: DataPoint[] = [];
  
  if (type === "ABA") {
    // ABA-specific data points
    dataPoints.push(
      {
        id: "dp-1",
        type: "trial",
        label: "Requesting 'more'",
        value: 8, // successful trials out of 10
        timestamp: startDate.toISOString(),
      },
      {
        id: "dp-2",
        type: "prompt_level",
        label: "Average prompt level",
        value: "partial physical",
        timestamp: startDate.toISOString(),
      },
      {
        id: "dp-3",
        type: "behavior_count",
        label: "Self-stimulatory behaviors",
        value: 3,
        timestamp: startDate.toISOString(),
      }
    );
  } else if (type === "SLP") {
    // Speech therapy data points
    dataPoints.push(
      {
        id: "dp-1",
        type: "articulation",
        label: "/s/ sound accuracy",
        value: 70,
        timestamp: startDate.toISOString(),
      },
      {
        id: "dp-2",
        type: "vocabulary",
        label: "New words practiced",
        value: 5,
        timestamp: startDate.toISOString(),
      }
    );
  }

  // Generate sample goals addressed
  const goalsAddressed: GoalSummary[] = [
    {
      id: "goal-1",
      name: "Request preferred items",
      targetDescription: "Child will independently request preferred items using AAC device in 8/10 trials",
      currentProgress: 60,
      status: "active",
    },
    {
      id: "goal-2",
      name: "Social greetings",
      targetDescription: "Child will respond to greetings from peers within 5 seconds",
      currentProgress: 45,
      status: "active",
    },
  ];

  const notesContent = type === "ABA" 
    ? `Today's ABA session focused on manding (requesting) skills. Child showed good engagement throughout the session.

Key observations:
- Independently requested "more" crackers 6 times
- Required partial physical prompting for "help" requests
- Showed frustration during transition from preferred activity (3 instances of crying)
- Recovered quickly with visual timer support

Recommendations:
- Continue working on "help" requests with fading prompts
- Introduce visual timer earlier in transition sequences
- Consider adding "break" card to communication board`
    : `Session notes for ${type} therapy. Child was engaged and made progress on current goals.

Activities completed:
- Warm-up exercises
- Target skill practice
- Generalization activities

Overall mood: Good
Cooperation level: 4/5`;

  return {
    id: sessionId,
    childId: "mock-child-id",
    childName: "Mock Child",
    type,
    startedAt: startDate.toISOString(),
    endedAt: new Date(startDate.getTime() + durationMinutes * 60 * 1000).toISOString(),
    durationMinutes,
    therapistId: "mock-therapist-id",
    therapistName: "Dr. Sarah Johnson",
    therapistEmail: "sarah.johnson@therapy.example",
    notes: notesContent,
    goalsAddressed,
    dataPoints,
    createdAt: startDate.toISOString(),
    _mock: true,
  };
}

// ============================================================================
// Export
// ============================================================================

export const getSessionTool = createReadOnlyTool(
  "get_session",
  "Get full details of a specific therapy session including complete notes, data points collected, and goals that were addressed. Use this to review detailed session information for progress analysis or discussion with caregivers.",
  inputSchema,
  getSession
);
