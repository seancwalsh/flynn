import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { app } from "../../app";
import { setupTestDatabase, cleanTestData, closeTestDb } from "../setup";
import {
  createTestFamily,
  createTestCaregiver,
  createTestChild,
  createTestTherapist,
  assignTherapistToChild,
} from "../fixtures";
import { db } from "../../db";
import { users } from "../../db/schema";
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

describe("Therapist Workflows", () => {
  let therapistId: string;
  let childId: string;
  let familyId: string;

  beforeAll(async () => {
    process.env.DEV_AUTH_BYPASS = "true";
    await setupTestDatabase();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await cleanTestData();

    // Create a family with caregiver and child
    const family = await createTestFamily({ name: "Test Therapy Family" });
    familyId = family.id;

    const caregiver = await createTestCaregiver(familyId, {
      email: "parent@flynn-aac.local",
      name: "Test Parent",
      role: "parent",
    });

    // Create user account for parent caregiver (for tests that require caregiver auth)
    await db.insert(users).values({
      clerkId: `test-caregiver-${caregiver.id}`,
      email: "parent@flynn-aac.local",
      role: "caregiver",
    });

    const child = await createTestChild(familyId, { name: "Test Child" });
    childId = child.id;

    // Create a therapist with the dev auth email
    const therapist = await createTestTherapist({
      email: "dev@flynn-aac.local",
      name: "Dr. Sarah Smith",
    });
    therapistId = therapist.id;

    // Update the dev user to have therapist role (createTestTherapist creates it, but dev auth might override)
    await db
      .update(users)
      .set({ role: "therapist" })
      .where(eq(users.email, "dev@flynn-aac.local"));
  });

  describe("Therapist Client Management", () => {
    test("therapist can view their assigned clients", async () => {
      // Assign child to therapist
      await assignTherapistToChild(therapistId, childId);

      // Therapist views their clients
      const response = await jsonRequest(`/api/v1/therapists/${therapistId}/clients`);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data).toBeArray();
      expect(json.data.length).toBe(1);
      expect(json.data[0].child.id).toBe(childId);
      expect(json.data[0].child.name).toBe("Test Child");
    });

    test("therapist cannot assign children (only caregivers can)", async () => {
      const response = await jsonRequest(`/api/v1/therapists/${therapistId}/clients`, {
        method: "POST",
        body: { childId },
      });

      // Therapists don't have permission to assign clients, only caregivers do
      expect(response.status).toBe(403);
    });

    test("therapist can remove their own client assignments", async () => {
      // Assign child to therapist first (using direct DB insert since therapist can't do it via API)
      await assignTherapistToChild(therapistId, childId);

      const response = await jsonRequest(
        `/api/v1/therapists/${therapistId}/clients/${childId}`,
        { method: "DELETE" }
      );

      // Therapists can remove their own client assignments
      expect(response.status).toBe(200);
    });
  });

  describe("Therapy Sessions", () => {
    beforeEach(async () => {
      // Assign therapist to child for session tests
      await assignTherapistToChild(therapistId, childId);
    });

    test("therapist can create a therapy session", async () => {
      const response = await jsonRequest(`/api/v1/children/${childId}/sessions`, {
        method: "POST",
        body: {
          therapyType: "slp",
          sessionDate: "2026-01-30",
          durationMinutes: 45,
          notes: "Great progress on two-word combinations",
        },
      });

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.data.childId).toBe(childId);
      expect(json.data.therapyType).toBe("slp");
      expect(json.data.durationMinutes).toBe(45);
    });

    test("therapist can list sessions for their client", async () => {
      // Create a session first
      await jsonRequest(`/api/v1/children/${childId}/sessions`, {
        method: "POST",
        body: {
          therapyType: "slp",
          sessionDate: "2026-01-30",
          durationMinutes: 45,
          notes: "Session notes",
        },
      });

      const response = await jsonRequest(`/api/v1/children/${childId}/sessions`);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data).toBeArray();
      expect(json.data.length).toBeGreaterThan(0);
    });

    test("session requires valid therapy type", async () => {
      const response = await jsonRequest(`/api/v1/children/${childId}/sessions`, {
        method: "POST",
        body: {
          therapyType: "invalid",
          sessionDate: "2026-01-30",
          durationMinutes: 45,
        },
      });

      expect(response.status).toBe(400);
    });

    test("therapist can update session notes", async () => {
      // Create a session
      const createResponse = await jsonRequest(`/api/v1/children/${childId}/sessions`, {
        method: "POST",
        body: {
          therapyType: "slp",
          sessionDate: "2026-01-30",
          durationMinutes: 45,
          notes: "Initial notes",
        },
      });

      const createJson = await createResponse.json();
      const sessionId = createJson.data.id;

      // Update the session
      const response = await jsonRequest(`/api/v1/sessions/${sessionId}`, {
        method: "PATCH",
        body: {
          notes: "Updated notes with more details",
        },
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.notes).toBe("Updated notes with more details");
    });

    test("therapist can delete a session", async () => {
      // Create a session
      const createResponse = await jsonRequest(`/api/v1/children/${childId}/sessions`, {
        method: "POST",
        body: {
          therapyType: "slp",
          sessionDate: "2026-01-30",
          durationMinutes: 45,
        },
      });

      const createJson = await createResponse.json();
      const sessionId = createJson.data.id;

      const response = await jsonRequest(`/api/v1/sessions/${sessionId}`, {
        method: "DELETE",
      });

      expect(response.status).toBe(200);
    });
  });

  describe("Goal Management for Therapists", () => {
    beforeEach(async () => {
      await assignTherapistToChild(therapistId, childId);
    });

    test("therapist can view goals for their client", async () => {
      // Create a goal first
      await jsonRequest(`/api/v1/children/${childId}/goals`, {
        method: "POST",
        body: {
          title: "Use two-word combinations",
          therapyType: "slp",
          progressPercent: 25,
        },
      });

      const response = await jsonRequest(`/api/v1/children/${childId}/goals`);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data).toBeArray();
      expect(json.data.length).toBeGreaterThan(0);
    });

    test("therapist can create goals for their client", async () => {
      const response = await jsonRequest(`/api/v1/children/${childId}/goals`, {
        method: "POST",
        body: {
          title: "Therapist-created goal",
          description: "Goal set during therapy session",
          therapyType: "slp",
          progressPercent: 0,
        },
      });

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.data.title).toBe("Therapist-created goal");
    });

    test("therapist can update goal progress", async () => {
      // Create a goal
      const createResponse = await jsonRequest(`/api/v1/children/${childId}/goals`, {
        method: "POST",
        body: {
          title: "Test Goal",
          therapyType: "slp",
          progressPercent: 25,
        },
      });

      const createJson = await createResponse.json();
      const goalId = createJson.data.id;

      // Update progress
      const response = await jsonRequest(`/api/v1/goals/${goalId}`, {
        method: "PATCH",
        body: {
          progressPercent: 75,
        },
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.progressPercent).toBe(75);
    });

    test("therapist cannot access goals for non-clients", async () => {
      // Create another family with a child not assigned to this therapist
      const otherFamily = await createTestFamily({ name: "Other Family" });
      const otherChild = await createTestChild(otherFamily.id, { name: "Other Child" });

      const response = await jsonRequest(`/api/v1/children/${otherChild.id}/goals`);

      expect([403, 404]).toContain(response.status);
    });
  });

  describe("Child Profile Access", () => {
    test("therapist can view basic profile of assigned client", async () => {
      await assignTherapistToChild(therapistId, childId);

      const response = await jsonRequest(`/api/v1/children/${childId}`);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.data.id).toBe(childId);
      expect(json.data.name).toBe("Test Child");
    });

    test("therapist cannot view non-client child profiles", async () => {
      // Don't assign therapist to child
      const response = await jsonRequest(`/api/v1/children/${childId}`);

      expect([403, 404]).toContain(response.status);
    });
  });
});
