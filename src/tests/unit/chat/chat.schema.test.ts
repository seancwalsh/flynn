/**
 * Chat Schema Validation Tests
 *
 * Unit tests for Zod schemas without database connection.
 * Tests all input validation for the chat API.
 */

import { describe, test, expect } from "bun:test";
import {
  createConversationSchema,
  updateConversationSchema,
  createMessageSchema,
  listConversationsQuerySchema,
  messageRoleSchema,
  toolCallSchema,
  toolResultSchema,
  tokenUsageSchema,
} from "../../../types/chat";

// =============================================================================
// MESSAGE ROLE SCHEMA
// =============================================================================

describe("Message Role Schema", () => {
  test("accepts valid roles", () => {
    const validRoles = ["user", "assistant", "system", "tool"];
    for (const role of validRoles) {
      const result = messageRoleSchema.safeParse(role);
      expect(result.success).toBe(true);
    }
  });

  test("rejects invalid roles", () => {
    const invalidRoles = ["admin", "bot", "human", "", "USER"];
    for (const role of invalidRoles) {
      const result = messageRoleSchema.safeParse(role);
      expect(result.success).toBe(false);
    }
  });
});

// =============================================================================
// TOOL CALL SCHEMA
// =============================================================================

describe("Tool Call Schema", () => {
  test("accepts valid tool call", () => {
    const result = toolCallSchema.safeParse({
      id: "call_123",
      name: "get_weather",
      arguments: { location: "Seattle" },
    });
    expect(result.success).toBe(true);
  });

  test("accepts tool call with complex arguments", () => {
    const result = toolCallSchema.safeParse({
      id: "call_456",
      name: "search_database",
      arguments: {
        query: "test",
        filters: { date: "2024-01-01", tags: ["important", "urgent"] },
        limit: 10,
      },
    });
    expect(result.success).toBe(true);
  });

  test("accepts tool call with empty arguments", () => {
    const result = toolCallSchema.safeParse({
      id: "call_789",
      name: "get_time",
      arguments: {},
    });
    expect(result.success).toBe(true);
  });

  test("rejects tool call without id", () => {
    const result = toolCallSchema.safeParse({
      name: "get_weather",
      arguments: {},
    });
    expect(result.success).toBe(false);
  });

  test("rejects tool call without name", () => {
    const result = toolCallSchema.safeParse({
      id: "call_123",
      arguments: {},
    });
    expect(result.success).toBe(false);
  });

  test("rejects tool call with empty id", () => {
    const result = toolCallSchema.safeParse({
      id: "",
      name: "test",
      arguments: {},
    });
    expect(result.success).toBe(false);
  });

  test("rejects tool call with empty name", () => {
    const result = toolCallSchema.safeParse({
      id: "call_123",
      name: "",
      arguments: {},
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// TOOL RESULT SCHEMA
// =============================================================================

describe("Tool Result Schema", () => {
  test("accepts valid tool result", () => {
    const result = toolResultSchema.safeParse({
      toolCallId: "call_123",
      content: "The weather is sunny",
    });
    expect(result.success).toBe(true);
  });

  test("accepts tool result with object content", () => {
    const result = toolResultSchema.safeParse({
      toolCallId: "call_123",
      content: { temperature: 72, unit: "F", conditions: "sunny" },
    });
    expect(result.success).toBe(true);
  });

  test("accepts tool result with error flag", () => {
    const result = toolResultSchema.safeParse({
      toolCallId: "call_123",
      content: "Error: API rate limit exceeded",
      isError: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isError).toBe(true);
    }
  });

  test("accepts tool result with null content", () => {
    const result = toolResultSchema.safeParse({
      toolCallId: "call_123",
      content: null,
    });
    expect(result.success).toBe(true);
  });

  test("rejects tool result without toolCallId", () => {
    const result = toolResultSchema.safeParse({
      content: "result",
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// TOKEN USAGE SCHEMA
// =============================================================================

describe("Token Usage Schema", () => {
  test("accepts full token usage", () => {
    const result = tokenUsageSchema.safeParse({
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    });
    expect(result.success).toBe(true);
  });

  test("accepts partial token usage", () => {
    const result = tokenUsageSchema.safeParse({
      totalTokens: 150,
    });
    expect(result.success).toBe(true);
  });

  test("accepts empty token usage", () => {
    const result = tokenUsageSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  test("rejects negative token counts", () => {
    const result = tokenUsageSchema.safeParse({
      promptTokens: -10,
    });
    expect(result.success).toBe(false);
  });

  test("rejects non-integer token counts", () => {
    const result = tokenUsageSchema.safeParse({
      promptTokens: 10.5,
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// CREATE CONVERSATION SCHEMA
// =============================================================================

describe("Create Conversation Schema", () => {
  const validUuid = "123e4567-e89b-12d3-a456-426614174000";

  test("accepts valid conversation with childId only", () => {
    const result = createConversationSchema.safeParse({
      childId: validUuid,
    });
    expect(result.success).toBe(true);
  });

  test("accepts valid conversation with all fields", () => {
    const result = createConversationSchema.safeParse({
      childId: validUuid,
      title: "My Conversation",
      metadata: { theme: "dark", language: "en" },
    });
    expect(result.success).toBe(true);
  });

  test("rejects missing childId", () => {
    const result = createConversationSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  test("rejects invalid childId UUID", () => {
    const result = createConversationSchema.safeParse({
      childId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  test("rejects title over 255 characters", () => {
    const result = createConversationSchema.safeParse({
      childId: validUuid,
      title: "a".repeat(256),
    });
    expect(result.success).toBe(false);
  });

  test("accepts title at max length (255)", () => {
    const result = createConversationSchema.safeParse({
      childId: validUuid,
      title: "a".repeat(255),
    });
    expect(result.success).toBe(true);
  });

  test("accepts empty title", () => {
    const result = createConversationSchema.safeParse({
      childId: validUuid,
      title: "",
    });
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// UPDATE CONVERSATION SCHEMA
// =============================================================================

describe("Update Conversation Schema", () => {
  test("accepts empty update (no-op)", () => {
    const result = updateConversationSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  test("accepts title update", () => {
    const result = updateConversationSchema.safeParse({
      title: "New Title",
    });
    expect(result.success).toBe(true);
  });

  test("accepts metadata update", () => {
    const result = updateConversationSchema.safeParse({
      metadata: { archived: true },
    });
    expect(result.success).toBe(true);
  });

  test("accepts both title and metadata", () => {
    const result = updateConversationSchema.safeParse({
      title: "New Title",
      metadata: { theme: "light" },
    });
    expect(result.success).toBe(true);
  });

  test("rejects title over 255 characters", () => {
    const result = updateConversationSchema.safeParse({
      title: "a".repeat(256),
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// CREATE MESSAGE SCHEMA
// =============================================================================

describe("Create Message Schema", () => {
  test("accepts minimal user message", () => {
    const result = createMessageSchema.safeParse({
      role: "user",
      content: "Hello, world!",
    });
    expect(result.success).toBe(true);
  });

  test("accepts assistant message with model", () => {
    const result = createMessageSchema.safeParse({
      role: "assistant",
      content: "Hello! How can I help?",
      model: "claude-3-opus-20240229",
    });
    expect(result.success).toBe(true);
  });

  test("accepts assistant message with tool calls", () => {
    const result = createMessageSchema.safeParse({
      role: "assistant",
      content: "Let me check the weather.",
      model: "claude-3-opus-20240229",
      toolCalls: [
        {
          id: "call_123",
          name: "get_weather",
          arguments: { location: "Seattle" },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  test("accepts tool message with results", () => {
    const result = createMessageSchema.safeParse({
      role: "tool",
      content: "",
      toolResults: [
        {
          toolCallId: "call_123",
          content: { temperature: 72 },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  test("accepts message with token usage", () => {
    const result = createMessageSchema.safeParse({
      role: "assistant",
      content: "Response",
      tokenUsage: {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      },
    });
    expect(result.success).toBe(true);
  });

  test("accepts message with metadata", () => {
    const result = createMessageSchema.safeParse({
      role: "user",
      content: "Hello",
      metadata: { source: "mobile", timestamp: 1234567890 },
    });
    expect(result.success).toBe(true);
  });

  test("accepts all roles", () => {
    const roles = ["user", "assistant", "system", "tool"];
    for (const role of roles) {
      const result = createMessageSchema.safeParse({
        role,
        content: "Test",
      });
      expect(result.success).toBe(true);
    }
  });

  test("rejects missing role", () => {
    const result = createMessageSchema.safeParse({
      content: "Hello",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing content", () => {
    const result = createMessageSchema.safeParse({
      role: "user",
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid role", () => {
    const result = createMessageSchema.safeParse({
      role: "admin",
      content: "Hello",
    });
    expect(result.success).toBe(false);
  });

  test("rejects model name over 100 characters", () => {
    const result = createMessageSchema.safeParse({
      role: "assistant",
      content: "Hello",
      model: "a".repeat(101),
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// LIST CONVERSATIONS QUERY SCHEMA
// =============================================================================

describe("List Conversations Query Schema", () => {
  test("accepts empty query (uses defaults)", () => {
    const result = listConversationsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.includeDeleted).toBe(false);
    }
  });

  test("accepts valid page and limit", () => {
    const result = listConversationsQuerySchema.safeParse({
      page: "2",
      limit: "50",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
    }
  });

  test("accepts childId filter", () => {
    const result = listConversationsQuerySchema.safeParse({
      childId: "123e4567-e89b-12d3-a456-426614174000",
    });
    expect(result.success).toBe(true);
  });

  test("accepts includeDeleted as string", () => {
    const result = listConversationsQuerySchema.safeParse({
      includeDeleted: "true",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.includeDeleted).toBe(true);
    }
  });

  test("coerces string numbers to integers", () => {
    const result = listConversationsQuerySchema.safeParse({
      page: "5",
      limit: "25",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(typeof result.data.page).toBe("number");
      expect(typeof result.data.limit).toBe("number");
    }
  });

  test("rejects page less than 1", () => {
    const result = listConversationsQuerySchema.safeParse({
      page: "0",
    });
    expect(result.success).toBe(false);
  });

  test("rejects negative page", () => {
    const result = listConversationsQuerySchema.safeParse({
      page: "-1",
    });
    expect(result.success).toBe(false);
  });

  test("rejects limit over 100", () => {
    const result = listConversationsQuerySchema.safeParse({
      limit: "101",
    });
    expect(result.success).toBe(false);
  });

  test("rejects limit less than 1", () => {
    const result = listConversationsQuerySchema.safeParse({
      limit: "0",
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid childId UUID", () => {
    const result = listConversationsQuerySchema.safeParse({
      childId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// EDGE CASES AND COMPLEX SCENARIOS
// =============================================================================

describe("Edge Cases", () => {
  test("handles very long message content", () => {
    const result = createMessageSchema.safeParse({
      role: "user",
      content: "a".repeat(100000), // 100KB of content
    });
    expect(result.success).toBe(true);
  });

  test("handles unicode in content", () => {
    const result = createMessageSchema.safeParse({
      role: "user",
      content: "Hello 👋 世界 🌍 مرحبا",
    });
    expect(result.success).toBe(true);
  });

  test("handles unicode in title", () => {
    const result = createConversationSchema.safeParse({
      childId: "123e4567-e89b-12d3-a456-426614174000",
      title: "Chat 💬 with Emma",
    });
    expect(result.success).toBe(true);
  });

  test("handles deeply nested metadata", () => {
    const result = createConversationSchema.safeParse({
      childId: "123e4567-e89b-12d3-a456-426614174000",
      metadata: {
        level1: {
          level2: {
            level3: {
              level4: {
                value: "deep",
              },
            },
          },
        },
      },
    });
    expect(result.success).toBe(true);
  });

  test("handles multiple tool calls in single message", () => {
    const result = createMessageSchema.safeParse({
      role: "assistant",
      content: "Checking multiple things...",
      toolCalls: [
        { id: "call_1", name: "get_weather", arguments: { city: "Seattle" } },
        { id: "call_2", name: "get_time", arguments: { timezone: "PST" } },
        { id: "call_3", name: "search", arguments: { query: "restaurants" } },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.toolCalls).toHaveLength(3);
    }
  });
});
