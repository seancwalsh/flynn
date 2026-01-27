import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";
import { db } from "../../../db";
import { usageLogs } from "../../../db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { AppError } from "../../../middleware/error-handler";

export const usageLogsRoutes = new Hono();

const createUsageLogSchema = z.object({
  childId: z.string().uuid(),
  symbolId: z.string().min(1).max(255),
  sessionId: z.string().uuid().optional(),
  timestamp: z.string().datetime().optional(),
});

const querySchema = z.object({
  childId: z.string().uuid().optional(),
  sessionId: z.string().uuid().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(1000).default(100),
});

// List usage logs with filtering
usageLogsRoutes.get("/", zValidator("query", querySchema), async (c) => {
  const query = c.req.valid("query");
  
  let baseQuery = db.select().from(usageLogs);
  const conditions = [];
  
  if (query.childId) {
    conditions.push(eq(usageLogs.childId, query.childId));
  }
  if (query.sessionId) {
    conditions.push(eq(usageLogs.sessionId, query.sessionId));
  }
  if (query.from) {
    conditions.push(gte(usageLogs.timestamp, new Date(query.from)));
  }
  if (query.to) {
    conditions.push(lte(usageLogs.timestamp, new Date(query.to)));
  }
  
  const results = await baseQuery
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(usageLogs.timestamp))
    .limit(query.limit);
  
  return c.json({ data: results });
});

// Get single usage log
usageLogsRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const [log] = await db.select().from(usageLogs).where(eq(usageLogs.id, id));
  
  if (!log) {
    throw new AppError("Usage log not found", 404, "NOT_FOUND");
  }
  
  return c.json({ data: log });
});

// Create usage log (typically called by sync from CloudKit)
usageLogsRoutes.post("/", zValidator("json", createUsageLogSchema), async (c) => {
  const body = c.req.valid("json");
  
  const [log] = await db.insert(usageLogs).values({
    childId: body.childId,
    symbolId: body.symbolId,
    sessionId: body.sessionId ?? null,
    timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
  }).returning();
  
  return c.json({ data: log }, 201);
});

// Bulk create usage logs (for sync)
usageLogsRoutes.post("/bulk", zValidator("json", z.array(createUsageLogSchema)), async (c) => {
  const body = c.req.valid("json");
  
  const logs = await db.insert(usageLogs).values(
    body.map((log) => ({
      childId: log.childId,
      symbolId: log.symbolId,
      sessionId: log.sessionId ?? null,
      timestamp: log.timestamp ? new Date(log.timestamp) : new Date(),
    }))
  ).returning();
  
  return c.json({ data: logs, count: logs.length }, 201);
});

// Get usage statistics for a child
usageLogsRoutes.get("/stats/:childId", async (c) => {
  const childId = c.req.param("childId");
  
  // Get total count
  const logs = await db
    .select()
    .from(usageLogs)
    .where(eq(usageLogs.childId, childId));
  
  // Simple statistics (in production, use proper SQL aggregations)
  const symbolCounts = new Map<string, number>();
  for (const log of logs) {
    const count = symbolCounts.get(log.symbolId) ?? 0;
    symbolCounts.set(log.symbolId, count + 1);
  }
  
  const topSymbols = [...symbolCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([symbolId, count]) => ({ symbolId, count }));
  
  return c.json({
    data: {
      totalLogs: logs.length,
      uniqueSymbols: symbolCounts.size,
      topSymbols,
    },
  });
});
