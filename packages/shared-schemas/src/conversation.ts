import { z } from "zod";

// Conversation validation schemas
export const conversationIdSchema = z.string().uuid();

export const createConversationSchema = z.object({
  caregiverId: z.string().uuid(),
  childId: z.string().uuid().optional(),
  title: z.string().min(1).max(255).optional(),
});

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(10000),
});

export const conversationQuerySchema = z.object({
  caregiverId: z.string().uuid(),
  childId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).default(20).optional(),
  offset: z.coerce.number().min(0).default(0).optional(),
});
