import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";
import { db } from "../../../db";
import { children, dailyMetrics, insights, goals, therapySessions } from "../../../db/schema";
import { eq, inArray, desc } from "drizzle-orm";
import { AppError } from "../../../middleware/error-handler";
import {
  requireChildAccess,
  requireFamilyAccess,
  filterAccessibleChildren
} from "../../../middleware/authorization";
import { canAccessFamily } from "../../../services/authorization";

export const childrenRoutes = new Hono();

const createChildSchema = z.object({
  familyId: z.string().uuid(),
  name: z.string().min(1).max(255),
  birthDate: z.string().date().optional(),
});

const updateChildSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  birthDate: z.string().date().optional(),
});

const therapyTypeEnum = z.enum(["aac", "aba", "ot", "slp", "pt", "other"]);
const statusEnum = z.enum(["active", "achieved", "paused", "discontinued"]);

const createGoalSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  therapyType: therapyTypeEnum,
  category: z.string().max(50).optional(),
  targetDate: z.string().date().optional(),
  progressPercent: z.number().int().min(0).max(100).optional(),
});

const updateGoalSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: statusEnum.optional(),
  progressPercent: z.number().int().min(0).max(100).optional(),
  targetDate: z.string().date().optional(),
});

const createSessionSchema = z.object({
  therapyType: therapyTypeEnum,
  sessionDate: z.string().date(),
  durationMinutes: z.number().int().positive().optional(),
  notes: z.string().optional(),
  goalsWorkedOn: z.array(z.object({
    goalId: z.string().uuid(),
    progress: z.number().int().min(0).max(100).optional(),
    notes: z.string().optional(),
  })).optional(),
});

// List children (filtered by authorization)
childrenRoutes.get("/", filterAccessibleChildren(), async (c) => {
  const familyId = c.req.query("familyId");
  const accessibleChildIds = c.get("accessibleChildIds");
  const user = c.get("user");
  
  // If no accessible children, return empty
  if (accessibleChildIds.length === 0 && user.role !== "admin") {
    return c.json({ data: [] });
  }
  
  // If filtering by family, verify access to that family first
  if (familyId) {
    const hasAccess = await canAccessFamily(user, familyId);
    if (!hasAccess) {
      throw new AppError("You don't have access to this family", 403, "FORBIDDEN");
    }
    
    const familyChildren = await db
      .select()
      .from(children)
      .where(eq(children.familyId, familyId));
    return c.json({ data: familyChildren });
  }
  
  // Return only accessible children
  if (user.role === "admin") {
    const allChildren = await db.select().from(children);
    return c.json({ data: allChildren });
  }
  
  const accessibleChildren = await db
    .select()
    .from(children)
    .where(inArray(children.id, accessibleChildIds));
  return c.json({ data: accessibleChildren });
});

// Get single child (with authorization)
childrenRoutes.get("/:id", requireChildAccess(), async (c) => {
  const id = c.req.param("id");
  const [child] = await db.select().from(children).where(eq(children.id, id));
  
  if (!child) {
    throw new AppError("Child not found", 404, "NOT_FOUND");
  }
  
  return c.json({ data: child });
});

// Create child (must have access to target family)
childrenRoutes.post("/", zValidator("json", createChildSchema), async (c) => {
  const body = c.req.valid("json");
  const user = c.get("user");
  
  // Verify user has access to the target family
  const hasAccess = await canAccessFamily(user, body.familyId);
  if (!hasAccess) {
    throw new AppError("You don't have access to this family", 403, "FORBIDDEN");
  }
  
  const [child] = await db.insert(children).values({
    familyId: body.familyId,
    name: body.name,
    birthDate: body.birthDate ?? null,
  }).returning();
  
  return c.json({ data: child }, 201);
});

// Update child (with authorization)
childrenRoutes.patch("/:id", requireChildAccess(), zValidator("json", updateChildSchema), async (c) => {
  const id = c.req.param("id");
  const body = c.req.valid("json");
  
  const [child] = await db
    .update(children)
    .set(body)
    .where(eq(children.id, id))
    .returning();
  
  if (!child) {
    throw new AppError("Child not found", 404, "NOT_FOUND");
  }
  
  return c.json({ data: child });
});

// Delete child (with authorization)
childrenRoutes.delete("/:id", requireChildAccess(), async (c) => {
  const id = c.req.param("id");

  const [deleted] = await db
    .delete(children)
    .where(eq(children.id, id))
    .returning();

  if (!deleted) {
    throw new AppError("Child not found", 404, "NOT_FOUND");
  }

  return c.json({ message: "Child deleted" });
});

