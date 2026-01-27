/**
 * Tool Executor Service
 * 
 * Infrastructure for registering and executing tools for Claude.
 * Features:
 * - Type-safe tool registration with Zod schemas
 * - Input validation
 * - Execution context (user, child, conversation)
 * - Error handling with proper tool result formatting
 * - Conversion to Anthropic tool format
 */

import { z } from "zod/v4";
import {
  type Tool,
  type ToolContext,
  type ToolResult,
  type ToolDefinition,
  type AnthropicTool,
  ToolExecutionError,
} from "../types/claude";
import { env } from "../config/env";

// ============================================================================
// Type Utilities
// ============================================================================

/**
 * Convert a Zod schema to JSON Schema for Anthropic tools
 * This is a simplified converter for common Zod types
 */
function zodToJsonSchema(schema: z.ZodSchema): {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
} {
  const jsonSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  } = {
    type: "object",
    properties: {},
    required: [],
  };

  // Get the shape - try multiple paths for Zod v4 compatibility
  const schemaAny = schema as unknown as { 
    shape?: Record<string, z.ZodType>;
    _zod?: { def?: { shape?: Record<string, z.ZodType> } };
  };
  
  const shape = schemaAny.shape ?? schemaAny._zod?.def?.shape;
  
  if (shape) {
    for (const [key, value] of Object.entries(shape)) {
      const propSchema = zodTypeToJsonSchema(value);
      jsonSchema.properties[key] = propSchema;
      
      // Check if required (not optional)
      if (!isOptional(value)) {
        jsonSchema.required?.push(key);
      }
    }
  }

  // Clean up empty required array
  if (jsonSchema.required?.length === 0) {
    delete jsonSchema.required;
  }

  return jsonSchema;
}

/**
 * Get the Zod v4 type from a schema
 */
function getZodType(schema: z.ZodType): string | undefined {
  const schemaAny = schema as unknown as {
    _zod?: { def?: { type?: string } };
  };
  return schemaAny._zod?.def?.type;
}

/**
 * Convert a single Zod type to JSON Schema
 * 
 * Note: This is a simplified converter that handles common Zod types.
 * Updated for Zod v4 internal structure.
 */
function zodTypeToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const zodType = getZodType(schema);
  
  // Zod v4 internal structure
  const schemaAny = schema as unknown as {
    _zod?: {
      def?: {
        type?: string;
        innerType?: z.ZodType;
        element?: z.ZodType;
        shape?: Record<string, z.ZodType>;
        entries?: Record<string, string>;
        value?: unknown;
        options?: z.ZodType[];
      };
      values?: Set<string>;
      bag?: {
        minimum?: number;
        maximum?: number;
      };
      minLength?: number | null;
      maxLength?: number | null;
      minValue?: number | null;
      maxValue?: number | null;
      isInt?: boolean;
      format?: string | null;
    };
    shape?: Record<string, z.ZodType>;
    description?: string;
  };

  // Handle optional wrapper
  if (zodType === "optional" && schemaAny._zod?.def?.innerType) {
    return zodTypeToJsonSchema(schemaAny._zod.def.innerType);
  }

  // Handle nullable wrapper
  if (zodType === "nullable" && schemaAny._zod?.def?.innerType) {
    const inner = zodTypeToJsonSchema(schemaAny._zod.def.innerType);
    return { ...inner, nullable: true };
  }

  // Handle default wrapper
  if (zodType === "default" && schemaAny._zod?.def?.innerType) {
    return zodTypeToJsonSchema(schemaAny._zod.def.innerType);
  }

  // String type
  if (zodType === "string") {
    const result: Record<string, unknown> = { type: "string" };
    
    // Check multiple places for min/max (Zod v4 stores in different places)
    const minLength = schemaAny._zod?.minLength ?? schemaAny._zod?.bag?.minimum;
    const maxLength = schemaAny._zod?.maxLength ?? schemaAny._zod?.bag?.maximum;
    
    if (minLength != null) {
      result["minLength"] = minLength;
    }
    if (maxLength != null) {
      result["maxLength"] = maxLength;
    }
    
    // Check format in multiple places - Zod v4 stores in _zod.format, _zod.def.format, or _zod.bag.format
    const defAny = schemaAny._zod?.def as { format?: string } | undefined;
    const format = schemaAny._zod?.format ?? defAny?.format ?? schemaAny._zod?.bag?.format;
    if (format) {
      if (format === "email") result["format"] = "email";
      else if (format === "uuid") result["format"] = "uuid";
      else if (format === "url" || format === "uri") result["format"] = "uri";
    }
    
    if (schemaAny.description) {
      result["description"] = schemaAny.description;
    }
    
    return result;
  }

  // Number type
  if (zodType === "number") {
    const result: Record<string, unknown> = { type: "number" };
    
    // Check for integer format - Zod v4 puts this in checks
    const checks = schemaAny._zod?.def?.checks as Array<{ isInt?: boolean; format?: string }> | undefined;
    const isInt = checks?.some(c => c.isInt === true || c.format === "safeint") ?? false;
    
    if (isInt || schemaAny._zod?.isInt) {
      result["type"] = "integer";
    }
    
    // Check multiple places for min/max
    const minValue = schemaAny._zod?.minValue ?? schemaAny._zod?.bag?.minimum;
    const maxValue = schemaAny._zod?.maxValue ?? schemaAny._zod?.bag?.maximum;
    
    if (minValue != null && minValue > Number.MIN_SAFE_INTEGER) {
      result["minimum"] = minValue;
    }
    if (maxValue != null && maxValue < Number.MAX_SAFE_INTEGER) {
      result["maximum"] = maxValue;
    }
    
    if (schemaAny.description) {
      result["description"] = schemaAny.description;
    }
    
    return result;
  }

  // Boolean type
  if (zodType === "boolean") {
    const result: Record<string, unknown> = { type: "boolean" };
    if (schemaAny.description) {
      result["description"] = schemaAny.description;
    }
    return result;
  }

  // Array type
  if (zodType === "array" && schemaAny._zod?.def?.element) {
    const result: Record<string, unknown> = {
      type: "array",
      items: zodTypeToJsonSchema(schemaAny._zod.def.element),
    };
    if (schemaAny.description) {
      result["description"] = schemaAny.description;
    }
    return result;
  }

  // Enum type
  if (zodType === "enum") {
    // Zod v4 stores enum values in different places
    let enumValues: string[] | undefined;
    
    if (schemaAny._zod?.values instanceof Set) {
      enumValues = Array.from(schemaAny._zod.values);
    } else if (schemaAny._zod?.def?.entries) {
      enumValues = Object.keys(schemaAny._zod.def.entries);
    }
    
    if (enumValues) {
      const result: Record<string, unknown> = {
        type: "string",
        enum: enumValues,
      };
      if (schemaAny.description) {
        result["description"] = schemaAny.description;
      }
      return result;
    }
  }

  // Literal type
  if (zodType === "literal" && schemaAny._zod?.def?.value !== undefined) {
    const value = schemaAny._zod.def.value;
    const result: Record<string, unknown> = {
      type: typeof value,
      const: value,
    };
    if (schemaAny.description) {
      result["description"] = schemaAny.description;
    }
    return result;
  }

  // Object type (nested)
  if (zodType === "object") {
    return zodToJsonSchema(schema);
  }

  // Union type (for simple string unions)
  if (zodType === "union" && schemaAny._zod?.def?.options) {
    const options = schemaAny._zod.def.options;
    
    // Check if all options are literals (common pattern for enums)
    const allLiterals = options.every((opt) => getZodType(opt) === "literal");
    
    if (allLiterals) {
      return {
        type: "string",
        enum: options.map((opt) => {
          const optAny = opt as unknown as { _zod?: { def?: { value?: unknown } } };
          return optAny._zod?.def?.value;
        }),
      };
    }
    
    // Otherwise, use anyOf
    return {
      anyOf: options.map((opt) => zodTypeToJsonSchema(opt)),
    };
  }

  // Date type (as ISO string)
  if (zodType === "date") {
    return { type: "string", format: "date-time" };
  }

  // Default fallback
  return { type: "string" };
}

