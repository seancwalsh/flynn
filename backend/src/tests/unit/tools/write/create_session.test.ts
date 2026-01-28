/**
 * create_session Tool Tests
 *
 * Tests for the create_session write tool.
 * Write operations require comprehensive testing for safety.
 */

import { describe, test, expect, beforeEach, afterAll } from "bun:test";
import { createSessionTool } from "../../../../tools/write/create_session";
import { ToolExecutor, resetToolExecutor } from "../../../../services/tool-executor";
import type { ToolContext } from "../../../../types/claude";
import {
  closeTestDb,
  setupTestDatabase,
  cleanTestData,
} from "../../../setup";
import {
  createTestFamily,
  createTestChild,
  createTestCaregiver,
} from "../../../fixtures";

// ============================================================================
// Test Setup
// ============================================================================

let executor: ToolExecutor;

beforeEach(async () => {
  executor = new ToolExecutor();
  executor.registerTool(createSessionTool);
  resetToolExecutor();

  await setupTestDatabase();
  await cleanTestData();
});

afterAll(async () => {
  await closeTestDb();
});

// ============================================================================
// Tests
// ============================================================================

describe("create_session tool", () => {
  describe("authorization", () => {
    test("creates session for authorized user", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const today = new Date().toISOString().split("T")[0] as string;
      const result = await executor.executeTool(
        "create_session",
        {
          childId: child.id,
          type: "ABA",
          date: today,
          durationMinutes: 45,
          notes: "Good session today",
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    test("throws UNAUTHORIZED for user without access", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);

      const context: ToolContext = {
        userId: "unauthorized@example.com",
      };

      const today = new Date().toISOString().split("T")[0] as string;
      const result = await executor.executeTool(
        "create_session",
        {
          childId: child.id,
          type: "ABA",
          date: today,
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("access");
    });

    test("throws error when user ID is missing", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);

      const context: ToolContext = {
        userId: "", // Empty user ID
      };

      const today = new Date().toISOString().split("T")[0] as string;
      const result = await executor.executeTool(
        "create_session",
        {
          childId: child.id,
          type: "ABA",
          date: today,
        },
        context
      );

      expect(result.success).toBe(false);
    });
  });

  describe("input validation", () => {
    test("validates required fields - childId", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const today = new Date().toISOString().split("T")[0] as string;
      const result = await executor.executeTool(
        "create_session",
        {
          type: "ABA",
          date: today,
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });

    test("validates required fields - type", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const today = new Date().toISOString().split("T")[0] as string;
      const result = await executor.executeTool(
        "create_session",
        {
          childId: child.id,
          date: today,
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });

    test("validates required fields - date", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_session",
        {
          childId: child.id,
          type: "ABA",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });

    test("validates date format - requires YYYY-MM-DD", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_session",
        {
          childId: child.id,
          type: "ABA",
          date: "01/15/2024", // Wrong format
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("YYYY-MM-DD");
    });

    test("validates date format - rejects ISO datetime", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_session",
        {
          childId: child.id,
          type: "ABA",
          date: new Date().toISOString(), // Full ISO, not just date
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("YYYY-MM-DD");
    });

    test("validates duration range - minimum 1 minute", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const today = new Date().toISOString().split("T")[0] as string;
      const result = await executor.executeTool(
        "create_session",
        {
          childId: child.id,
          type: "ABA",
          date: today,
          durationMinutes: 0,
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("at least 1");
    });

    test("validates duration range - maximum 480 minutes", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const today = new Date().toISOString().split("T")[0] as string;
      const result = await executor.executeTool(
        "create_session",
        {
          childId: child.id,
          type: "ABA",
          date: today,
          durationMinutes: 500,
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("480");
    });

    test("validates duration must be integer", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const today = new Date().toISOString().split("T")[0] as string;
      const result = await executor.executeTool(
        "create_session",
        {
          childId: child.id,
          type: "ABA",
          date: today,
          durationMinutes: 45.5,
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("whole number");
    });

    test("validates childId format - must be UUID", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const today = new Date().toISOString().split("T")[0] as string;
      const result = await executor.executeTool(
        "create_session",
        {
          childId: "not-a-uuid",
          type: "ABA",
          date: today,
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid");
    });

    test("validates session type enum", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const today = new Date().toISOString().split("T")[0] as string;
      const result = await executor.executeTool(
        "create_session",
        {
          childId: child.id,
          type: "INVALID_TYPE",
          date: today,
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });

    test("validates goalsWorkedOn contains valid UUIDs", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const today = new Date().toISOString().split("T")[0] as string;
      const result = await executor.executeTool(
        "create_session",
        {
          childId: child.id,
          type: "ABA",
          date: today,
          goalsWorkedOn: [{ goalId: "not-a-uuid" }],
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid");
    });
  });

  describe("business logic validation", () => {
    test("rejects future dates", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      const futureDateStr = futureDate.toISOString().split("T")[0] as string;

      const result = await executor.executeTool(
        "create_session",
        {
          childId: child.id,
          type: "ABA",
          date: futureDateStr,
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("future");
    });

    test("rejects dates more than 1 year in the past", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 2);
      const oldDateStr = oldDate.toISOString().split("T")[0] as string;

      const result = await executor.executeTool(
        "create_session",
        {
          childId: child.id,
          type: "ABA",
          date: oldDateStr,
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("1 year");
    });

    test("accepts today's date", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const today = new Date().toISOString().split("T")[0] as string;
      const result = await executor.executeTool(
        "create_session",
        {
          childId: child.id,
          type: "ABA",
          date: today,
        },
        context
      );

      expect(result.success).toBe(true);
    });

    test("accepts past dates within 1 year", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 6);
      const pastDateStr = pastDate.toISOString().split("T")[0] as string;

      const result = await executor.executeTool(
        "create_session",
        {
          childId: child.id,
          type: "ABA",
          date: pastDateStr,
        },
        context
      );

      expect(result.success).toBe(true);
    });
  });

  describe("response structure", () => {
    test("returns created session with ID", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const today = new Date().toISOString().split("T")[0] as string;
      const result = await executor.executeTool(
        "create_session",
        {
          childId: child.id,
          type: "OT",
          date: today,
          durationMinutes: 60,
          notes: "Worked on fine motor skills",
        },
        context
      );

      expect(result.success).toBe(true);

      const data = result.data as {
        session: {
          id: string;
          childId: string;
          type: string;
          date: string;
          durationMinutes: number;
          notes: string;
          createdAt: string;
          goalsWorkedOn: Array<{ goalId: string }>;
        };
        message: string;
      };

      expect(data.session).toBeDefined();
      expect(data.session.id).toBeDefined();
      expect(typeof data.session.id).toBe("string");
      expect(data.session.childId).toBe(child.id);
      expect(data.session.type).toBe("OT");
      expect(data.session.date).toBe(today);
      expect(data.session.durationMinutes).toBe(60);
      expect(data.session.notes).toBe("Worked on fine motor skills");
      expect(data.session.createdAt).toBeDefined();
      expect(data.message).toContain("Successfully");
    });

    test("persists session to database", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const today = new Date().toISOString().split("T")[0] as string;
      const result = await executor.executeTool(
        "create_session",
        {
          childId: child.id,
          type: "ABA",
          date: today,
        },
        context
      );

      expect(result.success).toBe(true);

      const data = result.data as { session: { id: string } };
      
      // Verify session exists in database
      const { db } = await import("../../../../db");
      const { therapySessions } = await import("../../../../db/schema");
      const { eq } = await import("drizzle-orm");
      
      const dbSession = await db.query.therapySessions.findFirst({
        where: eq(therapySessions.id, data.session.id),
      });
      
      expect(dbSession).toBeDefined();
      expect(dbSession?.childId).toBe(child.id);
    });

    test("handles optional fields correctly", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const today = new Date().toISOString().split("T")[0] as string;
      const result = await executor.executeTool(
        "create_session",
        {
          childId: child.id,
          type: "SLP",
          date: today,
          // durationMinutes, notes, goalsWorkedOn all omitted
        },
        context
      );

      expect(result.success).toBe(true);

      const data = result.data as {
        session: {
          durationMinutes: number | null;
          notes: string | null;
          goalsWorkedOn: Array<{ goalId: string }>;
        };
      };

      expect(data.session.durationMinutes).toBeNull();
      expect(data.session.notes).toBeNull();
      expect(data.session.goalsWorkedOn).toEqual([]);
    });
  });

  describe("session types", () => {
    test("accepts ABA session type", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const today = new Date().toISOString().split("T")[0] as string;
      const result = await executor.executeTool(
        "create_session",
        { childId: child.id, type: "ABA", date: today },
        context
      );

      expect(result.success).toBe(true);
    });

    test("accepts OT session type", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const today = new Date().toISOString().split("T")[0] as string;
      const result = await executor.executeTool(
        "create_session",
        { childId: child.id, type: "OT", date: today },
        context
      );

      expect(result.success).toBe(true);
    });

    test("accepts SLP session type", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const today = new Date().toISOString().split("T")[0] as string;
      const result = await executor.executeTool(
        "create_session",
        { childId: child.id, type: "SLP", date: today },
        context
      );

      expect(result.success).toBe(true);
    });

    test("accepts other session type", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const today = new Date().toISOString().split("T")[0] as string;
      const result = await executor.executeTool(
        "create_session",
        { childId: child.id, type: "other", date: today },
        context
      );

      expect(result.success).toBe(true);
    });
  });
});
