import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";
import { db } from "../../../db";
import { insights } from "../../../db/schema";
import { eq, and, desc, isNull, sql, count, inArray } from "drizzle-orm";
import { AppError } from "../../../middleware/error-handler";
import { filterAccessibleChildren, requireChildAccess } from "../../../middleware/authorization";
import { canAccessChild } from "../../../services/authorization";

export const insightsRoutes = new Hono();

const insightTypeSchema = z.enum([
  "daily_digest",
  "weekly_report",
  "regression_alert",
  "milestone",
  "suggestion",
  "anomaly", // Added for anomaly-based insights
]);

const severitySchema = z.enum(["info", "warning", "critical"]).optional();

const createInsightSchema = z.object({
  childId: z.string().uuid(),
  type: insightTypeSchema,
  severity: severitySchema,
  title: z.string().max(255).optional(),
  body: z.string().optional(),
  content: z.record(z.string(), z.unknown()), // JSON content
});

const querySchema = z.object({
  childId: z.string().uuid().optional(),
  type: insightTypeSchema.optional(),
  severity: severitySchema,
  unreadOnly: z.coerce.boolean().default(false),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// List insights with filtering (authorized)
insightsRoutes.get("/", filterAccessibleChildren(), zValidator("query", querySchema), async (c) => {
  const query = c.req.valid("query");
  const user = c.get("user");
  const accessibleChildIds = c.get("accessibleChildIds");
  
  // If no accessible children, return empty
  if (accessibleChildIds.length === 0 && user.role !== "admin") {
    return c.json({ data: [], meta: { total: 0, unreadCount: 0, limit: query.limit, offset: query.offset } });
  }
  
  const conditions = [];
  
  // Filter by specific child or accessible children
  if (query.childId) {
    const hasAccess = await canAccessChild(user, query.childId);
    if (!hasAccess) {
      throw new AppError("You don't have access to this child's insights", 403, "FORBIDDEN");
    }
    conditions.push(eq(insights.childId, query.childId));
  } else if (user.role !== "admin") {
    conditions.push(inArray(insights.childId, accessibleChildIds));
  }
  
  if (query.type) {
    conditions.push(eq(insights.type, query.type));
  }
  if (query.severity) {
    conditions.push(eq(insights.severity, query.severity));
  }
  if (query.unreadOnly) {
    conditions.push(isNull(insights.readAt));
  }
  // Exclude dismissed insights by default
  conditions.push(isNull(insights.dismissedAt));
  
  const results = await db
    .select()
    .from(insights)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(insights.generatedAt))
    .limit(query.limit)
    .offset(query.offset);
  
  // Get total count for pagination
  const [{ total }] = await db
    .select({ total: count() })
    .from(insights)
    .where(conditions.length > 0 ? and(...conditions) : undefined);
  
  // Get unread count
  const unreadConditions = query.childId 
    ? [eq(insights.childId, query.childId), isNull(insights.readAt), isNull(insights.dismissedAt)]
    : user.role === "admin"
      ? [isNull(insights.readAt), isNull(insights.dismissedAt)]
      : [inArray(insights.childId, accessibleChildIds), isNull(insights.readAt), isNull(insights.dismissedAt)];
  
  const [{ unreadCount }] = await db
    .select({ unreadCount: count() })
    .from(insights)
    .where(and(...unreadConditions));
  
  return c.json({ 
    data: results,
    meta: {
      total,
      unreadCount,
      limit: query.limit,
      offset: query.offset,
    }
  });
});

// Get single insight (verify access via child)
insightsRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  
  const [insight] = await db.select().from(insights).where(eq(insights.id, id));
  
  if (!insight) {
    throw new AppError("Insight not found", 404, "NOT_FOUND");
  }
  
  // Verify access to the child this insight belongs to
  const hasAccess = await canAccessChild(user, insight.childId);
  if (!hasAccess) {
    throw new AppError("You don't have access to this insight", 403, "FORBIDDEN");
  }
  
  return c.json({ data: insight });
});

// Create insight (typically called by scheduled jobs - verify access)
insightsRoutes.post("/", zValidator("json", createInsightSchema), async (c) => {
  const body = c.req.valid("json");
  const user = c.get("user");
  
  // Verify access to the target child
  const hasAccess = await canAccessChild(user, body.childId);
  if (!hasAccess) {
    throw new AppError("You don't have access to this child", 403, "FORBIDDEN");
  }
  
  const [insight] = await db.insert(insights).values({
    childId: body.childId,
    type: body.type,
    content: body.content,
  }).returning();
  
  return c.json({ data: insight }, 201);
});

