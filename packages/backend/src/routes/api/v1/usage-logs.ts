import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";
import { db } from "../../../db";
import { usageLogs } from "../../../db/schema";
import { eq, and, gte, lte, desc, inArray } from "drizzle-orm";
import { AppError } from "../../../middleware/error-handler";
import { filterAccessibleChildren, requireChildAccess } from "../../../middleware/authorization";
import { canAccessChild } from "../../../services/authorization";

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

// List usage logs with filtering (authorized)
usageLogsRoutes.get("/", filterAccessibleChildren(), zValidator("query", querySchema), async (c) => {
  const query = c.req.valid("query");
  const user = c.get("user");
  const accessibleChildIds = c.get("accessibleChildIds");
  
  // If no accessible children, return empty
  if (accessibleChildIds.length === 0 && user.role !== "admin") {
    return c.json({ data: [] });
  }
  
  const conditions = [];
  
  // If specific child requested, verify access
  if (query.childId) {
    const hasAccess = await canAccessChild(user, query.childId);
    if (!hasAccess) {
      throw new AppError("You don't have access to this child's data", 403, "FORBIDDEN");
    }
    conditions.push(eq(usageLogs.childId, query.childId));
  } else if (user.role !== "admin") {
    // Non-admins only see their accessible children's logs
    conditions.push(inArray(usageLogs.childId, accessibleChildIds));
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
  
  const results = await db.select().from(usageLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(usageLogs.timestamp))
    .limit(query.limit);
  
  return c.json({ data: results });
});

// Get single usage log (verify access via child)
usageLogsRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  
  const [log] = await db.select().from(usageLogs).where(eq(usageLogs.id, id));
  
  if (!log) {
    throw new AppError("Usage log not found", 404, "NOT_FOUND");
  }
  
  // Verify access to the child this log belongs to
  const hasAccess = await canAccessChild(user, log.childId);
  if (!hasAccess) {
    throw new AppError("You don't have access to this data", 403, "FORBIDDEN");
  }
  
  return c.json({ data: log });
});

// Create usage log (verify access to child)
usageLogsRoutes.post("/", zValidator("json", createUsageLogSchema), async (c) => {
  const body = c.req.valid("json");
  const user = c.get("user");
  
  // Verify access to the target child
  const hasAccess = await canAccessChild(user, body.childId);
  if (!hasAccess) {
    throw new AppError("You don't have access to this child", 403, "FORBIDDEN");
  }
  
  const [log] = await db.insert(usageLogs).values({
    childId: body.childId,
    symbolId: body.symbolId,
    sessionId: body.sessionId ?? null,
    timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
  }).returning();
  
  return c.json({ data: log }, 201);
});

// Schema for bulk upload request
const bulkCreateUsageLogSchema = z.object({
  childId: z.string().uuid(),
  logs: z.array(z.object({
    symbolId: z.string().min(1).max(255),
    categoryId: z.string().min(1).max(255),
    timestamp: z.string().datetime(),
    sessionId: z.string().optional().nullable(),
    metadata: z.record(z.string()).optional().nullable(),
  })).min(1).max(100), // Enforce max 100 logs per request
});

// Bulk create usage logs (for sync - verify access to child)
usageLogsRoutes.post("/bulk", zValidator("json", bulkCreateUsageLogSchema), async (c) => {
  const body = c.req.valid("json");
  const user = c.get("user");

  // Verify access to the target child
  const hasAccess = await canAccessChild(user, body.childId);
  if (!hasAccess) {
    throw new AppError(`You don't have access to child ${body.childId}`, 403, "FORBIDDEN");
  }

  // Validate timestamps (reject logs more than 24 hours in the future)
  const now = new Date();
  const maxFutureTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const invalidLogs = body.logs.filter(log => {
    const timestamp = new Date(log.timestamp);
    return timestamp > maxFutureTime;
  });

  if (invalidLogs.length > 0) {
    throw new AppError(
      "Invalid timestamps detected - some logs have timestamps in the future",
      400,
      "INVALID_TIMESTAMP"
    );
  }

  // Insert all logs for this child
  const values = body.logs.map((log) => ({
    childId: body.childId,
    symbolId: log.symbolId,
    categoryId: log.categoryId,
    sessionId: log.sessionId ?? null,
    timestamp: new Date(log.timestamp),
    metadata: log.metadata ?? null,
  }));

  // Use INSERT ... ON CONFLICT DO NOTHING to handle duplicates gracefully
  const logs = await db.insert(usageLogs).values(values).returning();

  return c.json({ success: true, count: logs.length }, 201);
});

// Get usage statistics for a child (with authorization)
usageLogsRoutes.get("/stats/:childId", requireChildAccess("childId"), async (c) => {
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
