/**
 * useChat Hook
 *
 * Manages chat state, handles API calls, and processes SSE streaming.
 * Provides a clean interface for chat components.
 */

import { useCallback, useReducer, useRef, useState } from "react";
import type {
  ChatState,
  ChatAction,
  Message,
  Conversation,
  ConversationWithMessages,
} from "./types";
import {
  listConversations,
  getConversation,
  createConversation,
  deleteConversation as deleteConversationApi,
  sendMessageStreaming,
  type ListConversationsOptions,
  type CreateConversationOptions,
} from "~/lib/chat-api";
import { generateTempId } from "~/lib/utils";

// =============================================================================
// REDUCER
// =============================================================================

const initialState: ChatState = {
  conversations: [],
  currentConversation: null,
  isLoading: false,
  isStreaming: false,
  error: null,
  activeToolCalls: new Map(),
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "SET_CONVERSATIONS":
      return { ...state, conversations: action.payload };

    case "SET_CURRENT_CONVERSATION":
      return { ...state, currentConversation: action.payload };

    case "ADD_CONVERSATION":
      return {
        ...state,
        conversations: [action.payload, ...state.conversations],
      };

    case "UPDATE_CONVERSATION": {
      const { id, ...updates } = action.payload;
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
        currentConversation:
          state.currentConversation?.id === id
            ? { ...state.currentConversation, ...updates }
            : state.currentConversation,
      };
    }

    case "ADD_MESSAGE":
      if (!state.currentConversation) return state;
      return {
        ...state,
        currentConversation: {
          ...state.currentConversation,
          messages: [...state.currentConversation.messages, action.payload],
          messageCount: state.currentConversation.messageCount + 1,
        },
      };

    case "UPDATE_MESSAGE": {
      if (!state.currentConversation) return state;
      const { id, ...updates } = action.payload;
      return {
        ...state,
        currentConversation: {
          ...state.currentConversation,
          messages: state.currentConversation.messages.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        },
      };
    }

    case "APPEND_CONTENT": {
      if (!state.currentConversation) return state;
      return {
        ...state,
        currentConversation: {
          ...state.currentConversation,
          messages: state.currentConversation.messages.map((m) =>
            m.id === action.payload.messageId
              ? { ...m, content: m.content + action.payload.content }
              : m
          ),
        },
      };
    }

    case "SET_LOADING":
      return { ...state, isLoading: action.payload };

    case "SET_STREAMING":
      return { ...state, isStreaming: action.payload };

    case "SET_ERROR":
      return { ...state, error: action.payload };

    case "SET_TOOL_CALL_STATUS": {
      const newToolCalls = new Map(state.activeToolCalls);
      newToolCalls.set(action.payload.id, {
        name: action.payload.name,
        status: action.payload.status,
      });
      return { ...state, activeToolCalls: newToolCalls };
    }

    case "CLEAR_TOOL_CALLS":
      return { ...state, activeToolCalls: new Map() };

    default:
      return state;
  }
}

// =============================================================================
// HOOK
// =============================================================================

export interface UseChatOptions {
  /** Child ID to filter conversations */
  childId?: string;
  /** Called when a new message is received */
  onMessage?: (message: Message) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
}

