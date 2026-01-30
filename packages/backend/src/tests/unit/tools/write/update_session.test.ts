/**
 * update_session Tool Tests
 *
 * Tests for the update_session write tool.
 */

import { describe, test, expect, beforeEach, afterAll } from "bun:test";
import { updateSessionTool } from "../../../../tools/write/update_session";
import { ToolExecutor, resetToolExecutor } from "../../../../services/tool-executor";
import type { ToolContext } from "../../../../types/claude";
import {
  closeTestDb,
  setupTestDatabase,
  cleanTestData,
} from "../../../setup";
import { createTestFamily, createTestChild, createTestCaregiver, createTestSession, createTestGoal } from "../../../fixtures";

// ============================================================================
// Test Setup
// ============================================================================

let executor: ToolExecutor;

beforeEach(async () => {
  executor = new ToolExecutor();
  executor.registerTool(updateSessionTool);
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

describe("update_session tool", () => {
  describe("authorization", () => {
    test("updates session for authorized user", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const session = await createTestSession(child.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_session",
        {
          sessionId: session.id,
          notes: "Updated session notes",
        },
        context
      );

      expect(result.success).toBe(true);
    });

    test("throws UNAUTHORIZED for user without access", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const session = await createTestSession(child.id);

      const context: ToolContext = {
        userId: "unauthorized@example.com",
      };

      const result = await executor.executeTool(
        "update_session",
        {
          sessionId: session.id,
          notes: "Updated notes",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/access/i);
    });
  });

  describe("input validation", () => {
    test("validates required sessionId", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_session",
        {
          notes: "Some notes",
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });

    test("validates sessionId format - must be UUID", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_session",
        {
          sessionId: "not-a-uuid",
          notes: "Some notes",
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
      const session = await createTestSession(child.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_session",
        {
          sessionId: session.id,
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("At least one field");
    });

    test("validates duration range - minimum 1 minute", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_session",
        {
          sessionId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          durationMinutes: 0,
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("at least 1");
    });

    test("validates duration range - maximum 480 minutes", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_session",
        {
          sessionId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          durationMinutes: 500,
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("480");
    });

    test("validates goalsWorkedOn contains valid UUIDs", async () => {
      const family = await createTestFamily();
      const caregiver = await createTestCaregiver(family.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_session",
        {
          sessionId: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
          goalsWorkedOn: [{ goalId: "not-a-uuid" }],
        },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid");
    });
  });

  describe("response structure", () => {
    test("returns updated session", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const session = await createTestSession(child.id, { notes: "Original notes" });

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_session",
        {
          sessionId: session.id,
          notes: "Updated notes",
        },
        context
      );

      expect(result.success).toBe(true);

      const data = result.data as {
        session: {
          id: string;
          childId: string;
          notes: string;
        };
        message: string;
      };

      expect(data.session).toBeDefined();
      expect(data.session.id).toBe(session.id);
      expect(data.session.childId).toBe(child.id);
      expect(data.session.notes).toBe("Updated notes");
      expect(data.message).toContain("Successfully");
    });
  });

  describe("partial updates", () => {
    test("allows updating only notes", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const session = await createTestSession(child.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_session",
        {
          sessionId: session.id,
          notes: "Only notes updated",
        },
        context
      );

      expect(result.success).toBe(true);
    });

    test("allows updating only duration", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const session = await createTestSession(child.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_session",
        {
          sessionId: session.id,
          durationMinutes: 90,
        },
        context
      );

      expect(result.success).toBe(true);
    });

    test("allows updating goalsWorkedOn with valid goals", async () => {
      const family = await createTestFamily();
      const child = await createTestChild(family.id);
      const caregiver = await createTestCaregiver(family.id);
      const session = await createTestSession(child.id);
      const goal = await createTestGoal(child.id);

      const context: ToolContext = {
        userId: caregiver.email,
        familyId: family.id,
      };

      const result = await executor.executeTool(
        "update_session",
        {
          sessionId: session.id,
          goalsWorkedOn: [{ goalId: goal.id, progress: 50 }],
        },
        context
      );

      expect(result.success).toBe(true);
    });
  });
});
