/**
 * Chat API Client with SSE Streaming Support
 *
 * Handles all chat-related API calls including streaming message responses.
 */

import type {
  Conversation,
  ConversationWithMessages,
  Message,
  PaginationInfo,
  SSEEvent,
  MessageStartEvent,
  ContentDeltaEvent,
  ToolCallStartEvent,
  ToolResultEvent,
  MessageEndEvent,
  ErrorEvent,
} from "~/components/chat/types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

/**
 * Get auth headers for API requests
 */
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("clerkToken");
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * API error class for consistent error handling
 */
export class ChatApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "ChatApiError";
  }
}

// =============================================================================
// CONVERSATIONS API
// =============================================================================

export interface ListConversationsOptions {
  page?: number;
  limit?: number;
  childId?: string;
}

export interface ListConversationsResponse {
  data: Conversation[];
  pagination: PaginationInfo;
}

/**
 * List conversations for the current user
 */
export async function listConversations(
  options: ListConversationsOptions = {}
): Promise<ListConversationsResponse> {
  const params = new URLSearchParams();
  if (options.page) params.set("page", String(options.page));
  if (options.limit) params.set("limit", String(options.limit));
  if (options.childId) params.set("childId", options.childId);

  const response = await fetch(`${API_BASE}/conversations?${params}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new ChatApiError(error.message || "Failed to list conversations", error.code, response.status);
  }

  return response.json();
}

/**
 * Get a single conversation with messages
 */
export async function getConversation(conversationId: string): Promise<ConversationWithMessages> {
  const response = await fetch(`${API_BASE}/conversations/${conversationId}`, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new ChatApiError(error.message || "Failed to get conversation", error.code, response.status);
  }

  const result = await response.json();
  return result.data;
}

export interface CreateConversationOptions {
  childId: string;
  title?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Create a new conversation
 */
export async function createConversation(
  options: CreateConversationOptions
): Promise<Conversation> {
  const response = await fetch(`${API_BASE}/conversations`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new ChatApiError(error.message || "Failed to create conversation", error.code, response.status);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Update a conversation
 */
export async function updateConversation(
  conversationId: string,
  updates: { title?: string; metadata?: Record<string, unknown> }
): Promise<Conversation> {
  const response = await fetch(`${API_BASE}/conversations/${conversationId}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new ChatApiError(error.message || "Failed to update conversation", error.code, response.status);
  }

  const result = await response.json();
  return result.data;
}

/**
 * Delete a conversation (soft delete)
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/conversations/${conversationId}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new ChatApiError(error.message || "Failed to delete conversation", error.code, response.status);
  }
}

// =============================================================================
// MESSAGES API WITH SSE STREAMING
// =============================================================================

export interface SendMessageOptions {
  conversationId: string;
  content: string;
  onMessageStart?: (event: MessageStartEvent) => void;
  onContentDelta?: (event: ContentDeltaEvent) => void;
  onToolCallStart?: (event: ToolCallStartEvent) => void;
  onToolResult?: (event: ToolResultEvent) => void;
  onMessageEnd?: (event: MessageEndEvent) => void;
  onError?: (event: ErrorEvent) => void;
  signal?: AbortSignal;
}

/**
 * Parse SSE line into event object
 */
function parseSSELine(line: string): SSEEvent | null {
  if (!line.startsWith("data: ")) return null;

  try {
    const data = JSON.parse(line.slice(6));
    return data as SSEEvent;
  } catch {
    console.error("Failed to parse SSE data:", line);
    return null;
  }
}

/**
 * Send a message and stream the response via SSE
 *
 * This uses fetch with ReadableStream to handle Server-Sent Events.
 * The backend should respond with text/event-stream content type.
 */
export async function sendMessageStreaming(options: SendMessageOptions): Promise<Message | null> {
  const {
    conversationId,
    content,
    onMessageStart,
    onContentDelta,
    onToolCallStart,
    onToolResult,
    onMessageEnd,
    onError,
    signal,
  } = options;

  const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      Accept: "text/event-stream",
    },
    body: JSON.stringify({ role: "user", content }),
    signal,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new ChatApiError(error.message || "Failed to send message", error.code, response.status);
  }

  // Check if the response is streaming (SSE) or a regular JSON response
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("text/event-stream")) {
    // Handle SSE streaming
    return handleSSEStream(response, {
      onMessageStart,
      onContentDelta,
      onToolCallStart,
      onToolResult,
      onMessageEnd,
      onError,
    });
  } else {
    // Handle regular JSON response (non-streaming fallback)
    const result = await response.json();
    return result.data as Message;
  }
}

interface StreamHandlers {
  onMessageStart?: (event: MessageStartEvent) => void;
  onContentDelta?: (event: ContentDeltaEvent) => void;
  onToolCallStart?: (event: ToolCallStartEvent) => void;
  onToolResult?: (event: ToolResultEvent) => void;
  onMessageEnd?: (event: MessageEndEvent) => void;
  onError?: (event: ErrorEvent) => void;
}

/**
 * Handle SSE stream from response
 */
async function handleSSEStream(
  response: Response,
  handlers: StreamHandlers
): Promise<Message | null> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new ChatApiError("No response body available for streaming");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let finalMessage: Message | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete lines
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === ":" || trimmed.startsWith(":")) continue; // Skip empty lines and comments

        const event = parseSSELine(trimmed);
        if (!event) continue;

        switch (event.type) {
          case "message_start":
            handlers.onMessageStart?.(event as MessageStartEvent);
            break;
          case "content_delta":
            handlers.onContentDelta?.(event as ContentDeltaEvent);
            break;
          case "tool_call_start":
            handlers.onToolCallStart?.(event as ToolCallStartEvent);
            break;
          case "tool_result":
            handlers.onToolResult?.(event as ToolResultEvent);
            break;
          case "message_end":
            handlers.onMessageEnd?.(event as MessageEndEvent);
            // Construct final message from accumulated data
            // Note: In a real implementation, you'd track all the data to build the complete message
            break;
          case "error":
            handlers.onError?.(event as ErrorEvent);
            break;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return finalMessage;
}

/**
 * Send a message without streaming (for simpler use cases)
 */
export async function sendMessage(
  conversationId: string,
  content: string
): Promise<Message> {
  const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ role: "user", content }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new ChatApiError(error.message || "Failed to send message", error.code, response.status);
  }

  const result = await response.json();
  return result.data;
}

// =============================================================================
// EXPORT TYPES
// =============================================================================

export type { Conversation, ConversationWithMessages, Message, PaginationInfo };