// Get child stats (with authorization)
childrenRoutes.get("/:id/stats", requireChildAccess(), async (c) => {
  const id = c.req.param("id");

  // Verify child exists
  const [child] = await db.select().from(children).where(eq(children.id, id));
  if (!child) {
    throw new AppError("Child not found", 404, "NOT_FOUND");
  }

  // Get latest daily metric
  const [latestMetric] = await db
    .select()
    .from(dailyMetrics)
    .where(eq(dailyMetrics.childId, id))
    .orderBy(desc(dailyMetrics.date))
    .limit(1);

  // Get insight count
  const insightResults = await db
    .select()
    .from(insights)
    .where(eq(insights.childId, id));

  // Get goal count
  const goalResults = await db
    .select()
    .from(goals)
    .where(eq(goals.childId, id));

  const stats = {
    totalSymbols: latestMetric?.uniqueSymbols ?? 0,
    recentActivity: latestMetric?.date ?? null,
    insightCount: insightResults.length,
    goalCount: goalResults.length,
  };

  return c.json({ data: stats });
});

// Get child insights (with authorization)
childrenRoutes.get("/:id/insights", requireChildAccess(), async (c) => {
  const id = c.req.param("id");
  const typeFilter = c.req.query("type");

  // Verify child exists
  const [child] = await db.select().from(children).where(eq(children.id, id));
  if (!child) {
    throw new AppError("Child not found", 404, "NOT_FOUND");
  }

  // Build query
  let query = db
    .select()
    .from(insights)
    .where(eq(insights.childId, id))
    .orderBy(desc(insights.generatedAt));

  // Filter by type if provided
  if (typeFilter) {
    query = query.where(eq(insights.type, typeFilter)) as typeof query;
  }

  const childInsights = await query;

  return c.json({ data: childInsights });
});

// Get child goals (with authorization)
childrenRoutes.get("/:id/goals", requireChildAccess(), async (c) => {
  const id = c.req.param("id");
  const statusFilter = c.req.query("status");

  // Verify child exists
  const [child] = await db.select().from(children).where(eq(children.id, id));
  if (!child) {
    throw new AppError("Child not found", 404, "NOT_FOUND");
  }

  // Build query
  let query = db
    .select()
    .from(goals)
    .where(eq(goals.childId, id))
    .orderBy(desc(goals.createdAt));

  // Filter by status if provided
  if (statusFilter) {
    query = query.where(eq(goals.status, statusFilter)) as typeof query;
  }

  const childGoals = await query;

  return c.json({ data: childGoals });
});

// Create goal for child (with authorization)
childrenRoutes.post("/:id/goals", requireChildAccess(), zValidator("json", createGoalSchema), async (c) => {
  const id = c.req.param("id");
  const body = c.req.valid("json");

  // Verify child exists
  const [child] = await db.select().from(children).where(eq(children.id, id));
  if (!child) {
    throw new AppError("Child not found", 404, "NOT_FOUND");
  }

  const [goal] = await db.insert(goals).values({
    childId: id,
    title: body.title,
    description: body.description ?? null,
    therapyType: body.therapyType,
    category: body.category ?? null,
    targetDate: body.targetDate ?? null,
    progressPercent: body.progressPercent ?? 0,
    status: "active",
  }).returning();

  return c.json({ data: goal }, 201);
});

// List sessions for child (with authorization)
childrenRoutes.get("/:id/sessions", requireChildAccess(), async (c) => {
  const id = c.req.param("id");

  // Verify child exists
  const [child] = await db.select().from(children).where(eq(children.id, id));
  if (!child) {
    throw new AppError("Child not found", 404, "NOT_FOUND");
  }

  const childSessions = await db
    .select()
    .from(therapySessions)
    .where(eq(therapySessions.childId, id))
    .orderBy(desc(therapySessions.sessionDate));

  return c.json({ data: childSessions });
});

// Create therapy session for child (with authorization)
childrenRoutes.post("/:id/sessions", requireChildAccess(), zValidator("json", createSessionSchema), async (c) => {
  const id = c.req.param("id");
  const body = c.req.valid("json");
  const user = c.get("user");

  // Verify child exists
  const [child] = await db.select().from(children).where(eq(children.id, id));
  if (!child) {
    throw new AppError("Child not found", 404, "NOT_FOUND");
  }

  const [session] = await db.insert(therapySessions).values({
    childId: id,
    therapyType: body.therapyType,
    sessionDate: body.sessionDate,
    durationMinutes: body.durationMinutes ?? null,
    notes: body.notes ?? null,
    goalsWorkedOn: body.goalsWorkedOn ? JSON.stringify(body.goalsWorkedOn) : null,
    therapistId: null, // TODO: Link to therapist if user is a therapist
  }).returning();

  return c.json({ data: session }, 201);
});
