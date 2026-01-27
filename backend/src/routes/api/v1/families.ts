import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";
import { db } from "../../../db";
import { families } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { AppError } from "../../../middleware/error-handler";

export const familiesRoutes = new Hono();

const createFamilySchema = z.object({
  name: z.string().min(1).max(255),
});

const updateFamilySchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

// List all families
familiesRoutes.get("/", async (c) => {
  const allFamilies = await db.select().from(families);
  return c.json({ data: allFamilies });
});

// Get single family
familiesRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const [family] = await db.select().from(families).where(eq(families.id, id));
  
  if (!family) {
    throw new AppError("Family not found", 404, "NOT_FOUND");
  }
  
  return c.json({ data: family });
});

// Create family
familiesRoutes.post("/", zValidator("json", createFamilySchema), async (c) => {
  const body = c.req.valid("json");
  
  const [family] = await db.insert(families).values({
    name: body.name,
  }).returning();
  
  return c.json({ data: family }, 201);
});

// Update family
familiesRoutes.patch("/:id", zValidator("json", updateFamilySchema), async (c) => {
  const id = c.req.param("id");
  const body = c.req.valid("json");
  
  const [family] = await db
    .update(families)
    .set(body)
    .where(eq(families.id, id))
    .returning();
  
  if (!family) {
    throw new AppError("Family not found", 404, "NOT_FOUND");
  }
  
  return c.json({ data: family });
});

// Delete family
familiesRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  
  const [deleted] = await db
    .delete(families)
    .where(eq(families.id, id))
    .returning();
  
  if (!deleted) {
    throw new AppError("Family not found", 404, "NOT_FOUND");
  }
  
  return c.json({ message: "Family deleted" });
});
