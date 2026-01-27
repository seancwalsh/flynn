/**
 * get_progress_summary Tool Tests
 */

import { describe, test, expect, beforeEach, afterAll } from "bun:test";
import { getProgressSummaryTool } from "../../../tools/read/get_progress_summary";
import { ToolExecutor, resetToolExecutor } from "../../../services/tool-executor";
import type { ToolContext } from "../../../types/claude";
import { 
  getTestDb,
  closeTestDb, 
  setupTestDatabase, 
  cleanTestData 
} from "../../setup";
import { 
  createTestFamily, 
  createTestChild, 
  createTestCaregiver,
} from "../../fixtures";
import { usageLogs } from "../../../db/schema";

// ============================================================================
// Test Setup
// ============================================================================

let executor: ToolExecutor;

beforeEach(async () => {
  executor = new ToolExecutor();
  executor.registerTool(getProgressSummaryTool);
  resetToolExecutor();
  
  await setupTestDatabase();
  await cleanTestData();
});

afterAll(async () => {
  await closeTestDb();
});

// Helper to create usage logs
async function createUsageLogsWithDates(
  childId: string, 
  logs: Array<{ symbolId: string; timestamp: Date }>
) {
  const db = getTestDb();
  for (const log of logs) {
    await db.insert(usageLogs).values({
      childId,
      symbolId: log.symbolId,
      timestamp: log.timestamp,
    });
  }
}

// ============================================================================
// Tests
// ============================================================================

