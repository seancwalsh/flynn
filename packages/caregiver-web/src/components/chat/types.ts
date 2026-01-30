/**
 * Chat Types for Frontend Components
 *
 * These types mirror the backend types but are optimized for UI state management.
 */

export type MessageRole = "user" | "assistant" | "system" | "tool";

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  content: unknown;
  isError?: boolean;
}

export interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface Message {
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
  /** Client-side only: indicates the message is being streamed */
  isStreaming?: boolean;
  /** Client-side only: indicates this is an optimistic update */
  isPending?: boolean;
}

export interface Conversation {
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

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * SSE Event types for streaming responses
 */
export type SSEEventType =
  | "message_start"
  | "content_delta"
  | "tool_call_start"
  | "tool_call_delta"
  | "tool_result"
  | "message_end"
  | "error";

export interface SSEEvent {
  type: SSEEventType;
  data: unknown;
}

export interface MessageStartEvent {
  type: "message_start";
  data: {
    messageId: string;
    role: MessageRole;
  };
}

export interface ContentDeltaEvent {
  type: "content_delta";
  data: {
    delta: string;
  };
}

export interface ToolCallStartEvent {
  type: "tool_call_start";
  data: {
    toolCallId: string;
    name: string;
  };
}

export interface ToolCallDeltaEvent {
  type: "tool_call_delta";
  data: {
    toolCallId: string;
    argumentsDelta: string;
  };
}

export interface ToolResultEvent {
  type: "tool_result";
  data: {
    toolCallId: string;
    result: unknown;
    isError?: boolean;
  };
}

export interface MessageEndEvent {
  type: "message_end";
  data: {
    messageId: string;
    tokenUsage?: TokenUsage;
  };
}

export interface ErrorEvent {
  type: "error";
  data: {
    message: string;
    code?: string;
  };
}

/**
 * Chat state for the useChat hook
 */
export interface ChatState {
  conversations: Conversation[];
  currentConversation: ConversationWithMessages | null;
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  activeToolCalls: Map<string, { name: string; status: "pending" | "complete" }>;
}

/**
 * Actions for the chat reducer
 */
export type ChatAction =
  | { type: "SET_CONVERSATIONS"; payload: Conversation[] }
  | { type: "SET_CURRENT_CONVERSATION"; payload: ConversationWithMessages | null }
  | { type: "ADD_CONVERSATION"; payload: Conversation }
  | { type: "UPDATE_CONVERSATION"; payload: Partial<Conversation> & { id: string } }
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "UPDATE_MESSAGE"; payload: Partial<Message> & { id: string } }
  | { type: "APPEND_CONTENT"; payload: { messageId: string; content: string } }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_STREAMING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_TOOL_CALL_STATUS"; payload: { id: string; name: string; status: "pending" | "complete" } }
  | { type: "CLEAR_TOOL_CALLS" };
