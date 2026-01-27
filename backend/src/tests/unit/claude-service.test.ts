/**
 * Claude Service Unit Tests
 * 
 * Tests for the Claude service with mocked Anthropic API.
 */

import { describe, test, expect, beforeEach, mock, spyOn } from "bun:test";
import Anthropic from "@anthropic-ai/sdk";
import { ClaudeService } from "../../services/claude";
import { 
  ClaudeError, 
  ClaudeAPIError, 
  ClaudeRateLimitError,
  type Message,
  type ToolDefinition,
} from "../../types/claude";

// ============================================================================
// Mock Setup
// ============================================================================

// Mock Anthropic message response
const createMockResponse = (
  content: Array<{ type: "text"; text: string } | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }>,
  stopReason: "end_turn" | "tool_use" = "end_turn"
): Anthropic.Message => ({
  id: "msg_test_123",
  type: "message",
  role: "assistant",
  model: "claude-sonnet-4-20250514",
  content,
  stop_reason: stopReason,
  stop_sequence: null,
  usage: {
    input_tokens: 100,
    output_tokens: 50,
  },
});

// Mock streaming response
class MockMessageStream {
  private events: Array<Anthropic.MessageStreamEvent>;
  private finalMsg: Anthropic.Message;

  constructor(
    content: string,
    toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }> = [],
    stopReason: "end_turn" | "tool_use" = "end_turn"
  ) {
    this.events = [];
    
    // Text content
    if (content) {
      this.events.push({
        type: "content_block_start",
        index: 0,
        content_block: { type: "text", text: "" },
      });
      
      // Split content into chunks
      for (let i = 0; i < content.length; i += 10) {
        this.events.push({
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: content.slice(i, i + 10) },
        });
      }
      
      this.events.push({
        type: "content_block_stop",
        index: 0,
      });
    }

    // Tool calls
    for (let i = 0; i < toolCalls.length; i++) {
      const tool = toolCalls[i];
      this.events.push({
        type: "content_block_start",
        index: content ? i + 1 : i,
        content_block: { type: "tool_use", id: tool.id, name: tool.name, input: {} },
      });
      
      this.events.push({
        type: "content_block_delta",
        index: content ? i + 1 : i,
        delta: { type: "input_json_delta", partial_json: JSON.stringify(tool.input) },
      });
      
      this.events.push({
        type: "content_block_stop",
        index: content ? i + 1 : i,
      });
    }

    // Build final message
    const responseContent: Anthropic.Message["content"] = [];
    if (content) {
      responseContent.push({ type: "text", text: content });
    }
    for (const tool of toolCalls) {
      responseContent.push({ type: "tool_use", id: tool.id, name: tool.name, input: tool.input });
    }

    this.finalMsg = createMockResponse(responseContent, stopReason);
  }

  async *[Symbol.asyncIterator]() {
    for (const event of this.events) {
      yield event;
    }
  }

  async finalMessage(): Promise<Anthropic.Message> {
    return this.finalMsg;
  }
}

// Create a mock Anthropic client
function createMockClient(options: {
  createResponse?: Anthropic.Message;
  streamResponse?: MockMessageStream;
  createError?: Error;
  streamError?: Error;
} = {}): Anthropic {
  const mockClient = {
    messages: {
      create: mock(async () => {
        if (options.createError) throw options.createError;
        return options.createResponse ?? createMockResponse([{ type: "text", text: "Hello!" }]);
      }),
      stream: mock(() => {
        if (options.streamError) throw options.streamError;
        return options.streamResponse ?? new MockMessageStream("Hello!");
      }),
    },
  };
  return mockClient as unknown as Anthropic;
}

// ============================================================================
// Tests
// ============================================================================

