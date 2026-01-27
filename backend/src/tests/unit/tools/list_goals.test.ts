/**
 * list_goals Tool Tests
 * 
 * This tool currently returns mock data since the goals table
 * doesn't exist yet. Tests verify the interface and authorization.
 */

import { describe, test, expect, beforeEach, afterAll } from "bun:test";
import { listGoalsTool } from "../../../tools/read/list_goals";
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
  executor.registerTool(listGoalsTool);
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

describe("list_goals tool", () => {
  describe("authorization", () => {
    test("verifies child access", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      
      const context: ToolContext = {
        userId: "unauthorized@example.com",
      };

      const result = await executor.executeTool(
        "list_goals",
        { childId: child.id },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("access");
    });

    test("allows authorized user", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "list_goals",
        { childId: child.id },
        context
      );

      expect(result.success).toBe(true);
    });
  });

  describe("status filtering", () => {
    test("returns all goals by default", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "list_goals",
        { childId: child.id },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        goals: Array<{ status: string }>;
        countByStatus: { active: number; completed: number; paused: number };
      };
      
      // Should have goals of multiple statuses
      const statuses = [...new Set(data.goals.map(g => g.status))];
      expect(statuses.length).toBeGreaterThan(1);
    });

    test("filters by active status", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "list_goals",
        { childId: child.id, status: "active" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        goals: Array<{ status: string }>;
      };
      
      for (const goal of data.goals) {
        expect(goal.status).toBe("active");
      }
    });

    test("filters by completed status", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "list_goals",
        { childId: child.id, status: "completed" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        goals: Array<{ status: string }>;
      };
      
      for (const goal of data.goals) {
        expect(goal.status).toBe("completed");
      }
    });

    test("filters by paused status", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "list_goals",
        { childId: child.id, status: "paused" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        goals: Array<{ status: string }>;
      };
      
      for (const goal of data.goals) {
        expect(goal.status).toBe("paused");
      }
    });

    test("handles all status filter", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "list_goals",
        { childId: child.id, status: "all" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        goals: Array<{ status: string }>;
        totalCount: number;
      };
      
      expect(data.totalCount).toBeGreaterThan(0);
    });
  });

  describe("response structure", () => {
    test("includes goal details", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "list_goals",
        { childId: child.id },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        goals: Array<{
          id: string;
          name: string;
          description: string;
          targetDescription: string;
          therapyType: string;
          status: string;
          targetValue: number;
          currentValue: number;
          progressPercent: number;
        }>;
      };
      
      expect(data.goals.length).toBeGreaterThan(0);
      
      const goal = data.goals[0];
      expect(goal).toHaveProperty("id");
      expect(goal).toHaveProperty("name");
      expect(goal).toHaveProperty("description");
      expect(goal).toHaveProperty("targetDescription");
      expect(goal).toHaveProperty("therapyType");
      expect(goal).toHaveProperty("status");
      expect(goal).toHaveProperty("targetValue");
      expect(goal).toHaveProperty("currentValue");
      expect(goal).toHaveProperty("progressPercent");
    });

    test("includes therapy type", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "list_goals",
        { childId: child.id },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        goals: Array<{ therapyType: string }>;
      };
      
      const validTypes = ["ABA", "OT", "SLP", "other"];
      for (const goal of data.goals) {
        expect(validTypes).toContain(goal.therapyType);
      }
    });

    test("includes progress percentage", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "list_goals",
        { childId: child.id },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        goals: Array<{ progressPercent: number }>;
      };
      
      for (const goal of data.goals) {
        expect(goal.progressPercent).toBeGreaterThanOrEqual(0);
        expect(goal.progressPercent).toBeLessThanOrEqual(100);
      }
    });

    test("includes session count for each goal", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "list_goals",
        { childId: child.id },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        goals: Array<{ totalSessionsAddressed: number }>;
      };
      
      for (const goal of data.goals) {
        expect(typeof goal.totalSessionsAddressed).toBe("number");
        expect(goal.totalSessionsAddressed).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe("count by status", () => {
    test("includes count breakdown", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "list_goals",
        { childId: child.id },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        countByStatus: {
          active: number;
          completed: number;
          paused: number;
        };
      };
      
      expect(typeof data.countByStatus.active).toBe("number");
      expect(typeof data.countByStatus.completed).toBe("number");
      expect(typeof data.countByStatus.paused).toBe("number");
    });

    test("count sums match total goals", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "list_goals",
        { childId: child.id, status: "all" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        totalCount: number;
        countByStatus: {
          active: number;
          completed: number;
          paused: number;
        };
      };
      
      const sumOfCounts = 
        data.countByStatus.active + 
        data.countByStatus.completed + 
        data.countByStatus.paused;
      
      expect(sumOfCounts).toBe(data.totalCount);
    });
  });

  describe("mock data indicator", () => {
    test("indicates mock data", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "list_goals",
        { childId: child.id },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as { _mock: boolean };
      expect(data._mock).toBe(true);
    });
  });

  describe("input validation", () => {
    test("rejects invalid childId", async () => {
      const context: ToolContext = {
        userId: "test@example.com",
      };

      const result = await executor.executeTool(
        "list_goals",
        { childId: "invalid-uuid" },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid");
    });

    test("rejects invalid status", async () => {
      const context: ToolContext = {
        userId: "test@example.com",
      };

      const result = await executor.executeTool(
        "list_goals",
        { 
          childId: "00000000-0000-0000-0000-000000000000",
          status: "invalid" 
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });

    test("requires childId", async () => {
      const context: ToolContext = {
        userId: "test@example.com",
      };

      const result = await executor.executeTool(
        "list_goals",
        {},
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });
  });
});
