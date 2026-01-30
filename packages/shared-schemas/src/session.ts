import { z } from "zod";
import { therapyTypeSchema } from "./goal";

// Therapy session validation schemas
export const sessionIdSchema = z.string().uuid();

export const createSessionSchema = z.object({
  childId: z.string().uuid(),
  therapistId: z.string().uuid().optional(),
  therapyType: therapyTypeSchema,
  date: z.string().date(),
  durationMinutes: z.number().int().min(1).max(480), // Max 8 hours
  notes: z.string().max(2000).optional(),
});

export const updateSessionSchema = z.object({
  date: z.string().date().optional(),
  durationMinutes: z.number().int().min(1).max(480).optional(),
  notes: z.string().max(2000).optional(),
});

export const sessionQuerySchema = z.object({
  childId: z.string().uuid(),
  therapyType: therapyTypeSchema.optional(),
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  limit: z.coerce.number().min(1).max(100).default(50).optional(),
  offset: z.coerce.number().min(0).default(0).optional(),
});