/**
 * Check if a Zod type is optional
 */
function isOptional(schema: z.ZodType): boolean {
  const zodType = getZodType(schema);
  return zodType === "optional" || zodType === "default";
}

// ============================================================================
// Tool Executor Class
// ============================================================================

export class ToolExecutor {
  private tools: Map<string, Tool> = new Map();

  /**
   * Register a tool
   */
  registerTool<TInput>(tool: Tool<TInput>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool as Tool);
  }

  /**
   * Unregister a tool
   */
  unregisterTool(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Check if a tool is registered
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get a registered tool
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Execute a tool by name with input validation
   */
  async executeTool(
    name: string,
    input: unknown,
    context: ToolContext
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);
    
    if (!tool) {
      return {
        success: false,
        error: `Unknown tool: ${name}`,
      };
    }

    try {
      // Validate input against schema
      const validatedInput = tool.inputSchema.parse(input);
      
      // Execute the tool
      const result = await tool.execute(validatedInput, context);
      
      return result;
    } catch (error) {
      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        const issues = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
        return {
          success: false,
          error: `Invalid input: ${issues.join("; ")}`,
        };
      }

      // Handle execution errors
      if (error instanceof ToolExecutionError) {
        if (env.NODE_ENV !== "test") {
          console.error(`Tool execution error (${name}):`, error);
        }
        return {
          success: false,
          error: error.message,
        };
      }

      // Handle unknown errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (env.NODE_ENV !== "test") {
        console.error(`Unexpected error executing tool (${name}):`, error);
      }
      
      return {
        success: false,
        error: `Tool execution failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Get tool definitions in our internal format
   */
  getToolDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: zodToJsonSchema(tool.inputSchema),
    }));
  }

  /**
   * Get tool definitions in Anthropic format
   */
  getAnthropicTools(): AnthropicTool[] {
    return this.getToolDefinitions().map((def) => ({
      name: def.name,
      description: def.description,
      input_schema: def.inputSchema as AnthropicTool["input_schema"],
    }));
  }

  /**
   * Create an executor function for use with ClaudeService.executeToolLoop
   */
  createExecutor(context: ToolContext): (
    name: string,
    input: Record<string, unknown>
  ) => Promise<{ result: unknown; isError?: boolean }> {
    return async (name: string, input: Record<string, unknown>) => {
      const toolResult = await this.executeTool(name, input, context);
      
      if (toolResult.success) {
        return {
          result: toolResult.data ?? "Success",
          isError: false,
        };
      } else {
        return {
          result: toolResult.error ?? "Unknown error",
          isError: true,
        };
      }
    };
  }

  /**
   * Clear all registered tools
   */
  clear(): void {
    this.tools.clear();
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a simple tool definition with type inference
 */
export function createTool<TInput>(
  name: string,
  description: string,
  inputSchema: z.ZodSchema<TInput>,
  execute: (input: TInput, context: ToolContext) => Promise<ToolResult>
): Tool<TInput> {
  return {
    name,
    description,
    inputSchema,
    execute,
  };
}

/**
 * Create a tool that just returns data (no side effects)
 */
export function createReadOnlyTool<TInput, TOutput>(
  name: string,
  description: string,
  inputSchema: z.ZodSchema<TInput>,
  getData: (input: TInput, context: ToolContext) => Promise<TOutput>
): Tool<TInput> {
  return {
    name,
    description,
    inputSchema,
    execute: async (input: TInput, context: ToolContext): Promise<ToolResult> => {
      try {
        const data = await getData(input, context);
        return { success: true, data };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
      }
    },
  };
}

// ============================================================================
// Default Instance
// ============================================================================

let defaultExecutor: ToolExecutor | null = null;

/**
 * Get the default tool executor instance
 */
export function getToolExecutor(): ToolExecutor {
  if (!defaultExecutor) {
    defaultExecutor = new ToolExecutor();
  }
  return defaultExecutor;
}

/**
 * Reset the default tool executor (useful for testing)
 */
export function resetToolExecutor(): void {
  defaultExecutor = null;
}
