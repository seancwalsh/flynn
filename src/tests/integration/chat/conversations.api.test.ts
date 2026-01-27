/**
 * Conversations API Integration Tests
 *
 * Full integration tests for the conversations REST API.
 * Tests the complete request/response cycle including:
 * - Authentication
 * - Input validation
 * - Business logic
 * - Error handling
 * - Response format
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { app } from "../../../app";
import {
  setupTestDatabase,
  cleanTestData,
  closeTestDb,
  teardownTestDatabase,
  getTestDb,
} from "../../setup";
import { createTestFamily, createTestChild } from "../../fixtures";

// =============================================================================
// TEST HELPERS
// =============================================================================

const testUserId = "11111111-1111-1111-1111-111111111111";
const otherUserId = "22222222-2222-2222-2222-222222222222";

/**
 * Make a JSON API request with authentication
 */
async function jsonRequest(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    userId?: string;
    headers?: Record<string, string>;
  } = {}
) {
  const init: RequestInit = {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.userId ? { "X-User-Id": options.userId } : {}),
      ...(options.headers ?? {}),
    },
  };

  if (options.body) {
    init.body = JSON.stringify(options.body);
  }

  return app.request(path, init);
}

/**
 * Parse JSON response body
 */
async function parseResponse<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

// =============================================================================
// TEST SETUP
// =============================================================================

