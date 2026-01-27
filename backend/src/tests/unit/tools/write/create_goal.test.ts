/**
 * create_goal Tool Tests
 *
 * Tests for the create_goal write tool.
 */

import { describe, test, expect, beforeEach, afterAll } from "bun:test";
import { createGoalTool } from "../../../../tools/write/create_goal";
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
  executor.registerTool(createGoalTool);
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

describe("create_goal tool", () => {
  describe("authorization", () => {
    test("creates goal for authorized user", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_goal",
        {
          childId: child.id,
          type: "ABA",
          title: "Request preferred items independently",
        },
        context
      );

      expect(result.success).toBe(true);
    });

    test("throws UNAUTHORIZED for user without access", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);

      const context: ToolContext = {
        userId: "unauthorized@example.com",
      };

      const result = await executor.executeTool(
        "create_goal",
        {
          childId: child.id,
          type: "ABA",
          title: "Test Goal",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("access");
    });
  });

  describe("input validation", () => {
    test("validates required childId", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_goal",
        {
          type: "ABA",
          title: "Test Goal",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });

    test("validates required type", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_goal",
        {
          childId: child.id,
          title: "Test Goal",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });

    test("validates required title", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_goal",
        {
          childId: child.id,
          type: "ABA",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });

    test("validates title minimum length", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_goal",
        {
          childId: child.id,
          type: "ABA",
          title: "AB", // Too short
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("at least 3");
    });

    test("validates title maximum length", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_goal",
        {
          childId: child.id,
          type: "ABA",
          title: "x".repeat(256), // Too long
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("255");
    });

    test("validates childId format - must be UUID", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_goal",
        {
          childId: "not-a-uuid",
          type: "ABA",
          title: "Test Goal",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid");
    });

    test("validates goal type enum", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_goal",
        {
          childId: child.id,
          type: "INVALID_TYPE",
          title: "Test Goal",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });

    test("validates targetDate format", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_goal",
        {
          childId: child.id,
          type: "ABA",
          title: "Test Goal",
          targetDate: "01/15/2025", // Wrong format
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("YYYY-MM-DD");
    });

    test("validates description maximum length", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_goal",
        {
          childId: child.id,
          type: "ABA",
          title: "Test Goal",
          description: "x".repeat(2001), // Exceeds 2000 char limit
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("2,000");
    });

    test("validates criteria maximum length", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_goal",
        {
          childId: child.id,
          type: "ABA",
          title: "Test Goal",
          criteria: "x".repeat(2001), // Exceeds 2000 char limit
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("2,000");
    });
  });

  describe("business logic validation", () => {
    test("rejects past target dates", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      const pastDateStr = pastDate.toISOString().split("T")[0] as string;

      const result = await executor.executeTool(
        "create_goal",
        {
          childId: child.id,
          type: "ABA",
          title: "Test Goal",
          targetDate: pastDateStr,
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("future");
    });

    test("rejects target dates more than 2 years in future", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const farFutureDate = new Date();
      farFutureDate.setFullYear(farFutureDate.getFullYear() + 3);
      const farFutureDateStr = farFutureDate.toISOString().split("T")[0] as string;

      const result = await executor.executeTool(
        "create_goal",
        {
          childId: child.id,
          type: "ABA",
          title: "Test Goal",
          targetDate: farFutureDateStr,
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("2 years");
    });

    test("accepts future target dates within 2 years", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 6);
      const futureDateStr = futureDate.toISOString().split("T")[0] as string;

      const result = await executor.executeTool(
        "create_goal",
        {
          childId: child.id,
          type: "ABA",
          title: "Test Goal",
          targetDate: futureDateStr,
        },
        context
      );

      expect(result.success).toBe(true);
    });
  });

  describe("response structure", () => {
    test("returns created goal with ID", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_goal",
        {
          childId: child.id,
          type: "SLP",
          title: "Improve articulation",
          description: "Work on /s/ sound production",
          criteria: "80% accuracy in structured activities",
        },
        context
      );

      expect(result.success).toBe(true);

      const data = result.data as {
        goal: {
          id: string;
          childId: string;
          type: string;
          title: string;
          description: string;
          criteria: string;
          status: string;
          progress: number;
          createdAt: string;
          updatedAt: string;
          _mock: boolean;
        };
        message: string;
      };

      expect(data.goal).toBeDefined();
      expect(data.goal.id).toBeDefined();
      expect(typeof data.goal.id).toBe("string");
      expect(data.goal.childId).toBe(child.id);
      expect(data.goal.type).toBe("SLP");
      expect(data.goal.title).toBe("Improve articulation");
      expect(data.goal.description).toBe("Work on /s/ sound production");
      expect(data.goal.criteria).toBe("80% accuracy in structured activities");
      expect(data.goal.status).toBe("active");
      expect(data.goal.progress).toBe(0);
      expect(data.message).toContain("Successfully");
    });

    test("indicates mock data", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_goal",
        {
          childId: child.id,
          type: "ABA",
          title: "Test Goal",
        },
        context
      );

      expect(result.success).toBe(true);

      const data = result.data as { goal: { _mock: boolean } };
      expect(data.goal._mock).toBe(true);
    });

    test("handles optional fields correctly", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_goal",
        {
          childId: child.id,
          type: "OT",
          title: "Minimal Goal",
          // description, targetDate, criteria all omitted
        },
        context
      );

      expect(result.success).toBe(true);

      const data = result.data as {
        goal: {
          description: string | null;
          targetDate: string | null;
          criteria: string | null;
        };
      };

      expect(data.goal.description).toBeNull();
      expect(data.goal.targetDate).toBeNull();
      expect(data.goal.criteria).toBeNull();
    });
  });

  describe("goal types", () => {
    test("accepts ABA goal type", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_goal",
        { childId: child.id, type: "ABA", title: "ABA Goal" },
        context
      );

      expect(result.success).toBe(true);
    });

    test("accepts OT goal type", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_goal",
        { childId: child.id, type: "OT", title: "OT Goal" },
        context
      );

      expect(result.success).toBe(true);
    });

    test("accepts SLP goal type", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_goal",
        { childId: child.id, type: "SLP", title: "SLP Goal" },
        context
      );

      expect(result.success).toBe(true);
    });

    test("accepts communication goal type", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_goal",
        { childId: child.id, type: "communication", title: "Communication Goal" },
        context
      );

      expect(result.success).toBe(true);
    });

    test("accepts other goal type", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_goal",
        { childId: child.id, type: "other", title: "Other Goal" },
        context
      );

      expect(result.success).toBe(true);
    });
  });
});
