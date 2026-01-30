/**
 * Claude Service
 * 
 * A robust service for interacting with the Claude API.
 * Features:
 * - Streaming and non-streaming chat
 * - Tool use support with multi-turn execution
 * - Token tracking and usage reporting
 * - Error handling with exponential backoff retries
 * - Dependency injection for testability
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  MODELS,
  type ModelName,
  type ChatOptions,
  type StreamChatOptions,
  type ChatResponse,
  type TokenUsage,
  type Message,
  type ContentBlock,
  type ToolDefinition,
  type ToolUseContent,
  type ToolResultContent,
  type AnthropicTool,
  ClaudeError,
  ClaudeAPIError,
  ClaudeRateLimitError,
} from "../types/claude";
import { env } from "../config/env";

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_MODEL: ModelName = "sonnet";
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TEMPERATURE = 0.7;

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;

// ============================================================================
// Types
// ============================================================================

export interface ClaudeServiceConfig {
  /** Anthropic API key (defaults to env.ANTHROPIC_API_KEY) */
  apiKey?: string;
  /** Default model to use */
  defaultModel?: ModelName;
  /** Default max tokens */
  defaultMaxTokens?: number;
  /** Default temperature */
  defaultTemperature?: number;
  /** Maximum retry attempts for transient errors */
  maxRetries?: number;
}

export interface ToolLoopOptions {
  /** Messages to start the conversation */
  messages: Message[];
  /** System prompt */
  system?: string;
  /** Model to use */
  model?: ModelName;
  /** Maximum tokens per response */
  maxTokens?: number;
  /** Tools available */
  tools: ToolDefinition[];
  /** Execute a tool call and return the result */
  executeToolCall: (
    name: string,
    input: Record<string, unknown>
  ) => Promise<{ result: unknown; isError?: boolean }>;
  /** Maximum number of tool call iterations (default: 10) */
  maxIterations?: number;
  /** Callback for streaming text */
  onText?: (text: string) => void;
  /** Callback for tool calls */
  onToolCall?: (toolUse: ToolUseContent) => void;
  /** Callback for tool results */
  onToolResult?: (toolUseId: string, result: unknown, isError?: boolean) => void;
}

export interface ToolLoopResult {
  /** Final response content */
  content: ContentBlock[];
  /** All messages in the conversation (including tool calls/results) */
  messages: Message[];
  /** Total token usage across all iterations */
  totalUsage: TokenUsage;
  /** Number of tool call iterations */
  iterations: number;
}

// ============================================================================
// Service Implementation
// ============================================================================

export class ClaudeService {
  private client: Anthropic;
  private defaultModel: ModelName;
  private defaultMaxTokens: number;
  private defaultTemperature: number;
  private maxRetries: number;

  constructor(config: ClaudeServiceConfig = {}) {
    const apiKey = config.apiKey ?? env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      throw new ClaudeError(
        "ANTHROPIC_API_KEY is required",
        "MISSING_API_KEY",
        false,
        500
      );
    }