export interface UseChatReturn {
  // State
  conversations: Conversation[];
  currentConversation: ConversationWithMessages | null;
  messages: Message[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  activeToolCalls: Map<string, { name: string; status: "pending" | "complete" }>;

  // Actions
  loadConversations: (options?: ListConversationsOptions) => Promise<void>;
  selectConversation: (conversationId: string) => Promise<void>;
  createNewConversation: (options: CreateConversationOptions) => Promise<Conversation>;
  deleteConversation: (conversationId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  stopStreaming: () => void;
  clearError: () => void;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { childId, onMessage, onError } = options;
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  // Load conversations
  const loadConversations = useCallback(
    async (loadOptions: ListConversationsOptions = {}) => {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      try {
        const result = await listConversations({
          childId,
          ...loadOptions,
        });
        dispatch({ type: "SET_CONVERSATIONS", payload: result.data });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load conversations";
        dispatch({ type: "SET_ERROR", payload: message });
        onError?.(error instanceof Error ? error : new Error(message));
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [childId, onError]
  );

  // Select and load a conversation
  const selectConversation = useCallback(
    async (conversationId: string) => {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      try {
        const conversation = await getConversation(conversationId);
        dispatch({ type: "SET_CURRENT_CONVERSATION", payload: conversation });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load conversation";
        dispatch({ type: "SET_ERROR", payload: message });
        onError?.(error instanceof Error ? error : new Error(message));
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [onError]
  );

  // Create a new conversation
  const createNewConversation = useCallback(
    async (createOptions: CreateConversationOptions): Promise<Conversation> => {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      try {
        const conversation = await createConversation(createOptions);
        dispatch({ type: "ADD_CONVERSATION", payload: conversation });

        // Automatically select the new conversation
        const fullConversation: ConversationWithMessages = {
          ...conversation,
          messages: [],
        };
        dispatch({ type: "SET_CURRENT_CONVERSATION", payload: fullConversation });

        return conversation;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create conversation";
        dispatch({ type: "SET_ERROR", payload: message });
        onError?.(error instanceof Error ? error : new Error(message));
        throw error;
      } finally {
        dispatch({ type: "SET_LOADING", payload: false });
      }
    },
    [onError]
  );

  // Delete a conversation
  const deleteConversation = useCallback(
    async (conversationId: string) => {
      dispatch({ type: "SET_ERROR", payload: null });

      try {
        await deleteConversationApi(conversationId);

        // Remove from local state
        dispatch({
          type: "SET_CONVERSATIONS",
          payload: state.conversations.filter((c) => c.id !== conversationId),
        });

        // Clear current if it was deleted
        if (state.currentConversation?.id === conversationId) {
          dispatch({ type: "SET_CURRENT_CONVERSATION", payload: null });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to delete conversation";
        dispatch({ type: "SET_ERROR", payload: message });
        onError?.(error instanceof Error ? error : new Error(message));
      }
    },
    [state.conversations, state.currentConversation?.id, onError]
  );

  // Send a message with streaming
  const sendMessageAction = useCallback(
    async (content: string) => {
      if (!state.currentConversation) {
        dispatch({ type: "SET_ERROR", payload: "No conversation selected" });
        return;
      }

      // Cancel any existing stream
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      // Add optimistic user message
      const userMessageId = generateTempId();
      const userMessage: Message = {
        id: userMessageId,
        conversationId: state.currentConversation.id,
        role: "user",
        content,
        model: null,
        toolCalls: null,
        toolResults: null,
        tokenUsage: null,
        metadata: null,
        createdAt: new Date().toISOString(),
        isPending: true,
      };
      dispatch({ type: "ADD_MESSAGE", payload: userMessage });

      // Prepare assistant message placeholder
      const assistantMessageId = generateTempId();
      const assistantMessage: Message = {
        id: assistantMessageId,
        conversationId: state.currentConversation.id,
        role: "assistant",
        content: "",
        model: null,
        toolCalls: null,
        toolResults: null,
        tokenUsage: null,
        metadata: null,
        createdAt: new Date().toISOString(),
        isStreaming: true,
      };
      dispatch({ type: "ADD_MESSAGE", payload: assistantMessage });
      setStreamingMessageId(assistantMessageId);

      dispatch({ type: "SET_STREAMING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });
      dispatch({ type: "CLEAR_TOOL_CALLS" });

      try {
        await sendMessageStreaming({
          conversationId: state.currentConversation.id,
          content,
          signal: abortControllerRef.current.signal,

          onMessageStart: (event) => {
            // Update with real message ID from server
            dispatch({
              type: "UPDATE_MESSAGE",
              payload: { id: assistantMessageId, ...event.data },
            });
          },

          onContentDelta: (event) => {
            dispatch({
              type: "APPEND_CONTENT",
              payload: { messageId: assistantMessageId, content: event.data.delta },
            });
          },

          onToolCallStart: (event) => {
            dispatch({
              type: "SET_TOOL_CALL_STATUS",
              payload: {
                id: event.data.toolCallId,
                name: event.data.name,
                status: "pending",
              },
            });
          },

          onToolResult: (event) => {
            dispatch({
              type: "SET_TOOL_CALL_STATUS",
              payload: {
                id: event.data.toolCallId,
                name: "", // Will be preserved from existing
                status: "complete",
              },
            });
          },

          onMessageEnd: (event) => {
            dispatch({
              type: "UPDATE_MESSAGE",
              payload: {
                id: assistantMessageId,
                isStreaming: false,
                tokenUsage: event.data.tokenUsage ?? null,
              },
            });
            setStreamingMessageId(null);
          },

          onError: (event) => {
            dispatch({ type: "SET_ERROR", payload: event.data.message });
            dispatch({
              type: "UPDATE_MESSAGE",
              payload: { id: assistantMessageId, isStreaming: false },
            });
          },
        });

        // Mark user message as confirmed
        dispatch({
          type: "UPDATE_MESSAGE",
          payload: { id: userMessageId, isPending: false },
        });

        // Update conversation in list
        dispatch({
          type: "UPDATE_CONVERSATION",
          payload: {
            id: state.currentConversation.id,
            updatedAt: new Date().toISOString(),
          },
        });
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          // User cancelled, don't treat as error
          return;
        }

        const message = error instanceof Error ? error.message : "Failed to send message";
        dispatch({ type: "SET_ERROR", payload: message });
        dispatch({
          type: "UPDATE_MESSAGE",
          payload: { id: assistantMessageId, isStreaming: false, content: "" },
        });
        onError?.(error instanceof Error ? error : new Error(message));
      } finally {
        dispatch({ type: "SET_STREAMING", payload: false });
        setStreamingMessageId(null);
      }
    },
    [state.currentConversation, onMessage, onError]
  );

  // Stop streaming
  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
    dispatch({ type: "SET_STREAMING", payload: false });

    if (streamingMessageId) {
      dispatch({
        type: "UPDATE_MESSAGE",
        payload: { id: streamingMessageId, isStreaming: false },
      });
      setStreamingMessageId(null);
    }
  }, [streamingMessageId]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: "SET_ERROR", payload: null });
  }, []);

  return {
    // State
    conversations: state.conversations,
    currentConversation: state.currentConversation,
    messages: state.currentConversation?.messages ?? [],
    isLoading: state.isLoading,
    isStreaming: state.isStreaming,
    error: state.error,
    activeToolCalls: state.activeToolCalls,

    // Actions
    loadConversations,
    selectConversation,
    createNewConversation,
    deleteConversation,
    sendMessage: sendMessageAction,
    stopStreaming,
    clearError,
  };
}