// Get latest daily digest for a child (with authorization)
insightsRoutes.get("/daily/:childId", requireChildAccess("childId"), async (c) => {
  const childId = c.req.param("childId");
  
  const [insight] = await db
    .select()
    .from(insights)
    .where(
      and(
        eq(insights.childId, childId),
        eq(insights.type, "daily_digest")
      )
    )
    .orderBy(desc(insights.generatedAt))
    .limit(1);
  
  if (!insight) {
    throw new AppError("No daily digest found", 404, "NOT_FOUND");
  }
  
  return c.json({ data: insight });
});

// Get latest weekly report for a child (with authorization)
insightsRoutes.get("/weekly/:childId", requireChildAccess("childId"), async (c) => {
  const childId = c.req.param("childId");
  
  const [insight] = await db
    .select()
    .from(insights)
    .where(
      and(
        eq(insights.childId, childId),
        eq(insights.type, "weekly_report")
      )
    )
    .orderBy(desc(insights.generatedAt))
    .limit(1);
  
  if (!insight) {
    throw new AppError("No weekly report found", 404, "NOT_FOUND");
  }
  
  return c.json({ data: insight });
});

// Mark insight as read (verify access via child)
insightsRoutes.patch("/:id/read", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  
  const [insight] = await db
    .select()
    .from(insights)
    .where(eq(insights.id, id));
  
  if (!insight) {
    throw new AppError("Insight not found", 404, "NOT_FOUND");
  }
  
  // Verify access
  const hasAccess = await canAccessChild(user, insight.childId);
  if (!hasAccess) {
    throw new AppError("You don't have access to this insight", 403, "FORBIDDEN");
  }
  
  // Only update if not already read
  if (!insight.readAt) {
    await db
      .update(insights)
      .set({ readAt: new Date() })
      .where(eq(insights.id, id));
  }
  
  const [updated] = await db
    .select()
    .from(insights)
    .where(eq(insights.id, id));
  
  return c.json({ data: updated });
});

// Mark multiple insights as read (verify access to each)
insightsRoutes.post("/mark-read", filterAccessibleChildren(), zValidator("json", z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
})), async (c) => {
  const { ids } = c.req.valid("json");
  const user = c.get("user");
  const accessibleChildIds = c.get("accessibleChildIds");
  
  // Get all insights to verify access
  const insightsToMark = await db
    .select()
    .from(insights)
    .where(sql`${insights.id} = ANY(${ids})`);
  
  // Verify user has access to all insights' children (unless admin)
  if (user.role !== "admin") {
    for (const insight of insightsToMark) {
      if (!accessibleChildIds.includes(insight.childId)) {
        throw new AppError("You don't have access to all requested insights", 403, "FORBIDDEN");
      }
    }
  }
  
  await db
    .update(insights)
    .set({ readAt: new Date() })
    .where(sql`${insights.id} = ANY(${ids}) AND ${insights.readAt} IS NULL`);
  
  return c.json({ success: true, count: ids.length });
});

// Dismiss insight (soft delete - verify access via child)
insightsRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  
  const [insight] = await db
    .select()
    .from(insights)
    .where(eq(insights.id, id));
  
  if (!insight) {
    throw new AppError("Insight not found", 404, "NOT_FOUND");
  }
  
  // Verify access
  const hasAccess = await canAccessChild(user, insight.childId);
  if (!hasAccess) {
    throw new AppError("You don't have access to this insight", 403, "FORBIDDEN");
  }
  
  await db
    .update(insights)
    .set({ dismissedAt: new Date() })
    .where(eq(insights.id, id));
  
  return c.json({ success: true });
});

// Get unread count for a child (with authorization)
insightsRoutes.get("/unread-count/:childId", requireChildAccess("childId"), async (c) => {
  const childId = c.req.param("childId");
  
  const [{ unreadCount }] = await db
    .select({ unreadCount: count() })
    .from(insights)
    .where(
      and(
        eq(insights.childId, childId),
        isNull(insights.readAt),
        isNull(insights.dismissedAt)
      )
    );
  
  return c.json({ count: unreadCount });
});
