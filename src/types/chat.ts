/**
 * Chat Types and Validation Schemas
 *
 * This module defines all types for the chat/conversation system.
 * Follows the principle: Zod schemas at API boundary, TypeScript types internally.
 *
 * @module types/chat
 */

import { z } from "zod/v4";

// =============================================================================
// ENUMS AND CONSTANTS
// =============================================================================

/**
 * Valid message roles in a conversation
 */
export const MessageRoleValues = {
  USER: "user",
  ASSISTANT: "assistant",
  SYSTEM: "system",
  TOOL: "tool",
} as const;

export type MessageRole = (typeof MessageRoleValues)[keyof typeof MessageRoleValues];

/**
 * Zod schema for message role validation
 */
export const messageRoleSchema = z.enum(["user", "assistant", "system", "tool"]);

// =============================================================================
// TOOL CALL TYPES
// =============================================================================

/**
 * Represents a tool call made by the assistant
 */
export interface ToolCall {
  /** Unique identifier for this tool call */
  id: string;
  /** Name of the tool being called */
  name: string;
  /** Arguments passed to the tool (JSON object) */
  arguments: Record<string, unknown>;
}

/**
 * Represents the result of a tool call
 */
export interface ToolResult {
  /** ID of the tool call this result is for */
  toolCallId: string;
  /** Result content (can be string or structured data) */
  content: unknown;
  /** Whether the tool call succeeded */
  isError?: boolean | undefined;
}

/**
 * Zod schema for tool call validation
 */
export const toolCallSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  arguments: z.record(z.string(), z.unknown()),
});

/**
 * Zod schema for tool result validation
 */
export const toolResultSchema = z.object({
  toolCallId: z.string().min(1),
  content: z.unknown(),
  isError: z.boolean().optional(),
});

// =============================================================================
// TOKEN USAGE
// =============================================================================

/**
 * Token usage statistics for a message
 */
export interface TokenUsage {
  /** Number of input/prompt tokens */
  promptTokens?: number | undefined;
  /** Number of output/completion tokens */
  completionTokens?: number | undefined;
  /** Total tokens (prompt + completion) */
  totalTokens?: number | undefined;
}

/**
 * Zod schema for token usage
 */
export const tokenUsageSchema = z.object({
  promptTokens: z.number().int().nonnegative().optional(),
  completionTokens: z.number().int().nonnegative().optional(),
  totalTokens: z.number().int().nonnegative().optional(),
});

// =============================================================================
// API INPUT SCHEMAS
// =============================================================================

/**
 * Schema for creating a new conversation
 */
export const createConversationSchema = z.object({
  /** ID of the child this conversation is for */
  childId: z.string().uuid(),
  /** Optional title for the conversation */
  title: z.string().max(255).optional(),
  /** Optional metadata for the conversation */
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;

/**
 * Schema for updating a conversation
 */
export const updateConversationSchema = z.object({
  /** New title for the conversation */
  title: z.string().max(255).optional(),
  /** New metadata (replaces existing) */
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;

/**
 * Schema for creating a new message
 */
export const createMessageSchema = z.object({
  /** Role of the message sender */
  role: messageRoleSchema,
  /** Message content */
  content: z.string(),
  /** Model used to generate this message (for assistant messages) */
  model: z.string().max(100).optional(),
  /** Tool calls made by the assistant */
  toolCalls: z.array(toolCallSchema).optional(),
  /** Tool results (for tool role messages) */
  toolResults: z.array(toolResultSchema).optional(),
  /** Token usage statistics */
  tokenUsage: tokenUsageSchema.optional(),
  /** Additional metadata */
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CreateMessageInput = z.infer<typeof createMessageSchema>;

/**
 * Schema for listing conversations with pagination
 */
export const listConversationsQuerySchema = z.object({
  /** Page number (1-indexed) */
  page: z.coerce.number().int().positive().default(1),
  /** Number of items per page */
  limit: z.coerce.number().int().positive().max(100).default(20),
  /** Filter by child ID */
  childId: z.string().uuid().optional(),
  /** Include deleted conversations */
  includeDeleted: z.coerce.boolean().default(false),
});

export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;

// =============================================================================
// RESPONSE TYPES
// =============================================================================

/**
 * Message as returned by the API
 */
export interface MessageResponse {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  model: string | null;
  toolCalls: ToolCall[] | null;
  toolResults: ToolResult[] | null;
  tokenUsage: TokenUsage | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/**
 * Conversation as returned by the API (without messages)
 */
export interface ConversationResponse {
  id: string;
  userId: string;
  childId: string;
  title: string | null;
  metadata: Record<string, unknown> | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/**
 * Conversation with messages
 */
export interface ConversationWithMessagesResponse extends ConversationResponse {
  messages: MessageResponse[];
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * API response wrappers (consistent with existing api.ts patterns)
 */
export interface ConversationApiResponse {
  data: ConversationResponse;
}

export interface ConversationWithMessagesApiResponse {
  data: ConversationWithMessagesResponse;
}

export interface ConversationListApiResponse extends PaginatedResponse<ConversationResponse> {}

export interface MessageApiResponse {
  data: MessageResponse;
}

// =============================================================================
// INTERNAL TYPES (for service layer)
// =============================================================================

/**
 * Options for creating a conversation internally
 */
export interface CreateConversationOptions {
  userId: string;
  childId: string;
  title?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

/**
 * Options for querying conversations
 */
export interface QueryConversationsOptions {
  userId: string;
  childId?: string | undefined;
  page: number;
  limit: number;
  includeDeleted: boolean;
}

/**
 * Options for adding a message
 */
export interface AddMessageOptions {
  conversationId: string;
  role: MessageRole;
  content: string;
  model?: string | undefined;
  toolCalls?: ToolCall[] | undefined;
  toolResults?: ToolResult[] | undefined;
  tokenUsage?: TokenUsage | undefined;
  metadata?: Record<string, unknown> | undefined;
}
