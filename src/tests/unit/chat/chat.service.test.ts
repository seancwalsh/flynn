/**
 * Chat Service Unit Tests
 *
 * Tests for the ChatService class with mocked database.
 * Focuses on business logic, authorization, and error handling.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { ChatService, ChatErrorCode } from "../../../services/chat";
import { AppError } from "../../../middleware/error-handler";
import {
  setupTestDatabase,
  cleanTestData,
  closeTestDb,
  teardownTestDatabase,
  getTestDb,
} from "../../setup";
import { createTestFamily, createTestChild } from "../../fixtures";

describe("ChatService", () => {
  let service: ChatService;
  let testFamily: Awaited<ReturnType<typeof createTestFamily>>;
  let testChild: Awaited<ReturnType<typeof createTestChild>>;
  const testUserId = "11111111-1111-1111-1111-111111111111";
  const otherUserId = "22222222-2222-2222-2222-222222222222";

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
    // Create service with test database
    service = new ChatService(db as any);
  });

  beforeEach(async () => {
    await cleanTestData();
    // Also clean chat tables
    const db = getTestDb();
    await db.execute(`TRUNCATE messages CASCADE`);
    await db.execute(`TRUNCATE conversations CASCADE`);
    
    // Create test data
    testFamily = await createTestFamily({ name: "Chat Test Family" });
    testChild = await createTestChild(testFamily!.id, { name: "Chat Test Child" });
  });

  afterAll(async () => {
    const db = getTestDb();
    await db.execute(`DROP TABLE IF EXISTS messages CASCADE`);
    await db.execute(`DROP TABLE IF EXISTS conversations CASCADE`);
    await teardownTestDatabase();
    await closeTestDb();
  });

  // ===========================================================================
  // CREATE CONVERSATION
  // ===========================================================================

  describe("createConversation", () => {
    test("creates conversation with minimal data", async () => {
      const conversation = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
      });

      expect(conversation.id).toBeDefined();
      expect(conversation.userId).toBe(testUserId);
      expect(conversation.childId).toBe(testChild!.id);
      expect(conversation.title).toBeNull();
      expect(conversation.messageCount).toBe(0);
      expect(conversation.deletedAt).toBeNull();
    });

    test("creates conversation with title", async () => {
      const conversation = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
        title: "My Test Conversation",
      });

      expect(conversation.title).toBe("My Test Conversation");
    });

    test("creates conversation with metadata", async () => {
      const conversation = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
        metadata: { theme: "dark", source: "mobile" },
      });

      expect(conversation.metadata).toEqual({ theme: "dark", source: "mobile" });
    });

    test("throws error for non-existent child", async () => {
      const nonExistentChildId = "a0000000-0000-4000-8000-000000000000";

      try {
        await service.createConversation({
          userId: testUserId,
          childId: nonExistentChildId,
        });
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(404);
        expect((error as AppError).code).toBe(ChatErrorCode.CHILD_NOT_FOUND);
      }
    });

    test("sets createdAt and updatedAt", async () => {
      const before = new Date();
      const conversation = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
      });
      const after = new Date();

      const createdAt = new Date(conversation.createdAt);
      const updatedAt = new Date(conversation.updatedAt);

      expect(createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(updatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  // ===========================================================================
  // GET CONVERSATION
  // ===========================================================================

  describe("getConversation", () => {
    test("returns conversation for owner", async () => {
      const created = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
        title: "Test",
      });

      const fetched = await service.getConversation(created.id, testUserId);

      expect(fetched.id).toBe(created.id);
      expect(fetched.title).toBe("Test");
    });

    test("throws 403 for non-owner", async () => {
      const created = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
      });

      try {
        await service.getConversation(created.id, otherUserId);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(403);
        expect((error as AppError).code).toBe(ChatErrorCode.UNAUTHORIZED);
      }
    });

    test("throws 404 for non-existent conversation", async () => {
      const nonExistentId = "a0000000-0000-4000-8000-000000000000";

      try {
        await service.getConversation(nonExistentId, testUserId);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(404);
        expect((error as AppError).code).toBe(ChatErrorCode.CONVERSATION_NOT_FOUND);
      }
    });

    test("excludes soft-deleted by default", async () => {
      const created = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
      });
      await service.deleteConversation(created.id, testUserId);

      try {
        await service.getConversation(created.id, testUserId);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(404);
      }
    });

    test("includes soft-deleted when requested", async () => {
      const created = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
      });
      await service.deleteConversation(created.id, testUserId);

      const fetched = await service.getConversation(created.id, testUserId, true);

      expect(fetched.id).toBe(created.id);
      expect(fetched.deletedAt).not.toBeNull();
    });
  });

  // ===========================================================================
  // GET CONVERSATION WITH MESSAGES
  // ===========================================================================

  describe("getConversationWithMessages", () => {
    test("returns conversation with empty messages array", async () => {
      const created = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
      });

      const result = await service.getConversationWithMessages(created.id, testUserId);

      expect(result.id).toBe(created.id);
      expect(result.messages).toEqual([]);
    });

    test("returns conversation with messages in chronological order", async () => {
      const created = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
      });

      await service.addMessage(
        { conversationId: created.id, role: "user", content: "First" },
        testUserId
      );
      await service.addMessage(
        { conversationId: created.id, role: "assistant", content: "Second" },
        testUserId
      );
      await service.addMessage(
        { conversationId: created.id, role: "user", content: "Third" },
        testUserId
      );

      const result = await service.getConversationWithMessages(created.id, testUserId);

      expect(result.messages).toHaveLength(3);
      expect(result.messages[0]?.content).toBe("First");
      expect(result.messages[1]?.content).toBe("Second");
      expect(result.messages[2]?.content).toBe("Third");
    });

    test("enforces authorization", async () => {
      const created = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
      });

      try {
        await service.getConversationWithMessages(created.id, otherUserId);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(403);
      }
    });
  });

  // ===========================================================================
  // LIST CONVERSATIONS
  // ===========================================================================

  describe("listConversations", () => {
    test("returns empty list when no conversations", async () => {
      const result = await service.listConversations({
        userId: testUserId,
        page: 1,
        limit: 20,
        includeDeleted: false,
      });

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.hasMore).toBe(false);
    });

    test("returns only user's conversations", async () => {
      // Create conversations for different users
      await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
        title: "User 1 Conv 1",
      });
      await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
        title: "User 1 Conv 2",
      });
      await service.createConversation({
        userId: otherUserId,
        childId: testChild!.id,
        title: "User 2 Conv",
      });

      const result = await service.listConversations({
        userId: testUserId,
        page: 1,
        limit: 20,
        includeDeleted: false,
      });

      expect(result.data).toHaveLength(2);
      expect(result.data.every((c) => c.userId === testUserId)).toBe(true);
    });

    test("filters by childId", async () => {
      const child2 = await createTestChild(testFamily!.id, { name: "Second Child" });

      await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
        title: "Child 1 Conv",
      });
      await service.createConversation({
        userId: testUserId,
        childId: child2!.id,
        title: "Child 2 Conv",
      });

      const result = await service.listConversations({
        userId: testUserId,
        childId: testChild!.id,
        page: 1,
        limit: 20,
        includeDeleted: false,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]?.title).toBe("Child 1 Conv");
    });

    test("excludes soft-deleted by default", async () => {
      const conv1 = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
      });
      await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
      });
      await service.deleteConversation(conv1.id, testUserId);

      const result = await service.listConversations({
        userId: testUserId,
        page: 1,
        limit: 20,
        includeDeleted: false,
      });

      expect(result.data).toHaveLength(1);
    });

    test("includes soft-deleted when requested", async () => {
      const conv1 = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
      });
      await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
      });
      await service.deleteConversation(conv1.id, testUserId);

      const result = await service.listConversations({
        userId: testUserId,
        page: 1,
        limit: 20,
        includeDeleted: true,
      });

      expect(result.data).toHaveLength(2);
    });

    test("paginates correctly", async () => {
      // Create 5 conversations
      for (let i = 0; i < 5; i++) {
        await service.createConversation({
          userId: testUserId,
          childId: testChild!.id,
          title: `Conv ${i}`,
        });
      }

      // Get page 1
      const page1 = await service.listConversations({
        userId: testUserId,
        page: 1,
        limit: 2,
        includeDeleted: false,
      });

      expect(page1.data).toHaveLength(2);
      expect(page1.pagination.page).toBe(1);
      expect(page1.pagination.limit).toBe(2);
      expect(page1.pagination.total).toBe(5);
      expect(page1.pagination.totalPages).toBe(3);
      expect(page1.pagination.hasMore).toBe(true);

      // Get page 2
      const page2 = await service.listConversations({
        userId: testUserId,
        page: 2,
        limit: 2,
        includeDeleted: false,
      });

      expect(page2.data).toHaveLength(2);
      expect(page2.pagination.page).toBe(2);
      expect(page2.pagination.hasMore).toBe(true);

      // Get page 3 (last page)
      const page3 = await service.listConversations({
        userId: testUserId,
        page: 3,
        limit: 2,
        includeDeleted: false,
      });

      expect(page3.data).toHaveLength(1);
      expect(page3.pagination.hasMore).toBe(false);
    });

    test("orders by updatedAt descending", async () => {
      const conv1 = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
        title: "First",
      });
      const conv2 = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
        title: "Second",
      });
      
      // Add message to conv1 to update its updatedAt
      await service.addMessage(
        { conversationId: conv1.id, role: "user", content: "Update" },
        testUserId
      );

      const result = await service.listConversations({
        userId: testUserId,
        page: 1,
        limit: 20,
        includeDeleted: false,
      });

      // conv1 should be first (most recently updated)
      expect(result.data[0]?.id).toBe(conv1.id);
      expect(result.data[1]?.id).toBe(conv2.id);
    });
  });

  // ===========================================================================
  // UPDATE CONVERSATION
  // ===========================================================================

  describe("updateConversation", () => {
    test("updates title", async () => {
      const created = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
        title: "Original",
      });

      const updated = await service.updateConversation(created.id, testUserId, {
        title: "Updated Title",
      });

      expect(updated.title).toBe("Updated Title");
    });

    test("updates metadata", async () => {
      const created = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
      });

      const updated = await service.updateConversation(created.id, testUserId, {
        metadata: { starred: true },
      });

      expect(updated.metadata).toEqual({ starred: true });
    });

    test("updates updatedAt timestamp", async () => {
      const created = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
      });

      const originalUpdatedAt = new Date(created.updatedAt);

      // Small delay to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await service.updateConversation(created.id, testUserId, {
        title: "New",
      });

      const newUpdatedAt = new Date(updated.updatedAt);
      expect(newUpdatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    test("throws 403 for non-owner", async () => {
      const created = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
      });

      try {
        await service.updateConversation(created.id, otherUserId, { title: "Hacked" });
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(403);
      }
    });

    test("throws 404 for non-existent conversation", async () => {
      const nonExistentId = "a0000000-0000-4000-8000-000000000000";

      try {
        await service.updateConversation(nonExistentId, testUserId, { title: "Test" });
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(404);
      }
    });
  });

  // ===========================================================================
  // DELETE CONVERSATION
  // ===========================================================================

  describe("deleteConversation", () => {
    test("soft deletes conversation", async () => {
      const created = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
      });

      await service.deleteConversation(created.id, testUserId);

      // Should not be found with default query
      try {
        await service.getConversation(created.id, testUserId);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(404);
      }

      // Should be found when including deleted
      const deleted = await service.getConversation(created.id, testUserId, true);
      expect(deleted.deletedAt).not.toBeNull();
    });

    test("throws 403 for non-owner", async () => {
      const created = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
      });

      try {
        await service.deleteConversation(created.id, otherUserId);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(403);
      }
    });

    test("throws 404 for non-existent conversation", async () => {
      const nonExistentId = "a0000000-0000-4000-8000-000000000000";

      try {
        await service.deleteConversation(nonExistentId, testUserId);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(404);
      }
    });
  });

  // ===========================================================================
  // ADD MESSAGE
  // ===========================================================================

  describe("addMessage", () => {
    test("adds user message", async () => {
      const conversation = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
      });

      const message = await service.addMessage(
        {
          conversationId: conversation.id,
          role: "user",
          content: "Hello, world!",
        },
        testUserId
      );

      expect(message.id).toBeDefined();
      expect(message.conversationId).toBe(conversation.id);
      expect(message.role).toBe("user");
      expect(message.content).toBe("Hello, world!");
    });

    test("adds assistant message with model", async () => {
      const conversation = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
      });

      const message = await service.addMessage(
        {
          conversationId: conversation.id,
          role: "assistant",
          content: "Hi there!",
          model: "claude-3-opus-20240229",
        },
        testUserId
      );

      expect(message.role).toBe("assistant");
      expect(message.model).toBe("claude-3-opus-20240229");
    });

    test("adds message with tool calls", async () => {
      const conversation = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
      });

      const toolCalls = [
        { id: "call_123", name: "get_weather", arguments: { city: "Seattle" } },
      ];

      const message = await service.addMessage(
        {
          conversationId: conversation.id,
          role: "assistant",
          content: "Let me check the weather.",
          toolCalls,
        },
        testUserId
      );

      expect(message.toolCalls).toEqual(toolCalls);
    });

    test("adds message with tool results", async () => {
      const conversation = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
      });

      const toolResults = [{ toolCallId: "call_123", content: { temp: 72 } }];

      const message = await service.addMessage(
        {
          conversationId: conversation.id,
          role: "tool",
          content: "",
          toolResults,
        },
        testUserId
      );

      expect(message.toolResults).toEqual(toolResults);
    });

    test("adds message with token usage", async () => {
      const conversation = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
      });

      const tokenUsage = { promptTokens: 100, completionTokens: 50, totalTokens: 150 };

      const message = await service.addMessage(
        {
          conversationId: conversation.id,
          role: "assistant",
          content: "Response",
          tokenUsage,
        },
        testUserId
      );

      expect(message.tokenUsage).toEqual(tokenUsage);
    });

    test("increments conversation message count", async () => {
      const conversation = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
      });

      expect(conversation.messageCount).toBe(0);

      await service.addMessage(
        { conversationId: conversation.id, role: "user", content: "1" },
        testUserId
      );
      await service.addMessage(
        { conversationId: conversation.id, role: "assistant", content: "2" },
        testUserId
      );

      const updated = await service.getConversation(conversation.id, testUserId);
      expect(updated.messageCount).toBe(2);
    });

    test("updates conversation updatedAt", async () => {
      const conversation = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
      });

      const originalUpdatedAt = new Date(conversation.updatedAt);

      await new Promise((resolve) => setTimeout(resolve, 10));

      await service.addMessage(
        { conversationId: conversation.id, role: "user", content: "Test" },
        testUserId
      );

      const updated = await service.getConversation(conversation.id, testUserId);
      const newUpdatedAt = new Date(updated.updatedAt);

      expect(newUpdatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });

    test("throws 403 for non-owner", async () => {
      const conversation = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
      });

      try {
        await service.addMessage(
          { conversationId: conversation.id, role: "user", content: "Hacked" },
          otherUserId
        );
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(403);
      }
    });

    test("throws 404 for non-existent conversation", async () => {
      const nonExistentId = "a0000000-0000-4000-8000-000000000000";

      try {
        await service.addMessage(
          { conversationId: nonExistentId, role: "user", content: "Test" },
          testUserId
        );
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(404);
      }
    });
  });

  // ===========================================================================
  // GET MESSAGES
  // ===========================================================================

  describe("getMessages", () => {
    test("returns messages in chronological order", async () => {
      const conversation = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
      });

      await service.addMessage(
        { conversationId: conversation.id, role: "user", content: "First" },
        testUserId
      );
      await service.addMessage(
        { conversationId: conversation.id, role: "assistant", content: "Second" },
        testUserId
      );

      const messages = await service.getMessages(conversation.id, testUserId);

      expect(messages).toHaveLength(2);
      expect(messages[0]?.content).toBe("First");
      expect(messages[1]?.content).toBe("Second");
    });

    test("respects limit parameter", async () => {
      const conversation = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
      });

      for (let i = 0; i < 10; i++) {
        await service.addMessage(
          { conversationId: conversation.id, role: "user", content: `Message ${i}` },
          testUserId
        );
      }

      const messages = await service.getMessages(conversation.id, testUserId, 5);

      expect(messages).toHaveLength(5);
    });

    test("throws 403 for non-owner", async () => {
      const conversation = await service.createConversation({
        userId: testUserId,
        childId: testChild!.id,
      });

      try {
        await service.getMessages(conversation.id, otherUserId);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).statusCode).toBe(403);
      }
    });
  });
});
