/**
 * create_custom_symbol Tool Tests
 *
 * Comprehensive tests for the create_custom_symbol write tool.
 * Tests authorization, validation, database operations, and edge cases.
 */

import { describe, test, expect, beforeEach, afterAll } from "bun:test";
import { createCustomSymbolTool } from "../../../../tools/write/create_custom_symbol";
import { ToolExecutor, resetToolExecutor } from "../../../../services/tool-executor";
import type { ToolContext } from "../../../../types/claude";
import {
  closeTestDb,
  setupTestDatabase,
  cleanTestData,
  getTestDb,
} from "../../../setup";
import {
  createTestFamily,
  createTestChild,
  createTestCaregiver,
  createTestTherapist,
  createTestSymbolCategory,
  createTestCustomSymbol,
} from "../../../fixtures";
import { customSymbols } from "../../../../db/schema";
import { eq } from "drizzle-orm";

// ============================================================================
// Test Setup
// ============================================================================

let executor: ToolExecutor;

beforeEach(async () => {
  executor = new ToolExecutor();
  executor.registerTool(createCustomSymbolTool);
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

describe("create_custom_symbol tool", () => {
  describe("Authorization", () => {
    test("creates symbol for authorized caregiver", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "Favorite Toy",
          nameBulgarian: "Любима играчка",
          categoryId: category.id,
          imageSource: "url",
          imageUrl: "https://example.com/toy.png",
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.symbol).toBeDefined();
      expect(result.data.symbol.name).toBe("Favorite Toy");
      expect(result.data.symbol.status).toBe("pending");
    });

    test("creates symbol for authorized therapist", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const therapist = await createTestTherapist();
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: therapist.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "Therapy Tool",
          categoryId: category.id,
          imageSource: "url",
          imageUrl: "https://example.com/tool.png",
        },
        context
      );

      expect(result.success).toBe(true);
    });

    test("throws UNAUTHORIZED for user without child access", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: "unauthorized@example.com",
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "Test Symbol",
          categoryId: category.id,
          imageSource: "url",
          imageUrl: "https://example.com/image.png",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/access|permission|authorized/i);
    });

    test("rejects when childId does not exist", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const nonexistentChildId = "00000000-0000-0000-0000-000000000000";

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: nonexistentChildId,
          name: "Test",
          categoryId: category.id,
          imageSource: "url",
          imageUrl: "https://example.com/test.png",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/child|access|not found/i);
    });
  });

  describe("Input Validation", () => {
    test("validates required childId", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          name: "Test Symbol",
          categoryId: category.id,
          imageSource: "url",
          imageUrl: "https://example.com/image.png",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid|required/i);
    });

    test("validates required name", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          categoryId: category.id,
          imageSource: "url",
          imageUrl: "https://example.com/image.png",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/name|required/i);
    });

    test("validates empty name string", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "",
          categoryId: category.id,
          imageSource: "url",
          imageUrl: "https://example.com/image.png",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/name|required/i);
    });

    test("validates name maximum length (100 chars)", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "x".repeat(101),
          categoryId: category.id,
          imageSource: "url",
          imageUrl: "https://example.com/image.png",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/100|exceed|length/i);
    });

    test("accepts name at maximum length (100 chars)", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const maxLengthName = "a".repeat(100);

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: maxLengthName,
          categoryId: category.id,
          imageSource: "url",
          imageUrl: "https://example.com/image.png",
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data.symbol.name).toBe(maxLengthName);
    });

    test("validates nameBulgarian maximum length (100 chars)", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "Test",
          nameBulgarian: "x".repeat(101),
          categoryId: category.id,
          imageSource: "url",
          imageUrl: "https://example.com/image.png",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/100|exceed|length/i);
    });

    test("validates childId format - must be UUID", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: "not-a-uuid",
          name: "Test Symbol",
          categoryId: category.id,
          imageSource: "url",
          imageUrl: "https://example.com/image.png",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid|uuid|format/i);
    });

    test("validates categoryId format - must be UUID", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "Test Symbol",
          categoryId: "not-a-uuid",
          imageSource: "url",
          imageUrl: "https://example.com/image.png",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid|uuid|format/i);
    });

    test("validates imageSource enum", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "Test Symbol",
          categoryId: category.id,
          imageSource: "invalid",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid|imageSource/i);
    });

    test("validates imageUrl format", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "Test Symbol",
          categoryId: category.id,
          imageSource: "url",
          imageUrl: "not-a-valid-url",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid|url|format/i);
    });
  });

  describe("Conditional Validation", () => {
    test("requires imagePrompt when imageSource is generate", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "Generated Symbol",
          categoryId: category.id,
          imageSource: "generate",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/imagePrompt|required|generate/i);
    });

    test("requires imageUrl when imageSource is url", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "URL Symbol",
          categoryId: category.id,
          imageSource: "url",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/imageUrl|required/i);
    });

    test("requires imageKey when imageSource is upload", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "Upload Symbol",
          categoryId: category.id,
          imageSource: "upload",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/imageKey|required|upload/i);
    });

    test("rejects generate with imagePrompt (AI not implemented)", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "AI Generated Symbol",
          categoryId: category.id,
          imageSource: "generate",
          imagePrompt: "A friendly cartoon bear waving hello, simple AAC style",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/AI|generation|not.+implement/i);
    });

    test("accepts url source with valid imageUrl", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "URL Symbol",
          categoryId: category.id,
          imageSource: "url",
          imageUrl: "https://example.com/symbol.png",
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data.symbol.imageUrl).toBe("https://example.com/symbol.png");
    });

    test("accepts upload source with imageKey", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "Upload Symbol",
          categoryId: category.id,
          imageSource: "upload",
          imageKey: "custom-symbols/child-123/symbol.png",
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data.symbol.imageKey).toBe("custom-symbols/child-123/symbol.png");
      // Image URL should be constructed from imageKey
      expect(result.data.symbol.imageUrl).toContain("custom-symbols/child-123/symbol.png");
    });

    test("validates imagePrompt minimum length (10 chars)", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "Symbol",
          categoryId: category.id,
          imageSource: "generate",
          imagePrompt: "short",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/at least 10/i);
    });

    test("validates imagePrompt maximum length (500 chars)", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "Symbol",
          categoryId: category.id,
          imageSource: "generate",
          imagePrompt: "x".repeat(501),
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/500|exceed/i);
    });
  });

  describe("Category Validation", () => {
    test("rejects when categoryId does not exist", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const nonexistentCategoryId = "00000000-0000-0000-0000-000000000000";

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "Test",
          categoryId: nonexistentCategoryId,
          imageSource: "url",
          imageUrl: "https://example.com/test.png",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/category|not found/i);
    });

    test("accepts valid system category", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory({
        name: "People",
        colorName: "yellow",
        isSystem: true,
      });

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "Grandpa",
          categoryId: category.id,
          imageSource: "url",
          imageUrl: "https://example.com/grandpa.png",
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data.symbol.categoryId).toBe(category.id);
    });
  });

  describe("Database Operations", () => {
    test("creates symbol record in database", async () => {
      const db = getTestDb();
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "Pizza",
          nameBulgarian: "Пица",
          categoryId: category.id,
          imageSource: "url",
          imageUrl: "https://example.com/pizza.png",
        },
        context
      );

      expect(result.success).toBe(true);

      // Verify in database
      const [symbol] = await db
        .select()
        .from(customSymbols)
        .where(eq(customSymbols.id, result.data.symbol.id));

      expect(symbol).toBeDefined();
      expect(symbol.name).toBe("Pizza");
      expect(symbol.nameBulgarian).toBe("Пица");
      expect(symbol.childId).toBe(child.id);
      expect(symbol.categoryId).toBe(category.id);
      expect(symbol.status).toBe("pending");
      expect(symbol.createdBy).toBeDefined();
    });

    test("sets correct createdBy user", async () => {
      const db = getTestDb();
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "Test",
          categoryId: category.id,
          imageSource: "url",
          imageUrl: "https://example.com/test.png",
        },
        context
      );

      expect(result.success).toBe(true);

      const [symbol] = await db
        .select()
        .from(customSymbols)
        .where(eq(customSymbols.id, result.data.symbol.id));

      expect(symbol.createdBy).toBe(context.userId);
    });

    test("sets status to pending", async () => {
      const db = getTestDb();
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "Test",
          categoryId: category.id,
          imageSource: "url",
          imageUrl: "https://example.com/test.png",
        },
        context
      );

      expect(result.success).toBe(true);

      const [symbol] = await db
        .select()
        .from(customSymbols)
        .where(eq(customSymbols.id, result.data.symbol.id));

      expect(symbol.status).toBe("pending");
    });

    test("handles optional nameBulgarian correctly", async () => {
      const db = getTestDb();
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "Test",
          categoryId: category.id,
          imageSource: "url",
          imageUrl: "https://example.com/test.png",
        },
        context
      );

      expect(result.success).toBe(true);

      const [symbol] = await db
        .select()
        .from(customSymbols)
        .where(eq(customSymbols.id, result.data.symbol.id));

      expect(symbol.nameBulgarian).toBeNull();
    });

    test("handles optional gridPosition correctly", async () => {
      const db = getTestDb();
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "Test",
          categoryId: category.id,
          imageSource: "url",
          imageUrl: "https://example.com/test.png",
          gridPosition: 5,
        },
        context
      );

      expect(result.success).toBe(true);

      const [symbol] = await db
        .select()
        .from(customSymbols)
        .where(eq(customSymbols.id, result.data.symbol.id));

      expect(symbol.gridPosition).toBe(5);
    });
  });

  describe("Response Structure", () => {
    test("returns created symbol with all fields", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory({ name: "Food" });

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "Grandma",
          nameBulgarian: "Баба",
          categoryId: category.id,
          imageSource: "url",
          imageUrl: "https://example.com/grandma.png",
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.symbol).toBeDefined();
      expect(result.data.symbol.id).toBeDefined();
      expect(typeof result.data.symbol.id).toBe("string");
      expect(result.data.symbol.childId).toBe(child.id);
      expect(result.data.symbol.name).toBe("Grandma");
      expect(result.data.symbol.nameBulgarian).toBe("Баба");
      expect(result.data.symbol.categoryId).toBe(category.id);
      expect(result.data.symbol.imageSource).toBe("url");
      expect(result.data.symbol.imageUrl).toBe("https://example.com/grandma.png");
      expect(result.data.symbol.status).toBe("pending");
      expect(result.data.message).toContain("Successfully");
      expect(result.data.message).toContain("Food");
    });

    test("message describes image source - url", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "Test",
          categoryId: category.id,
          imageSource: "url",
          imageUrl: "https://example.com/test.png",
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data.message).toMatch(/provided image URL/i);
    });

    test("message describes image source - upload", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "Test",
          categoryId: category.id,
          imageSource: "upload",
          imageKey: "custom-symbols/test.png",
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data.message).toMatch(/uploaded image/i);
    });

    test("includes nextSteps with approval workflow info", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "Test",
          categoryId: category.id,
          imageSource: "url",
          imageUrl: "https://example.com/test.png",
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data.nextSteps).toBeDefined();
      expect(Array.isArray(result.data.nextSteps)).toBe(true);
      expect(result.data.nextSteps.length).toBeGreaterThan(0);
      expect(result.data.nextSteps.some((step: string) => step.match(/pending|approval/i))).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    test("handles Cyrillic characters in nameBulgarian", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "Water",
          nameBulgarian: "Вода",
          categoryId: category.id,
          imageSource: "url",
          imageUrl: "https://example.com/water.png",
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data.symbol.nameBulgarian).toBe("Вода");
    });

    test("handles special characters in name", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "Café!",
          categoryId: category.id,
          imageSource: "url",
          imageUrl: "https://example.com/cafe.png",
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data.symbol.name).toBe("Café!");
    });

    test("handles very long valid URLs", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const longUrl = "https://example.com/very/long/path/to/image/with/many/segments/" + "a".repeat(400) + ".png";

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "Test",
          categoryId: category.id,
          imageSource: "url",
          imageUrl: longUrl,
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data.symbol.imageUrl).toBe(longUrl);
    });

    test("handles multiple symbols for same child", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      // Create first symbol
      const result1 = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "Symbol 1",
          categoryId: category.id,
          imageSource: "url",
          imageUrl: "https://example.com/symbol1.png",
        },
        context
      );

      // Create second symbol
      const result2 = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "Symbol 2",
          categoryId: category.id,
          imageSource: "url",
          imageUrl: "https://example.com/symbol2.png",
        },
        context
      );

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.data.symbol.id).not.toBe(result2.data.symbol.id);
    });

    test("handles whitespace in name correctly", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const category = await createTestSymbolCategory();

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: child.id,
          name: "  Test  Symbol  ",
          categoryId: category.id,
          imageSource: "url",
          imageUrl: "https://example.com/test.png",
        },
        context
      );

      // Name should be stored as-is (validation only checks non-empty)
      expect(result.success).toBe(true);
    });
  });
});
