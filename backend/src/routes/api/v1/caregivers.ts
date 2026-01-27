import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";
import { db } from "../../../db";
import { caregivers } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { AppError } from "../../../middleware/error-handler";

export const caregiversRoutes = new Hono();

const caregiverRoleSchema = z.enum(["parent", "guardian", "grandparent", "nanny", "other"]);

const createCaregiverSchema = z.object({
  familyId: z.string().uuid(),
  name: z.string().min(1).max(255),
  email: z.string().email(),
  role: caregiverRoleSchema,
});

const updateCaregiverSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  role: caregiverRoleSchema.optional(),
});

// List all caregivers
caregiversRoutes.get("/", async (c) => {
  const familyId = c.req.query("familyId");
  
  if (familyId) {
    const familyCaregivers = await db
      .select()
      .from(caregivers)
      .where(eq(caregivers.familyId, familyId));
    return c.json({ data: familyCaregivers });
  }
  
  const allCaregivers = await db.select().from(caregivers);
  return c.json({ data: allCaregivers });
});

// Get single caregiver
caregiversRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const [caregiver] = await db.select().from(caregivers).where(eq(caregivers.id, id));
  
  if (!caregiver) {
    throw new AppError("Caregiver not found", 404, "NOT_FOUND");
  }
  
  return c.json({ data: caregiver });
});

// Create caregiver
caregiversRoutes.post("/", zValidator("json", createCaregiverSchema), async (c) => {
  const body = c.req.valid("json");
  
  const [caregiver] = await db.insert(caregivers).values({
    familyId: body.familyId,
    name: body.name,
    email: body.email,
    role: body.role,
  }).returning();
  
  return c.json({ data: caregiver }, 201);
});

// Update caregiver
caregiversRoutes.patch("/:id", zValidator("json", updateCaregiverSchema), async (c) => {
  const id = c.req.param("id");
  const body = c.req.valid("json");
  
  const [caregiver] = await db
    .update(caregivers)
    .set(body)
    .where(eq(caregivers.id, id))
    .returning();
  
  if (!caregiver) {
    throw new AppError("Caregiver not found", 404, "NOT_FOUND");
  }
  
  return c.json({ data: caregiver });
});

// Delete caregiver
caregiversRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  
  const [deleted] = await db
    .delete(caregivers)
    .where(eq(caregivers.id, id))
    .returning();
  
  if (!deleted) {
    throw new AppError("Caregiver not found", 404, "NOT_FOUND");
  }
  
  return c.json({ message: "Caregiver deleted" });
});
