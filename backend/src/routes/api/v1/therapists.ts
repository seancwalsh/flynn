import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";
import { db } from "../../../db";
import { therapists, therapistClients, children } from "../../../db/schema";
import { eq, and } from "drizzle-orm";
import { AppError } from "../../../middleware/error-handler";

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

// List all therapists
therapistsRoutes.get("/", async (c) => {
  const allTherapists = await db.select().from(therapists);
  return c.json({ data: allTherapists });
});

// Get single therapist
therapistsRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const [therapist] = await db.select().from(therapists).where(eq(therapists.id, id));
  
  if (!therapist) {
    throw new AppError("Therapist not found", 404, "NOT_FOUND");
  }
  
  return c.json({ data: therapist });
});

// Create therapist
therapistsRoutes.post("/", zValidator("json", createTherapistSchema), async (c) => {
  const body = c.req.valid("json");
  
  const [therapist] = await db.insert(therapists).values({
    name: body.name,
    email: body.email,
  }).returning();
  
  return c.json({ data: therapist }, 201);
});

// Update therapist
therapistsRoutes.patch("/:id", zValidator("json", updateTherapistSchema), async (c) => {
  const id = c.req.param("id");
  const body = c.req.valid("json");
  
  const [therapist] = await db
    .update(therapists)
    .set(body)
    .where(eq(therapists.id, id))
    .returning();
  
  if (!therapist) {
    throw new AppError("Therapist not found", 404, "NOT_FOUND");
  }
  
  return c.json({ data: therapist });
});

// Delete therapist
therapistsRoutes.delete("/:id", async (c) => {
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

// Get therapist's clients
therapistsRoutes.get("/:id/clients", async (c) => {
  const id = c.req.param("id");
  
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

// Assign client to therapist
therapistsRoutes.post("/:id/clients", zValidator("json", assignClientSchema), async (c) => {
  const therapistId = c.req.param("id");
  const body = c.req.valid("json");
  
  const [assignment] = await db.insert(therapistClients).values({
    therapistId,
    childId: body.childId,
  }).returning();
  
  return c.json({ data: assignment }, 201);
});

// Remove client from therapist
therapistsRoutes.delete("/:id/clients/:childId", async (c) => {
  const therapistId = c.req.param("id");
  const childId = c.req.param("childId");
  
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
