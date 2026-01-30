import { z } from "zod";

// Insight validation schemas
export const insightTypeSchema = z.enum([
  "daily_digest",
  "weekly_report",
  "regression_alert",
  "milestone",
  "suggestion",
  "usage_trend",
  "vocabulary_growth",
  "session_reminder",
]);

export const insightSeveritySchema = z.enum(["info", "warning", "critical"]);

export const insightIdSchema = z.string().uuid();

export const insightQuerySchema = z.object({
  childId: z.string().uuid(),
  type: insightTypeSchema.optional(),
  severity: insightSeveritySchema.optional(),
  unreadOnly: z.coerce.boolean().default(false).optional(),
  limit: z.coerce.number().min(1).max(100).default(20).optional(),
  offset: z.coerce.number().min(0).default(0).optional(),
});

export const markInsightReadSchema = z.object({
  insightId: z.string().uuid(),
});

export const dismissInsightSchema = z.object({
  insightId: z.string().uuid(),
});
