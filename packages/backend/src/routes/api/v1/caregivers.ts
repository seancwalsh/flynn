import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";
import { db } from "../../../db";
import { caregivers } from "../../../db/schema";
import { eq } from "drizzle-orm";
import { AppError } from "../../../middleware/error-handler";
import { requireFamilyAccess, requireAdmin } from "../../../middleware/authorization";
import { canAccessFamily, getUserFamilyId } from "../../../services/authorization";

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

// List caregivers (filtered by family access)
caregiversRoutes.get("/", async (c) => {
  const familyId = c.req.query("familyId");
  const user = c.get("user");
  
  // If specific family requested, verify access
  if (familyId) {
    const hasAccess = await canAccessFamily(user, familyId);
    if (!hasAccess) {
      throw new AppError("You don't have access to this family", 403, "FORBIDDEN");
    }
    const familyCaregivers = await db
      .select()
      .from(caregivers)
      .where(eq(caregivers.familyId, familyId));
    return c.json({ data: familyCaregivers });
  }
  
  // Admins see all, others see only their family
  if (user.role === "admin") {
    const allCaregivers = await db.select().from(caregivers);
    return c.json({ data: allCaregivers });
  }
  
  const userFamilyId = await getUserFamilyId(user);
  if (!userFamilyId) {
    return c.json({ data: [] });
  }
  
  const familyCaregivers = await db
    .select()
    .from(caregivers)
    .where(eq(caregivers.familyId, userFamilyId));
  return c.json({ data: familyCaregivers });
});

// Get single caregiver (verify family access)
caregiversRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  
  const [caregiver] = await db.select().from(caregivers).where(eq(caregivers.id, id));
  
  if (!caregiver) {
    throw new AppError("Caregiver not found", 404, "NOT_FOUND");
  }
  
  // Verify access to caregiver's family
  const hasAccess = await canAccessFamily(user, caregiver.familyId);
  if (!hasAccess) {
    throw new AppError("You don't have access to this caregiver", 403, "FORBIDDEN");
  }
  
  return c.json({ data: caregiver });
});

// Create caregiver (verify family access)
caregiversRoutes.post("/", zValidator("json", createCaregiverSchema), async (c) => {
  const body = c.req.valid("json");
  const user = c.get("user");
  
  // Verify access to the target family
  const hasAccess = await canAccessFamily(user, body.familyId);
  if (!hasAccess) {
    throw new AppError("You don't have access to this family", 403, "FORBIDDEN");
  }
  
  const [caregiver] = await db.insert(caregivers).values({
    familyId: body.familyId,
    name: body.name,
    email: body.email,
    role: body.role,
  }).returning();
  
  return c.json({ data: caregiver }, 201);
});

// Update caregiver (verify family access)
caregiversRoutes.patch("/:id", zValidator("json", updateCaregiverSchema), async (c) => {
  const id = c.req.param("id");
  const body = c.req.valid("json");
  const user = c.get("user");
  
  // Get caregiver to check family access
  const [existing] = await db.select().from(caregivers).where(eq(caregivers.id, id));
  if (!existing) {
    throw new AppError("Caregiver not found", 404, "NOT_FOUND");
  }
  
  const hasAccess = await canAccessFamily(user, existing.familyId);
  if (!hasAccess) {
    throw new AppError("You don't have access to this caregiver", 403, "FORBIDDEN");
  }
  
  const [caregiver] = await db
    .update(caregivers)
    .set(body)
    .where(eq(caregivers.id, id))
    .returning();
  
  return c.json({ data: caregiver });
});

// Delete caregiver (verify family access)
caregiversRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  
  // Get caregiver to check family access
  const [existing] = await db.select().from(caregivers).where(eq(caregivers.id, id));
  if (!existing) {
    throw new AppError("Caregiver not found", 404, "NOT_FOUND");
  }
  
  const hasAccess = await canAccessFamily(user, existing.familyId);
  if (!hasAccess) {
    throw new AppError("You don't have access to this caregiver", 403, "FORBIDDEN");
  }
  
  const [deleted] = await db
    .delete(caregivers)
    .where(eq(caregivers.id, id))
    .returning();
  
  return c.json({ message: "Caregiver deleted" });
});
