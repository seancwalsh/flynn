/**
 * Conversations API Routes
 *
 * RESTful API for managing chat conversations and messages.
 * Routes handle HTTP concerns only - business logic is in the service layer.
 *
 * Endpoints:
 * - GET    /                 - List user's conversations (paginated)
 * - POST   /                 - Create new conversation
 * - GET    /:id              - Get conversation with messages
 * - PATCH  /:id              - Update conversation metadata
 * - DELETE /:id              - Soft delete conversation
 * - POST   /:id/messages     - Add message to conversation
 *
 * @module routes/api/v1/conversations
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";
import { db } from "../../../db";
import { ChatService } from "../../../services/chat";
import {
  createConversationSchema,
  updateConversationSchema,
  createMessageSchema,
  listConversationsQuerySchema,
} from "../../../types/chat";
import { AppError } from "../../../middleware/error-handler";

export const conversationsRoutes = new Hono();

// Create service instance with database
const chatService = new ChatService(db);

// =============================================================================
// TEMPORARY AUTH HELPER
// =============================================================================

/**
 * Get user ID from request headers
 *
 * TEMPORARY: This extracts user ID from X-User-Id header.
 * In production, this will be replaced with proper JWT auth middleware.
 *
 * @param headers - Request headers
 * @returns User ID
 * @throws AppError if no user ID provided
 */
function getUserId(headers: Headers): string {
  const userId = headers.get("X-User-Id");

  if (userId === null || userId === "") {
    throw new AppError("Authentication required", 401, "UNAUTHORIZED");
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    throw new AppError("Invalid user ID format", 401, "INVALID_USER_ID");
  }

  return userId;
}

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET / - List conversations
 *
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - childId: Filter by child (optional)
 * - includeDeleted: Include soft-deleted (default: false)
 */
conversationsRoutes.get(
  "/",
  zValidator("query", listConversationsQuerySchema),
  async (c) => {
    const userId = getUserId(c.req.raw.headers);
    const query = c.req.valid("query");

    const result = await chatService.listConversations({
      userId,
      childId: query.childId,
      page: query.page,
      limit: query.limit,
      includeDeleted: query.includeDeleted,
    });

    return c.json(result);
  }
);

/**
 * POST / - Create a new conversation
 *
 * Body:
 * - childId: UUID of the child (required)
 * - title: Optional title
 * - metadata: Optional metadata object
 */
conversationsRoutes.post(
  "/",
  zValidator("json", createConversationSchema),
  async (c) => {
    const userId = getUserId(c.req.raw.headers);
    const body = c.req.valid("json");

    const conversation = await chatService.createConversation({
      userId,
      childId: body.childId,
      title: body.title,
      metadata: body.metadata,
    });

    return c.json({ data: conversation }, 201);
  }
);

/**
 * GET /:id - Get conversation with messages
 */
conversationsRoutes.get("/:id", async (c) => {
  const userId = getUserId(c.req.raw.headers);
  const conversationId = c.req.param("id");

  // Validate UUID format
  const uuidSchema = z.string().uuid();
  const parseResult = uuidSchema.safeParse(conversationId);

  if (!parseResult.success) {
    throw new AppError("Invalid conversation ID format", 400, "INVALID_ID");
  }

  const conversation = await chatService.getConversationWithMessages(conversationId, userId);

  return c.json({ data: conversation });
});

/**
 * PATCH /:id - Update conversation
 *
 * Body:
 * - title: New title (optional)
 * - metadata: New metadata (optional, replaces existing)
 */
conversationsRoutes.patch(
  "/:id",
  zValidator("json", updateConversationSchema),
  async (c) => {
    const userId = getUserId(c.req.raw.headers);
    const conversationId = c.req.param("id");
    const body = c.req.valid("json");

    // Validate UUID format
    const uuidSchema = z.string().uuid();
    const parseResult = uuidSchema.safeParse(conversationId);

    if (!parseResult.success) {
      throw new AppError("Invalid conversation ID format", 400, "INVALID_ID");
    }

    const conversation = await chatService.updateConversation(conversationId, userId, body);

    return c.json({ data: conversation });
  }
);

/**
 * DELETE /:id - Soft delete conversation
 */
conversationsRoutes.delete("/:id", async (c) => {
  const userId = getUserId(c.req.raw.headers);
  const conversationId = c.req.param("id");

  // Validate UUID format
  const uuidSchema = z.string().uuid();
  const parseResult = uuidSchema.safeParse(conversationId);

  if (!parseResult.success) {
    throw new AppError("Invalid conversation ID format", 400, "INVALID_ID");
  }

  await chatService.deleteConversation(conversationId, userId);

  return c.json({ message: "Conversation deleted" });
});

/**
 * POST /:id/messages - Add message to conversation
 *
 * Body:
 * - role: "user" | "assistant" | "system" | "tool"
 * - content: Message text
 * - model: Model name (optional, for assistant messages)
 * - toolCalls: Tool calls array (optional)
 * - toolResults: Tool results array (optional)
 * - tokenUsage: Token usage stats (optional)
 * - metadata: Additional metadata (optional)
 *
 * Note: This is a placeholder for direct message creation.
 * Streaming chat (FLY-88) will add real AI-powered messaging.
 */
conversationsRoutes.post(
  "/:id/messages",
  zValidator("json", createMessageSchema),
  async (c) => {
    const userId = getUserId(c.req.raw.headers);
    const conversationId = c.req.param("id");
    const body = c.req.valid("json");

    // Validate UUID format
    const uuidSchema = z.string().uuid();
    const parseResult = uuidSchema.safeParse(conversationId);

    if (!parseResult.success) {
      throw new AppError("Invalid conversation ID format", 400, "INVALID_ID");
    }

    const message = await chatService.addMessage(
      {
        conversationId,
        role: body.role,
        content: body.content,
        model: body.model,
        toolCalls: body.toolCalls,
        toolResults: body.toolResults,
        tokenUsage: body.tokenUsage,
        metadata: body.metadata,
      },
      userId
    );

    return c.json({ data: message }, 201);
  }
);
