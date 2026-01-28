/**
 * update_goal Tool Tests
 *
 * Tests for the update_goal write tool.
 */

import { describe, test, expect, beforeEach, afterAll } from "bun:test";
import { updateGoalTool } from "../../../../tools/write/update_goal";
import { ToolExecutor, resetToolExecutor } from "../../../../services/tool-executor";
import type { ToolContext } from "../../../../types/claude";
import {
  closeTestDb,
  setupTestDatabase,
  cleanTestData,
} from "../../../setup";
import { createTestFamily, createTestChild, createTestCaregiver, createTestGoal } from "../../../fixtures";

// ============================================================================
// Test Setup
// ============================================================================

let executor: ToolExecutor;

beforeEach(async () => {
  executor = new ToolExecutor();
  executor.registerTool(updateGoalTool);
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

describe("update_goal tool", () => {
  describe("authorization", () => {
    test("updates goal for authorized user", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const goal = await createTestGoal(child.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: goal.id,
          progress: 75,
        },
        context
      );

      expect(result.success).toBe(true);
    });

    test("throws UNAUTHORIZED for user without access", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const goal = await createTestGoal(child.id);

      const context: ToolContext = {
        userId: "unauthorized@example.com",
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: goal.id,
          progress: 50,
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/access/i);
    });
  });

  describe("input validation", () => {
    test("validates required goalId", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          progress: 50,
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });

    test("validates goalId format - must be UUID", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: "not-a-uuid",
          progress: 50,
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid");
    });

    test("requires at least one field to update", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const goal = await createTestGoal(child.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: goal.id,
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("At least one field");
    });

    test("validates progress range - minimum 0", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          progress: -10,
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("negative");
    });

    test("validates progress range - maximum 100", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          progress: 150,
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("100");
    });

    test("validates progress must be integer", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          progress: 50.5,
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("whole number");
    });

    test("validates status enum", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          status: "invalid_status",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid");
    });
  });

  describe("business logic validation", () => {
    test("rejects achieved status with progress not 100", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const goal = await createTestGoal(child.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: goal.id,
          status: "achieved",
          progress: 80,
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("100");
    });

    test("suggests completion when progress reaches 100", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const goal = await createTestGoal(child.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: goal.id,
          progress: 100,
        },
        context
      );

      expect(result.success).toBe(true);
      const data = result.data as { suggestCompletion: boolean };
      expect(data.suggestCompletion).toBe(true);
    });

    test("accepts achieved status with progress 100", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const goal = await createTestGoal(child.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: goal.id,
          status: "achieved",
          progress: 100,
        },
        context
      );

      expect(result.success).toBe(true);
    });

    test("accepts achieved status without explicit progress", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const goal = await createTestGoal(child.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: goal.id,
          status: "achieved",
        },
        context
      );

      expect(result.success).toBe(true);
    });
  });

  describe("response structure", () => {
    test("returns updated goal", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const goal = await createTestGoal(child.id, { title: "Original Goal" });

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: goal.id,
          status: "active",
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
          status: string;
        };
        message: string;
      };

      expect(data.goal).toBeDefined();
      expect(data.goal.id).toBe(goal.id);
      expect(data.goal.childId).toBe(child.id);
      expect(data.goal.title).toBe("Original Goal");
      expect(data.message).toContain("Successfully");
    });

    test("message lists updated fields", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const goal = await createTestGoal(child.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: goal.id,
          progress: 50,
        },
        context
      );

      expect(result.success).toBe(true);

      const data = result.data as { message: string };
      expect(data.message).toContain("progress");
    });
  });

  describe("partial updates", () => {
    test("allows updating only status", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const goal = await createTestGoal(child.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: goal.id,
          status: "paused",
        },
        context
      );

      expect(result.success).toBe(true);
    });

    test("allows updating only progress", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const goal = await createTestGoal(child.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: goal.id,
          progress: 45,
        },
        context
      );

      expect(result.success).toBe(true);
    });
  });

  describe("status transitions", () => {
    test("accepts active status", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const goal = await createTestGoal(child.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        { goalId: goal.id, status: "active" },
        context
      );

      expect(result.success).toBe(true);
    });

    test("accepts paused status", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const goal = await createTestGoal(child.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        { goalId: goal.id, status: "paused" },
        context
      );

      expect(result.success).toBe(true);
    });

    test("accepts achieved status", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const goal = await createTestGoal(child.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        { goalId: goal.id, status: "achieved" },
        context
      );

      expect(result.success).toBe(true);
    });

    test("accepts discontinued status", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const goal = await createTestGoal(child.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        { goalId: goal.id, status: "discontinued" },
        context
      );

      expect(result.success).toBe(true);
    });
  });
});