describe("ClaudeService", () => {
  describe("constructor", () => {
    test("throws error when API key is missing", () => {
      // Save and clear env
      const originalKey = process.env["ANTHROPIC_API_KEY"];
      delete process.env["ANTHROPIC_API_KEY"];

      expect(() => new ClaudeService()).toThrow(ClaudeError);
      expect(() => new ClaudeService()).toThrow("ANTHROPIC_API_KEY is required");

      // Restore env
      if (originalKey) {
        process.env["ANTHROPIC_API_KEY"] = originalKey;
      }
    });

    test("accepts API key via config", () => {
      const service = new ClaudeService({ apiKey: "test-key" });
      expect(service).toBeInstanceOf(ClaudeService);
    });
  });

  describe("withClient", () => {
    test("creates service with custom client", () => {
      const mockClient = createMockClient();
      const service = ClaudeService.withClient(mockClient);
      expect(service).toBeInstanceOf(ClaudeService);
    });

    test("applies custom config", () => {
      const mockClient = createMockClient();
      const service = ClaudeService.withClient(mockClient, {
        defaultModel: "haiku",
        defaultMaxTokens: 1000,
        defaultTemperature: 0.5,
      });
      expect(service).toBeInstanceOf(ClaudeService);
    });
  });

  describe("chat", () => {
    test("sends message and returns response", async () => {
      const mockClient = createMockClient({
        createResponse: createMockResponse([{ type: "text", text: "Hello, I am Claude!" }]),
      });
      const service = ClaudeService.withClient(mockClient);

      const response = await service.chat({
        messages: [{ role: "user", content: "Hi!" }],
      });

      expect(response.content).toHaveLength(1);
      expect(response.content[0]).toEqual({ type: "text", text: "Hello, I am Claude!" });
      expect(response.usage.inputTokens).toBe(100);
      expect(response.usage.outputTokens).toBe(50);
      expect(response.stopReason).toBe("end_turn");
    });

    test("handles tool use response", async () => {
      const mockClient = createMockClient({
        createResponse: createMockResponse([
          { type: "text", text: "Let me check that for you." },
          { type: "tool_use", id: "tool_123", name: "get_data", input: { id: "abc" } },
        ], "tool_use"),
      });
      const service = ClaudeService.withClient(mockClient);

      const response = await service.chat({
        messages: [{ role: "user", content: "Get my data" }],
        tools: [{
          name: "get_data",
          description: "Get data by ID",
          inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
        }],
      });

      expect(response.content).toHaveLength(2);
      expect(response.content[0]).toEqual({ type: "text", text: "Let me check that for you." });
      expect(response.content[1]).toEqual({
        type: "tool_use",
        id: "tool_123",
        name: "get_data",
        input: { id: "abc" },
      });
      expect(response.stopReason).toBe("tool_use");
    });

    test("applies custom options", async () => {
      const mockClient = createMockClient();
      const service = ClaudeService.withClient(mockClient);

      await service.chat({
        messages: [{ role: "user", content: "Hi!" }],
        model: "haiku",
        maxTokens: 500,
        temperature: 0.3,
        system: "You are a helpful assistant.",
      });

      expect(mockClient.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: "claude-3-5-haiku-20241022",
          max_tokens: 500,
          temperature: 0.3,
          system: "You are a helpful assistant.",
        })
      );
    });

    test("converts message content blocks", async () => {
      const mockClient = createMockClient();
      const service = ClaudeService.withClient(mockClient);

      await service.chat({
        messages: [
          { role: "user", content: "Hi!" },
          { 
            role: "assistant", 
            content: [
              { type: "text", text: "Let me check." },
              { type: "tool_use", id: "t1", name: "test", input: {} },
            ],
          },
          {
            role: "user",
            content: [
              { type: "tool_result", tool_use_id: "t1", content: "Done" },
            ],
          },
        ],
      });

      expect(mockClient.messages.create).toHaveBeenCalled();
    });
  });

  describe("streamChat", () => {
    test("yields text chunks", async () => {
      const mockClient = createMockClient({
        streamResponse: new MockMessageStream("Hello world!"),
      });
      const service = ClaudeService.withClient(mockClient);

      const chunks: string[] = [];
      const generator = service.streamChat({
        messages: [{ role: "user", content: "Hi!" }],
      });

      let result: IteratorResult<
        { type: "text"; text: string } | { type: "tool_use"; toolUse: unknown },
        unknown
      >;
      
      do {
        result = await generator.next();
        if (!result.done && result.value.type === "text") {
          chunks.push(result.value.text);
        }
      } while (!result.done);

      expect(chunks.join("")).toBe("Hello world!");
    });

    test("yields tool use events", async () => {
      const mockClient = createMockClient({
        streamResponse: new MockMessageStream("", [
          { id: "tool_1", name: "get_data", input: { key: "value" } },
        ], "tool_use"),
      });
      const service = ClaudeService.withClient(mockClient);

      const toolUses: unknown[] = [];
      const generator = service.streamChat({
        messages: [{ role: "user", content: "Get data" }],
      });

      let result: IteratorResult<
        { type: "text"; text: string } | { type: "tool_use"; toolUse: unknown },
        unknown
      >;
      
      do {
        result = await generator.next();
        if (!result.done && result.value.type === "tool_use") {
          toolUses.push(result.value.toolUse);
        }
      } while (!result.done);

      expect(toolUses).toHaveLength(1);
      expect(toolUses[0]).toEqual({
        type: "tool_use",
        id: "tool_1",
        name: "get_data",
        input: { key: "value" },
      });
    });

    test("calls callbacks", async () => {
      const mockClient = createMockClient({
        streamResponse: new MockMessageStream("Hello!"),
      });
      const service = ClaudeService.withClient(mockClient);

      const texts: string[] = [];
      let finalUsage = null;

      const generator = service.streamChat({
        messages: [{ role: "user", content: "Hi!" }],
        onText: (text) => texts.push(text),
        onUsage: (usage) => { finalUsage = usage; },
      });

      // Consume generator
      let result: IteratorResult<unknown, unknown>;
      do {
        result = await generator.next();
      } while (!result.done);

      expect(texts.length).toBeGreaterThan(0);
      expect(texts.join("")).toBe("Hello!");
      expect(finalUsage).toEqual({
        inputTokens: 100,
        outputTokens: 50,
        cacheCreationInputTokens: undefined,
        cacheReadInputTokens: undefined,
      });
    });
  });

  describe("executeToolLoop", () => {
    test("executes tool calls in a loop", async () => {
      // First response: tool call
      const firstStream = new MockMessageStream(
        "Let me get that for you.",
        [{ id: "t1", name: "get_info", input: { id: "123" } }],
        "tool_use"
      );
      
      // Second response: final answer
      const secondStream = new MockMessageStream("Here's what I found: Data for 123.");

      let callCount = 0;
      const mockClient = {
        messages: {
          stream: mock(() => {
            callCount++;
            return callCount === 1 ? firstStream : secondStream;
          }),
        },
      } as unknown as Anthropic;

      const service = ClaudeService.withClient(mockClient);

      const toolResults = new Map<string, unknown>();
      const result = await service.executeToolLoop({
        messages: [{ role: "user", content: "Get info for 123" }],
        tools: [{
          name: "get_info",
          description: "Get info by ID",
          inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
        }],
        executeToolCall: async (name, input) => {
          toolResults.set(name, input);
          return { result: { data: "Data for " + (input as { id: string }).id } };
        },
      });

      expect(toolResults.get("get_info")).toEqual({ id: "123" });
      expect(result.iterations).toBe(2);
      expect(result.messages.length).toBeGreaterThan(1);
    });

    test("respects max iterations", async () => {
      // Always return a tool call
      const mockStream = new MockMessageStream(
        "Calling tool...",
        [{ id: "t1", name: "loop", input: {} }],
        "tool_use"
      );

      const mockClient = {
        messages: {
          stream: mock(() => mockStream),
        },
      } as unknown as Anthropic;

      const service = ClaudeService.withClient(mockClient);

      await expect(
        service.executeToolLoop({
          messages: [{ role: "user", content: "Start loop" }],
          tools: [{
            name: "loop",
            description: "Loop forever",
            inputSchema: { type: "object", properties: {} },
          }],
          executeToolCall: async () => ({ result: "Again!" }),
          maxIterations: 3,
        })
      ).rejects.toThrow("Tool loop exceeded maximum iterations (3)");
    });

    test("handles tool execution errors gracefully", async () => {
      const firstStream = new MockMessageStream(
        "",
        [{ id: "t1", name: "failing_tool", input: {} }],
        "tool_use"
      );
      const secondStream = new MockMessageStream("I encountered an error with that tool.");

      let callCount = 0;
      const mockClient = {
        messages: {
          stream: mock(() => {
            callCount++;
            return callCount === 1 ? firstStream : secondStream;
          }),
        },
      } as unknown as Anthropic;

      const service = ClaudeService.withClient(mockClient);

      const result = await service.executeToolLoop({
        messages: [{ role: "user", content: "Use failing tool" }],
        tools: [{
          name: "failing_tool",
          description: "A tool that fails",
          inputSchema: { type: "object", properties: {} },
        }],
        executeToolCall: async () => {
          throw new Error("Tool execution failed!");
        },
      });

      // Should complete without throwing, error passed to Claude
      expect(result.iterations).toBe(2);
    });
  });

  describe("error handling", () => {
    // Create a proper mock Headers object
    const createMockHeaders = () => new Headers({ "retry-after": "60" });

    test("wraps rate limit errors", async () => {
      const rateLimitError = new Anthropic.RateLimitError(
        429,
        { message: "Rate limited" },
        "Rate limited",
        createMockHeaders()
      );
      
      const mockClient = createMockClient({ createError: rateLimitError });
      const service = ClaudeService.withClient(mockClient, { maxRetries: 0 });

      await expect(
        service.chat({ messages: [{ role: "user", content: "Hi" }] })
      ).rejects.toThrow(ClaudeRateLimitError);
    });

    test("wraps bad request errors", async () => {
      const badRequestError = new Anthropic.BadRequestError(
        400,
        { message: "Invalid request" },
        "Invalid request",
        createMockHeaders()
      );
      
      const mockClient = createMockClient({ createError: badRequestError });
      const service = ClaudeService.withClient(mockClient, { maxRetries: 0 });

      await expect(
        service.chat({ messages: [{ role: "user", content: "Hi" }] })
      ).rejects.toThrow(ClaudeAPIError);
    });

    test("wraps authentication errors", async () => {
      const authError = new Anthropic.AuthenticationError(
        401,
        { message: "Invalid API key" },
        "Invalid API key",
        createMockHeaders()
      );
      
      const mockClient = createMockClient({ createError: authError });
      const service = ClaudeService.withClient(mockClient, { maxRetries: 0 });

      await expect(
        service.chat({ messages: [{ role: "user", content: "Hi" }] })
      ).rejects.toThrow(ClaudeAPIError);
    });

    test("retries on server errors", async () => {
      let attempts = 0;
      const mockClient = {
        messages: {
          create: mock(async () => {
            attempts++;
            if (attempts < 3) {
              throw new Anthropic.InternalServerError(
                500,
                { message: "Server error" },
                "Server error",
                createMockHeaders()
              );
            }
            return createMockResponse([{ type: "text", text: "Success!" }]);
          }),
        },
      } as unknown as Anthropic;

      const service = ClaudeService.withClient(mockClient, { maxRetries: 3 });

      const response = await service.chat({
        messages: [{ role: "user", content: "Hi" }],
      });

      expect(attempts).toBe(3);
      expect(response.content[0]).toEqual({ type: "text", text: "Success!" });
    });

    test("does not retry on client errors", async () => {
      let attempts = 0;
      const mockClient = {
        messages: {
          create: mock(async () => {
            attempts++;
            throw new Anthropic.BadRequestError(
              400,
              { message: "Bad request" },
              "Bad request",
              createMockHeaders()
            );
          }),
        },
      } as unknown as Anthropic;

      const service = ClaudeService.withClient(mockClient, { maxRetries: 3 });

      await expect(
        service.chat({ messages: [{ role: "user", content: "Hi" }] })
      ).rejects.toThrow();

      expect(attempts).toBe(1); // No retries
    });
  });
});
