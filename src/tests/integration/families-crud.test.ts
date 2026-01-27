/**
 * Families CRUD API tests
 * 
 * Full integration test covering the entire CRUD lifecycle
 * for the families resource.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { app } from "../../app";
import { setupTestDatabase, cleanTestData, closeTestDb, teardownTestDatabase } from "../setup";

// Helper to make JSON requests
async function jsonRequest(
  path: string,
  options: { method?: string; body?: unknown } = {}
) {
  const init: RequestInit = {
    method: options.method ?? "GET",
    headers: { "Content-Type": "application/json" },
  };
  
  if (options.body) {
    init.body = JSON.stringify(options.body);
  }
  
  return app.request(path, init);
}

describe("Families CRUD API", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanTestData();
  });

  afterAll(async () => {
    await teardownTestDatabase();
    await closeTestDb();
  });

  describe("POST /api/v1/families", () => {
    test("creates a family with valid data", async () => {
      const res = await jsonRequest("/api/v1/families", {
        method: "POST",
        body: { name: "Johnson Family" },
      });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.data.id).toBeDefined();
      expect(body.data.name).toBe("Johnson Family");
      expect(body.data.createdAt).toBeDefined();
    });

    test("returns 400 for missing name", async () => {
      const res = await jsonRequest("/api/v1/families", {
        method: "POST",
        body: {},
      });

      expect(res.status).toBe(400);
    });

    test("returns 400 for empty name", async () => {
      const res = await jsonRequest("/api/v1/families", {
        method: "POST",
        body: { name: "" },
      });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/v1/families", () => {
    test("returns empty array when no families exist", async () => {
      const res = await jsonRequest("/api/v1/families");
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toEqual([]);
    });

    test("returns all families", async () => {
      // Create some families first
      await jsonRequest("/api/v1/families", {
        method: "POST",
        body: { name: "Family A" },
      });
      await jsonRequest("/api/v1/families", {
        method: "POST",
        body: { name: "Family B" },
      });

      const res = await jsonRequest("/api/v1/families");
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(2);
    });
  });

  describe("GET /api/v1/families/:id", () => {
    test("returns a single family by ID", async () => {
      // Create a family
      const createRes = await jsonRequest("/api/v1/families", {
        method: "POST",
        body: { name: "Single Family" },
      });
      const { data: created } = await createRes.json();

      // Fetch it
      const res = await jsonRequest(`/api/v1/families/${created.id}`);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.id).toBe(created.id);
      expect(body.data.name).toBe("Single Family");
    });

    test("returns 404 for non-existent family", async () => {
      const res = await jsonRequest("/api/v1/families/00000000-0000-0000-0000-000000000000");
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toContain("not found");
    });
  });

  describe("PATCH /api/v1/families/:id", () => {
    test("updates family name", async () => {
      // Create a family
      const createRes = await jsonRequest("/api/v1/families", {
        method: "POST",
        body: { name: "Original Name" },
      });
      const { data: created } = await createRes.json();

      // Update it
      const res = await jsonRequest(`/api/v1/families/${created.id}`, {
        method: "PATCH",
        body: { name: "Updated Name" },
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.id).toBe(created.id);
      expect(body.data.name).toBe("Updated Name");
    });

    test("returns 404 for non-existent family", async () => {
      const res = await jsonRequest("/api/v1/families/00000000-0000-0000-0000-000000000000", {
        method: "PATCH",
        body: { name: "New Name" },
      });

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /api/v1/families/:id", () => {
    test("deletes a family", async () => {
      // Create a family
      const createRes = await jsonRequest("/api/v1/families", {
        method: "POST",
        body: { name: "To Delete" },
      });
      const { data: created } = await createRes.json();

      // Delete it
      const deleteRes = await jsonRequest(`/api/v1/families/${created.id}`, {
        method: "DELETE",
      });

      expect(deleteRes.status).toBe(200);

      // Verify it's gone
      const getRes = await jsonRequest(`/api/v1/families/${created.id}`);
      expect(getRes.status).toBe(404);
    });

    test("returns 404 for non-existent family", async () => {
      const res = await jsonRequest("/api/v1/families/00000000-0000-0000-0000-000000000000", {
        method: "DELETE",
      });

      expect(res.status).toBe(404);
    });
  });

  describe("Full CRUD Lifecycle", () => {
    test("complete create-read-update-delete cycle", async () => {
      // 1. Create
      const createRes = await jsonRequest("/api/v1/families", {
        method: "POST",
        body: { name: "Lifecycle Test Family" },
      });
      expect(createRes.status).toBe(201);
      const { data: family } = await createRes.json();

      // 2. Read
      const readRes = await jsonRequest(`/api/v1/families/${family.id}`);
      expect(readRes.status).toBe(200);
      const { data: readFamily } = await readRes.json();
      expect(readFamily.name).toBe("Lifecycle Test Family");

      // 3. Update
      const updateRes = await jsonRequest(`/api/v1/families/${family.id}`, {
        method: "PATCH",
        body: { name: "Updated Lifecycle Family" },
      });
      expect(updateRes.status).toBe(200);
      const { data: updatedFamily } = await updateRes.json();
      expect(updatedFamily.name).toBe("Updated Lifecycle Family");

      // 4. Verify update persisted
      const verifyRes = await jsonRequest(`/api/v1/families/${family.id}`);
      const { data: verifiedFamily } = await verifyRes.json();
      expect(verifiedFamily.name).toBe("Updated Lifecycle Family");

      // 5. Delete
      const deleteRes = await jsonRequest(`/api/v1/families/${family.id}`, {
        method: "DELETE",
      });
      expect(deleteRes.status).toBe(200);

      // 6. Verify deletion
      const finalRes = await jsonRequest(`/api/v1/families/${family.id}`);
      expect(finalRes.status).toBe(404);
    });
  });
});
