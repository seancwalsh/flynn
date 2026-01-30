import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";
import { db } from "../../../db";
import { goals } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { AppError } from "../../../middleware/error-handler";

export const goalsRoutes = new Hono();

const statusEnum = z.enum(["active", "achieved", "paused", "discontinued"]);

const updateGoalSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: statusEnum.optional(),
  progressPercent: z.number().int().min(0).max(100).optional(),
  targetDate: z.string().date().optional(),
});

// Get single goal
goalsRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");

  const [goal] = await db
    .select()
    .from(goals)
    .where(eq(goals.id, id));

  if (!goal) {
    throw new AppError("Goal not found", 404, "NOT_FOUND");
  }

  return c.json({ data: goal });
});

// Update goal
goalsRoutes.patch("/:id", zValidator("json", updateGoalSchema), async (c) => {
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const [goal] = await db
    .update(goals)
    .set({
      ...body,
      updatedAt: new Date(),
    })
    .where(eq(goals.id, id))
    .returning();

  if (!goal) {
    throw new AppError("Goal not found", 404, "NOT_FOUND");
  }

  return c.json({ data: goal });
});

// Delete goal
goalsRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");

  const [deleted] = await db
    .delete(goals)
    .where(eq(goals.id, id))
    .returning();

  if (!deleted) {
    throw new AppError("Goal not found", 404, "NOT_FOUND");
  }

  return c.body(null, 204);
});