describe("Conversations API", () => {
  let testFamily: Awaited<ReturnType<typeof createTestFamily>>;
  let testChild: Awaited<ReturnType<typeof createTestChild>>;

  beforeAll(async () => {
    await setupTestDatabase();
    // Add chat tables to test database
    const db = getTestDb();
    await db.execute(`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
        title VARCHAR(255),
        metadata JSONB,
        message_count INTEGER DEFAULT 0 NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
        deleted_at TIMESTAMP WITH TIME ZONE
      )
    `);
    await db.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        model VARCHAR(100),
        tool_calls JSONB,
        tool_results JSONB,
        token_usage JSONB,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      )
    `);
  });

  beforeEach(async () => {
    await cleanTestData();
    // Also clean chat tables
    const db = getTestDb();
    await db.execute(`TRUNCATE messages CASCADE`);
    await db.execute(`TRUNCATE conversations CASCADE`);

    // Create test data
    testFamily = await createTestFamily({ name: "API Test Family" });
    testChild = await createTestChild(testFamily!.id, { name: "API Test Child" });
  });

  afterAll(async () => {
    const db = getTestDb();
    await db.execute(`DROP TABLE IF EXISTS messages CASCADE`);
    await db.execute(`DROP TABLE IF EXISTS conversations CASCADE`);
    await teardownTestDatabase();
    await closeTestDb();
  });

  // ===========================================================================
  // AUTHENTICATION
  // ===========================================================================

  describe("Authentication", () => {
    test("returns 401 when X-User-Id header is missing", async () => {
      const res = await jsonRequest("/api/v1/conversations");
      expect(res.status).toBe(401);

      const body = await parseResponse<{ error: string }>(res);
      expect(body.error).toContain("Authentication required");
    });

    test("returns 401 for invalid UUID format in X-User-Id", async () => {
      const res = await jsonRequest("/api/v1/conversations", {
        userId: "not-a-uuid",
      });
      expect(res.status).toBe(401);

      const body = await parseResponse<{ error: string }>(res);
      expect(body.error).toContain("Invalid user ID");
    });

    test("accepts valid UUID in X-User-Id", async () => {
      const res = await jsonRequest("/api/v1/conversations", {
        userId: testUserId,
      });
      expect(res.status).toBe(200);
    });
  });

  // ===========================================================================
  // POST /api/v1/conversations - Create Conversation
  // ===========================================================================

  describe("POST /api/v1/conversations", () => {
    test("creates conversation with minimal data", async () => {
      const res = await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: { childId: testChild!.id },
      });
      const body = await parseResponse<{ data: any }>(res);

      expect(res.status).toBe(201);
      expect(body.data.id).toBeDefined();
      expect(body.data.userId).toBe(testUserId);
      expect(body.data.childId).toBe(testChild!.id);
      expect(body.data.title).toBeNull();
      expect(body.data.messageCount).toBe(0);
      expect(body.data.createdAt).toBeDefined();
      expect(body.data.updatedAt).toBeDefined();
      expect(body.data.deletedAt).toBeNull();
    });

    test("creates conversation with title", async () => {
      const res = await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: {
          childId: testChild!.id,
          title: "My First Conversation",
        },
      });
      const body = await parseResponse<{ data: any }>(res);

      expect(res.status).toBe(201);
      expect(body.data.title).toBe("My First Conversation");
    });

    test("creates conversation with metadata", async () => {
      const res = await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: {
          childId: testChild!.id,
          metadata: { theme: "dark", language: "en" },
        },
      });
      const body = await parseResponse<{ data: any }>(res);

      expect(res.status).toBe(201);
      expect(body.data.metadata).toEqual({ theme: "dark", language: "en" });
    });

    test("returns 400 for missing childId", async () => {
      const res = await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: {},
      });

      expect(res.status).toBe(400);
    });

    test("returns 400 for invalid childId UUID", async () => {
      const res = await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: { childId: "not-a-uuid" },
      });

      expect(res.status).toBe(400);
    });

    test("returns 404 for non-existent child", async () => {
      // Use a valid UUID v4 format that doesn't exist
      const res = await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: { childId: "a0000000-0000-4000-8000-000000000000" },
      });
      const body = await parseResponse<{ error: string; code: string }>(res);

      expect(res.status).toBe(404);
      expect(body.code).toBe("CHILD_NOT_FOUND");
    });

    test("returns 400 for title over 255 characters", async () => {
      const res = await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: {
          childId: testChild!.id,
          title: "a".repeat(256),
        },
      });

      expect(res.status).toBe(400);
    });
  });

  // ===========================================================================
  // GET /api/v1/conversations - List Conversations
  // ===========================================================================

  describe("GET /api/v1/conversations", () => {
    test("returns empty list when no conversations", async () => {
      const res = await jsonRequest("/api/v1/conversations", {
        userId: testUserId,
      });
      const body = await parseResponse<{ data: any[]; pagination: any }>(res);

      expect(res.status).toBe(200);
      expect(body.data).toEqual([]);
      expect(body.pagination.total).toBe(0);
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.hasMore).toBe(false);
    });

    test("returns user's conversations", async () => {
      // Create conversations
      await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: { childId: testChild!.id, title: "Conv 1" },
      });
      await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: { childId: testChild!.id, title: "Conv 2" },
      });

      const res = await jsonRequest("/api/v1/conversations", {
        userId: testUserId,
      });
      const body = await parseResponse<{ data: any[]; pagination: any }>(res);

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(2);
      expect(body.pagination.total).toBe(2);
    });

    test("excludes other users' conversations", async () => {
      // Create conversation for other user
      await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: otherUserId,
        body: { childId: testChild!.id },
      });

      const res = await jsonRequest("/api/v1/conversations", {
        userId: testUserId,
      });
      const body = await parseResponse<{ data: any[] }>(res);

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(0);
    });

    test("filters by childId", async () => {
      const child2 = await createTestChild(testFamily!.id, { name: "Child 2" });

      await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: { childId: testChild!.id, title: "Child 1 Conv" },
      });
      await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: { childId: child2!.id, title: "Child 2 Conv" },
      });

      const res = await jsonRequest(
        `/api/v1/conversations?childId=${testChild!.id}`,
        { userId: testUserId }
      );
      const body = await parseResponse<{ data: any[] }>(res);

      expect(res.status).toBe(200);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].title).toBe("Child 1 Conv");
    });

    test("paginates results", async () => {
      // Create 5 conversations
      for (let i = 0; i < 5; i++) {
        await jsonRequest("/api/v1/conversations", {
          method: "POST",
          userId: testUserId,
          body: { childId: testChild!.id, title: `Conv ${i}` },
        });
      }

      // Get page 1 with limit 2
      const res1 = await jsonRequest("/api/v1/conversations?page=1&limit=2", {
        userId: testUserId,
      });
      const body1 = await parseResponse<{ data: any[]; pagination: any }>(res1);

      expect(body1.data).toHaveLength(2);
      expect(body1.pagination.page).toBe(1);
      expect(body1.pagination.limit).toBe(2);
      expect(body1.pagination.total).toBe(5);
      expect(body1.pagination.totalPages).toBe(3);
      expect(body1.pagination.hasMore).toBe(true);

      // Get page 3
      const res3 = await jsonRequest("/api/v1/conversations?page=3&limit=2", {
        userId: testUserId,
      });
      const body3 = await parseResponse<{ data: any[]; pagination: any }>(res3);

      expect(body3.data).toHaveLength(1);
      expect(body3.pagination.hasMore).toBe(false);
    });

    test("excludes deleted conversations by default", async () => {
      // Create and delete a conversation
      const createRes = await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: { childId: testChild!.id },
      });
      const { data: created } = await parseResponse<{ data: any }>(createRes);

      await jsonRequest(`/api/v1/conversations/${created.id}`, {
        method: "DELETE",
        userId: testUserId,
      });

      // Create another (not deleted)
      await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: { childId: testChild!.id },
      });

      const res = await jsonRequest("/api/v1/conversations", {
        userId: testUserId,
      });
      const body = await parseResponse<{ data: any[] }>(res);

      expect(body.data).toHaveLength(1);
    });

    test("includes deleted when includeDeleted=true", async () => {
      // Create and delete a conversation
      const createRes = await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: { childId: testChild!.id },
      });
      const { data: created } = await parseResponse<{ data: any }>(createRes);

      await jsonRequest(`/api/v1/conversations/${created.id}`, {
        method: "DELETE",
        userId: testUserId,
      });

      const res = await jsonRequest(
        "/api/v1/conversations?includeDeleted=true",
        { userId: testUserId }
      );
      const body = await parseResponse<{ data: any[] }>(res);

      expect(body.data).toHaveLength(1);
      expect(body.data[0].deletedAt).not.toBeNull();
    });

    test("returns 400 for invalid page", async () => {
      const res = await jsonRequest("/api/v1/conversations?page=0", {
        userId: testUserId,
      });

      expect(res.status).toBe(400);
    });

    test("returns 400 for limit over 100", async () => {
      const res = await jsonRequest("/api/v1/conversations?limit=101", {
        userId: testUserId,
      });

      expect(res.status).toBe(400);
    });
  });

  // ===========================================================================
  // GET /api/v1/conversations/:id - Get Conversation
  // ===========================================================================

  describe("GET /api/v1/conversations/:id", () => {
    test("returns conversation with messages", async () => {
      // Create conversation
      const createRes = await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: { childId: testChild!.id, title: "Test Conv" },
      });
      const { data: created } = await parseResponse<{ data: any }>(createRes);

      // Add messages
      await jsonRequest(`/api/v1/conversations/${created.id}/messages`, {
        method: "POST",
        userId: testUserId,
        body: { role: "user", content: "Hello" },
      });
      await jsonRequest(`/api/v1/conversations/${created.id}/messages`, {
        method: "POST",
        userId: testUserId,
        body: { role: "assistant", content: "Hi there!" },
      });

      // Get conversation
      const res = await jsonRequest(`/api/v1/conversations/${created.id}`, {
        userId: testUserId,
      });
      const body = await parseResponse<{ data: any }>(res);

      expect(res.status).toBe(200);
      expect(body.data.id).toBe(created.id);
      expect(body.data.title).toBe("Test Conv");
      expect(body.data.messages).toHaveLength(2);
      expect(body.data.messages[0].content).toBe("Hello");
      expect(body.data.messages[1].content).toBe("Hi there!");
    });

    test("returns 404 for non-existent conversation", async () => {
      const res = await jsonRequest(
        "/api/v1/conversations/a0000000-0000-4000-8000-000000000000",
        { userId: testUserId }
      );
      const body = await parseResponse<{ error: string; code: string }>(res);

      expect(res.status).toBe(404);
      expect(body.code).toBe("CONVERSATION_NOT_FOUND");
    });

    test("returns 403 for other user's conversation", async () => {
      // Create as user 1
      const createRes = await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: { childId: testChild!.id },
      });
      const { data: created } = await parseResponse<{ data: any }>(createRes);

      // Try to access as user 2
      const res = await jsonRequest(`/api/v1/conversations/${created.id}`, {
        userId: otherUserId,
      });
      const body = await parseResponse<{ error: string; code: string }>(res);

      expect(res.status).toBe(403);
      expect(body.code).toBe("UNAUTHORIZED");
    });

    test("returns 400 for invalid UUID format", async () => {
      const res = await jsonRequest("/api/v1/conversations/not-a-uuid", {
        userId: testUserId,
      });

      expect(res.status).toBe(400);
    });
  });

  // ===========================================================================
  // PATCH /api/v1/conversations/:id - Update Conversation
  // ===========================================================================

  describe("PATCH /api/v1/conversations/:id", () => {
    test("updates conversation title", async () => {
      const createRes = await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: { childId: testChild!.id, title: "Original" },
      });
      const { data: created } = await parseResponse<{ data: any }>(createRes);

      const res = await jsonRequest(`/api/v1/conversations/${created.id}`, {
        method: "PATCH",
        userId: testUserId,
        body: { title: "Updated Title" },
      });
      const body = await parseResponse<{ data: any }>(res);

      expect(res.status).toBe(200);
      expect(body.data.title).toBe("Updated Title");
    });

    test("updates conversation metadata", async () => {
      const createRes = await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: { childId: testChild!.id },
      });
      const { data: created } = await parseResponse<{ data: any }>(createRes);

      const res = await jsonRequest(`/api/v1/conversations/${created.id}`, {
        method: "PATCH",
        userId: testUserId,
        body: { metadata: { starred: true } },
      });
      const body = await parseResponse<{ data: any }>(res);

      expect(res.status).toBe(200);
      expect(body.data.metadata).toEqual({ starred: true });
    });

    test("returns 403 for other user's conversation", async () => {
      const createRes = await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: { childId: testChild!.id },
      });
      const { data: created } = await parseResponse<{ data: any }>(createRes);

      const res = await jsonRequest(`/api/v1/conversations/${created.id}`, {
        method: "PATCH",
        userId: otherUserId,
        body: { title: "Hacked" },
      });

      expect(res.status).toBe(403);
    });

    test("returns 404 for non-existent conversation", async () => {
      const res = await jsonRequest(
        "/api/v1/conversations/a0000000-0000-4000-8000-000000000000",
        {
          method: "PATCH",
          userId: testUserId,
          body: { title: "Test" },
        }
      );

      expect(res.status).toBe(404);
    });
  });

  // ===========================================================================
  // DELETE /api/v1/conversations/:id - Delete Conversation
  // ===========================================================================

  describe("DELETE /api/v1/conversations/:id", () => {
    test("soft deletes conversation", async () => {
      const createRes = await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: { childId: testChild!.id },
      });
      const { data: created } = await parseResponse<{ data: any }>(createRes);

      const res = await jsonRequest(`/api/v1/conversations/${created.id}`, {
        method: "DELETE",
        userId: testUserId,
      });
      const body = await parseResponse<{ message: string }>(res);

      expect(res.status).toBe(200);
      expect(body.message).toBe("Conversation deleted");

      // Verify it's not accessible
      const getRes = await jsonRequest(`/api/v1/conversations/${created.id}`, {
        userId: testUserId,
      });
      expect(getRes.status).toBe(404);
    });

    test("returns 403 for other user's conversation", async () => {
      const createRes = await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: { childId: testChild!.id },
      });
      const { data: created } = await parseResponse<{ data: any }>(createRes);

      const res = await jsonRequest(`/api/v1/conversations/${created.id}`, {
        method: "DELETE",
        userId: otherUserId,
      });

      expect(res.status).toBe(403);
    });

    test("returns 404 for non-existent conversation", async () => {
      const res = await jsonRequest(
        "/api/v1/conversations/a0000000-0000-4000-8000-000000000000",
        {
          method: "DELETE",
          userId: testUserId,
        }
      );

      expect(res.status).toBe(404);
    });

    test("returns 404 for already deleted conversation", async () => {
      const createRes = await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: { childId: testChild!.id },
      });
      const { data: created } = await parseResponse<{ data: any }>(createRes);

      // Delete once
      await jsonRequest(`/api/v1/conversations/${created.id}`, {
        method: "DELETE",
        userId: testUserId,
      });

      // Try to delete again
      const res = await jsonRequest(`/api/v1/conversations/${created.id}`, {
        method: "DELETE",
        userId: testUserId,
      });

      expect(res.status).toBe(404);
    });
  });

  // ===========================================================================
  // POST /api/v1/conversations/:id/messages - Add Message
  // ===========================================================================

  describe("POST /api/v1/conversations/:id/messages", () => {
    test("adds user message", async () => {
      const createRes = await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: { childId: testChild!.id },
      });
      const { data: created } = await parseResponse<{ data: any }>(createRes);

      const res = await jsonRequest(
        `/api/v1/conversations/${created.id}/messages`,
        {
          method: "POST",
          userId: testUserId,
          body: {
            role: "user",
            content: "Hello, world!",
          },
        }
      );
      const body = await parseResponse<{ data: any }>(res);

      expect(res.status).toBe(201);
      expect(body.data.id).toBeDefined();
      expect(body.data.role).toBe("user");
      expect(body.data.content).toBe("Hello, world!");
      expect(body.data.conversationId).toBe(created.id);
    });

    test("adds assistant message with model", async () => {
      const createRes = await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: { childId: testChild!.id },
      });
      const { data: created } = await parseResponse<{ data: any }>(createRes);

      const res = await jsonRequest(
        `/api/v1/conversations/${created.id}/messages`,
        {
          method: "POST",
          userId: testUserId,
          body: {
            role: "assistant",
            content: "Hello! How can I help?",
            model: "claude-3-opus-20240229",
          },
        }
      );
      const body = await parseResponse<{ data: any }>(res);

      expect(res.status).toBe(201);
      expect(body.data.role).toBe("assistant");
      expect(body.data.model).toBe("claude-3-opus-20240229");
    });

    test("adds message with tool calls", async () => {
      const createRes = await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: { childId: testChild!.id },
      });
      const { data: created } = await parseResponse<{ data: any }>(createRes);

      const toolCalls = [
        { id: "call_123", name: "get_weather", arguments: { city: "Seattle" } },
      ];

      const res = await jsonRequest(
        `/api/v1/conversations/${created.id}/messages`,
        {
          method: "POST",
          userId: testUserId,
          body: {
            role: "assistant",
            content: "Let me check the weather.",
            toolCalls,
          },
        }
      );
      const body = await parseResponse<{ data: any }>(res);

      expect(res.status).toBe(201);
      expect(body.data.toolCalls).toEqual(toolCalls);
    });

    test("adds message with tool results", async () => {
      const createRes = await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: { childId: testChild!.id },
      });
      const { data: created } = await parseResponse<{ data: any }>(createRes);

      const toolResults = [
        { toolCallId: "call_123", content: { temperature: 72 } },
      ];

      const res = await jsonRequest(
        `/api/v1/conversations/${created.id}/messages`,
        {
          method: "POST",
          userId: testUserId,
          body: {
            role: "tool",
            content: "",
            toolResults,
          },
        }
      );
      const body = await parseResponse<{ data: any }>(res);

      expect(res.status).toBe(201);
      expect(body.data.toolResults).toEqual(toolResults);
    });

    test("adds message with token usage", async () => {
      const createRes = await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: { childId: testChild!.id },
      });
      const { data: created } = await parseResponse<{ data: any }>(createRes);

      const tokenUsage = {
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
      };

      const res = await jsonRequest(
        `/api/v1/conversations/${created.id}/messages`,
        {
          method: "POST",
          userId: testUserId,
          body: {
            role: "assistant",
            content: "Response",
            tokenUsage,
          },
        }
      );
      const body = await parseResponse<{ data: any }>(res);

      expect(res.status).toBe(201);
      expect(body.data.tokenUsage).toEqual(tokenUsage);
    });

    test("increments conversation message count", async () => {
      const createRes = await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: { childId: testChild!.id },
      });
      const { data: created } = await parseResponse<{ data: any }>(createRes);

      // Add 3 messages
      for (let i = 0; i < 3; i++) {
        await jsonRequest(`/api/v1/conversations/${created.id}/messages`, {
          method: "POST",
          userId: testUserId,
          body: { role: "user", content: `Message ${i}` },
        });
      }

      // Check message count
      const getRes = await jsonRequest(`/api/v1/conversations/${created.id}`, {
        userId: testUserId,
      });
      const body = await parseResponse<{ data: any }>(getRes);

      expect(body.data.messageCount).toBe(3);
    });

    test("returns 400 for missing role", async () => {
      const createRes = await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: { childId: testChild!.id },
      });
      const { data: created } = await parseResponse<{ data: any }>(createRes);

      const res = await jsonRequest(
        `/api/v1/conversations/${created.id}/messages`,
        {
          method: "POST",
          userId: testUserId,
          body: { content: "Hello" },
        }
      );

      expect(res.status).toBe(400);
    });

    test("returns 400 for invalid role", async () => {
      const createRes = await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: { childId: testChild!.id },
      });
      const { data: created } = await parseResponse<{ data: any }>(createRes);

      const res = await jsonRequest(
        `/api/v1/conversations/${created.id}/messages`,
        {
          method: "POST",
          userId: testUserId,
          body: { role: "admin", content: "Hello" },
        }
      );

      expect(res.status).toBe(400);
    });

    test("returns 403 for other user's conversation", async () => {
      const createRes = await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: { childId: testChild!.id },
      });
      const { data: created } = await parseResponse<{ data: any }>(createRes);

      const res = await jsonRequest(
        `/api/v1/conversations/${created.id}/messages`,
        {
          method: "POST",
          userId: otherUserId,
          body: { role: "user", content: "Hacked" },
        }
      );

      expect(res.status).toBe(403);
    });

    test("returns 404 for non-existent conversation", async () => {
      const res = await jsonRequest(
        "/api/v1/conversations/a0000000-0000-4000-8000-000000000000/messages",
        {
          method: "POST",
          userId: testUserId,
          body: { role: "user", content: "Hello" },
        }
      );

      expect(res.status).toBe(404);
    });
  });

  // ===========================================================================
  // FULL LIFECYCLE TEST
  // ===========================================================================

  describe("Full Conversation Lifecycle", () => {
    test("complete create-message-update-delete cycle", async () => {
      // 1. Create conversation
      const createRes = await jsonRequest("/api/v1/conversations", {
        method: "POST",
        userId: testUserId,
        body: {
          childId: testChild!.id,
          title: "Test Conversation",
        },
      });
      expect(createRes.status).toBe(201);
      const { data: conversation } = await parseResponse<{ data: any }>(createRes);

      // 2. Add user message
      const msg1Res = await jsonRequest(
        `/api/v1/conversations/${conversation.id}/messages`,
        {
          method: "POST",
          userId: testUserId,
          body: { role: "user", content: "What's the weather?" },
        }
      );
      expect(msg1Res.status).toBe(201);

      // 3. Add assistant message with tool call
      const msg2Res = await jsonRequest(
        `/api/v1/conversations/${conversation.id}/messages`,
        {
          method: "POST",
          userId: testUserId,
          body: {
            role: "assistant",
            content: "Let me check that for you.",
            model: "claude-3-opus",
            toolCalls: [
              { id: "tc_1", name: "get_weather", arguments: { city: "NYC" } },
            ],
          },
        }
      );
      expect(msg2Res.status).toBe(201);

      // 4. Add tool result
      const msg3Res = await jsonRequest(
        `/api/v1/conversations/${conversation.id}/messages`,
        {
          method: "POST",
          userId: testUserId,
          body: {
            role: "tool",
            content: "",
            toolResults: [
              { toolCallId: "tc_1", content: { temp: 72, conditions: "sunny" } },
            ],
          },
        }
      );
      expect(msg3Res.status).toBe(201);

      // 5. Add final assistant response
      const msg4Res = await jsonRequest(
        `/api/v1/conversations/${conversation.id}/messages`,
        {
          method: "POST",
          userId: testUserId,
          body: {
            role: "assistant",
            content: "It's 72°F and sunny in NYC!",
            model: "claude-3-opus",
            tokenUsage: { promptTokens: 150, completionTokens: 20, totalTokens: 170 },
          },
        }
      );
      expect(msg4Res.status).toBe(201);

      // 6. Verify conversation state
      const getRes = await jsonRequest(`/api/v1/conversations/${conversation.id}`, {
        userId: testUserId,
      });
      const { data: fetched } = await parseResponse<{ data: any }>(getRes);

      expect(fetched.messages).toHaveLength(4);
      expect(fetched.messageCount).toBe(4);

      // 7. Update conversation title
      const updateRes = await jsonRequest(
        `/api/v1/conversations/${conversation.id}`,
        {
          method: "PATCH",
          userId: testUserId,
          body: { title: "Weather Chat" },
        }
      );
      expect(updateRes.status).toBe(200);

      // 8. Verify in list
      const listRes = await jsonRequest("/api/v1/conversations", {
        userId: testUserId,
      });
      const { data: list } = await parseResponse<{ data: any[] }>(listRes);

      expect(list).toHaveLength(1);
      expect(list[0].title).toBe("Weather Chat");
      expect(list[0].messageCount).toBe(4);

      // 9. Delete conversation
      const deleteRes = await jsonRequest(
        `/api/v1/conversations/${conversation.id}`,
        {
          method: "DELETE",
          userId: testUserId,
        }
      );
      expect(deleteRes.status).toBe(200);

      // 10. Verify deleted
      const finalListRes = await jsonRequest("/api/v1/conversations", {
        userId: testUserId,
      });
      const { data: finalList } = await parseResponse<{ data: any[] }>(finalListRes);

      expect(finalList).toHaveLength(0);
    });
  });
});
