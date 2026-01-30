import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";
import { db } from "../../../db";
import { therapists, therapistClients, children } from "../../../db/schema";
import { eq, and } from "drizzle-orm";
import { AppError } from "../../../middleware/error-handler";
import { requireAdmin } from "../../../middleware/authorization";
import { canAccessChild } from "../../../services/authorization";

export const therapistsRoutes = new Hono();

const createTherapistSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
});

const updateTherapistSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
});

const assignClientSchema = z.object({
  childId: z.string().uuid(),
});

// List therapists (therapists see themselves, admins see all)
therapistsRoutes.get("/", async (c) => {
  const user = c.get("user");
  
  if (user.role === "admin") {
    const allTherapists = await db.select().from(therapists);
    return c.json({ data: allTherapists });
  }
  
  // Therapists can only see themselves
  if (user.role === "therapist") {
    const [therapist] = await db
      .select()
      .from(therapists)
      .where(eq(therapists.email, user.email));
    return c.json({ data: therapist ? [therapist] : [] });
  }
  
  // Caregivers can see therapists assigned to their children
  // For now, return empty - this can be enhanced later
  return c.json({ data: [] });
});

// Get single therapist
therapistsRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  
  const [therapist] = await db.select().from(therapists).where(eq(therapists.id, id));
  
  if (!therapist) {
    throw new AppError("Therapist not found", 404, "NOT_FOUND");
  }
  
  // Therapists can view themselves, admins can view anyone
  if (user.role !== "admin" && therapist.email !== user.email) {
    throw new AppError("You can only view your own therapist profile", 403, "FORBIDDEN");
  }
  
  return c.json({ data: therapist });
});

// Create therapist (admin only)
therapistsRoutes.post("/", requireAdmin(), zValidator("json", createTherapistSchema), async (c) => {
  const body = c.req.valid("json");
  
  const [therapist] = await db.insert(therapists).values({
    name: body.name,
    email: body.email,
  }).returning();
  
  return c.json({ data: therapist }, 201);
});

// Update therapist (admin or self)
therapistsRoutes.patch("/:id", zValidator("json", updateTherapistSchema), async (c) => {
  const id = c.req.param("id");
  const body = c.req.valid("json");
  const user = c.get("user");
  
  const [existing] = await db.select().from(therapists).where(eq(therapists.id, id));
  if (!existing) {
    throw new AppError("Therapist not found", 404, "NOT_FOUND");
  }
  
  // Only admin or the therapist themselves can update
  if (user.role !== "admin" && existing.email !== user.email) {
    throw new AppError("You can only update your own profile", 403, "FORBIDDEN");
  }
  
  const [therapist] = await db
    .update(therapists)
    .set(body)
    .where(eq(therapists.id, id))
    .returning();
  
  return c.json({ data: therapist });
});

// Delete therapist (admin only)
therapistsRoutes.delete("/:id", requireAdmin(), async (c) => {
  const id = c.req.param("id");
  
  const [deleted] = await db
    .delete(therapists)
    .where(eq(therapists.id, id))
    .returning();
  
  if (!deleted) {
    throw new AppError("Therapist not found", 404, "NOT_FOUND");
  }
  
  return c.json({ message: "Therapist deleted" });
});

// Get therapist's clients (admin or the therapist)
therapistsRoutes.get("/:id/clients", async (c) => {
  const id = c.req.param("id");
  const user = c.get("user");
  
  const [therapist] = await db.select().from(therapists).where(eq(therapists.id, id));
  if (!therapist) {
    throw new AppError("Therapist not found", 404, "NOT_FOUND");
  }
  
  // Only admin or the therapist can see their clients
  if (user.role !== "admin" && therapist.email !== user.email) {
    throw new AppError("You can only view your own clients", 403, "FORBIDDEN");
  }
  
  const clients = await db
    .select({
      childId: therapistClients.childId,
      grantedAt: therapistClients.grantedAt,
      child: children,
    })
    .from(therapistClients)
    .innerJoin(children, eq(therapistClients.childId, children.id))
    .where(eq(therapistClients.therapistId, id));
  
  return c.json({ data: clients });
});

// Assign client to therapist (admin or caregiver of the child)
therapistsRoutes.post("/:id/clients", zValidator("json", assignClientSchema), async (c) => {
  const therapistId = c.req.param("id");
  const body = c.req.valid("json");
  const user = c.get("user");
  
  // Admin can assign anyone, caregivers can assign their own children
  if (user.role !== "admin") {
    const hasAccess = await canAccessChild(user, body.childId);
    if (!hasAccess) {
      throw new AppError("You can only assign your own children", 403, "FORBIDDEN");
    }
  }
  
  const [assignment] = await db.insert(therapistClients).values({
    therapistId,
    childId: body.childId,
  }).returning();
  
  return c.json({ data: assignment }, 201);
});

// Remove client from therapist (admin or caregiver of the child)
therapistsRoutes.delete("/:id/clients/:childId", async (c) => {
  const therapistId = c.req.param("id");
  const childId = c.req.param("childId");
  const user = c.get("user");
  
  // Admin can remove anyone, caregivers can remove their own children
  if (user.role !== "admin") {
    const hasAccess = await canAccessChild(user, childId);
    if (!hasAccess) {
      throw new AppError("You can only manage your own children's therapists", 403, "FORBIDDEN");
    }
  }
  
  await db
    .delete(therapistClients)
    .where(
      and(
        eq(therapistClients.therapistId, therapistId),
        eq(therapistClients.childId, childId)
      )
    );
  
  return c.json({ message: "Client assignment removed" });
});
