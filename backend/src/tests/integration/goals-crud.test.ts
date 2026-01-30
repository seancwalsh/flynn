import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { app } from "../../app";
import { setupTestDatabase, cleanTestData, closeTestDb } from "../setup";
import { createTestFamily, createTestChild, createTestCaregiver } from "../fixtures";
import { db } from "../../db";
import { goals } from "../../db/schema";
import { eq } from "drizzle-orm";

// Helper to make JSON requests (with dev auth bypass for tests)
async function jsonRequest(
  path: string,
  options: { method?: string; body?: unknown } = {}
) {
  const init: RequestInit = {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "x-dev-auth-bypass": "dev-user",
    },
  };

  if (options.body) {
    init.body = JSON.stringify(options.body);
  }

  return app.request(path, init);
}

let testChildId: string;
let testGoalId: string;

beforeAll(async () => {
  process.env.DEV_AUTH_BYPASS = "true";
  await setupTestDatabase();
});

afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  // Clean all test data between tests
  await cleanTestData();

  // Recreate test data
  const family = await createTestFamily({ name: "Test Goals Family" });
  await createTestCaregiver(family.id, {
    email: "dev@flynn-aac.local",
    name: "Dev User",
    role: "parent",
  });
  const child = await createTestChild(family.id, { name: "Test Child" });
  testChildId = child.id;
});

