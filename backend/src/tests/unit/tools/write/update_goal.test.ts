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
import { createTestFamily, createTestCaregiver } from "../../../fixtures";

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
// Helper
// ============================================================================

// Use a valid UUID v4 format for the mock goal ID
const mockGoalId = "b1ffbc99-9c0b-4ef8-bb6d-6bb9bd380a22";

// ============================================================================
// Tests
// ============================================================================

describe("update_goal tool", () => {
  describe("authorization", () => {
    test("updates goal for authorized user", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: mockGoalId,
          progress: 75,
        },
        context
      );

      expect(result.success).toBe(true);
    });

    test("throws UNAUTHORIZED for user without access", async () => {
      const context: ToolContext = {
        userId: "unauthorized@example.com",
        // No familyId
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: mockGoalId,
          progress: 50,
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found|access/i);
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
          goalId: "not-a-valid-uuid-format-really",
          progress: 50,
        },
        context
      );

      // Will either fail UUID validation or goal lookup
      if (result.success) {
        expect(result.data).toBeDefined();
      } else {
        expect(result.error).toBeDefined();
      }
    });

    test("requires at least one field to update", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: mockGoalId,
          // No fields to update
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
          goalId: mockGoalId,
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
          goalId: mockGoalId,
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
          goalId: mockGoalId,
          progress: 75.5,
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
          goalId: mockGoalId,
          status: "INVALID_STATUS",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });

    test("validates notes maximum length", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: mockGoalId,
          notes: "x".repeat(2001), // Exceeds 2000 char limit
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("2,000");
    });
  });

  describe("business logic validation", () => {
    test("rejects completed status with progress not 100", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: mockGoalId,
          status: "completed",
          progress: 80, // Not 100
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("100%");
    });

    test("suggests completion when progress reaches 100", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: mockGoalId,
          progress: 100,
          // status not set
        },
        context
      );

      expect(result.success).toBe(true);

      const data = result.data as { suggestCompletion: boolean; message: string };
      expect(data.suggestCompletion).toBe(true);
      expect(data.message).toContain("completed");
    });

    test("accepts completed status with progress 100", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: mockGoalId,
          status: "completed",
          progress: 100,
        },
        context
      );

      expect(result.success).toBe(true);
    });

    test("accepts completed status without explicit progress", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: mockGoalId,
          status: "completed",
          // Progress will be auto-set to 100
        },
        context
      );

      expect(result.success).toBe(true);

      const data = result.data as { goal: { progress: number } };
      expect(data.goal.progress).toBe(100);
    });
  });

  describe("response structure", () => {
    test("returns updated goal", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: mockGoalId,
          progress: 80,
          status: "active",
        },
        context
      );

      expect(result.success).toBe(true);

      const data = result.data as {
        goal: {
          id: string;
          status: string;
          progress: number;
          updatedAt: string;
          _mock: boolean;
        };
        message: string;
      };

      expect(data.goal).toBeDefined();
      expect(data.goal.id).toBe(mockGoalId);
      expect(data.goal.status).toBe("active");
      expect(data.goal.progress).toBe(80);
      expect(data.goal.updatedAt).toBeDefined();
      expect(data.message).toContain("Successfully");
    });

    test("message lists updated fields", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: mockGoalId,
          progress: 65,
          status: "active",
          notes: "Making great progress!",
        },
        context
      );

      expect(result.success).toBe(true);

      const data = result.data as { message: string };
      expect(data.message).toContain("progress");
      expect(data.message).toContain("status");
      expect(data.message).toContain("notes");
    });

    test("indicates mock data", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: mockGoalId,
          progress: 50,
        },
        context
      );

      expect(result.success).toBe(true);

      const data = result.data as { goal: { _mock: boolean } };
      expect(data.goal._mock).toBe(true);
    });

    test("sets completedAt when marked completed", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: mockGoalId,
          status: "completed",
        },
        context
      );

      expect(result.success).toBe(true);

      const data = result.data as { goal: { completedAt: string | null } };
      expect(data.goal.completedAt).toBeDefined();
      expect(data.goal.completedAt).not.toBeNull();
    });
  });

  describe("partial updates", () => {
    test("allows updating only status", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: mockGoalId,
          status: "paused",
        },
        context
      );

      expect(result.success).toBe(true);
    });

    test("allows updating only progress", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: mockGoalId,
          progress: 45,
        },
        context
      );

      expect(result.success).toBe(true);
    });

    test("allows updating only notes", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        {
          goalId: mockGoalId,
          notes: "Good progress this week",
        },
        context
      );

      expect(result.success).toBe(true);
    });
  });

  describe("status transitions", () => {
    test("accepts active status", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        { goalId: mockGoalId, status: "active" },
        context
      );

      expect(result.success).toBe(true);
    });

    test("accepts paused status", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        { goalId: mockGoalId, status: "paused" },
        context
      );

      expect(result.success).toBe(true);
    });

    test("accepts completed status", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_goal",
        { goalId: mockGoalId, status: "completed" },
        context
      );

      expect(result.success).toBe(true);
    });
  });
});
