/**
 * search_vocabulary Tool Tests
 * 
 * This tool uses real data from usageLogs to find symbols,
 * but generates mock metadata (name, image, tags) since the
 * symbols table doesn't exist yet.
 */

import { describe, test, expect, beforeEach, afterAll } from "bun:test";
import { searchVocabularyTool } from "../../../tools/read/search_vocabulary";
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
  executor.registerTool(searchVocabularyTool);
  resetToolExecutor();
  
  await setupTestDatabase();
  await cleanTestData();
});

afterAll(async () => {
  await closeTestDb();
});

// Helper to create usage logs
async function createUsageLogsForVocabulary(
  childId: string, 
  symbols: Array<{ symbolId: string; count: number }>
) {
  const db = getTestDb();
  const now = new Date();
  
  for (const { symbolId, count } of symbols) {
    for (let i = 0; i < count; i++) {
      await db.insert(usageLogs).values({
        childId,
        symbolId,
        timestamp: new Date(now.getTime() - i * 60 * 1000), // Spread out timestamps
      });
    }
  }
}

// ============================================================================
// Tests
// ============================================================================

describe("search_vocabulary tool", () => {
  describe("authorization", () => {
    test("verifies child access", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      
      const context: ToolContext = {
        userId: "unauthorized@example.com",
      };

      const result = await executor.executeTool(
        "search_vocabulary",
        { childId: child.id, query: "food" },
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
        "search_vocabulary",
        { childId: child.id, query: "anything" },
        context
      );

      expect(result.success).toBe(true);
    });
  });

  describe("search functionality", () => {
    test("finds symbols by symbol ID", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      // Create vocabulary usage
      await createUsageLogsForVocabulary(child.id, [
        { symbolId: "food-apple", count: 5 },
        { symbolId: "food-banana", count: 3 },
        { symbolId: "drink-water", count: 2 },
      ]);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "search_vocabulary",
        { childId: child.id, query: "apple" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        symbols: Array<{ symbolId: string }>;
        totalMatches: number;
      };
      
      expect(data.totalMatches).toBe(1);
      expect(data.symbols[0]?.symbolId).toBe("food-apple");
    });

    test("finds symbols by category", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      await createUsageLogsForVocabulary(child.id, [
        { symbolId: "food-apple", count: 5 },
        { symbolId: "food-banana", count: 3 },
        { symbolId: "drink-water", count: 2 },
      ]);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "search_vocabulary",
        { childId: child.id, query: "food" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        symbols: Array<{ symbolId: string }>;
        totalMatches: number;
      };
      
      expect(data.totalMatches).toBe(2);
      const symbolIds = data.symbols.map(s => s.symbolId);
      expect(symbolIds).toContain("food-apple");
      expect(symbolIds).toContain("food-banana");
    });

    test("case-insensitive search", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      await createUsageLogsForVocabulary(child.id, [
        { symbolId: "Food-Apple", count: 1 },
      ]);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "search_vocabulary",
        { childId: child.id, query: "APPLE" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        symbols: Array<{ symbolId: string }>;
        totalMatches: number;
      };
      
      expect(data.totalMatches).toBe(1);
    });

    test("returns empty when no matches", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      await createUsageLogsForVocabulary(child.id, [
        { symbolId: "food-apple", count: 1 },
      ]);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "search_vocabulary",
        { childId: child.id, query: "xyz123nonexistent" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        symbols: unknown[];
        totalMatches: number;
      };
      
      expect(data.totalMatches).toBe(0);
      expect(data.symbols.length).toBe(0);
    });

    test("returns empty for child with no vocabulary", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      // No usage logs created

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "search_vocabulary",
        { childId: child.id, query: "food" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        symbols: unknown[];
        totalMatches: number;
      };
      
      expect(data.totalMatches).toBe(0);
    });
  });

  describe("usage statistics", () => {
    test("includes total usage count", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      await createUsageLogsForVocabulary(child.id, [
        { symbolId: "food-apple", count: 10 },
      ]);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "search_vocabulary",
        { childId: child.id, query: "apple" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        symbols: Array<{
          usageStats: { totalUsages: number };
        }>;
      };
      
      expect(data.symbols[0]?.usageStats.totalUsages).toBe(10);
    });

    test("includes usage rank", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      // Create symbols with different usage counts
      await createUsageLogsForVocabulary(child.id, [
        { symbolId: "food-apple", count: 10 },   // Rank 1
        { symbolId: "food-banana", count: 5 },   // Rank 2
        { symbolId: "food-orange", count: 1 },   // Rank 3
      ]);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "search_vocabulary",
        { childId: child.id, query: "banana" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        symbols: Array<{
          symbolId: string;
          usageStats: { usageRank: number };
        }>;
      };
      
      expect(data.symbols[0]?.usageStats.usageRank).toBe(2);
    });

    test("includes first and last used timestamps", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      await createUsageLogsForVocabulary(child.id, [
        { symbolId: "food-apple", count: 3 },
      ]);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "search_vocabulary",
        { childId: child.id, query: "apple" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        symbols: Array<{
          usageStats: {
            firstUsedAt: string | null;
            lastUsedAt: string | null;
          };
        }>;
      };
      
      expect(data.symbols[0]?.usageStats.lastUsedAt).not.toBeNull();
      expect(data.symbols[0]?.usageStats.firstUsedAt).not.toBeNull();
    });
  });

  describe("derived metadata", () => {
    test("extracts category from symbol ID", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      await createUsageLogsForVocabulary(child.id, [
        { symbolId: "food-apple", count: 1 },
      ]);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "search_vocabulary",
        { childId: child.id, query: "apple" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        symbols: Array<{
          category: string;
        }>;
      };
      
      expect(data.symbols[0]?.category.toLowerCase()).toBe("food");
    });

    test("derives name from symbol ID", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      await createUsageLogsForVocabulary(child.id, [
        { symbolId: "food-red-apple", count: 1 },
      ]);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "search_vocabulary",
        { childId: child.id, query: "apple" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        symbols: Array<{
          name: string;
        }>;
      };
      
      // Should derive name like "Red Apple" from "food-red-apple"
      expect(data.symbols[0]?.name.toLowerCase()).toContain("red");
      expect(data.symbols[0]?.name.toLowerCase()).toContain("apple");
    });

    test("generates mock tags", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      await createUsageLogsForVocabulary(child.id, [
        { symbolId: "food-apple", count: 1 },
      ]);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "search_vocabulary",
        { childId: child.id, query: "apple" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        symbols: Array<{
          tags: string[];
          _mockMetadata: boolean;
        }>;
      };
      
      expect(data.symbols[0]?.tags).toBeInstanceOf(Array);
      expect(data.symbols[0]?.tags.length).toBeGreaterThan(0);
      expect(data.symbols[0]?._mockMetadata).toBe(true);
    });
  });

  describe("result limits", () => {
    test("limits results to 50 symbols", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      // Create 60 matching symbols
      const symbols = [];
      for (let i = 0; i < 60; i++) {
        symbols.push({ symbolId: `food-item-${i}`, count: 1 });
      }
      await createUsageLogsForVocabulary(child.id, symbols);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "search_vocabulary",
        { childId: child.id, query: "food" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as {
        symbols: unknown[];
        totalMatches: number;
      };
      
      expect(data.symbols.length).toBeLessThanOrEqual(50);
      expect(data.totalMatches).toBe(60); // Reports true total
    });
  });

  describe("response metadata", () => {
    test("includes query in response", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "search_vocabulary",
        { childId: child.id, query: "apple" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as { query: string };
      expect(data.query).toBe("apple");
    });

    test("includes childId in response", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "search_vocabulary",
        { childId: child.id, query: "apple" },
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as { childId: string };
      expect(data.childId).toBe(child.id);
    });
  });

  describe("input validation", () => {
    test("rejects invalid childId", async () => {
      const context: ToolContext = {
        userId: "test@example.com",
      };

      const result = await executor.executeTool(
        "search_vocabulary",
        { childId: "invalid", query: "food" },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid");
    });

    test("rejects empty query", async () => {
      const context: ToolContext = {
        userId: "test@example.com",
      };

      const result = await executor.executeTool(
        "search_vocabulary",
        { 
          childId: "00000000-0000-0000-0000-000000000000",
          query: "" 
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("empty");
    });

    test("rejects query exceeding max length", async () => {
      const context: ToolContext = {
        userId: "test@example.com",
      };

      const result = await executor.executeTool(
        "search_vocabulary",
        { 
          childId: "00000000-0000-0000-0000-000000000000",
          query: "a".repeat(101) // Max is 100
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });

    test("requires query parameter", async () => {
      const context: ToolContext = {
        userId: "test@example.com",
      };

      const result = await executor.executeTool(
        "search_vocabulary",
        { childId: "00000000-0000-0000-0000-000000000000" },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });
  });
});
