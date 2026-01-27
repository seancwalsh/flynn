/**
 * list_children Tool Tests
 */

import { describe, test, expect, beforeEach, afterAll } from "bun:test";
import { listChildrenTool } from "../../../tools/read/list_children";
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
  createTestUsageLogs,
} from "../../fixtures";

// ============================================================================
// Test Setup
// ============================================================================

let executor: ToolExecutor;

beforeEach(async () => {
  executor = new ToolExecutor();
  executor.registerTool(listChildrenTool);
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

describe("list_children tool", () => {
  describe("basic functionality", () => {
    test("returns empty list when user has no children", async () => {
      const context: ToolContext = {
        userId: "no-children@example.com",
      };

      const result = await executor.executeTool(
        "list_children",
        {},
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as { children: unknown[]; totalCount: number };
      expect(data.children).toBeInstanceOf(Array);
      expect(data.children.length).toBe(0);
      expect(data.totalCount).toBe(0);
    });

    test("returns children for authorized caregiver", async () => {
      // Setup: Create family with children
      const family = await createTestFamily({ name: "Johnson Family" });
      const child1 = await createTestChild(family.id, { name: "Alex Johnson" });
      const child2 = await createTestChild(family.id, { name: "Jordan Johnson" });
      const caregiver = await createTestCaregiver(family.id, { name: "Parent Johnson" });

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "list_children",
        {},
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as { 
        children: Array<{ id: string; name: string; familyName: string }>;
        totalCount: number;
      };
      expect(data.children.length).toBe(2);
      expect(data.totalCount).toBe(2);
      
      const names = data.children.map(c => c.name);
      expect(names).toContain("Alex Johnson");
      expect(names).toContain("Jordan Johnson");
    });

    test("includes family name in response", async () => {
      const family = await createTestFamily({ name: "Garcia Family" });
      const child = await createTestChild(family.id, { name: "Maria Garcia" });
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "list_children",
        {},
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as { 
        children: Array<{ familyName: string }>;
      };
      expect(data.children[0]?.familyName).toBe("Garcia Family");
    });
  });

  describe("usage statistics", () => {
    test("includes usage stats for children with activity", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id, { name: "Active Child" });
      const caregiver = await createTestCaregiver(family.id);
      
      // Create usage logs
      await createTestUsageLogs(child.id, 10, { symbolPrefix: "food" });

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "list_children",
        {},
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as { 
        children: Array<{ 
          totalUsageLogs: number;
          uniqueSymbolsUsed: number;
          lastActivityAt: string | null;
        }>;
      };
      
      expect(data.children[0]?.totalUsageLogs).toBe(10);
      expect(data.children[0]?.uniqueSymbolsUsed).toBeGreaterThan(0);
      expect(data.children[0]?.lastActivityAt).not.toBeNull();
    });

    test("returns zero stats for children with no activity", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id, { name: "Inactive Child" });
      const caregiver = await createTestCaregiver(family.id);
      // No usage logs created

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "list_children",
        {},
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as { 
        children: Array<{ 
          totalUsageLogs: number;
          uniqueSymbolsUsed: number;
          lastActivityAt: string | null;
        }>;
      };
      
      expect(data.children[0]?.totalUsageLogs).toBe(0);
      expect(data.children[0]?.uniqueSymbolsUsed).toBe(0);
      expect(data.children[0]?.lastActivityAt).toBeNull();
    });
  });

  describe("age calculation", () => {
    test("calculates age in months from birthDate", async () => {
      const family = await createTestFamily();
      // Set a specific birth date
      const birthDate = "2022-01-15"; // Known date for testing
      const child = await createTestChild(family.id, { birthDate });
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "list_children",
        {},
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as { 
        children: Array<{ ageInMonths: number | null; birthDate: string | null }>;
      };
      
      expect(data.children[0]?.birthDate).toBe(birthDate);
      expect(data.children[0]?.ageInMonths).toBeGreaterThan(0);
      // Should be at least 36 months (3 years) old
      expect(data.children[0]?.ageInMonths).toBeGreaterThanOrEqual(36);
    });

    test("returns null age when no birthDate", async () => {
      const family = await createTestFamily();
      
      // Create child without birth date
      const db = getTestDb();
      const { children } = await import("../../../db/schema");
      const [child] = await db.insert(children).values({
        familyId: family.id,
        name: "No Birthday Child",
        // birthDate is null
      }).returning();
      
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "list_children",
        {},
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as { 
        children: Array<{ ageInMonths: number | null; name: string }>;
      };
      
      const childData = data.children.find(c => c.name === "No Birthday Child");
      expect(childData?.ageInMonths).toBeNull();
    });
  });

  describe("sorting", () => {
    test("sorts children by name alphabetically", async () => {
      const family = await createTestFamily();
      // Create children in non-alphabetical order
      await createTestChild(family.id, { name: "Zack" });
      await createTestChild(family.id, { name: "Alice" });
      await createTestChild(family.id, { name: "Mike" });
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "list_children",
        {},
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as { 
        children: Array<{ name: string }>;
      };
      
      expect(data.children[0]?.name).toBe("Alice");
      expect(data.children[1]?.name).toBe("Mike");
      expect(data.children[2]?.name).toBe("Zack");
    });
  });

  describe("authorization", () => {
    test("throws USER_ID_REQUIRED when no userId", async () => {
      const context: ToolContext = {
        userId: "", // Empty
      };

      const result = await executor.executeTool(
        "list_children",
        {},
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("User ID is required");
    });

    test("only returns children from accessible families", async () => {
      // Create two families
      const family1 = await createTestFamily({ name: "Family One" });
      const family2 = await createTestFamily({ name: "Family Two" });
      
      // Create children in both families
      await createTestChild(family1.id, { name: "Child One" });
      await createTestChild(family2.id, { name: "Child Two" });
      
      // Create caregiver only in family 1
      const caregiver = await createTestCaregiver(family1.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family1.id, // Only has access to family 1
      };

      const result = await executor.executeTool(
        "list_children",
        {},
        context
      );

      expect(result.success).toBe(true);
      
      const data = result.data as { 
        children: Array<{ name: string }>;
        totalCount: number;
      };
      
      expect(data.totalCount).toBe(1);
      expect(data.children[0]?.name).toBe("Child One");
    });
  });
});