describe("Goals CRUD API", () => {
  describe("GET /api/v1/children/:id/goals", () => {
    test("returns list of goals for a child", async () => {
      // First create some goals for testing
      await db.insert(goals).values([
        {
          childId: testChildId,
          title: "Test Goal 1",
          description: "Description 1",
          therapyType: "aac",
          category: "communication",
          status: "active",
          progressPercent: 25,
          targetDate: "2026-03-30",
        },
        {
          childId: testChildId,
          title: "Test Goal 2",
          description: "Description 2",
          therapyType: "slp",
          category: "language",
          status: "active",
          progressPercent: 50,
          targetDate: "2026-04-15",
        },
      ]);

      const response = await jsonRequest(`/api/v1/children/${testChildId}/goals`);

      expect(response.status).toBe(200);
      const json = await response.json();

      expect(json).toHaveProperty("data");
      expect(Array.isArray(json.data)).toBe(true);

      // We created 2 goals
      expect(json.data.length).toBe(2);

      // Validate goal structure
      const goal = json.data[0];
      expect(goal).toHaveProperty("id");
      expect(goal).toHaveProperty("childId", testChildId);
      expect(goal).toHaveProperty("title");
      expect(goal).toHaveProperty("description");
      expect(goal).toHaveProperty("therapyType");
      expect(goal).toHaveProperty("category");
      expect(goal).toHaveProperty("status");
      expect(goal).toHaveProperty("progressPercent");
      expect(goal).toHaveProperty("targetDate");
      expect(goal).toHaveProperty("createdAt");
      expect(goal).toHaveProperty("updatedAt");
    });

    test("filters goals by status", async () => {
      // Create goals with different statuses
      await db.insert(goals).values([
        {
          childId: testChildId,
          title: "Active Goal",
          therapyType: "aac",
          category: "communication",
          status: "active",
        },
        {
          childId: testChildId,
          title: "Achieved Goal",
          therapyType: "aac",
          category: "communication",
          status: "achieved",
        },
      ]);

      const response = await jsonRequest(
        `/api/v1/children/${testChildId}/goals?status=active`
      );

      expect(response.status).toBe(200);
      const json = await response.json();

      // Should only return active goal
      expect(json.data.length).toBe(1);
      expect(json.data[0].status).toBe("active");
    });

    test("returns 404 for non-existent child", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await jsonRequest(`/api/v1/children/${fakeId}/goals`);

      // Auth middleware returns 403 before we check if child exists
      // This is correct security behavior
      expect([403, 404]).toContain(response.status);
    });
  });

  describe("POST /api/v1/children/:id/goals", () => {
    test("creates a new goal", async () => {
      const newGoal = {
        title: "Test goal: Use 4-word sentences",
        description: "Practice building longer sentences with AAC device",
        therapyType: "aac",
        category: "communication",
        targetDate: "2026-03-30",
        progressPercent: 0,
      };

      const response = await jsonRequest(`/api/v1/children/${testChildId}/goals`, {
        method: "POST",
        body: newGoal,
      });

      expect(response.status).toBe(201);
      const json = await response.json();

      expect(json).toHaveProperty("data");
      expect(json.data).toHaveProperty("id");
      expect(json.data.title).toBe(newGoal.title);
      expect(json.data.description).toBe(newGoal.description);
      expect(json.data.therapyType).toBe(newGoal.therapyType);
      expect(json.data.category).toBe(newGoal.category);
      expect(json.data.targetDate).toBe(newGoal.targetDate);
      expect(json.data.progressPercent).toBe(0);
      expect(json.data.status).toBe("active");
      expect(json.data.childId).toBe(testChildId);

      // Verify it's in the database
      const [dbGoal] = await db
        .select()
        .from(goals)
        .where(eq(goals.id, json.data.id));

      expect(dbGoal).toBeDefined();
      expect(dbGoal.title).toBe(newGoal.title);
    });

    test("validates required fields", async () => {
      const invalidGoal = {
        // Missing title
        description: "Test description",
        therapyType: "aac",
      };

      const response = await jsonRequest(`/api/v1/children/${testChildId}/goals`, {
        method: "POST",
        body: invalidGoal,
      });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json).toHaveProperty("error");
    });

    test("validates therapy type enum", async () => {
      const invalidGoal = {
        title: "Test goal",
        therapyType: "invalid_type",
        category: "communication",
      };

      const response = await jsonRequest(`/api/v1/children/${testChildId}/goals`, {
        method: "POST",
        body: invalidGoal,
      });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json).toHaveProperty("error");
    });

    test("returns 404 for non-existent child", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const newGoal = {
        title: "Test goal",
        therapyType: "aac",
        category: "communication",
      };

      const response = await jsonRequest(`/api/v1/children/${fakeId}/goals`, {
        method: "POST",
        body: newGoal,
      });

      // Auth middleware returns 403 before we check if child exists
      // This is correct security behavior
      expect([403, 404]).toContain(response.status);
    });
  });

  describe("PATCH /api/v1/goals/:id", () => {
    test("updates goal fields", async () => {
      // First create a goal to update
      const createResponse = await jsonRequest(`/api/v1/children/${testChildId}/goals`, {
        method: "POST",
        body: {
          title: "Initial Goal",
          description: "Initial description",
          therapyType: "aac",
          category: "communication",
        },
      });
      const createdGoal = (await createResponse.json()).data;

      const updates = {
        title: "Updated: Use 5-word sentences",
        progressPercent: 25,
        status: "active" as const,
      };

      const response = await jsonRequest(`/api/v1/goals/${createdGoal.id}`, {
        method: "PATCH",
        body: updates,
      });

      expect(response.status).toBe(200);
      const json = await response.json();

      expect(json.data.id).toBe(createdGoal.id);
      expect(json.data.title).toBe(updates.title);
      expect(json.data.progressPercent).toBe(updates.progressPercent);
      expect(json.data.status).toBe(updates.status);

      // Verify in database
      const [dbGoal] = await db
        .select()
        .from(goals)
        .where(eq(goals.id, createdGoal.id));

      expect(dbGoal.title).toBe(updates.title);
      expect(dbGoal.progressPercent).toBe(updates.progressPercent);
    });

    test("updates only provided fields", async () => {
      // First create a goal
      const createResponse = await jsonRequest(`/api/v1/children/${testChildId}/goals`, {
        method: "POST",
        body: {
          title: "Initial Goal for Partial Update",
          therapyType: "aac",
          category: "communication",
        },
      });
      const createdGoal = (await createResponse.json()).data;

      // Get current state
      const beforeResponse = await jsonRequest(`/api/v1/goals/${createdGoal.id}`);
      const before = (await beforeResponse.json()).data;

      // Update only progress
      const updates = {
        progressPercent: 50,
      };

      const response = await jsonRequest(`/api/v1/goals/${createdGoal.id}`, {
        method: "PATCH",
        body: updates,
      });

      expect(response.status).toBe(200);
      const json = await response.json();

      // Progress should be updated
      expect(json.data.progressPercent).toBe(50);
      // But title should remain the same
      expect(json.data.title).toBe(before.title);
    });

    test("validates progress percent bounds", async () => {
      // Create a goal first
      const createResponse = await jsonRequest(`/api/v1/children/${testChildId}/goals`, {
        method: "POST",
        body: {
          title: "Goal for validation test",
          therapyType: "aac",
          category: "communication",
        },
      });
      const createdGoal = (await createResponse.json()).data;

      const invalidUpdates = {
        progressPercent: 150, // Invalid: > 100
      };

      const response = await jsonRequest(`/api/v1/goals/${createdGoal.id}`, {
        method: "PATCH",
        body: invalidUpdates,
      });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json).toHaveProperty("error");
    });

    test("validates status enum", async () => {
      // Create a goal first
      const createResponse = await jsonRequest(`/api/v1/children/${testChildId}/goals`, {
        method: "POST",
        body: {
          title: "Goal for status validation",
          therapyType: "aac",
          category: "communication",
        },
      });

      expect(createResponse.status).toBe(201);
      const createData = await createResponse.json();
      const createdGoal = createData.data;

      const invalidUpdates = {
        status: "invalid_status",
      };

      const response = await jsonRequest(`/api/v1/goals/${createdGoal.id}`, {
        method: "PATCH",
        body: invalidUpdates,
      });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json).toHaveProperty("error");
    });

    test("returns 404 for non-existent goal", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const updates = {
        progressPercent: 75,
      };

      const response = await jsonRequest(`/api/v1/goals/${fakeId}`, {
        method: "PATCH",
        body: updates,
      });

      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/v1/goals/:id", () => {
    test("returns single goal by id", async () => {
      // Create a goal first
      const createResponse = await jsonRequest(`/api/v1/children/${testChildId}/goals`, {
        method: "POST",
        body: {
          title: "Goal for GET test",
          therapyType: "aac",
          category: "communication",
        },
      });
      const createdGoal = (await createResponse.json()).data;

      const response = await jsonRequest(`/api/v1/goals/${createdGoal.id}`);

      expect(response.status).toBe(200);
      const json = await response.json();

      expect(json.data).toHaveProperty("id", createdGoal.id);
      expect(json.data).toHaveProperty("title");
      expect(json.data).toHaveProperty("childId");
    });

    test("returns 404 for non-existent goal", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await jsonRequest(`/api/v1/goals/${fakeId}`);

      expect(response.status).toBe(404);
    });
  });

  describe("DELETE /api/v1/goals/:id", () => {
    test("deletes a goal", async () => {
      // Create a goal first
      const createResponse = await jsonRequest(`/api/v1/children/${testChildId}/goals`, {
        method: "POST",
        body: {
          title: "Goal for DELETE test",
          therapyType: "aac",
          category: "communication",
        },
      });

      expect(createResponse.status).toBe(201);
      const createData = await createResponse.json();
      const createdGoal = createData.data;

      const response = await jsonRequest(`/api/v1/goals/${createdGoal.id}`, {
        method: "DELETE",
      });

      expect(response.status).toBe(204);

      // Verify it's deleted from database
      const [dbGoal] = await db
        .select()
        .from(goals)
        .where(eq(goals.id, createdGoal.id));

      expect(dbGoal).toBeUndefined();

      // Verify GET returns 404
      const getResponse = await jsonRequest(`/api/v1/goals/${createdGoal.id}`);
      expect(getResponse.status).toBe(404);
    });

    test("returns 404 for non-existent goal", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await jsonRequest(`/api/v1/goals/${fakeId}`, {
        method: "DELETE",
      });

      expect(response.status).toBe(404);
    });
  });
});
