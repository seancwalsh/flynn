import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";
import { db } from "../../../db";
import { families } from "../../../db/schema";
import { eq, inArray } from "drizzle-orm";
import { AppError } from "../../../middleware/error-handler";
import { requireFamilyAccess, requireAdmin, setUserFamilyContext } from "../../../middleware/authorization";
import { getUserFamilyId, canAccessFamily } from "../../../services/authorization";

export const familiesRoutes = new Hono();

const createFamilySchema = z.object({
  name: z.string().min(1).max(255),
});

const updateFamilySchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

// List families (caregivers see their family, admins see all)
familiesRoutes.get("/", async (c) => {
  const user = c.get("user");
  
  // Admins see all families
  if (user.role === "admin") {
    const allFamilies = await db.select().from(families);
    return c.json({ data: allFamilies });
  }
  
  // Caregivers see only their family
  const familyId = await getUserFamilyId(user);
  if (!familyId) {
    return c.json({ data: [] });
  }
  
  const [family] = await db.select().from(families).where(eq(families.id, familyId));
  return c.json({ data: family ? [family] : [] });
});

// Get single family (with authorization)
familiesRoutes.get("/:id", requireFamilyAccess(), async (c) => {
  const id = c.req.param("id");
  const [family] = await db.select().from(families).where(eq(families.id, id));
  
  if (!family) {
    throw new AppError("Family not found", 404, "NOT_FOUND");
  }
  
  return c.json({ data: family });
});

// Create family (admin only - families are created during onboarding)
familiesRoutes.post("/", requireAdmin(), zValidator("json", createFamilySchema), async (c) => {
  const body = c.req.valid("json");
  
  const [family] = await db.insert(families).values({
    name: body.name,
  }).returning();
  
  return c.json({ data: family }, 201);
});

// Update family (with authorization)
familiesRoutes.patch("/:id", requireFamilyAccess(), zValidator("json", updateFamilySchema), async (c) => {
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

// Delete family (admin only)
familiesRoutes.delete("/:id", requireAdmin(), async (c) => {
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
