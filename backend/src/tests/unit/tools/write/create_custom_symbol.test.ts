/**
 * create_custom_symbol Tool Tests
 *
 * Tests for the create_custom_symbol write tool.
 * Note: This is a placeholder tool pending FLY-81 implementation.
 */

import { describe, test, expect, beforeEach, afterAll } from "bun:test";
import { createCustomSymbolTool } from "../../../../tools/write/create_custom_symbol";
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
  executor.registerTool(createCustomSymbolTool);
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

// Use a valid UUID v4 format for the mock category ID
const mockCategoryId = "c2ffbc99-9c0b-4ef8-bb6d-6bb9bd380a33";

// ============================================================================
// Tests
// ============================================================================

describe("create_custom_symbol tool", () => {
  describe("authorization", () => {
    test("creates symbol for authorized user", async () => {
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
          name: "Favorite Toy",
          categoryId: mockCategoryId,
          imageSource: "url",
          imageUrl: "https://example.com/toy.png",
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
        "create_custom_symbol",
        {
          childId: child.id,
          name: "Test Symbol",
          categoryId: mockCategoryId,
          imageSource: "url",
          imageUrl: "https://example.com/image.png",
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
        "create_custom_symbol",
        {
          name: "Test Symbol",
          categoryId: mockCategoryId,
          imageSource: "url",
          imageUrl: "https://example.com/image.png",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });

    test("validates required name", async () => {
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
          categoryId: mockCategoryId,
          imageSource: "url",
          imageUrl: "https://example.com/image.png",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });

    test("validates required categoryId", async () => {
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
          imageSource: "url",
          imageUrl: "https://example.com/image.png",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });

    test("validates required imageSource", async () => {
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
          categoryId: mockCategoryId,
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });

    test("validates childId format - must be UUID", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "create_custom_symbol",
        {
          childId: "not-a-uuid",
          name: "Test Symbol",
          categoryId: mockCategoryId,
          imageSource: "url",
          imageUrl: "https://example.com/image.png",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid");
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
      expect(result.error).toContain("Invalid");
    });

    test("validates name maximum length", async () => {
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
          name: "x".repeat(101), // Exceeds 100 char limit
          categoryId: mockCategoryId,
          imageSource: "url",
          imageUrl: "https://example.com/image.png",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("100");
    });

    test("validates nameBulgarian maximum length", async () => {
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
          name: "Test",
          nameBulgarian: "x".repeat(101), // Exceeds 100 char limit
          categoryId: mockCategoryId,
          imageSource: "url",
          imageUrl: "https://example.com/image.png",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("100");
    });

    test("validates imageSource enum", async () => {
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
          categoryId: mockCategoryId,
          imageSource: "invalid",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });

    test("validates imageUrl format", async () => {
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
          categoryId: mockCategoryId,
          imageSource: "url",
          imageUrl: "not-a-valid-url",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid");
    });
  });

  describe("conditional validation", () => {
    test("requires imagePrompt when imageSource is generate", async () => {
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
          name: "Generated Symbol",
          categoryId: mockCategoryId,
          imageSource: "generate",
          // imagePrompt missing
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("imagePrompt");
    });

    test("requires imageUrl when imageSource is url", async () => {
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
          name: "URL Symbol",
          categoryId: mockCategoryId,
          imageSource: "url",
          // imageUrl missing
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("imageUrl");
    });

    test("accepts generate source with imagePrompt", async () => {
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
          name: "AI Generated Symbol",
          categoryId: mockCategoryId,
          imageSource: "generate",
          imagePrompt: "A friendly cartoon bear waving hello, simple style for AAC",
        },
        context
      );

      expect(result.success).toBe(true);
    });

    test("accepts url source with imageUrl", async () => {
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
          name: "URL Symbol",
          categoryId: mockCategoryId,
          imageSource: "url",
          imageUrl: "https://example.com/symbol.png",
        },
        context
      );

      expect(result.success).toBe(true);
    });

    test("validates imagePrompt minimum length", async () => {
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
          name: "Symbol",
          categoryId: mockCategoryId,
          imageSource: "generate",
          imagePrompt: "short", // Less than 10 chars
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("at least 10");
    });

    test("validates imagePrompt maximum length", async () => {
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
          name: "Symbol",
          categoryId: mockCategoryId,
          imageSource: "generate",
          imagePrompt: "x".repeat(501), // Exceeds 500 char limit
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("500");
    });
  });

  describe("response structure", () => {
    test("returns created symbol with ID", async () => {
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
          name: "Grandma",
          nameBulgarian: "Баба",
          categoryId: mockCategoryId,
          imageSource: "url",
          imageUrl: "https://example.com/grandma.png",
        },
        context
      );

      expect(result.success).toBe(true);

      const data = result.data as {
        symbol: {
          id: string;
          childId: string;
          name: string;
          nameBulgarian: string;
          categoryId: string;
          imageSource: string;
          imageUrl: string;
          status: string;
          createdAt: string;
          updatedAt: string;
          _mock: boolean;
          _pendingImplementation: boolean;
        };
        message: string;
        notice: string;
      };

      expect(data.symbol).toBeDefined();
      expect(data.symbol.id).toBeDefined();
      expect(typeof data.symbol.id).toBe("string");
      expect(data.symbol.childId).toBe(child.id);
      expect(data.symbol.name).toBe("Grandma");
      expect(data.symbol.nameBulgarian).toBe("Баба");
      expect(data.symbol.categoryId).toBe(mockCategoryId);
      expect(data.symbol.imageSource).toBe("url");
      expect(data.symbol.imageUrl).toBe("https://example.com/grandma.png");
      expect(data.symbol.status).toBe("pending");
      expect(data.message).toContain("Successfully");
      expect(data.notice).toContain("FLY-81");
    });

    test("indicates mock data and pending implementation", async () => {
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
          name: "Test",
          categoryId: mockCategoryId,
          imageSource: "url",
          imageUrl: "https://example.com/test.png",
        },
        context
      );

      expect(result.success).toBe(true);

      const data = result.data as {
        symbol: { _mock: boolean; _pendingImplementation: boolean };
      };
      expect(data.symbol._mock).toBe(true);
      expect(data.symbol._pendingImplementation).toBe(true);
    });

    test("symbol starts in pending status", async () => {
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
          name: "Test",
          categoryId: mockCategoryId,
          imageSource: "url",
          imageUrl: "https://example.com/test.png",
        },
        context
      );

      expect(result.success).toBe(true);

      const data = result.data as { symbol: { status: string } };
      expect(data.symbol.status).toBe("pending");
    });

    test("handles optional Bulgarian name", async () => {
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
          name: "Test",
          categoryId: mockCategoryId,
          imageSource: "url",
          imageUrl: "https://example.com/test.png",
          // nameBulgarian not provided
        },
        context
      );

      expect(result.success).toBe(true);

      const data = result.data as { symbol: { nameBulgarian: string | null } };
      expect(data.symbol.nameBulgarian).toBeNull();
    });

    test("message describes image source - url", async () => {
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
          name: "Test",
          categoryId: mockCategoryId,
          imageSource: "url",
          imageUrl: "https://example.com/test.png",
        },
        context
      );

      expect(result.success).toBe(true);

      const data = result.data as { message: string };
      expect(data.message).toContain("provided image URL");
    });

    test("message describes image source - generate", async () => {
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
          name: "Test",
          categoryId: mockCategoryId,
          imageSource: "generate",
          imagePrompt: "A cute cartoon cat sitting, simple AAC style",
        },
        context
      );

      expect(result.success).toBe(true);

      const data = result.data as { message: string };
      expect(data.message).toContain("AI-generated");
      expect(data.message).toContain("prompt");
    });
  });
});
