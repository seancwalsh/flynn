/**
 * useChat Hook Tests
 *
 * Tests for error state management in the useChat hook.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { server } from "~/mocks/node";
import {
  chatErrorHandlers,
  mockConversation,
} from "~/mocks/handlers/chat";
import { useChat } from "./useChat";

describe("useChat", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    localStorage.setItem("clerkToken", "test-token");
  });

  describe("loadConversations", () => {
    it("sets conversations on success", async () => {
      const { result } = renderHook(() => useChat({ childId: "child-123" }));

      await act(async () => {
        await result.current.loadConversations();
      });

      expect(result.current.conversations).toHaveLength(1);
      expect(result.current.error).toBeNull();
    });

    it("sets error state on 401 Unauthorized", async () => {
      server.use(chatErrorHandlers.listUnauthorized);
      const { result } = renderHook(() => useChat({ childId: "child-123" }));

      await act(async () => {
        await result.current.loadConversations();
      });

      expect(result.current.error).toBe("Unauthorized");
      expect(result.current.conversations).toHaveLength(0);
    });

    it("sets error state on 500 Server Error", async () => {
      server.use(chatErrorHandlers.listServerError);
      const { result } = renderHook(() => useChat({ childId: "child-123" }));

      await act(async () => {
        await result.current.loadConversations();
      });

      expect(result.current.error).toBe("Internal server error");
      expect(result.current.conversations).toHaveLength(0);
    });

    it("sets error state on network failure", async () => {
      server.use(chatErrorHandlers.listNetworkError);
      const { result } = renderHook(() => useChat({ childId: "child-123" }));

      await act(async () => {
        await result.current.loadConversations();
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.conversations).toHaveLength(0);
    });

    it("calls onError callback on failure", async () => {
      server.use(chatErrorHandlers.listServerError);
      const onError = vi.fn();
      const { result } = renderHook(() =>
        useChat({ childId: "child-123", onError })
      );

      await act(async () => {
        await result.current.loadConversations();
      });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it("sets loading state during request", async () => {
      const { result } = renderHook(() => useChat({ childId: "child-123" }));

      expect(result.current.isLoading).toBe(false);

      let loadPromise: Promise<void>;
      act(() => {
        loadPromise = result.current.loadConversations();
      });

      // Loading state should be true during the request
      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await loadPromise;
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe("selectConversation", () => {
    it("sets current conversation on success", async () => {
      const { result } = renderHook(() => useChat({ childId: "child-123" }));

      await act(async () => {
        await result.current.selectConversation("conv-123");
      });

      expect(result.current.currentConversation).toBeDefined();
      expect(result.current.currentConversation?.id).toBe("conv-123");
      expect(result.current.error).toBeNull();
    });

    it("sets error state on 401 Unauthorized", async () => {
      server.use(chatErrorHandlers.getUnauthorized);
      const { result } = renderHook(() => useChat({ childId: "child-123" }));

      await act(async () => {
        await result.current.selectConversation("conv-123");
      });

      expect(result.current.error).toBe("Unauthorized");
      expect(result.current.currentConversation).toBeNull();
    });

    it("sets error state on 404 Not Found", async () => {
      server.use(chatErrorHandlers.getNotFound);
      const { result } = renderHook(() => useChat({ childId: "child-123" }));

      await act(async () => {
        await result.current.selectConversation("conv-123");
      });

      expect(result.current.error).toBe("Conversation not found");
      expect(result.current.currentConversation).toBeNull();
    });

    it("sets error state on 500 Server Error", async () => {
      server.use(chatErrorHandlers.getServerError);
      const { result } = renderHook(() => useChat({ childId: "child-123" }));

      await act(async () => {
        await result.current.selectConversation("conv-123");
      });

      expect(result.current.error).toBe("Internal server error");
      expect(result.current.currentConversation).toBeNull();
    });
  });

  describe("createNewConversation", () => {
    it("creates and selects new conversation on success", async () => {
      const { result } = renderHook(() => useChat({ childId: "child-123" }));

      await act(async () => {
        await result.current.createNewConversation({ childId: "child-123" });
      });

      expect(result.current.currentConversation).toBeDefined();
      expect(result.current.error).toBeNull();
    });

    it("sets error state on 500 Server Error", async () => {
      server.use(chatErrorHandlers.createConversationServerError);
      const { result } = renderHook(() => useChat({ childId: "child-123" }));

      await act(async () => {
        try {
          await result.current.createNewConversation({ childId: "child-123" });
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBe("Internal server error");
    });
  });

  describe("deleteConversation", () => {
    it("removes conversation from state on success", async () => {
      const { result } = renderHook(() => useChat({ childId: "child-123" }));

      // First load conversations
      await act(async () => {
        await result.current.loadConversations();
      });

      const initialCount = result.current.conversations.length;

      await act(async () => {
        await result.current.deleteConversation("conv-123");
      });

      expect(result.current.conversations.length).toBe(initialCount - 1);
      expect(result.current.error).toBeNull();
    });

    it("sets error state on 500 Server Error", async () => {
      server.use(chatErrorHandlers.deleteConversationServerError);
      const { result } = renderHook(() => useChat({ childId: "child-123" }));

      await act(async () => {
        await result.current.deleteConversation("conv-123");
      });

      expect(result.current.error).toBe("Internal server error");
    });
  });

  describe("sendMessage", () => {
    it("requires current conversation", async () => {
      const { result } = renderHook(() => useChat({ childId: "child-123" }));

      await act(async () => {
        await result.current.sendMessage("Hello!");
      });

      expect(result.current.error).toBe("No conversation selected");
    });

    it("adds optimistic user message on send", async () => {
      const { result } = renderHook(() => useChat({ childId: "child-123" }));

      // First select a conversation
      await act(async () => {
        await result.current.selectConversation("conv-123");
      });

      const initialMessageCount = result.current.messages.length;

      await act(async () => {
        await result.current.sendMessage("Hello!");
      });

      // Should have added user message and assistant placeholder
      expect(result.current.messages.length).toBeGreaterThan(initialMessageCount);
    });

    it("sets error state on 401 Unauthorized", async () => {
      server.use(chatErrorHandlers.sendMessageUnauthorized);
      const { result } = renderHook(() => useChat({ childId: "child-123" }));

      await act(async () => {
        await result.current.selectConversation("conv-123");
      });

      // Reset handlers for select, then set error for send
      server.use(chatErrorHandlers.sendMessageUnauthorized);

      await act(async () => {
        await result.current.sendMessage("Hello!");
      });

      expect(result.current.error).toBe("Unauthorized");
    });

    it("sets error state on network failure", async () => {
      server.use(chatErrorHandlers.sendMessageNetworkError);
      const { result } = renderHook(() => useChat({ childId: "child-123" }));

      await act(async () => {
        await result.current.selectConversation("conv-123");
      });

      server.use(chatErrorHandlers.sendMessageNetworkError);

      await act(async () => {
        await result.current.sendMessage("Hello!");
      });

      expect(result.current.error).toBeTruthy();
    });
  });

  describe("clearError", () => {
    it("clears error state", async () => {
      server.use(chatErrorHandlers.listServerError);
      const { result } = renderHook(() => useChat({ childId: "child-123" }));

      await act(async () => {
        await result.current.loadConversations();
      });

      expect(result.current.error).toBe("Internal server error");

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe("stopStreaming", () => {
    it("stops streaming and clears streaming state", async () => {
      const { result } = renderHook(() => useChat({ childId: "child-123" }));

      await act(async () => {
        await result.current.selectConversation("conv-123");
      });

      // Start a message (will set streaming)
      act(() => {
        result.current.sendMessage("Hello!");
      });

      // Stop streaming
      act(() => {
        result.current.stopStreaming();
      });

      expect(result.current.isStreaming).toBe(false);
    });
  });
});
