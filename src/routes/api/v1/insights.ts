import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";
import { db } from "../../../db";
import { insights } from "../../../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { AppError } from "../../../middleware/error-handler";

export const insightsRoutes = new Hono();

const insightTypeSchema = z.enum([
  "daily_digest",
  "weekly_report",
  "regression_alert",
  "milestone",
  "suggestion",
]);

const createInsightSchema = z.object({
  childId: z.string().uuid(),
  type: insightTypeSchema,
  content: z.record(z.string(), z.unknown()), // JSON content
});

const querySchema = z.object({
  childId: z.string().uuid().optional(),
  type: insightTypeSchema.optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// List insights with filtering
insightsRoutes.get("/", zValidator("query", querySchema), async (c) => {
  const query = c.req.valid("query");
  
  const conditions = [];
  
  if (query.childId) {
    conditions.push(eq(insights.childId, query.childId));
  }
  if (query.type) {
    conditions.push(eq(insights.type, query.type));
  }
  
  const results = await db
    .select()
    .from(insights)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(insights.generatedAt))
    .limit(query.limit);
  
  return c.json({ data: results });
});

// Get single insight
insightsRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const [insight] = await db.select().from(insights).where(eq(insights.id, id));
  
  if (!insight) {
    throw new AppError("Insight not found", 404, "NOT_FOUND");
  }
  
  return c.json({ data: insight });
});

// Create insight (typically called by scheduled jobs)
insightsRoutes.post("/", zValidator("json", createInsightSchema), async (c) => {
  const body = c.req.valid("json");
  
  const [insight] = await db.insert(insights).values({
    childId: body.childId,
    type: body.type,
    content: body.content,
  }).returning();
  
  return c.json({ data: insight }, 201);
});

// Get latest daily digest for a child
insightsRoutes.get("/daily/:childId", async (c) => {
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

// Get latest weekly report for a child
insightsRoutes.get("/weekly/:childId", async (c) => {
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
