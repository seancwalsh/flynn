/**
 * Session Tools Tests (list_sessions and get_session)
 * 
 * Tests for therapy session listing and retrieval.
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
  createTestSession,
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
    test("returns sessions from database", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      
      // Create test sessions
      await createTestSession(child.id, { therapyType: "aba" });
      await createTestSession(child.id, { therapyType: "slp" });

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
      };
      
      expect(data.sessions).toBeInstanceOf(Array);
      expect(data.totalCount).toBeGreaterThan(0);
    });

    test("accepts type filter", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      
      await createTestSession(child.id, { therapyType: "aba" });
      await createTestSession(child.id, { therapyType: "slp" });

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
      
      // Create multiple sessions
      for (let i = 0; i < 10; i++) {
        await createTestSession(child.id);
      }

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
      
      await createTestSession(child.id, { therapyType: "aba", durationMinutes: 45 });

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
        expect(session).toHaveProperty("sessionDate");
        expect(session).toHaveProperty("durationMinutes");
      }
    });
  });
  
  describe("empty results", () => {
    test("returns empty array when no sessions exist", async () => {
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
      
      const data = result.data as { sessions: unknown[]; totalCount: number };
      expect(data.sessions).toEqual([]);
      expect(data.totalCount).toBe(0);
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
    test("returns session from database", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const session = await createTestSession(child.id, { 
        therapyType: "aba",
        notes: "Test session notes" 
      });

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "get_session",
        { sessionId: session.id },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as { 
        id: string;
        childId: string;
        notes: string | null;
      };
      expect(data.id).toBe(session.id);
      expect(data.childId).toBe(child.id);
      expect(data.notes).toBe("Test session notes");
    });
    
    test("returns not found for non-existent session", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "get_session",
        { sessionId: "00000000-0000-0000-0000-000000000000" },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("response structure", () => {
    test("includes full session details", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const session = await createTestSession(child.id, { 
        therapyType: "aba",
        durationMinutes: 45,
        notes: "Detailed notes"
      });

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "get_session",
        { sessionId: session.id },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        id: string;
        childId: string;
        type: string;
        sessionDate: string;
        durationMinutes: number | null;
        notes: string | null;
        goalsWorkedOn: Array<{ id: string; title: string }>;
      };
      
      expect(data).toHaveProperty("id");
      expect(data).toHaveProperty("childId");
      expect(data).toHaveProperty("type");
      expect(data).toHaveProperty("sessionDate");
      expect(data).toHaveProperty("notes");
      expect(data).toHaveProperty("goalsWorkedOn");
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
