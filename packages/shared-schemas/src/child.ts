import { z } from "zod";

// Child validation schemas
export const childIdSchema = z.string().uuid();

export const createChildSchema = z.object({
  familyId: z.string().uuid(),
  name: z.string().min(1).max(255),
  birthDate: z.string().date().optional(),
});

export const updateChildSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  birthDate: z.string().date().optional(),
});

export const childQuerySchema = z.object({
  familyId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20).optional(),
  offset: z.coerce.number().min(0).default(0).optional(),
});
