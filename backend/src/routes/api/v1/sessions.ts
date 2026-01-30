import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";
import { db } from "../../../db";
import { therapySessions } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { AppError } from "../../../middleware/error-handler";

export const sessionsRoutes = new Hono();

const updateSessionSchema = z.object({
  therapyType: z.enum(["aac", "aba", "ot", "slp", "pt", "other"]).optional(),
  sessionDate: z.string().date().optional(),
  durationMinutes: z.number().int().positive().optional(),
  notes: z.string().optional(),
  goalsWorkedOn: z.array(z.object({
    goalId: z.string().uuid(),
    progress: z.number().int().min(0).max(100).optional(),
    notes: z.string().optional(),
  })).optional(),
});

// Get single session
sessionsRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");

  const [session] = await db
    .select()
    .from(therapySessions)
    .where(eq(therapySessions.id, id));

  if (!session) {
    throw new AppError("Session not found", 404, "NOT_FOUND");
  }

  return c.json({ data: session });
});

// Update session
sessionsRoutes.patch("/:id", zValidator("json", updateSessionSchema), async (c) => {
  const id = c.req.param("id");
  const body = c.req.valid("json");

  const [session] = await db
    .update(therapySessions)
    .set(body)
    .where(eq(therapySessions.id, id))
    .returning();

  if (!session) {
    throw new AppError("Session not found", 404, "NOT_FOUND");
  }

  return c.json({ data: session });
});

// Delete session
sessionsRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");

  const [deleted] = await db
    .delete(therapySessions)
    .where(eq(therapySessions.id, id))
    .returning();

  if (!deleted) {
    throw new AppError("Session not found", 404, "NOT_FOUND");
  }

  return c.json({ message: "Session deleted" });
});
