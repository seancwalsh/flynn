import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";
import { db } from "../../../db";
import { children } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { AppError } from "../../../middleware/error-handler";

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

// List all children
childrenRoutes.get("/", async (c) => {
  const familyId = c.req.query("familyId");
  
  if (familyId) {
    const familyChildren = await db
      .select()
      .from(children)
      .where(eq(children.familyId, familyId));
    return c.json({ data: familyChildren });
  }
  
  const allChildren = await db.select().from(children);
  return c.json({ data: allChildren });
});

// Get single child
childrenRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const [child] = await db.select().from(children).where(eq(children.id, id));
  
  if (!child) {
    throw new AppError("Child not found", 404, "NOT_FOUND");
  }
  
  return c.json({ data: child });
});

// Create child
childrenRoutes.post("/", zValidator("json", createChildSchema), async (c) => {
  const body = c.req.valid("json");
  
  const [child] = await db.insert(children).values({
    familyId: body.familyId,
    name: body.name,
    birthDate: body.birthDate ?? null,
  }).returning();
  
  return c.json({ data: child }, 201);
});

// Update child
childrenRoutes.patch("/:id", zValidator("json", updateChildSchema), async (c) => {
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

// Delete child
childrenRoutes.delete("/:id", async (c) => {
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
