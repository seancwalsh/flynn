/**
 * Tool Executor Unit Tests
 * 
 * Tests for tool registration, execution, and error handling.
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { z } from "zod/v4";
import { 
  ToolExecutor, 
  createTool, 
  createReadOnlyTool,
  getToolExecutor,
  resetToolExecutor,
} from "../../services/tool-executor";
import type { ToolContext, ToolResult, Tool } from "../../types/claude";

// ============================================================================
// Test Fixtures
// ============================================================================

const testContext: ToolContext = {
  userId: "user-123",
  childId: "child-456",
  conversationId: "conv-789",
  familyId: "family-abc",
};

// Simple test tool
const echoTool: Tool<{ message: string }> = {
  name: "echo",
  description: "Echoes back the message",
  inputSchema: z.object({
    message: z.string().describe("The message to echo"),
  }),
  execute: async (input) => ({
    success: true,
    data: { echoed: input.message },
  }),
};

// Tool with complex input
const complexTool: Tool<{ 
  name: string; 
  age: number; 
  tags?: string[];
  metadata?: { key: string; value: string };
}> = {
  name: "complex",
  description: "A tool with complex inputs",
  inputSchema: z.object({
    name: z.string(),
    age: z.number().int().min(0).max(150),
    tags: z.array(z.string()).optional(),
    metadata: z.object({
      key: z.string(),
      value: z.string(),
    }).optional(),
  }),
  execute: async (input) => ({
    success: true,
    data: input,
  }),
};

// Tool that uses context
const contextTool: Tool<Record<string, never>> = {
  name: "get_context",
  description: "Returns the execution context",
  inputSchema: z.object({}),
  execute: async (_input, context) => ({
    success: true,
    data: context,
  }),
};

// Tool that fails
const failingTool: Tool<{ shouldFail: boolean }> = {
  name: "failing",
  description: "A tool that can fail",
  inputSchema: z.object({
    shouldFail: z.boolean(),
  }),
  execute: async (input) => {
    if (input.shouldFail) {
      return { success: false, error: "Tool execution failed as requested" };
    }
    return { success: true, data: "Success!" };
  },
};

// Tool that throws
const throwingTool: Tool<Record<string, never>> = {
  name: "throwing",
  description: "A tool that throws an error",
  inputSchema: z.object({}),
  execute: async () => {
    throw new Error("Unexpected error!");
  },
};

// ============================================================================
// Tests
// ============================================================================

describe("ToolExecutor", () => {
  let executor: ToolExecutor;

  beforeEach(() => {
    executor = new ToolExecutor();
    resetToolExecutor();
  });

  describe("tool registration", () => {
    test("registers a tool", () => {
      executor.registerTool(echoTool);
      expect(executor.hasTool("echo")).toBe(true);
    });

    test("retrieves a registered tool", () => {
      executor.registerTool(echoTool);
      const tool = executor.getTool("echo");
      expect(tool).toBeDefined();
      expect(tool?.name).toBe("echo");
    });

    test("throws when registering duplicate tool", () => {
      executor.registerTool(echoTool);
      expect(() => executor.registerTool(echoTool)).toThrow(
        'Tool "echo" is already registered'
      );
    });

    test("unregisters a tool", () => {
      executor.registerTool(echoTool);
      expect(executor.hasTool("echo")).toBe(true);
      
      const result = executor.unregisterTool("echo");
      expect(result).toBe(true);
      expect(executor.hasTool("echo")).toBe(false);
    });

    test("returns false when unregistering non-existent tool", () => {
      const result = executor.unregisterTool("nonexistent");
      expect(result).toBe(false);
    });

    test("lists all registered tool names", () => {
      executor.registerTool(echoTool);
      executor.registerTool(complexTool);
      executor.registerTool(contextTool);

      const names = executor.getToolNames();
      expect(names).toContain("echo");
      expect(names).toContain("complex");
      expect(names).toContain("get_context");
      expect(names).toHaveLength(3);
    });

    test("clears all tools", () => {
      executor.registerTool(echoTool);
      executor.registerTool(complexTool);
      expect(executor.getToolNames()).toHaveLength(2);

      executor.clear();
      expect(executor.getToolNames()).toHaveLength(0);
    });
  });

  describe("tool execution", () => {
    test("executes a simple tool", async () => {
      executor.registerTool(echoTool);

      const result = await executor.executeTool(
        "echo",
        { message: "Hello!" },
        testContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ echoed: "Hello!" });
    });

    test("passes context to tool", async () => {
      executor.registerTool(contextTool);

      const result = await executor.executeTool("get_context", {}, testContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testContext);
    });

    test("validates input against schema", async () => {
      executor.registerTool(complexTool);

      // Valid input
      const validResult = await executor.executeTool(
        "complex",
        { name: "Test", age: 25 },
        testContext
      );
      expect(validResult.success).toBe(true);

      // Invalid input (age out of range)
      const invalidResult = await executor.executeTool(
        "complex",
        { name: "Test", age: 200 },
        testContext
      );
      expect(invalidResult.success).toBe(false);
      expect(invalidResult.error).toContain("Invalid input");
    });

    test("handles missing required fields", async () => {
      executor.registerTool(echoTool);

      const result = await executor.executeTool("echo", {}, testContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid input");
    });

    test("returns error for unknown tool", async () => {
      const result = await executor.executeTool(
        "unknown_tool",
        {},
        testContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown tool: unknown_tool");
    });

    test("handles tool that returns failure", async () => {
      executor.registerTool(failingTool);

      const result = await executor.executeTool(
        "failing",
        { shouldFail: true },
        testContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Tool execution failed as requested");
    });

    test("handles tool that throws", async () => {
      executor.registerTool(throwingTool);

      const result = await executor.executeTool("throwing", {}, testContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Unexpected error!");
    });
  });

  describe("tool definitions", () => {
    test("generates tool definitions", () => {
      executor.registerTool(echoTool);
      executor.registerTool(complexTool);

      const defs = executor.getToolDefinitions();

      expect(defs).toHaveLength(2);
      
      const echoDef = defs.find((d) => d.name === "echo");
      expect(echoDef).toBeDefined();
      expect(echoDef?.description).toBe("Echoes back the message");
      expect(echoDef?.inputSchema.type).toBe("object");
      expect(echoDef?.inputSchema.properties).toHaveProperty("message");
    });

    test("generates Anthropic-compatible tools", () => {
      executor.registerTool(echoTool);

      const anthropicTools = executor.getAnthropicTools();

      expect(anthropicTools).toHaveLength(1);
      expect(anthropicTools[0]).toHaveProperty("name", "echo");
      expect(anthropicTools[0]).toHaveProperty("description");
      expect(anthropicTools[0]).toHaveProperty("input_schema");
      expect(anthropicTools[0].input_schema).toHaveProperty("type", "object");
    });

    test("converts complex schemas correctly", () => {
      executor.registerTool(complexTool);

      const defs = executor.getToolDefinitions();
      const complexDef = defs[0];

      expect(complexDef.inputSchema.properties).toHaveProperty("name");
      expect(complexDef.inputSchema.properties).toHaveProperty("age");
      expect(complexDef.inputSchema.properties).toHaveProperty("tags");
      expect(complexDef.inputSchema.properties).toHaveProperty("metadata");
      
      // Required fields should only include non-optional ones
      expect(complexDef.inputSchema.required).toContain("name");
      expect(complexDef.inputSchema.required).toContain("age");
      expect(complexDef.inputSchema.required).not.toContain("tags");
      expect(complexDef.inputSchema.required).not.toContain("metadata");
    });
  });

  describe("createExecutor helper", () => {
    test("creates executor function for tool loop", async () => {
      executor.registerTool(echoTool);

      const executeFn = executor.createExecutor(testContext);

      const result = await executeFn("echo", { message: "Test" });

      expect(result.result).toEqual({ echoed: "Test" });
      expect(result.isError).toBe(false);
    });

    test("handles errors in executor function", async () => {
      executor.registerTool(failingTool);

      const executeFn = executor.createExecutor(testContext);

      const result = await executeFn("failing", { shouldFail: true });

      expect(result.result).toBe("Tool execution failed as requested");
      expect(result.isError).toBe(true);
    });
  });

  describe("default instance", () => {
    test("returns singleton instance", () => {
      const instance1 = getToolExecutor();
      const instance2 = getToolExecutor();
      expect(instance1).toBe(instance2);
    });

    test("reset creates new instance", () => {
      const instance1 = getToolExecutor();
      resetToolExecutor();
      const instance2 = getToolExecutor();
      expect(instance1).not.toBe(instance2);
    });
  });
});

describe("createTool helper", () => {
  test("creates a tool with proper typing", async () => {
    const tool = createTool(
      "test_tool",
      "A test tool",
      z.object({ value: z.number() }),
      async (input) => ({
        success: true,
        data: input.value * 2,
      })
    );

    expect(tool.name).toBe("test_tool");
    expect(tool.description).toBe("A test tool");

    const executor = new ToolExecutor();
    executor.registerTool(tool);

    const result = await executor.executeTool(
      "test_tool",
      { value: 21 },
      testContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toBe(42);
  });
});

describe("createReadOnlyTool helper", () => {
  test("creates a read-only tool that wraps data fetch", async () => {
    const tool = createReadOnlyTool(
      "fetch_data",
      "Fetches some data",
      z.object({ id: z.string() }),
      async (input) => ({
        id: input.id,
        name: "Test Item",
        value: 123,
      })
    );

    const executor = new ToolExecutor();
    executor.registerTool(tool);

    const result = await executor.executeTool(
      "fetch_data",
      { id: "item-1" },
      testContext
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      id: "item-1",
      name: "Test Item",
      value: 123,
    });
  });

  test("handles errors in read-only tool", async () => {
    const tool = createReadOnlyTool(
      "failing_fetch",
      "A fetch that fails",
      z.object({}),
      async () => {
        throw new Error("Database connection failed");
      }
    );

    const executor = new ToolExecutor();
    executor.registerTool(tool);

    const result = await executor.executeTool("failing_fetch", {}, testContext);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Database connection failed");
  });
});

describe("Zod to JSON Schema conversion", () => {
  let executor: ToolExecutor;

  beforeEach(() => {
    executor = new ToolExecutor();
  });

  test("converts string types", () => {
    const tool = createTool(
      "string_test",
      "Test string types",
      z.object({
        basic: z.string(),
        email: z.email(),
        uuid: z.uuid(),
        url: z.url(),
        minMax: z.string().min(1).max(100),
      }),
      async () => ({ success: true })
    );

    executor.registerTool(tool);
    const defs = executor.getToolDefinitions();
    const schema = defs[0].inputSchema;

    expect(schema.properties["basic"]).toEqual({ type: "string" });
    expect(schema.properties["email"]).toMatchObject({ type: "string", format: "email" });
    expect(schema.properties["uuid"]).toMatchObject({ type: "string", format: "uuid" });
    expect(schema.properties["url"]).toMatchObject({ type: "string", format: "uri" });
    expect(schema.properties["minMax"]).toMatchObject({ 
      type: "string", 
      minLength: 1, 
      maxLength: 100 
    });
  });

  test("converts number types", () => {
    const tool = createTool(
      "number_test",
      "Test number types",
      z.object({
        basic: z.number(),
        integer: z.number().int(),
        ranged: z.number().min(0).max(100),
      }),
      async () => ({ success: true })
    );

    executor.registerTool(tool);
    const defs = executor.getToolDefinitions();
    const schema = defs[0].inputSchema;

    // Basic number - Zod v4 may add min/max from safeint
    expect((schema.properties["basic"] as { type: string }).type).toBe("number");
    // Integer - should have type "integer" (Zod v4 also adds minValue from safeint)
    const intSchema = schema.properties["integer"] as { type: string };
    expect(intSchema.type).toBe("integer");
    // Ranged number
    expect(schema.properties["ranged"]).toMatchObject({ 
      type: "number", 
      minimum: 0, 
      maximum: 100 
    });
  });

  test("converts boolean types", () => {
    const tool = createTool(
      "bool_test",
      "Test boolean types",
      z.object({
        flag: z.boolean(),
      }),
      async () => ({ success: true })
    );

    executor.registerTool(tool);
    const defs = executor.getToolDefinitions();
    const schema = defs[0].inputSchema;

    expect(schema.properties["flag"]).toEqual({ type: "boolean" });
  });

  test("converts array types", () => {
    const tool = createTool(
      "array_test",
      "Test array types",
      z.object({
        strings: z.array(z.string()),
        numbers: z.array(z.number()),
      }),
      async () => ({ success: true })
    );

    executor.registerTool(tool);
    const defs = executor.getToolDefinitions();
    const schema = defs[0].inputSchema;

    expect(schema.properties["strings"]).toEqual({ 
      type: "array", 
      items: { type: "string" } 
    });
    expect(schema.properties["numbers"]).toEqual({ 
      type: "array", 
      items: { type: "number" } 
    });
  });

  test("converts enum types", () => {
    const tool = createTool(
      "enum_test",
      "Test enum types",
      z.object({
        status: z.enum(["pending", "active", "completed"]),
      }),
      async () => ({ success: true })
    );

    executor.registerTool(tool);
    const defs = executor.getToolDefinitions();
    const schema = defs[0].inputSchema;

    expect(schema.properties["status"]).toEqual({ 
      type: "string", 
      enum: ["pending", "active", "completed"] 
    });
  });

  test("handles optional fields", () => {
    const tool = createTool(
      "optional_test",
      "Test optional fields",
      z.object({
        required: z.string(),
        optional: z.string().optional(),
        withDefault: z.string().default("default"),
      }),
      async () => ({ success: true })
    );

    executor.registerTool(tool);
    const defs = executor.getToolDefinitions();
    const schema = defs[0].inputSchema;

    expect(schema.required).toContain("required");
    expect(schema.required).not.toContain("optional");
    expect(schema.required).not.toContain("withDefault");
  });

  test("handles nested objects", () => {
    const tool = createTool(
      "nested_test",
      "Test nested objects",
      z.object({
        user: z.object({
          name: z.string(),
          age: z.number(),
        }),
      }),
      async () => ({ success: true })
    );

    executor.registerTool(tool);
    const defs = executor.getToolDefinitions();
    const schema = defs[0].inputSchema;

    expect(schema.properties["user"]).toMatchObject({
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
    });
  });
});
