/**
 * Claude AI Types
 * 
 * Full TypeScript types for Claude SDK integration including
 * chat options, streaming events, tool definitions, and token usage.
 */

import type Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod/v4";

// ============================================================================
// Model Configuration
// ============================================================================

export const MODELS = {
  haiku: "claude-3-5-haiku-20241022",
  sonnet: "claude-sonnet-4-20250514",
  opus: "claude-opus-4-20250514",
} as const;

export type ModelName = keyof typeof MODELS;
export type ModelId = (typeof MODELS)[ModelName];

// ============================================================================
// Message Types
// ============================================================================

export type MessageRole = "user" | "assistant";

export interface TextContent {
  type: "text";
  text: string;
}

export interface ToolUseContent {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultContent {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean | undefined;
}

export type ContentBlock = TextContent | ToolUseContent | ToolResultContent;

export interface Message {
  role: MessageRole;
  content: string | ContentBlock[];
}

// ============================================================================
// Chat Options
// ============================================================================

export interface ChatOptions {
  /** Messages to send to Claude */
  messages: Message[];
  /** System prompt (optional, will use default if not provided) */
  system?: string | undefined;
  /** Model to use (defaults to sonnet) */
  model?: ModelName | undefined;
  /** Maximum tokens in response */
  maxTokens?: number | undefined;
  /** Temperature (0-1) for response randomness */
  temperature?: number | undefined;
  /** Tools available for Claude to use */
  tools?: ToolDefinition[] | undefined;
  /** Stop sequences */
  stopSequences?: string[] | undefined;
}

export interface StreamChatOptions extends ChatOptions {
  /** Callback for each text chunk */
  onText?: (text: string) => void;
  /** Callback for tool use events */
  onToolUse?: (toolUse: ToolUseContent) => void;
  /** Callback for usage information */
  onUsage?: (usage: TokenUsage) => void;
}

// ============================================================================
// Chat Response Types
// ============================================================================

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens?: number | undefined;
  cacheReadInputTokens?: number | undefined;
}

export interface ChatResponse {
  content: ContentBlock[];
  stopReason: Anthropic.Message["stop_reason"];
  usage: TokenUsage;
  model: string;
}

// ============================================================================
// Tool Definitions
// ============================================================================

export interface ToolDefinition {
  /** Unique name for the tool */
  name: string;
  /** Human-readable description of what the tool does */
  description: string;
  /** JSON Schema for the tool's input parameters */
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/** Anthropic SDK tool format */
export type AnthropicTool = Anthropic.Tool;

// ============================================================================
// Tool Executor Types
// ============================================================================

export interface ToolContext {
  /** Current user ID */
  userId: string;
  /** Optional child ID being discussed */
  childId?: string | undefined;
  /** Conversation ID */
  conversationId?: string | undefined;
  /** Family ID the user belongs to */
  familyId?: string | undefined;
}

export interface ToolResult {
  /** Whether the tool execution succeeded */
  success: boolean;
  /** The result data (JSON serializable) */
  data?: unknown;
  /** Error message if execution failed */
  error?: string;
}

export interface Tool<TInput = unknown> {
  /** Unique name for the tool */
  name: string;
  /** Human-readable description */
  description: string;
  /** Zod schema for input validation */
  inputSchema: z.ZodSchema<TInput>;
  /** Execute the tool with validated input */
  execute: (input: TInput, context: ToolContext) => Promise<ToolResult>;
}

// ============================================================================
// Streaming Event Types (SSE)
// ============================================================================

export interface SSETextEvent {
  event: "text";
  data: {
    content: string;
  };
}

export interface SSEToolCallEvent {
  event: "tool_call";
  data: {
    id: string;
    name: string;
    input: Record<string, unknown>;
  };
}

export interface SSEToolResultEvent {
  event: "tool_result";
  data: {
    id: string;
    name: string;
    result: unknown;
    isError?: boolean;
  };
}

export interface SSEDoneEvent {
  event: "done";
  data: {
    usage: TokenUsage;
    stopReason: string;
  };
}

export interface SSEErrorEvent {
  event: "error";
  data: {
    message: string;
    code?: string;
    retryable?: boolean;
  };
}

export type SSEEvent =
  | SSETextEvent
  | SSEToolCallEvent
  | SSEToolResultEvent
  | SSEDoneEvent
  | SSEErrorEvent;

// ============================================================================
// Conversation Types
// ============================================================================

export type ConversationMessageRole = "user" | "assistant" | "tool_call" | "tool_result";

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: ConversationMessageRole;
  content: string | ContentBlock[];
  toolName?: string;
  toolCallId?: string;
  tokenUsage?: TokenUsage;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  userId: string;
  childId?: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Error Types
// ============================================================================

export class ClaudeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean = false,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = "ClaudeError";
  }
}

export class ClaudeRateLimitError extends ClaudeError {
  constructor(
    message: string,
    public readonly retryAfterMs?: number
  ) {
    super(message, "RATE_LIMIT", true, 429);
    this.name = "ClaudeRateLimitError";
  }
}

export class ClaudeAPIError extends ClaudeError {
  constructor(message: string, statusCode: number = 500) {
    const retryable = statusCode >= 500;
    super(message, "API_ERROR", retryable, statusCode);
    this.name = "ClaudeAPIError";
  }
}

export class ToolExecutionError extends Error {
  constructor(
    message: string,
    public readonly toolName: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = "ToolExecutionError";
  }
}
