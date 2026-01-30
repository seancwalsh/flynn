/**
 * Chat API Client Tests
 *
 * Tests for ChatApiError class and chat API error handling.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { server } from "~/mocks/node";
import {
  chatErrorHandlers,
  mockConversation,
  mockMessage,
} from "~/mocks/handlers/chat";
import {
  ChatApiError,
  listConversations,
  getConversation,
  createConversation,
  sendMessage,
  deleteConversation,
} from "./chat-api";

describe("ChatApiError", () => {
  it("creates error with message only", () => {
    const error = new ChatApiError("Something went wrong");

    expect(error.message).toBe("Something went wrong");
    expect(error.name).toBe("ChatApiError");
    expect(error.code).toBeUndefined();
    expect(error.status).toBeUndefined();
  });

  it("creates error with message and code", () => {
    const error = new ChatApiError("Unauthorized", "UNAUTHORIZED");

    expect(error.message).toBe("Unauthorized");
    expect(error.code).toBe("UNAUTHORIZED");
    expect(error.status).toBeUndefined();
  });

  it("creates error with message, code, and status", () => {
    const error = new ChatApiError("Unauthorized", "UNAUTHORIZED", 401);

    expect(error.message).toBe("Unauthorized");
    expect(error.code).toBe("UNAUTHORIZED");
    expect(error.status).toBe(401);
  });

  it("is an instance of Error", () => {
    const error = new ChatApiError("Test error");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ChatApiError);
  });
});

describe("listConversations", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("returns conversations on success", async () => {
    localStorage.setItem("clerkToken", "test-token");

    const result = await listConversations();

    expect(result.data).toEqual([mockConversation]);
    expect(result.pagination).toBeDefined();
    expect(result.pagination.page).toBe(1);
  });

  it("throws ChatApiError on 401 Unauthorized", async () => {
    server.use(chatErrorHandlers.listUnauthorized);
    localStorage.setItem("clerkToken", "test-token");

    await expect(listConversations()).rejects.toThrow(ChatApiError);

    try {
      await listConversations();
    } catch (error) {
      expect(error).toBeInstanceOf(ChatApiError);
      expect((error as ChatApiError).message).toBe("Unauthorized");
      expect((error as ChatApiError).status).toBe(401);
    }
  });

  it("throws ChatApiError on 403 Forbidden", async () => {
    server.use(chatErrorHandlers.listForbidden);
    localStorage.setItem("clerkToken", "test-token");

    await expect(listConversations()).rejects.toThrow(ChatApiError);

    try {
      await listConversations();
    } catch (error) {
      expect((error as ChatApiError).message).toBe("Forbidden");
      expect((error as ChatApiError).status).toBe(403);
    }
  });

  it("throws ChatApiError on 500 Server Error", async () => {
    server.use(chatErrorHandlers.listServerError);
    localStorage.setItem("clerkToken", "test-token");

    await expect(listConversations()).rejects.toThrow(ChatApiError);

    try {
      await listConversations();
    } catch (error) {
      expect((error as ChatApiError).message).toBe("Internal server error");
      expect((error as ChatApiError).status).toBe(500);
    }
  });

  it("throws on network error", async () => {
    server.use(chatErrorHandlers.listNetworkError);
    localStorage.setItem("clerkToken", "test-token");

    await expect(listConversations()).rejects.toThrow();
  });

  it("passes pagination options", async () => {
    localStorage.setItem("clerkToken", "test-token");

    const result = await listConversations({ page: 2, limit: 10 });

    expect(result.data).toBeDefined();
  });

  it("passes childId filter", async () => {
    localStorage.setItem("clerkToken", "test-token");

    const result = await listConversations({ childId: "child-123" });

    expect(result.data).toBeDefined();
  });
});

describe("getConversation", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("returns conversation with messages on success", async () => {
    localStorage.setItem("clerkToken", "test-token");

    const result = await getConversation("conv-123");

    expect(result.id).toBe("conv-123");
    expect(result.messages).toEqual([mockMessage]);
  });

  it("throws ChatApiError on 401 Unauthorized", async () => {
    server.use(chatErrorHandlers.getUnauthorized);
    localStorage.setItem("clerkToken", "test-token");

    await expect(getConversation("conv-123")).rejects.toThrow(ChatApiError);
  });

  it("throws ChatApiError on 404 Not Found", async () => {
    server.use(chatErrorHandlers.getNotFound);
    localStorage.setItem("clerkToken", "test-token");

    try {
      await getConversation("conv-123");
    } catch (error) {
      expect((error as ChatApiError).message).toBe("Conversation not found");
      expect((error as ChatApiError).status).toBe(404);
    }
  });

  it("throws ChatApiError on 500 Server Error", async () => {
    server.use(chatErrorHandlers.getServerError);
    localStorage.setItem("clerkToken", "test-token");

    await expect(getConversation("conv-123")).rejects.toThrow(ChatApiError);
  });
});

describe("createConversation", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("creates conversation on success", async () => {
    localStorage.setItem("clerkToken", "test-token");

    const result = await createConversation({ childId: "child-123" });

    expect(result.childId).toBe("child-123");
    expect(result.id).toBeDefined();
  });

  it("creates conversation with title", async () => {
    localStorage.setItem("clerkToken", "test-token");

    const result = await createConversation({
      childId: "child-123",
      title: "My Conversation",
    });

    expect(result.title).toBe("My Conversation");
  });

  it("throws ChatApiError on 500 Server Error", async () => {
    server.use(chatErrorHandlers.createConversationServerError);
    localStorage.setItem("clerkToken", "test-token");

    await expect(
      createConversation({ childId: "child-123" })
    ).rejects.toThrow(ChatApiError);
  });
});

describe("sendMessage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("sends message on success", async () => {
    localStorage.setItem("clerkToken", "test-token");

    const result = await sendMessage("conv-123", "Hello!");

    expect(result.id).toBeDefined();
  });

  it("throws ChatApiError on 401 Unauthorized", async () => {
    server.use(chatErrorHandlers.sendMessageUnauthorized);
    localStorage.setItem("clerkToken", "test-token");

    await expect(sendMessage("conv-123", "Hello!")).rejects.toThrow(
      ChatApiError
    );

    try {
      await sendMessage("conv-123", "Hello!");
    } catch (error) {
      expect((error as ChatApiError).message).toBe("Unauthorized");
      expect((error as ChatApiError).status).toBe(401);
    }
  });

  it("throws ChatApiError on 500 Server Error", async () => {
    server.use(chatErrorHandlers.sendMessageServerError);
    localStorage.setItem("clerkToken", "test-token");

    await expect(sendMessage("conv-123", "Hello!")).rejects.toThrow(
      ChatApiError
    );
  });

  it("throws on network error", async () => {
    server.use(chatErrorHandlers.sendMessageNetworkError);
    localStorage.setItem("clerkToken", "test-token");

    await expect(sendMessage("conv-123", "Hello!")).rejects.toThrow();
  });
});

describe("deleteConversation", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("deletes conversation on success", async () => {
    localStorage.setItem("clerkToken", "test-token");

    await expect(deleteConversation("conv-123")).resolves.toBeUndefined();
  });

  it("throws ChatApiError on 500 Server Error", async () => {
    server.use(chatErrorHandlers.deleteConversationServerError);
    localStorage.setItem("clerkToken", "test-token");

    await expect(deleteConversation("conv-123")).rejects.toThrow(ChatApiError);
  });
});
