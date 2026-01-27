/**
 * Chat Database Schema
 *
 * Defines the database tables for conversations and messages.
 * Follows Drizzle ORM patterns consistent with the existing schema.
 *
 * Design decisions:
 * - Conversations scoped to child (childId) and owned by user (userId)
 * - Soft delete support via deletedAt timestamp
 * - JSONB for flexible tool calls and metadata
 * - Proper indexes for query performance
 * - Cascading deletes for referential integrity
 *
 * @module db/schema/chat
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { children } from "../schema";

// =============================================================================
// CONVERSATIONS TABLE
// =============================================================================

/**
 * Conversations table - stores chat sessions scoped to a child
 *
 * Each conversation:
 * - Belongs to a user (future: from auth system)
 * - Is scoped to a specific child
 * - Can be soft-deleted (deletedAt)
 * - Tracks message count for efficient listing
 */
export const conversations = pgTable(
  "conversations",
  {
    /** Primary key - UUID */
    id: uuid("id").primaryKey().defaultRandom(),

    /**
     * User ID who owns this conversation
     * Note: This will be a FK to users table once auth is implemented
     * For now, it's a UUID that the API layer provides
     */
    userId: uuid("user_id").notNull(),

    /**
     * Child this conversation is about
     * FK to children table with cascade delete
     */
    childId: uuid("child_id")
      .references(() => children.id, { onDelete: "cascade" })
      .notNull(),

    /**
     * Optional title for the conversation
     * Can be auto-generated or user-provided
     */
    title: varchar("title", { length: 255 }),

    /**
     * Flexible metadata storage
     * Can store UI state, preferences, etc.
     */
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    /**
     * Denormalized message count for efficient listing
     * Updated via triggers or application logic
     */
    messageCount: integer("message_count").default(0).notNull(),

    /** Creation timestamp */
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),

    /** Last update timestamp (updated when messages added) */
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),

    /**
     * Soft delete timestamp
     * When set, conversation is considered deleted but retained for recovery
     */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    // Index for listing user's conversations (most common query)
    index("conversations_user_id_idx").on(table.userId),

    // Index for filtering by child
    index("conversations_child_id_idx").on(table.childId),

    // Composite index for user + child filtering with deleted filter
    index("conversations_user_child_deleted_idx").on(
      table.userId,
      table.childId,
      table.deletedAt
    ),

    // Index for listing non-deleted conversations by recency
    index("conversations_user_updated_idx").on(table.userId, table.updatedAt),
  ]
);

// =============================================================================
// MESSAGES TABLE
// =============================================================================

/**
 * Messages table - stores individual messages in conversations
 *
 * Each message:
 * - Belongs to a conversation
 * - Has a role (user, assistant, system, tool)
 * - Can include tool calls and results (stored as JSONB)
 * - Tracks token usage for analytics
 */
export const messages = pgTable(
  "messages",
  {
    /** Primary key - UUID */
    id: uuid("id").primaryKey().defaultRandom(),

    /**
     * Conversation this message belongs to
     * FK with cascade delete
     */
    conversationId: uuid("conversation_id")
      .references(() => conversations.id, { onDelete: "cascade" })
      .notNull(),

    /**
     * Message role
     * - user: From the human user
     * - assistant: From the AI model
     * - system: System prompts/instructions
     * - tool: Tool execution results
     */
    role: varchar("role", { length: 20 }).notNull(),

    /**
     * Message content
     * Using text for unlimited length (some AI responses are long)
     */
    content: text("content").notNull(),

    /**
     * Model used to generate this message
     * Only relevant for assistant messages
     * e.g., "claude-3-opus-20240229", "gpt-4-turbo"
     */
    model: varchar("model", { length: 100 }),

    /**
     * Tool calls made by the assistant
     * Array of {id, name, arguments} objects
     */
    toolCalls: jsonb("tool_calls").$type<
      Array<{
        id: string;
        name: string;
        arguments: Record<string, unknown>;
      }>
    >(),

    /**
     * Tool results for tool role messages
     * Array of {toolCallId, content, isError?} objects
     */
    toolResults: jsonb("tool_results").$type<
      Array<{
        toolCallId: string;
        content: unknown;
        isError?: boolean;
      }>
    >(),

    /**
     * Token usage statistics
     * {promptTokens, completionTokens, totalTokens}
     */
    tokenUsage: jsonb("token_usage").$type<{
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
    }>(),

    /**
     * Additional metadata
     * Can store latency, model params, etc.
     */
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    /** Creation timestamp */
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Index for fetching messages in a conversation (sorted by creation)
    index("messages_conversation_id_idx").on(table.conversationId),

    // Composite index for efficient conversation message retrieval
    index("messages_conversation_created_idx").on(table.conversationId, table.createdAt),
  ]
);

// =============================================================================
// TYPE EXPORTS
// =============================================================================

/** Conversation select type (what you get from queries) */
export type Conversation = typeof conversations.$inferSelect;

/** Conversation insert type (what you provide for inserts) */
export type NewConversation = typeof conversations.$inferInsert;

/** Message select type */
export type Message = typeof messages.$inferSelect;

/** Message insert type */
export type NewMessage = typeof messages.$inferInsert;
