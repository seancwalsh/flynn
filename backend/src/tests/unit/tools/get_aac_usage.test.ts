/**
 * get_aac_usage Tool Tests
 * 
 * This tool uses real data from the usageLogs table.
 */

import { describe, test, expect, beforeEach, afterAll } from "bun:test";
import { getAACUsageTool } from "../../../tools/read/get_aac_usage";
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
  executor.registerTool(getAACUsageTool);
  resetToolExecutor();
  
  await setupTestDatabase();
  await cleanTestData();
});

afterAll(async () => {
  await closeTestDb();
});

// Helper to create usage logs with specific timestamps
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

describe("get_aac_usage tool", () => {
  describe("authorization", () => {
    test("verifies child access", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      
      const context: ToolContext = {
        userId: "unauthorized@example.com",
      };

      const result = await executor.executeTool(
        "get_aac_usage",
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
        "get_aac_usage",
        { childId: child.id },
        context
      );

      expect(result.success).toBe(true);
    });
  });

  describe("summary statistics", () => {
    test("returns zero stats for child with no usage", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "get_aac_usage",
        { childId: child.id },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        summary: {
          totalSelections: number;
          uniqueSymbols: number;
          averageSelectionsPerDay: number;
          activeDays: number;
        };
      };
      
      expect(data.summary.totalSelections).toBe(0);
      expect(data.summary.uniqueSymbols).toBe(0);
      expect(data.summary.activeDays).toBe(0);
    });

    test("calculates correct summary for child with usage", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      // Create usage logs
      const now = new Date();
      await createUsageLogsWithDates(child.id, [
        { symbolId: "food-apple", timestamp: now },
        { symbolId: "food-banana", timestamp: now },
        { symbolId: "food-apple", timestamp: now },
        { symbolId: "drink-water", timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
      ]);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "get_aac_usage",
        { childId: child.id },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        summary: {
          totalSelections: number;
          uniqueSymbols: number;
          activeDays: number;
        };
      };
      
      expect(data.summary.totalSelections).toBe(4);
      expect(data.summary.uniqueSymbols).toBe(3); // apple, banana, water
      expect(data.summary.activeDays).toBe(2); // today and yesterday
    });
  });

  describe("date filtering", () => {
    test("filters by date range", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      // Create logs at different times
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      await createUsageLogsWithDates(child.id, [
        { symbolId: "recent-1", timestamp: now },
        { symbolId: "recent-2", timestamp: oneWeekAgo },
        { symbolId: "old-1", timestamp: twoWeeksAgo },
      ]);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      // Query only recent week
      const startDate = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      const endDate = now.toISOString().split("T")[0];

      const result = await executor.executeTool(
        "get_aac_usage",
        { childId: child.id, startDate, endDate },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        summary: { totalSelections: number };
        period: { startDate: string; endDate: string };
      };
      
      expect(data.summary.totalSelections).toBe(2); // Only recent-1 and recent-2
    });

    test("defaults to last 30 days", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "get_aac_usage",
        { childId: child.id },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        period: { startDate: string; endDate: string };
      };
      
      // Verify period spans ~30 days
      const start = new Date(data.period.startDate);
      const end = new Date(data.period.endDate);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
      
      expect(daysDiff).toBeGreaterThanOrEqual(29);
      expect(daysDiff).toBeLessThanOrEqual(31);
    });
  });

  describe("groupBy options", () => {
    test("groups by day", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      // Create logs on different days
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      await createUsageLogsWithDates(child.id, [
        { symbolId: "symbol-1", timestamp: now },
        { symbolId: "symbol-2", timestamp: now },
        { symbolId: "symbol-3", timestamp: yesterday },
      ]);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "get_aac_usage",
        { childId: child.id, groupBy: "day" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        breakdown: Array<{ label: string; count: number; uniqueSymbols?: number }>;
      };
      
      expect(data.breakdown.length).toBe(2); // Two days
      expect(data.breakdown.some(b => b.count === 2)).toBe(true); // Today with 2
      expect(data.breakdown.some(b => b.count === 1)).toBe(true); // Yesterday with 1
    });

    test("groups by symbol", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      await createUsageLogsWithDates(child.id, [
        { symbolId: "food-apple", timestamp: new Date() },
        { symbolId: "food-apple", timestamp: new Date() },
        { symbolId: "food-apple", timestamp: new Date() },
        { symbolId: "drink-water", timestamp: new Date() },
      ]);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "get_aac_usage",
        { childId: child.id, groupBy: "symbol" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        breakdown: Array<{ label: string; count: number }>;
      };
      
      const appleEntry = data.breakdown.find(b => b.label === "food-apple");
      expect(appleEntry?.count).toBe(3);
      
      const waterEntry = data.breakdown.find(b => b.label === "drink-water");
      expect(waterEntry?.count).toBe(1);
    });

    test("groups by category", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      await createUsageLogsWithDates(child.id, [
        { symbolId: "food-apple", timestamp: new Date() },
        { symbolId: "food-banana", timestamp: new Date() },
        { symbolId: "drink-water", timestamp: new Date() },
        { symbolId: "drink-juice", timestamp: new Date() },
        { symbolId: "drink-milk", timestamp: new Date() },
      ]);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "get_aac_usage",
        { childId: child.id, groupBy: "category" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        breakdown: Array<{ label: string; count: number }>;
      };
      
      const foodEntry = data.breakdown.find(b => b.label.toLowerCase() === "food");
      expect(foodEntry?.count).toBe(2);
      
      const drinkEntry = data.breakdown.find(b => b.label.toLowerCase() === "drink");
      expect(drinkEntry?.count).toBe(3);
    });
  });

  describe("top symbols", () => {
    test("returns top 10 most used symbols", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      // Create varied usage
      const now = new Date();
      const logs = [];
      for (let i = 0; i < 15; i++) {
        // Symbol i used (15-i) times
        for (let j = 0; j < (15 - i); j++) {
          logs.push({ symbolId: `symbol-${i}`, timestamp: now });
        }
      }
      await createUsageLogsWithDates(child.id, logs);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "get_aac_usage",
        { childId: child.id },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        topSymbols: Array<{ symbolId: string; count: number }>;
      };
      
      expect(data.topSymbols.length).toBeLessThanOrEqual(10);
      // First should be symbol-0 with 15 usages
      expect(data.topSymbols[0]?.symbolId).toBe("symbol-0");
      expect(data.topSymbols[0]?.count).toBe(15);
    });
  });

  describe("trends", () => {
    test("identifies increasing trend", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      // More usage in second half of period
      const now = new Date();
      const logs = [];
      
      // Early period: 2 usages
      for (let i = 0; i < 2; i++) {
        logs.push({ 
          symbolId: `symbol-${i}`, 
          timestamp: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000) 
        });
      }
      
      // Recent period: 10 usages
      for (let i = 0; i < 10; i++) {
        logs.push({ 
          symbolId: `symbol-${i}`, 
          timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) 
        });
      }
      
      await createUsageLogsWithDates(child.id, logs);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "get_aac_usage",
        { childId: child.id },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        trends: { direction: string; percentChange: number };
      };
      
      expect(data.trends.direction).toBe("increasing");
      expect(data.trends.percentChange).toBeGreaterThan(0);
    });

    test("identifies stable trend when usage is similar", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      // Similar usage in both halves
      const now = new Date();
      const logs = [];
      
      // Early period: 5 usages
      for (let i = 0; i < 5; i++) {
        logs.push({ 
          symbolId: `symbol-${i}`, 
          timestamp: new Date(now.getTime() - 25 * 24 * 60 * 60 * 1000) 
        });
      }
      
      // Recent period: 5 usages
      for (let i = 0; i < 5; i++) {
        logs.push({ 
          symbolId: `symbol-${i}`, 
          timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000) 
        });
      }
      
      await createUsageLogsWithDates(child.id, logs);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "get_aac_usage",
        { childId: child.id },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        trends: { direction: string };
      };
      
      expect(data.trends.direction).toBe("stable");
    });
  });

  describe("input validation", () => {
    test("rejects invalid childId", async () => {
      const context: ToolContext = {
        userId: "test@example.com",
      };

      const result = await executor.executeTool(
        "get_aac_usage",
        { childId: "invalid" },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid");
    });

    test("rejects invalid date format", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "get_aac_usage",
        { childId: child.id, startDate: "invalid-date" },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("YYYY-MM-DD");
    });

    test("rejects invalid groupBy value", async () => {
      const context: ToolContext = {
        userId: "test@example.com",
      };

      const result = await executor.executeTool(
        "get_aac_usage",
        { 
          childId: "00000000-0000-0000-0000-000000000000",
          groupBy: "invalid" 
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });
  });
});
