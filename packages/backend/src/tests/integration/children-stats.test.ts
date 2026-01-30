/**
 * Children Stats API tests
 *
 * Integration tests for /api/v1/children/:id/stats endpoint
 * that aggregates usage metrics, insights, and goals for a child.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { app } from "../../app";
import { setupTestDatabase, cleanTestData, closeTestDb, teardownTestDatabase } from "../setup";
import {
  createTestFamily,
  createTestChild,
  createTestCaregiver,
  createTestUsageLogs,
  createTestInsight,
  createTestGoal,
} from "../fixtures";
import { db } from "../../db";
import { dailyMetrics, usageLogs } from "../../db/schema";
import { sql } from "drizzle-orm";

// Helper to make JSON requests (with dev auth bypass for tests)
async function jsonRequest(
  path: string,
  options: { method?: string; body?: unknown } = {}
) {
  const init: RequestInit = {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "x-dev-auth-bypass": "dev-user", // Dev auth bypass for tests
    },
  };

  if (options.body) {
    init.body = JSON.stringify(options.body);
  }

  return app.request(path, init);
}

describe("Children Stats API", () => {
  // Enable dev auth bypass for tests
  const originalEnv = process.env.DEV_AUTH_BYPASS;

  beforeAll(async () => {
    process.env.DEV_AUTH_BYPASS = "true";
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanTestData();
  });

  afterAll(async () => {
    process.env.DEV_AUTH_BYPASS = originalEnv;
    await teardownTestDatabase();
    await closeTestDb();
  });

  describe("GET /api/v1/children/:id/stats", () => {
    test("returns stats for a child with usage data", async () => {
      // Create test data
      const family = await createTestFamily({ name: "Test Family" });
      // Link dev user to family via caregiver
      await createTestCaregiver(family.id, {
        email: "dev@flynn-aac.local",
        name: "Dev User",
        role: "parent"
      });
      const child = await createTestChild(family.id, { name: "Emma", birthDate: "2020-06-15" });

      // Create usage logs
      await createTestUsageLogs(child.id, 50, { symbolPrefix: "symbol" });

      // Create daily metric
      const today = new Date().toISOString().split('T')[0];
      await db.insert(dailyMetrics).values({
        childId: child.id,
        date: today,
        totalTaps: 50,
        uniqueSymbols: 15,
        uniqueCategories: 5,
        sessionCount: 3,
        categoryBreakdown: { food: 20, actions: 15, people: 10 },
        hourlyDistribution: Array(24).fill(0),
        topSymbols: [
          { symbolId: "symbol-1", count: 10, label: "symbol 1" },
          { symbolId: "symbol-2", count: 8, label: "symbol 2" },
        ],
      });

      // Create insights
      await createTestInsight(child.id, { type: "daily_digest" });
      await createTestInsight(child.id, { type: "milestone" });

      // Create goals
      await createTestGoal(child.id, { title: "Use 50 symbols", progressPercent: 60 });

      // Fetch stats
      const res = await jsonRequest(`/api/v1/children/${child.id}/stats`);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toBeDefined();

      // Check basic stats
      expect(body.data.totalSymbols).toBe(15);
      expect(body.data.recentActivity).toBeDefined();

      // Check insights count
      expect(body.data.insightCount).toBe(2);

      // Check goals count
      expect(body.data.goalCount).toBe(1);
    });

    test("returns stats for child with no data", async () => {
      const family = await createTestFamily();
      await createTestCaregiver(family.id, { email: "dev@flynn-aac.local" });
      const child = await createTestChild(family.id, { name: "New Child" });

      const res = await jsonRequest(`/api/v1/children/${child.id}/stats`);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.totalSymbols).toBe(0);
      expect(body.data.recentActivity).toBeNull();
      expect(body.data.insightCount).toBe(0);
      expect(body.data.goalCount).toBe(0);
    });

    test("returns 403 for non-existent child (auth check happens first)", async () => {
      const res = await jsonRequest("/api/v1/children/00000000-0000-0000-0000-000000000000/stats");

      // Returns 403 because authorization check happens before existence check
      // This is correct behavior - don't reveal if child exists to unauthorized users
      expect(res.status).toBe(403);
    });

    test("includes recent activity from latest daily metric", async () => {
      const family = await createTestFamily();
      await createTestCaregiver(family.id, { email: "dev@flynn-aac.local" });
      const child = await createTestChild(family.id);

      // Create metric from yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      await db.insert(dailyMetrics).values({
        childId: child.id,
        date: yesterdayStr,
        totalTaps: 75,
        uniqueSymbols: 25,
        uniqueCategories: 6,
        sessionCount: 5,
        categoryBreakdown: {},
        hourlyDistribution: Array(24).fill(0),
        topSymbols: [],
      });

      const res = await jsonRequest(`/api/v1/children/${child.id}/stats`);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.recentActivity).toBe(yesterdayStr);
      expect(body.data.totalSymbols).toBe(25);
    });
  });

  describe("GET /api/v1/children/:id/insights", () => {
    test("returns all insights for a child", async () => {
      const family = await createTestFamily();
      await createTestCaregiver(family.id, { email: "dev@flynn-aac.local" });
      const child = await createTestChild(family.id);

      // Create various insights
      await createTestInsight(child.id, {
        type: "daily_digest",
        content: { summary: "Great day!" }
      });
      await createTestInsight(child.id, {
        type: "milestone",
        content: { milestone: "50_symbols" }
      });
      await createTestInsight(child.id, {
        type: "suggestion",
        content: { suggestionType: "category_expansion" }
      });

      const res = await jsonRequest(`/api/v1/children/${child.id}/insights`);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(3);
      expect(body.data[0].type).toBeDefined();
      expect(body.data[0].content).toBeDefined();
    });

    test("returns empty array for child with no insights", async () => {
      const family = await createTestFamily();
      await createTestCaregiver(family.id, { email: "dev@flynn-aac.local" });
      const child = await createTestChild(family.id);

      const res = await jsonRequest(`/api/v1/children/${child.id}/insights`);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toEqual([]);
    });

    test("returns 403 for non-existent child (auth check happens first)", async () => {
      const res = await jsonRequest("/api/v1/children/00000000-0000-0000-0000-000000000000/insights");

      // Returns 403 because authorization check happens before existence check
      // This is correct behavior - don't reveal if child exists to unauthorized users
      expect(res.status).toBe(403);
    });

    test("filters insights by type when type query param provided", async () => {
      const family = await createTestFamily();
      await createTestCaregiver(family.id, { email: "dev@flynn-aac.local" });
      const child = await createTestChild(family.id);

      await createTestInsight(child.id, { type: "daily_digest" });
      await createTestInsight(child.id, { type: "milestone" });
      await createTestInsight(child.id, { type: "milestone" });

      const res = await jsonRequest(`/api/v1/children/${child.id}/insights?type=milestone`);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(2);
      expect(body.data.every((i: any) => i.type === "milestone")).toBe(true);
    });

    test("orders insights by generated date descending", async () => {
      const family = await createTestFamily();
      await createTestCaregiver(family.id, { email: "dev@flynn-aac.local" });
      const child = await createTestChild(family.id);

      // Create insights (they'll have timestamps in order of creation)
      const insight1 = await createTestInsight(child.id, { type: "daily_digest" });
      const insight2 = await createTestInsight(child.id, { type: "milestone" });
      const insight3 = await createTestInsight(child.id, { type: "suggestion" });

      const res = await jsonRequest(`/api/v1/children/${child.id}/insights`);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(3);

      // Most recent first
      expect(body.data[0].id).toBe(insight3.id);
      expect(body.data[2].id).toBe(insight1.id);
    });
  });
});
