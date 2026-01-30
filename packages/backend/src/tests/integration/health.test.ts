/**
 * Health check endpoint tests
 * 
 * These tests verify the health, liveness, and readiness endpoints
 * work correctly with and without database connectivity.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { app } from "../../app";
import { setupTestDatabase, closeTestDb, teardownTestDatabase } from "../setup";

describe("Health Endpoints", () => {
  beforeAll(async () => {
    // Set test database URL
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 
      "postgres://postgres:postgres@localhost:5433/flynn_aac_test";
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
    await closeTestDb();
  });

  describe("GET /health", () => {
    test("returns health status with all services", async () => {
      const res = await app.request("/health");
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toHaveProperty("status");
      expect(body).toHaveProperty("timestamp");
      expect(body).toHaveProperty("version");
      expect(body).toHaveProperty("services");
      expect(body.services).toHaveProperty("database");
      expect(body.services).toHaveProperty("redis");
    });

    test("returns ISO timestamp", async () => {
      const res = await app.request("/health");
      const body = await res.json();

      // Should be a valid ISO date string
      expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
    });
  });

  describe("GET /live", () => {
    test("returns alive status", async () => {
      const res = await app.request("/live");
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.status).toBe("alive");
    });

    test("responds quickly (under 100ms)", async () => {
      const start = Date.now();
      await app.request("/live");
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });

  describe("GET /ready", () => {
    test("returns ready status when database is connected", async () => {
      const res = await app.request("/ready");
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.status).toBe("ready");
    });
  });
});

describe("404 Handler", () => {
  test("returns 404 for unknown routes", async () => {
    const res = await app.request("/unknown/route");
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Not Found");
    expect(body.message).toContain("/unknown/route");
  });

  test("includes HTTP method in 404 message", async () => {
    const res = await app.request("/unknown", { method: "POST" });
    const body = await res.json();

    expect(body.message).toContain("POST");
  });
});
