/**
 * Chat Service
 *
 * Business logic for conversations and messages.
 * Handles authorization, validation, and data operations.
 *
 * Architecture:
 * - Service receives database instance via dependency injection
 * - All authorization checks happen here (not in routes)
 * - Typed errors that map to HTTP status codes
 * - Clean interface for testing with mocks
 *
 * @module services/chat
 */

import { eq, and, desc, sql, isNull, count } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { conversations, messages, children } from "../db/schema";
import type { Conversation, Message, NewConversation, NewMessage } from "../db/schema/chat";
import type {
  CreateConversationOptions,
  QueryConversationsOptions,
  AddMessageOptions,
  ConversationResponse,
  ConversationWithMessagesResponse,
  MessageResponse,
  PaginatedResponse,
} from "../types/chat";
import { AppError } from "../middleware/error-handler";

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Error codes for chat-related errors
 */
export const ChatErrorCode = {
  CONVERSATION_NOT_FOUND: "CONVERSATION_NOT_FOUND",
  CHILD_NOT_FOUND: "CHILD_NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  ALREADY_DELETED: "ALREADY_DELETED",
} as const;

export type ChatErrorCodeType = (typeof ChatErrorCode)[keyof typeof ChatErrorCode];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert a database conversation to an API response
 */
function toConversationResponse(conversation: Conversation): ConversationResponse {
  return {
    id: conversation.id,
    userId: conversation.userId,
    childId: conversation.childId,
    title: conversation.title,
    metadata: conversation.metadata,
    messageCount: conversation.messageCount,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
    deletedAt: conversation.deletedAt?.toISOString() ?? null,
  };
}

/**
 * Convert a database message to an API response
 */
function toMessageResponse(message: Message): MessageResponse {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role as MessageResponse["role"],
    content: message.content,
    model: message.model,
    toolCalls: message.toolCalls ?? null,
    toolResults: message.toolResults ?? null,
    tokenUsage: message.tokenUsage ?? null,
    metadata: message.metadata ?? null,
    createdAt: message.createdAt.toISOString(),
  };
}

// =============================================================================
// CHAT SERVICE CLASS
// =============================================================================

/**
 * Chat service for managing conversations and messages
 *
 * @example
 * ```typescript
 * const service = new ChatService(db);
 * const conversation = await service.createConversation({
 *   userId: "user-uuid",
 *   childId: "child-uuid",
 *   title: "Hello",
 * });
 * ```
 */
export class ChatService {
  constructor(private readonly db: PostgresJsDatabase<typeof import("../db/schema")>) {}

  // ===========================================================================
  // CONVERSATION OPERATIONS
  // ===========================================================================

  /**
   * Create a new conversation
   *
   * @param options - Creation options
   * @returns The created conversation
   * @throws AppError if child doesn't exist
   */
  async createConversation(options: CreateConversationOptions): Promise<ConversationResponse> {
    // Verify child exists
    const [child] = await this.db
      .select({ id: children.id })
      .from(children)
      .where(eq(children.id, options.childId));

    if (!child) {
      throw new AppError("Child not found", 404, ChatErrorCode.CHILD_NOT_FOUND);
    }

    // Create the conversation
    const newConversation: NewConversation = {
      userId: options.userId,
      childId: options.childId,
      title: options.title,
      metadata: options.metadata,
      messageCount: 0,
    };

    const [created] = await this.db.insert(conversations).values(newConversation).returning();

    if (!created) {
      throw new AppError("Failed to create conversation", 500);
    }

    return toConversationResponse(created);
  }

  /**
   * Get a conversation by ID with authorization check
   *
   * @param conversationId - The conversation ID
   * @param userId - The user making the request
   * @param includeDeleted - Whether to include soft-deleted conversations
   * @returns The conversation or throws
   * @throws AppError if not found or unauthorized
   */
  async getConversation(
    conversationId: string,
    userId: string,
    includeDeleted: boolean = false
  ): Promise<ConversationResponse> {
    const conditions = [eq(conversations.id, conversationId)];

    if (!includeDeleted) {
      conditions.push(isNull(conversations.deletedAt));
    }

    const [conversation] = await this.db
      .select()
      .from(conversations)
      .where(and(...conditions));

    if (!conversation) {
      throw new AppError("Conversation not found", 404, ChatErrorCode.CONVERSATION_NOT_FOUND);
    }

    // Authorization check
    if (conversation.userId !== userId) {
      throw new AppError("Not authorized to access this conversation", 403, ChatErrorCode.UNAUTHORIZED);
    }

    return toConversationResponse(conversation);
  }