describe("get_progress_summary tool", () => {
  describe("authorization", () => {
    test("verifies child access", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      
      const context: ToolContext = {
        userId: "unauthorized@example.com",
      };

      const result = await executor.executeTool(
        "get_progress_summary",
        { childId: child.id, period: "week" },
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
        "get_progress_summary",
        { childId: child.id, period: "week" },
        context
      );

      expect(result.success).toBe(true);
    });
  });

  describe("period handling", () => {
    test("handles week period", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "get_progress_summary",
        { childId: child.id, period: "week" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        period: string;
        dateRange: { startDate: string; endDate: string };
      };
      
      expect(data.period).toBe("week");
      
      // Verify ~7 day range
      const start = new Date(data.dateRange.startDate);
      const end = new Date(data.dateRange.endDate);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
      expect(daysDiff).toBeGreaterThanOrEqual(6);
      expect(daysDiff).toBeLessThanOrEqual(8);
    });

    test("handles month period", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "get_progress_summary",
        { childId: child.id, period: "month" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        period: string;
        dateRange: { startDate: string; endDate: string };
      };
      
      expect(data.period).toBe("month");
      
      // Verify ~30 day range
      const start = new Date(data.dateRange.startDate);
      const end = new Date(data.dateRange.endDate);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
      expect(daysDiff).toBeGreaterThanOrEqual(29);
      expect(daysDiff).toBeLessThanOrEqual(31);
    });

    test("handles quarter period", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "get_progress_summary",
        { childId: child.id, period: "quarter" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as { period: string };
      expect(data.period).toBe("quarter");
    });

    test("handles year period", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "get_progress_summary",
        { childId: child.id, period: "year" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as { period: string };
      expect(data.period).toBe("year");
    });
  });

  describe("AAC progress (real data)", () => {
    test("calculates real AAC progress", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      // Create usage data
      const now = new Date();
      await createUsageLogsWithDates(child.id, [
        { symbolId: "food-apple", timestamp: now },
        { symbolId: "food-banana", timestamp: now },
        { symbolId: "drink-water", timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      ]);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "get_progress_summary",
        { childId: child.id, period: "week" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        aacProgress: {
          totalSelections: number;
          uniqueSymbols: number;
          mostUsedSymbols: Array<{ symbolId: string; count: number }>;
        };
      };
      
      expect(data.aacProgress.totalSelections).toBe(3);
      expect(data.aacProgress.uniqueSymbols).toBe(3);
    });

    test("calculates vocabulary growth rate", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      // Create new symbols this week
      const now = new Date();
      await createUsageLogsWithDates(child.id, [
        { symbolId: "new-symbol-1", timestamp: now },
        { symbolId: "new-symbol-2", timestamp: now },
      ]);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "get_progress_summary",
        { childId: child.id, period: "week" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        aacProgress: {
          newSymbolsLearned: number;
          vocabularyGrowthRate: number;
        };
      };
      
      expect(data.aacProgress.newSymbolsLearned).toBeGreaterThanOrEqual(0);
      expect(typeof data.aacProgress.vocabularyGrowthRate).toBe("number");
    });

    test("compares with previous period", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      // Create usage data
      const now = new Date();
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      
      await createUsageLogsWithDates(child.id, [
        // Recent (current week)
        { symbolId: "current-1", timestamp: now },
        { symbolId: "current-2", timestamp: now },
        // Previous period
        { symbolId: "previous-1", timestamp: twoWeeksAgo },
      ]);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "get_progress_summary",
        { childId: child.id, period: "week" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        aacProgress: {
          totalSelections: number;
          previousPeriodSelections: number;
          percentChange: number;
        };
      };
      
      expect(typeof data.aacProgress.previousPeriodSelections).toBe("number");
      expect(typeof data.aacProgress.percentChange).toBe("number");
    });
  });

  describe("goals and sessions (mock data)", () => {
    test("includes mock goals progress", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "get_progress_summary",
        { childId: child.id, period: "month" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        goalsProgress: {
          totalGoals: number;
          activeGoals: number;
          completedGoals: number;
          averageProgress: number;
          _mock: boolean;
        };
      };
      
      expect(data.goalsProgress._mock).toBe(true);
      expect(typeof data.goalsProgress.totalGoals).toBe("number");
      expect(typeof data.goalsProgress.activeGoals).toBe("number");
      expect(typeof data.goalsProgress.averageProgress).toBe("number");
    });

    test("includes mock session metrics", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "get_progress_summary",
        { childId: child.id, period: "month" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        sessionMetrics: {
          totalSessions: number;
          totalMinutes: number;
          sessionsByType: Array<{ type: string; count: number }>;
          _mock: boolean;
        };
      };
      
      expect(data.sessionMetrics._mock).toBe(true);
      expect(typeof data.sessionMetrics.totalSessions).toBe("number");
      expect(data.sessionMetrics.sessionsByType).toBeInstanceOf(Array);
    });
  });

  describe("milestones", () => {
    test("generates milestones based on progress", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "get_progress_summary",
        { childId: child.id, period: "month" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        milestones: Array<{
          id: string;
          type: string;
          title: string;
          description: string;
          achievedAt: string;
        }>;
      };
      
      expect(data.milestones).toBeInstanceOf(Array);
      
      // Each milestone should have required fields
      for (const milestone of data.milestones) {
        expect(milestone).toHaveProperty("id");
        expect(milestone).toHaveProperty("type");
        expect(milestone).toHaveProperty("title");
        expect(milestone).toHaveProperty("description");
      }
    });
  });

  describe("overall summary", () => {
    test("generates human-readable summary", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id, { name: "Emma" });
      const caregiver = await createTestCaregiver(family.id);

      // Add some usage
      await createUsageLogsWithDates(child.id, [
        { symbolId: "symbol-1", timestamp: new Date() },
      ]);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "get_progress_summary",
        { childId: child.id, period: "week" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        childName: string;
        overallSummary: string;
      };
      
      expect(data.childName).toBe("Emma");
      expect(typeof data.overallSummary).toBe("string");
      expect(data.overallSummary.length).toBeGreaterThan(0);
      // Summary should mention the child's name
      expect(data.overallSummary).toContain("Emma");
    });
  });

  describe("response metadata", () => {
    test("indicates partially mock data", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "get_progress_summary",
        { childId: child.id, period: "week" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as { _partiallyMock: boolean };
      expect(data._partiallyMock).toBe(true);
    });
  });

  describe("input validation", () => {
    test("rejects invalid childId", async () => {
      const context: ToolContext = {
        userId: "test@example.com",
      };

      const result = await executor.executeTool(
        "get_progress_summary",
        { childId: "invalid", period: "week" },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid");
    });

    test("rejects invalid period", async () => {
      const context: ToolContext = {
        userId: "test@example.com",
      };

      const result = await executor.executeTool(
        "get_progress_summary",
        { 
          childId: "00000000-0000-0000-0000-000000000000",
          period: "decade" 
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });

    test("requires period parameter", async () => {
      const context: ToolContext = {
        userId: "test@example.com",
      };

      const result = await executor.executeTool(
        "get_progress_summary",
        { childId: "00000000-0000-0000-0000-000000000000" },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });
  });
});
