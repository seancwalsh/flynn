import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";
import { db } from "../../../db";
import { children } from "../../../db/schema";
import { eq, inArray } from "drizzle-orm";
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