  /**
   * Get a conversation with all its messages
   *
   * @param conversationId - The conversation ID
   * @param userId - The user making the request
   * @returns The conversation with messages
   * @throws AppError if not found or unauthorized
   */
  async getConversationWithMessages(
    conversationId: string,
    userId: string
  ): Promise<ConversationWithMessagesResponse> {
    // First get the conversation (with auth check)
    const conversation = await this.getConversation(conversationId, userId);

    // Then get all messages
    const messageList = await this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    return {
      ...conversation,
      messages: messageList.map(toMessageResponse),
    };
  }

  /**
   * List conversations for a user with pagination
   *
   * @param options - Query options
   * @returns Paginated list of conversations
   */
  async listConversations(
    options: QueryConversationsOptions
  ): Promise<PaginatedResponse<ConversationResponse>> {
    const { userId, childId, page, limit, includeDeleted } = options;
    const offset = (page - 1) * limit;

    // Build conditions
    const conditions = [eq(conversations.userId, userId)];

    if (childId !== undefined) {
      conditions.push(eq(conversations.childId, childId));
    }

    if (!includeDeleted) {
      conditions.push(isNull(conversations.deletedAt));
    }

    // Get total count
    const [countResult] = await this.db
      .select({ count: count() })
      .from(conversations)
      .where(and(...conditions));

    const total = countResult?.count ?? 0;

    // Get paginated results
    const results = await this.db
      .select()
      .from(conversations)
      .where(and(...conditions))
      .orderBy(desc(conversations.updatedAt))
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(total / limit);

    return {
      data: results.map(toConversationResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  }

  /**
   * Update a conversation
   *
   * @param conversationId - The conversation ID
   * @param userId - The user making the request
   * @param updates - Fields to update
   * @returns The updated conversation
   * @throws AppError if not found or unauthorized
   */
  async updateConversation(
    conversationId: string,
    userId: string,
    updates: { title?: string | undefined; metadata?: Record<string, unknown> | undefined }
  ): Promise<ConversationResponse> {
    // First verify access
    await this.getConversation(conversationId, userId);

    // Perform update
    const [updated] = await this.db
      .update(conversations)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId))
      .returning();

    if (!updated) {
      throw new AppError("Failed to update conversation", 500);
    }

    return toConversationResponse(updated);
  }

  /**
   * Soft delete a conversation
   *
   * @param conversationId - The conversation ID
   * @param userId - The user making the request
   * @throws AppError if not found, unauthorized, or already deleted
   */
  async deleteConversation(conversationId: string, userId: string): Promise<void> {
    // Verify access (includeDeleted=false to ensure it's not already deleted)
    const conversation = await this.getConversation(conversationId, userId, false);

    if (conversation.deletedAt !== null) {
      throw new AppError("Conversation already deleted", 400, ChatErrorCode.ALREADY_DELETED);
    }

    // Soft delete
    await this.db
      .update(conversations)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId));
  }

  // ===========================================================================
  // MESSAGE OPERATIONS
  // ===========================================================================

  /**
   * Add a message to a conversation
   *
   * @param options - Message creation options
   * @param userId - The user making the request
   * @returns The created message
   * @throws AppError if conversation not found or unauthorized
   */
  async addMessage(options: AddMessageOptions, userId: string): Promise<MessageResponse> {
    // Verify conversation access
    await this.getConversation(options.conversationId, userId);

    // Create the message
    const newMessage: NewMessage = {
      conversationId: options.conversationId,
      role: options.role,
      content: options.content,
      model: options.model,
      toolCalls: options.toolCalls,
      toolResults: options.toolResults,
      tokenUsage: options.tokenUsage,
      metadata: options.metadata,
    };

    const [created] = await this.db.insert(messages).values(newMessage).returning();

    if (!created) {
      throw new AppError("Failed to create message", 500);
    }

    // Update conversation's message count and updatedAt
    await this.db
      .update(conversations)
      .set({
        messageCount: sql`${conversations.messageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, options.conversationId));

    return toMessageResponse(created);
  }

  /**
   * Get messages for a conversation
   *
   * @param conversationId - The conversation ID
   * @param userId - The user making the request
   * @param limit - Maximum number of messages to return
   * @param before - Get messages before this ID (for pagination)
   * @returns List of messages
   * @throws AppError if conversation not found or unauthorized
   */
  async getMessages(
    conversationId: string,
    userId: string,
    limit: number = 50
  ): Promise<MessageResponse[]> {
    // Verify conversation access
    await this.getConversation(conversationId, userId);

    const messageList = await this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt)
      .limit(limit);

    return messageList.map(toMessageResponse);
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a ChatService instance with the given database
 *
 * @param db - Drizzle database instance
 * @returns ChatService instance
 */
export function createChatService(
  db: PostgresJsDatabase<typeof import("../db/schema")>
): ChatService {
  return new ChatService(db);
}