    this.client = new Anthropic({ apiKey });
    this.defaultModel = config.defaultModel ?? DEFAULT_MODEL;
    this.defaultMaxTokens = config.defaultMaxTokens ?? DEFAULT_MAX_TOKENS;
    this.defaultTemperature = config.defaultTemperature ?? DEFAULT_TEMPERATURE;
    this.maxRetries = config.maxRetries ?? MAX_RETRIES;
  }

  /**
   * Create a new service instance with a custom client (for testing)
   */
  static withClient(client: Anthropic, config: Omit<ClaudeServiceConfig, "apiKey"> = {}): ClaudeService {
    const service = Object.create(ClaudeService.prototype) as ClaudeService;
    service.client = client;
    service.defaultModel = config.defaultModel ?? DEFAULT_MODEL;
    service.defaultMaxTokens = config.defaultMaxTokens ?? DEFAULT_MAX_TOKENS;
    service.defaultTemperature = config.defaultTemperature ?? DEFAULT_TEMPERATURE;
    service.maxRetries = config.maxRetries ?? MAX_RETRIES;
    return service;
  }

  /**
   * Non-streaming chat completion
   */
  async chat(options: ChatOptions): Promise<ChatResponse> {
    const {
      messages,
      system,
      model = this.defaultModel,
      maxTokens = this.defaultMaxTokens,
      temperature = this.defaultTemperature,
      tools,
      stopSequences,
    } = options;

    const anthropicTools = tools ? this.convertTools(tools) : undefined;
    const anthropicMessages = this.convertMessages(messages);

    return this.withRetry(async () => {
      const params: Anthropic.MessageCreateParamsNonStreaming = {
        model: MODELS[model],
        max_tokens: maxTokens,
        temperature,
        messages: anthropicMessages,
      };
      
      if (system !== undefined) params.system = system;
      if (anthropicTools !== undefined) params.tools = anthropicTools;
      if (stopSequences !== undefined) params.stop_sequences = stopSequences;

      const response = await this.client.messages.create(params);

      return this.parseResponse(response);
    });
  }

  /**
   * Streaming chat completion
   * Returns an async generator that yields content blocks as they arrive
   */
  async *streamChat(options: StreamChatOptions): AsyncGenerator<
    { type: "text"; text: string } | { type: "tool_use"; toolUse: ToolUseContent },
    ChatResponse,
    unknown
  > {
    const {
      messages,
      system,
      model = this.defaultModel,
      maxTokens = this.defaultMaxTokens,
      temperature = this.defaultTemperature,
      tools,
      stopSequences,
      onText,
      onToolUse,
      onUsage,
    } = options;

    const anthropicTools = tools ? this.convertTools(tools) : undefined;
    const anthropicMessages = this.convertMessages(messages);

    const stream = await this.withRetry(async () => {
      const params: Anthropic.MessageStreamParams = {
        model: MODELS[model],
        max_tokens: maxTokens,
        temperature,
        messages: anthropicMessages,
      };
      
      if (system !== undefined) params.system = system;
      if (anthropicTools !== undefined) params.tools = anthropicTools;
      if (stopSequences !== undefined) params.stop_sequences = stopSequences;
      
      return this.client.messages.stream(params);
    });

    const contentBlocks: ContentBlock[] = [];
    let currentToolUse: ToolUseContent | null = null;
    let currentToolInput = "";

    for await (const event of stream) {
      if (event.type === "content_block_start") {
        if (event.content_block.type === "text") {
          // Text block starting
        } else if (event.content_block.type === "tool_use") {
          currentToolUse = {
            type: "tool_use",
            id: event.content_block.id,
            name: event.content_block.name,
            input: {},
          };
          currentToolInput = "";
        }
      } else if (event.type === "content_block_delta") {
        if (event.delta.type === "text_delta") {
          const text = event.delta.text;
          yield { type: "text", text };
          onText?.(text);
        } else if (event.delta.type === "input_json_delta") {
          currentToolInput += event.delta.partial_json;
        }
      } else if (event.type === "content_block_stop") {
        if (currentToolUse) {
          try {
            currentToolUse.input = JSON.parse(currentToolInput || "{}") as Record<string, unknown>;
          } catch {
            currentToolUse.input = {};
          }
          contentBlocks.push(currentToolUse);
          yield { type: "tool_use", toolUse: currentToolUse };
          onToolUse?.(currentToolUse);
          currentToolUse = null;
          currentToolInput = "";
        }
      }
    }

    // Get final message for usage
    const finalMessage = await stream.finalMessage();
    
    // Extract text content blocks
    for (const block of finalMessage.content) {
      if (block.type === "text") {
        contentBlocks.push({ type: "text", text: block.text });
      }
    }

    const usageExtended = finalMessage.usage as { 
      cache_creation_input_tokens?: number; 
      cache_read_input_tokens?: number;
    };
    
    const usage: TokenUsage = {
      inputTokens: finalMessage.usage.input_tokens,
      outputTokens: finalMessage.usage.output_tokens,
    };
    
    if (usageExtended.cache_creation_input_tokens !== undefined) {
      usage.cacheCreationInputTokens = usageExtended.cache_creation_input_tokens;
    }
    if (usageExtended.cache_read_input_tokens !== undefined) {
      usage.cacheReadInputTokens = usageExtended.cache_read_input_tokens;
    }

    onUsage?.(usage);

    return {
      content: contentBlocks,
      stopReason: finalMessage.stop_reason,
      usage,
      model: finalMessage.model,
    };
  }

  /**
   * Execute a multi-turn tool loop
   * Handles tool calls automatically until Claude finishes or max iterations reached
   */
  async executeToolLoop(options: ToolLoopOptions): Promise<ToolLoopResult> {
    const {
      messages: initialMessages,
      system,
      model = this.defaultModel,
      maxTokens = this.defaultMaxTokens,
      tools,
      executeToolCall,
      maxIterations = 10,
      onText,
      onToolCall,
      onToolResult,
    } = options;

    const conversationMessages = [...initialMessages];
    const totalUsage: TokenUsage = { inputTokens: 0, outputTokens: 0 };
    let iterations = 0;

    while (iterations < maxIterations) {
      iterations++;

      // Collect streaming response
      let fullText = "";
      const toolCalls: ToolUseContent[] = [];

      const streamOptions: StreamChatOptions = {
        messages: conversationMessages,
        model,
        maxTokens,
        tools,
        onText: (text) => {
          fullText += text;
          onText?.(text);
        },
        onToolUse: (toolUse) => {
          toolCalls.push(toolUse);
          onToolCall?.(toolUse);
        },
      };
      
      if (system !== undefined) {
        streamOptions.system = system;
      }
      
      const generator = this.streamChat(streamOptions);

      // Consume the generator
      let result: IteratorResult<
        { type: "text"; text: string } | { type: "tool_use"; toolUse: ToolUseContent },
        ChatResponse
      >;
      
      do {
        result = await generator.next();
      } while (!result.done);

      const response = result.value;

      // Accumulate usage
      totalUsage.inputTokens += response.usage.inputTokens;
      totalUsage.outputTokens += response.usage.outputTokens;
      if (response.usage.cacheCreationInputTokens) {
        totalUsage.cacheCreationInputTokens =
          (totalUsage.cacheCreationInputTokens ?? 0) + response.usage.cacheCreationInputTokens;
      }
      if (response.usage.cacheReadInputTokens) {
        totalUsage.cacheReadInputTokens =
          (totalUsage.cacheReadInputTokens ?? 0) + response.usage.cacheReadInputTokens;
      }

      // Build assistant message content
      const assistantContent: ContentBlock[] = [];
      if (fullText) {
        assistantContent.push({ type: "text", text: fullText });
      }
      assistantContent.push(...toolCalls);

      conversationMessages.push({
        role: "assistant",
        content: assistantContent,
      });

      // If no tool calls or stop reason is end_turn, we're done
      if (toolCalls.length === 0 || response.stopReason === "end_turn") {
        return {
          content: assistantContent,
          messages: conversationMessages,
          totalUsage,
          iterations,
        };
      }

      // Execute tool calls and add results
      const toolResults: ContentBlock[] = [];
      
      for (const toolUse of toolCalls) {
        try {
          const { result: toolResult, isError } = await executeToolCall(
            toolUse.name,
            toolUse.input
          );
          
          const resultContent = typeof toolResult === "string" 
            ? toolResult 
            : JSON.stringify(toolResult);

          const toolResultBlock: ToolResultContent = {
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: resultContent,
          };
          
          if (isError) {
            toolResultBlock.is_error = isError;
          }

          toolResults.push(toolResultBlock);

          onToolResult?.(toolUse.id, toolResult, isError);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: `Error: ${errorMessage}`,
            is_error: true,
          });

          onToolResult?.(toolUse.id, { error: errorMessage }, true);
        }
      }

      // Add tool results as user message
      conversationMessages.push({
        role: "user",
        content: toolResults,
      });
    }

    // Max iterations reached
    throw new ClaudeError(
      `Tool loop exceeded maximum iterations (${maxIterations})`,
      "MAX_ITERATIONS_EXCEEDED",
      false,
      500
    );
  }

  /**
   * Convert our tool definitions to Anthropic format
   */
  private convertTools(tools: ToolDefinition[]): AnthropicTool[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema as AnthropicTool["input_schema"],
    }));
  }

  /**
   * Convert our message format to Anthropic format
   */
  private convertMessages(messages: Message[]): Anthropic.MessageParam[] {
    return messages.map((msg) => {
      if (typeof msg.content === "string") {
        return {
          role: msg.role,
          content: msg.content,
        };
      }

      // Convert content blocks
      const anthropicContent: Anthropic.ContentBlockParam[] = msg.content.map((block) => {
        if (block.type === "text") {
          return { type: "text" as const, text: block.text };
        } else if (block.type === "tool_use") {
          return {
            type: "tool_use" as const,
            id: block.id,
            name: block.name,
            input: block.input,
          };
        } else if (block.type === "tool_result") {
          const result: Anthropic.ToolResultBlockParam = {
            type: "tool_result" as const,
            tool_use_id: block.tool_use_id,
            content: block.content,
          };
          if (block.is_error !== undefined) {
            result.is_error = block.is_error;
          }
          return result;
        }
        // Should never happen with proper typing
        throw new Error(`Unknown content block type: ${(block as ContentBlock).type}`);
      });

      return {
        role: msg.role,
        content: anthropicContent,
      };
    });
  }

  /**
   * Parse Anthropic response to our format
   */
  private parseResponse(response: Anthropic.Message): ChatResponse {
    const content: ContentBlock[] = response.content.map((block) => {
      if (block.type === "text") {
        return { type: "text", text: block.text };
      } else if (block.type === "tool_use") {
        return {
          type: "tool_use",
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        };
      }
      throw new Error(`Unknown content block type: ${(block as { type: string }).type}`);
    });

    const usageExtended = response.usage as { 
      cache_creation_input_tokens?: number; 
      cache_read_input_tokens?: number;
    };

    const usage: TokenUsage = {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
    
    if (usageExtended.cache_creation_input_tokens !== undefined) {
      usage.cacheCreationInputTokens = usageExtended.cache_creation_input_tokens;
    }
    if (usageExtended.cache_read_input_tokens !== undefined) {
      usage.cacheReadInputTokens = usageExtended.cache_read_input_tokens;
    }

    return {
      content,
      stopReason: response.stop_reason,
      usage,
      model: response.model,
    };
  }

  /**
   * Retry wrapper with exponential backoff
   */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | null = null;
    let delay = INITIAL_RETRY_DELAY_MS;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          throw this.wrapError(error);
        }

        // Don't retry if we've exhausted attempts
        if (attempt === this.maxRetries) {
          throw this.wrapError(error);
        }

        // Log retry attempt
        if (env.NODE_ENV !== "test") {
          console.warn(
            `Claude API error (attempt ${attempt + 1}/${this.maxRetries + 1}), retrying in ${delay}ms:`,
            lastError.message
          );
        }

        // Wait before retry
        await this.sleep(delay);
        
        // Exponential backoff with jitter
        delay = Math.min(delay * 2 + Math.random() * 1000, MAX_RETRY_DELAY_MS);
      }
    }

    // Should never reach here, but TypeScript needs this
    throw this.wrapError(lastError ?? new Error("Unknown error"));
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Anthropic.RateLimitError) {
      return true;
    }
    if (error instanceof Anthropic.InternalServerError) {
      return true;
    }
    if (error instanceof Anthropic.APIConnectionError) {
      return true;
    }
    if (error instanceof ClaudeError) {
      return error.retryable;
    }
    return false;
  }

  /**
   * Wrap unknown errors in our error types
   */
  private wrapError(error: unknown): ClaudeError {
    if (error instanceof ClaudeError) {
      return error;
    }

    if (error instanceof Anthropic.RateLimitError) {
      const retryAfter = error.headers?.get?.("retry-after");
      const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined;
      return new ClaudeRateLimitError(error.message, retryAfterMs);
    }

    if (error instanceof Anthropic.BadRequestError) {
      return new ClaudeAPIError(error.message, 400);
    }

    if (error instanceof Anthropic.AuthenticationError) {
      return new ClaudeAPIError(error.message, 401);
    }

    if (error instanceof Anthropic.PermissionDeniedError) {
      return new ClaudeAPIError(error.message, 403);
    }

    if (error instanceof Anthropic.NotFoundError) {
      return new ClaudeAPIError(error.message, 404);
    }

    if (error instanceof Anthropic.InternalServerError) {
      return new ClaudeAPIError(error.message, 500);
    }

    if (error instanceof Anthropic.APIError) {
      return new ClaudeAPIError(error.message, error.status ?? 500);
    }

    if (error instanceof Error) {
      return new ClaudeError(error.message, "UNKNOWN_ERROR", false, 500);
    }

    return new ClaudeError(String(error), "UNKNOWN_ERROR", false, 500);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ============================================================================
// Singleton Instance (for convenience)
// ============================================================================

let defaultService: ClaudeService | null = null;

/**
 * Get the default Claude service instance
 * Creates one on first call if ANTHROPIC_API_KEY is set
 */
export function getClaudeService(): ClaudeService {
  if (!defaultService) {
    defaultService = new ClaudeService();
  }
  return defaultService;
}

/**
 * Reset the default service (useful for testing)
 */
export function resetClaudeService(): void {
  defaultService = null;
}
