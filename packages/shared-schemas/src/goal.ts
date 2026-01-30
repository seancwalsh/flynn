import { z } from "zod";

// Goal validation schemas
export const therapyTypeSchema = z.enum(["aac", "aba", "ot", "slp", "pt", "other"]);

export const goalStatusSchema = z.enum(["active", "achieved", "paused", "discontinued"]);

export const goalIdSchema = z.string().uuid();

export const createGoalSchema = z.object({
  childId: z.string().uuid(),
  therapyType: therapyTypeSchema,
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  category: z.string().max(100).optional(),
  targetDate: z.string().date().optional(),
  progressPercent: z.number().int().min(0).max(100).default(0).optional(),
});

export const updateGoalSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  category: z.string().max(100).optional(),
  targetDate: z.string().date().optional(),
  status: goalStatusSchema.optional(),
  progressPercent: z.number().int().min(0).max(100).optional(),
});

export const goalQuerySchema = z.object({
  childId: z.string().uuid(),
  status: goalStatusSchema.optional(),
  therapyType: therapyTypeSchema.optional(),
  limit: z.coerce.number().min(1).max(100).default(50).optional(),
  offset: z.coerce.number().min(0).default(0).optional(),
});
