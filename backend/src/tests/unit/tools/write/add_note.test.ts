/**
 * add_note Tool Tests
 *
 * Tests for the add_note write tool.
 */

import { describe, test, expect, beforeEach, afterAll } from "bun:test";
import { addNoteTool } from "../../../../tools/write/add_note";
import { ToolExecutor, resetToolExecutor } from "../../../../services/tool-executor";
import type { ToolContext } from "../../../../types/claude";
import {
  closeTestDb,
  setupTestDatabase,
  cleanTestData,
} from "../../../setup";
import { createTestFamily, createTestChild, createTestCaregiver } from "../../../fixtures";

// ============================================================================
// Test Setup
// ============================================================================

let executor: ToolExecutor;

beforeEach(async () => {
  executor = new ToolExecutor();
  executor.registerTool(addNoteTool);
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

describe("add_note tool", () => {
  describe("authorization", () => {
    test("creates note for authorized user", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "add_note",
        {
          childId: child.id,
          content: "Today was a great day!",
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
        "add_note",
        {
          childId: child.id,
          content: "Test note",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/access/i);
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
        "add_note",
        {
          content: "Test content",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });

    test("validates required content", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "add_note",
        {
          childId: child.id,
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
        "add_note",
        {
          childId: "not-a-uuid",
          content: "Test content",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid");
    });

    test("validates content minimum length", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "add_note",
        {
          childId: child.id,
          content: "",
        },
        context
      );

      expect(result.success).toBe(false);
    });

    test("validates content maximum length", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "add_note",
        {
          childId: child.id,
          content: "x".repeat(5001),
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("5,000");
    });

    test("validates note type enum", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "add_note",
        {
          childId: child.id,
          content: "Test content",
          type: "invalid_type",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid");
    });
  });

  describe("business logic validation", () => {
    test("rejects whitespace-only content", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "add_note",
        {
          childId: child.id,
          content: "   \n\t  ",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("empty");
    });

    test("trims whitespace from content", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "add_note",
        {
          childId: child.id,
          content: "  Good observation today!  ",
        },
        context
      );

      expect(result.success).toBe(true);

      const data = result.data as { note: { content: string } };
      expect(data.note.content).toBe("Good observation today!");
    });
  });

  describe("response structure", () => {
    test("returns created note with ID", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "add_note",
        {
          childId: child.id,
          content: "Test observation",
          type: "observation",
        },
        context
      );

      expect(result.success).toBe(true);

      const data = result.data as {
        note: {
          id: string;
          childId: string;
          type: string;
          content: string;
          createdAt: string;
        };
        message: string;
      };

      expect(data.note).toBeDefined();
      expect(data.note.id).toBeDefined();
      expect(typeof data.note.id).toBe("string");
      expect(data.note.childId).toBe(child.id);
      expect(data.note.type).toBe("observation");
      expect(data.note.content).toBe("Test observation");
      expect(data.message).toContain("observation");
    });

    test("defaults type to general", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "add_note",
        {
          childId: child.id,
          content: "Test note",
        },
        context
      );

      expect(result.success).toBe(true);

      const data = result.data as { note: { type: string } };
      expect(data.note.type).toBe("general");
    });

    test("returns contextual message based on type", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const obsResult = await executor.executeTool(
        "add_note",
        { childId: child.id, content: "Test", type: "observation" },
        context
      );
      expect((obsResult.data as { message: string }).message).toContain("observation");

      const milestoneResult = await executor.executeTool(
        "add_note",
        { childId: child.id, content: "Test", type: "milestone" },
        context
      );
      expect((milestoneResult.data as { message: string }).message).toContain("milestone");
    });
  });

  describe("note types", () => {
    test("accepts observation type", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "add_note",
        { childId: child.id, content: "Test", type: "observation" },
        context
      );

      expect(result.success).toBe(true);
    });

    test("accepts milestone type", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "add_note",
        { childId: child.id, content: "First time saying 'mama'!", type: "milestone" },
        context
      );

      expect(result.success).toBe(true);
    });

    test("accepts concern type", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "add_note",
        { childId: child.id, content: "Noticed some regression", type: "concern" },
        context
      );

      expect(result.success).toBe(true);
    });

    test("accepts general type", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "add_note",
        { childId: child.id, content: "General note", type: "general" },
        context
      );

      expect(result.success).toBe(true);
    });
  });
});
