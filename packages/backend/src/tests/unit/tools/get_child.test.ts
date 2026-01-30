/**
 * get_child Tool Tests
 */

import { describe, test, expect, beforeEach, afterAll } from "bun:test";
import { getChildTool } from "../../../tools/read/get_child";
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
  createTestTherapist,
  createTestUsageLogs,
} from "../../fixtures";
import { therapistClients } from "../../../db/schema";

// ============================================================================
// Test Setup
// ============================================================================

let executor: ToolExecutor;
let testFamily: Awaited<ReturnType<typeof createTestFamily>>;
let testChild: Awaited<ReturnType<typeof createTestChild>>;
let testCaregiver: Awaited<ReturnType<typeof createTestCaregiver>>;
let testTherapist: Awaited<ReturnType<typeof createTestTherapist>>;

beforeEach(async () => {
  executor = new ToolExecutor();
  executor.registerTool(getChildTool);
  resetToolExecutor();
  
  await setupTestDatabase();
  await cleanTestData();
  
  // Create test data
  testFamily = await createTestFamily({ name: "Smith Family" });
  testChild = await createTestChild(testFamily.id, { 
    name: "Emma Smith", 
    birthDate: "2020-03-15" 
  });
  testCaregiver = await createTestCaregiver(testFamily.id, { 
    name: "Sarah Smith",
    role: "parent" 
  });
  testTherapist = await createTestTherapist({ name: "Dr. Johnson" });
  
  // Assign therapist to child
  const db = getTestDb();
  await db.insert(therapistClients).values({
    therapistId: testTherapist.id,
    childId: testChild.id,
  });
  
  // Create some usage logs
  await createTestUsageLogs(testChild.id, 5);
});

afterAll(async () => {
  await closeTestDb();
});

// ============================================================================
// Tests
// ============================================================================

describe("get_child tool", () => {
  describe("authorization", () => {
    test("returns child profile for authorized caregiver", async () => {
      const context: ToolContext = {
        userId: testCaregiver.email, // Using email as userId for now
        familyId: testFamily.id,
      };

      const result = await executor.executeTool(
        "get_child",
        { childId: testChild.id },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      const profile = result.data as { id: string; name: string; familyId: string };
      expect(profile.id).toBe(testChild.id);
      expect(profile.name).toBe("Emma Smith");
      expect(profile.familyId).toBe(testFamily.id);
    });

    test("throws UNAUTHORIZED for user without access", async () => {
      const context: ToolContext = {
        userId: "unauthorized@example.com",
        familyId: "some-other-family-id",
      };

      const result = await executor.executeTool(
        "get_child",
        { childId: testChild.id },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("access");
    });

    test("throws USER_ID_REQUIRED when no userId provided", async () => {
      const context: ToolContext = {
        userId: "", // Empty user ID
      };

      const result = await executor.executeTool(
        "get_child",
        { childId: testChild.id },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("User ID is required");
    });
  });

  describe("child not found", () => {
    test("throws CHILD_NOT_FOUND for invalid childId", async () => {
      const context: ToolContext = {
        userId: testCaregiver.email,
        familyId: testFamily.id,
      };

      const result = await executor.executeTool(
        "get_child",
        { childId: "00000000-0000-0000-0000-000000000000" },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });
  });

  describe("response content", () => {
    test("includes therapists in response", async () => {
      const context: ToolContext = {
        userId: testCaregiver.email,
        familyId: testFamily.id,
      };

      const result = await executor.executeTool(
        "get_child",
        { childId: testChild.id },
        context
      );

      expect(result.success).toBe(true);
      
      const profile = result.data as { 
        therapists: Array<{ id: string; name: string }> 
      };
      expect(profile.therapists).toBeInstanceOf(Array);
      expect(profile.therapists.length).toBeGreaterThan(0);
      expect(profile.therapists[0]?.name).toBe("Dr. Johnson");
    });

    test("includes settings in response", async () => {
      const context: ToolContext = {
        userId: testCaregiver.email,
        familyId: testFamily.id,
      };

      const result = await executor.executeTool(
        "get_child",
        { childId: testChild.id },
        context
      );

      expect(result.success).toBe(true);
      
      const profile = result.data as { 
        settings: { preferredSymbolSet: string; voiceEnabled: boolean; gridSize: string } 
      };
      expect(profile.settings).toBeDefined();
      expect(profile.settings.preferredSymbolSet).toBe("pcs");
      expect(profile.settings.voiceEnabled).toBe(true);
      expect(profile.settings.gridSize).toBe("medium");
    });

    test("calculates age in months correctly", async () => {
      const context: ToolContext = {
        userId: testCaregiver.email,
        familyId: testFamily.id,
      };

      const result = await executor.executeTool(
        "get_child",
        { childId: testChild.id },
        context
      );

      expect(result.success).toBe(true);
      
      const profile = result.data as { ageInMonths: number };
      expect(profile.ageInMonths).toBeGreaterThan(0);
      // Child born 2020-03-15, so should be > 48 months at minimum
      expect(profile.ageInMonths).toBeGreaterThan(48);
    });

    test("includes symbol usage count", async () => {
      const context: ToolContext = {
        userId: testCaregiver.email,
        familyId: testFamily.id,
      };

      const result = await executor.executeTool(
        "get_child",
        { childId: testChild.id },
        context
      );

      expect(result.success).toBe(true);
      
      const profile = result.data as { totalSymbolsUsed: number };
      expect(profile.totalSymbolsUsed).toBeGreaterThanOrEqual(0);
    });
  });

  describe("input validation", () => {
    test("rejects invalid UUID format", async () => {
      const context: ToolContext = {
        userId: testCaregiver.email,
        familyId: testFamily.id,
      };

      const result = await executor.executeTool(
        "get_child",
        { childId: "not-a-valid-uuid" },
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid");
    });

    test("rejects missing childId", async () => {
      const context: ToolContext = {
        userId: testCaregiver.email,
        familyId: testFamily.id,
      };

      const result = await executor.executeTool(
        "get_child",
        {},
        context
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });
  });
});
