import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { setupTestDatabase, cleanTestData } from "../setup";
import { createTestFamily, createTestChild } from "../fixtures";
import { db } from "../../db";
import { usageLogs, dailyMetrics } from "../../db/schema";
import { runDailyAggregationJob } from "../../services/metrics-aggregator";
import { eq, and, gte } from "drizzle-orm";

describe("Usage Flow E2E", () => {
  let childId: string;
  let familyId: string;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanTestData();
  });

  beforeEach(async () => {
    // Create fresh test data for each test
    const family = await createTestFamily();
    familyId = family.id;
    const child = await createTestChild(family.id);
    childId = child.id;
  });

  it("should store usage logs with categoryId and metadata", async () => {
    // 1. Insert usage logs (simulating iOS sync)
    const now = new Date();

    const testLogs = [
      {
        childId,
        symbolId: "food-apple",
        categoryId: "food",
        timestamp: now,
        sessionId: "test-session-1",
        metadata: { source: "test" },
      },
      {
        childId,
        symbolId: "action-want",
        categoryId: "actions",
        timestamp: now,
        sessionId: "test-session-1",
        metadata: { source: "test" },
      },
    ];

    await db.insert(usageLogs).values(testLogs);

    // 2. Verify logs were inserted
    const logs = await db
      .select()
      .from(usageLogs)
      .where(eq(usageLogs.childId, childId));

    expect(logs).toHaveLength(2);
    expect(logs[0].symbolId).toBe("food-apple");
    expect(logs[0].categoryId).toBe("food");
    expect(logs[0].metadata).toEqual({ source: "test" });
  });

  it("should aggregate usage logs into daily metrics", async () => {
    // 1. Insert usage logs (simulating iOS sync)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(12, 0, 0, 0); // Noon yesterday

    const testLogs = [
      {
        childId,
        symbolId: "food-apple",
        categoryId: "food",
        timestamp: yesterday,
        sessionId: null,
        metadata: null,
      },
      {
        childId,
        symbolId: "food-milk",
        categoryId: "food",
        timestamp: yesterday,
        sessionId: null,
        metadata: null,
      },
      {
        childId,
        symbolId: "action-want",
        categoryId: "actions",
        timestamp: yesterday,
        sessionId: null,
        metadata: null,
      },
      {
        childId,
        symbolId: "food-apple",
        categoryId: "food",
        timestamp: yesterday,
        sessionId: null,
        metadata: null,
      }, // duplicate symbol
    ];

    await db.insert(usageLogs).values(testLogs);

    // 2. Run aggregation
    await runDailyAggregationJob();

    // 3. Verify daily_metrics created
    const metrics = await db
      .select()
      .from(dailyMetrics)
      .where(
        and(
          eq(dailyMetrics.childId, childId),
          gte(dailyMetrics.date, yesterday)
        )
      )
      .limit(1);

    expect(metrics).toHaveLength(1);
    expect(metrics[0].totalTaps).toBe(4);
    expect(metrics[0].uniqueSymbols).toBe(3); // apple, milk, want
    expect(metrics[0].uniqueCategories).toBe(2); // food, actions
  });

  it("should handle bulk upload format from iOS", async () => {
    // 1. Simulate bulk upload from iOS
    const bulkData = {
      childId,
      logs: [
        {
          symbolId: "food-apple",
          categoryId: "food",
          timestamp: new Date().toISOString(),
          sessionId: "session-123",
          metadata: { device: "iPad" },
        },
        {
          symbolId: "food-milk",
          categoryId: "food",
          timestamp: new Date().toISOString(),
          sessionId: "session-123",
          metadata: { device: "iPad" },
        },
      ],
    };

    // 2. Insert using the same logic as the API endpoint
    const values = bulkData.logs.map((log) => ({
      childId: bulkData.childId,
      symbolId: log.symbolId,
      categoryId: log.categoryId,
      sessionId: log.sessionId ?? null,
      timestamp: new Date(log.timestamp),
      metadata: log.metadata ?? null,
    }));

    const inserted = await db.insert(usageLogs).values(values).returning();

    // 3. Verify insertion
    expect(inserted).toHaveLength(2);
    expect(inserted[0].categoryId).toBe("food");
    expect(inserted[0].metadata).toEqual({ device: "iPad" });
  });

  it("should group logs by session", async () => {
    // 1. Insert logs with different sessions
    const now = new Date();
    const sessionId1 = "session-1";
    const sessionId2 = "session-2";

    await db.insert(usageLogs).values([
      {
        childId,
        symbolId: "food-apple",
        categoryId: "food",
        timestamp: now,
        sessionId: sessionId1,
        metadata: null,
      },
      {
        childId,
        symbolId: "food-milk",
        categoryId: "food",
        timestamp: now,
        sessionId: sessionId1,
        metadata: null,
      },
      {
        childId,
        symbolId: "action-want",
        categoryId: "actions",
        timestamp: now,
        sessionId: sessionId2,
        metadata: null,
      },
    ]);

    // 2. Query logs by session
    const session1Logs = await db
      .select()
      .from(usageLogs)
      .where(
        and(
          eq(usageLogs.childId, childId),
          eq(usageLogs.sessionId, sessionId1)
        )
      );

    const session2Logs = await db
      .select()
      .from(usageLogs)
      .where(
        and(
          eq(usageLogs.childId, childId),
          eq(usageLogs.sessionId, sessionId2)
        )
      );

    // 3. Verify grouping
    expect(session1Logs).toHaveLength(2);
    expect(session2Logs).toHaveLength(1);
  });
});
