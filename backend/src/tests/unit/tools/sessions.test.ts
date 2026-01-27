/**
 * Session Tools Tests (list_sessions and get_session)
 * 
 * These tools currently return mock data since the sessions table
 * doesn't exist yet. Tests verify the interface and authorization.
 */

import { describe, test, expect, beforeEach, afterAll } from "bun:test";
import { listSessionsTool } from "../../../tools/read/list_sessions";
import { getSessionTool } from "../../../tools/read/get_session";
import { ToolExecutor, resetToolExecutor } from "../../../services/tool-executor";
import type { ToolContext } from "../../../types/claude";
import { 
  closeTestDb, 
  setupTestDatabase, 
  cleanTestData 
} from "../../setup";
import { 
  createTestFamily, 
  createTestChild, 
  createTestCaregiver,
} from "../../fixtures";

// ============================================================================
// Test Setup
// ============================================================================

let executor: ToolExecutor;

beforeEach(async () => {
  executor = new ToolExecutor();
  executor.registerTool(listSessionsTool);
  executor.registerTool(getSessionTool);
  resetToolExecutor();
  
  await setupTestDatabase();
  await cleanTestData();
});

afterAll(async () => {
  await closeTestDb();
});

// ============================================================================
// list_sessions Tests
// ============================================================================

describe("list_sessions tool", () => {
  describe("authorization", () => {
    test("requires user ID", async () => {
      const context: ToolContext = {
        userId: "",
      };

      const result = await executor.executeTool(
        "list_sessions",
        {},
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("User ID is required");
    });

    test("verifies access when childId is provided", async () => {
      // Create test data
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      
      // User without access
      const context: ToolContext = {
        userId: "unauthorized@example.com",
      };

      const result = await executor.executeTool(
        "list_sessions",
        { childId: child.id },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("access");
    });

    test("allows authorized user to list sessions", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "list_sessions",
        { childId: child.id },
        context
      );

      expect(result.success).toBe(true);
    });
  });

  describe("filtering", () => {
    test("returns mock sessions (currently)", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "list_sessions",
        { childId: child.id },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as { 
        sessions: unknown[];
        totalCount: number;
        _mock: boolean;
      };
      
      expect(data._mock).toBe(true);
      expect(data.sessions).toBeInstanceOf(Array);
    });

    test("accepts type filter", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "list_sessions",
        { childId: child.id, type: "ABA" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as { 
        sessions: Array<{ type: string }>;
      };
      
      // All sessions should be ABA type
      for (const session of data.sessions) {
        expect(session.type).toBe("ABA");
      }
    });

    test("accepts date range filters", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "list_sessions",
        { 
          childId: child.id, 
          startDate: "2024-01-01",
          endDate: "2024-12-31",
        },
        context
      );

      expect(result.success).toBe(true);
    });

    test("respects limit parameter", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "list_sessions",
        { childId: child.id, limit: 5 },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as { sessions: unknown[] };
      expect(data.sessions.length).toBeLessThanOrEqual(5);
    });
  });

  describe("input validation", () => {
    test("rejects invalid childId format", async () => {
      const context: ToolContext = {
        userId: "test@example.com",
      };

      const result = await executor.executeTool(
        "list_sessions",
        { childId: "invalid-uuid" },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid");
    });

    test("rejects invalid date format", async () => {
      const context: ToolContext = {
        userId: "test@example.com",
      };

      const result = await executor.executeTool(
        "list_sessions",
        { startDate: "01-15-2024" }, // Wrong format
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("YYYY-MM-DD");
    });

    test("rejects invalid session type", async () => {
      const context: ToolContext = {
        userId: "test@example.com",
      };

      const result = await executor.executeTool(
        "list_sessions",
        { type: "INVALID_TYPE" },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });

    test("rejects limit out of range", async () => {
      const context: ToolContext = {
        userId: "test@example.com",
      };

      const result = await executor.executeTool(
        "list_sessions",
        { limit: 200 }, // Max is 100
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });
  });

  describe("response structure", () => {
    test("includes session summaries with required fields", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "list_sessions",
        { childId: child.id, limit: 1 },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as { 
        sessions: Array<{
          id: string;
          childId: string;
          type: string;
          startedAt: string;
          durationMinutes: number | null;
        }>;
      };
      
      if (data.sessions.length > 0) {
        const session = data.sessions[0];
        expect(session).toHaveProperty("id");
        expect(session).toHaveProperty("childId");
        expect(session).toHaveProperty("type");
        expect(session).toHaveProperty("startedAt");
        expect(session).toHaveProperty("durationMinutes");
      }
    });
  });
});

// ============================================================================
// get_session Tests
// ============================================================================

describe("get_session tool", () => {
  describe("authorization", () => {
    test("requires user ID", async () => {
      const context: ToolContext = {
        userId: "",
      };

      const result = await executor.executeTool(
        "get_session",
        { sessionId: "00000000-0000-0000-0000-000000000000" },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("User ID is required");
    });
  });

  describe("session retrieval", () => {
    test("returns mock data for any valid UUID (sessions table not yet implemented)", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      // For MVP, sessions table doesn't exist yet, so we always return mock data
      const result = await executor.executeTool(
        "get_session",
        { sessionId: "00000000-0000-0000-0000-000000000000" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as { _mock: boolean };
      expect(data._mock).toBe(true);
    });
  });

  describe("mock session retrieval", () => {
    test("returns mock session detail for mock session ID", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      // Use a valid RFC 4122 UUID for the session ID
      const result = await executor.executeTool(
        "get_session",
        { sessionId: "550e8400-e29b-41d4-a716-446655440001" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        id: string;
        notes: string;
        goalsAddressed: unknown[];
        dataPoints: unknown[];
        _mock: boolean;
      };
      
      expect(data._mock).toBe(true);
      expect(data.notes).toBeDefined();
      expect(data.goalsAddressed).toBeInstanceOf(Array);
      expect(data.dataPoints).toBeInstanceOf(Array);
    });
  });

  describe("response structure", () => {
    test("includes full session details", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      // Use a valid RFC 4122 UUID for the session ID
      const result = await executor.executeTool(
        "get_session",
        { sessionId: "550e8400-e29b-41d4-a716-446655440002" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        id: string;
        childId: string;
        type: string;
        startedAt: string;
        endedAt: string | null;
        durationMinutes: number | null;
        therapistId: string | null;
        therapistName: string | null;
        notes: string | null;
        goalsAddressed: Array<{ id: string; name: string }>;
        dataPoints: Array<{ type: string; label: string; value: unknown }>;
      };
      
      expect(data).toHaveProperty("id");
      expect(data).toHaveProperty("childId");
      expect(data).toHaveProperty("type");
      expect(data).toHaveProperty("startedAt");
      expect(data).toHaveProperty("notes");
      expect(data).toHaveProperty("goalsAddressed");
      expect(data).toHaveProperty("dataPoints");
    });
  });

  describe("input validation", () => {
    test("rejects invalid UUID format", async () => {
      const context: ToolContext = {
        userId: "test@example.com",
      };

      const result = await executor.executeTool(
        "get_session",
        { sessionId: "not-a-uuid" },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid");
    });

    test("rejects missing sessionId", async () => {
      const context: ToolContext = {
        userId: "test@example.com",
      };

      const result = await executor.executeTool(
        "get_session",
        {},
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });
  });
});
