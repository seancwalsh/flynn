/**
 * Tool Registry Tests
 * 
 * Tests for tool registration and initialization functions.
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { 
  ToolExecutor, 
  resetToolExecutor,
  getToolExecutor,
} from "../../../services/tool-executor";
import {
  readTools,
  registerReadTools,
  registerAllTools,
  initializeTools,
} from "../../../tools";

// ============================================================================
// Tests
// ============================================================================

describe("Tool Registry", () => {
  beforeEach(() => {
    resetToolExecutor();
  });

  describe("readTools array", () => {
    test("contains 8 read tools", () => {
      expect(readTools.length).toBe(8);
    });

    test("includes all expected tool names", () => {
      const toolNames = readTools.map(t => t.name);
      
      expect(toolNames).toContain("get_child");
      expect(toolNames).toContain("list_children");
      expect(toolNames).toContain("list_sessions");
      expect(toolNames).toContain("get_session");
      expect(toolNames).toContain("get_aac_usage");
      expect(toolNames).toContain("get_progress_summary");
      expect(toolNames).toContain("list_goals");
      expect(toolNames).toContain("search_vocabulary");
    });

    test("all tools have required properties", () => {
      for (const tool of readTools) {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("description");
        expect(tool).toHaveProperty("inputSchema");
        expect(tool).toHaveProperty("execute");
        
        expect(typeof tool.name).toBe("string");
        expect(typeof tool.description).toBe("string");
        expect(typeof tool.execute).toBe("function");
      }
    });

    test("all tools have meaningful descriptions", () => {
      for (const tool of readTools) {
        expect(tool.description.length).toBeGreaterThan(20);
      }
    });
  });

  describe("registerReadTools", () => {
    test("registers all read tools", () => {
      const executor = new ToolExecutor();
      
      registerReadTools(executor);
      
      expect(executor.getToolNames().length).toBe(8);
    });

    test("tools are executable after registration", () => {
      const executor = new ToolExecutor();
      
      registerReadTools(executor);
      
      expect(executor.hasTool("get_child")).toBe(true);
      expect(executor.hasTool("list_children")).toBe(true);
      expect(executor.hasTool("get_aac_usage")).toBe(true);
    });

    test("does not re-register existing tools", () => {
      const executor = new ToolExecutor();
      
      registerReadTools(executor);
      registerReadTools(executor); // Call again
      
      // Should still have 8 tools, not 16
      expect(executor.getToolNames().length).toBe(8);
    });
  });

  describe("registerAllTools", () => {
    test("registers read and write tools", () => {
      const executor = new ToolExecutor();
      
      registerAllTools(executor);
      
      // Currently only read tools exist
      expect(executor.getToolNames().length).toBeGreaterThanOrEqual(8);
    });
  });

  describe("initializeTools", () => {
    test("initializes default executor with all tools", () => {
      const executor = initializeTools();
      
      expect(executor).toBeInstanceOf(ToolExecutor);
      expect(executor.getToolNames().length).toBeGreaterThanOrEqual(8);
    });

    test("returns the default executor instance", () => {
      resetToolExecutor();
      
      const executor1 = initializeTools();
      const executor2 = getToolExecutor();
      
      expect(executor1).toBe(executor2);
    });
  });

  describe("tool definitions", () => {
    test("generates valid Anthropic tool definitions", () => {
      const executor = new ToolExecutor();
      registerReadTools(executor);
      
      const anthropicTools = executor.getAnthropicTools();
      
      expect(anthropicTools.length).toBe(8);
      
      for (const tool of anthropicTools) {
        expect(tool).toHaveProperty("name");
        expect(tool).toHaveProperty("description");
        expect(tool).toHaveProperty("input_schema");
        expect(tool.input_schema.type).toBe("object");
      }
    });

    test("get_child has correct schema", () => {
      const executor = new ToolExecutor();
      registerReadTools(executor);
      
      const tools = executor.getAnthropicTools();
      const getChildTool = tools.find(t => t.name === "get_child");
      
      expect(getChildTool).toBeDefined();
      expect(getChildTool?.input_schema.properties).toHaveProperty("childId");
      expect(getChildTool?.input_schema.required).toContain("childId");
    });

    test("list_children has empty required inputs", () => {
      const executor = new ToolExecutor();
      registerReadTools(executor);
      
      const tools = executor.getAnthropicTools();
      const listChildrenTool = tools.find(t => t.name === "list_children");
      
      expect(listChildrenTool).toBeDefined();
      // list_children has no required inputs
      const required = listChildrenTool?.input_schema.required;
      expect(required === undefined || required.length === 0).toBe(true);
    });

    test("list_sessions has optional filters", () => {
      const executor = new ToolExecutor();
      registerReadTools(executor);
      
      const tools = executor.getAnthropicTools();
      const listSessionsTool = tools.find(t => t.name === "list_sessions");
      
      expect(listSessionsTool).toBeDefined();
      expect(listSessionsTool?.input_schema.properties).toHaveProperty("childId");
      expect(listSessionsTool?.input_schema.properties).toHaveProperty("type");
      expect(listSessionsTool?.input_schema.properties).toHaveProperty("startDate");
      expect(listSessionsTool?.input_schema.properties).toHaveProperty("endDate");
      expect(listSessionsTool?.input_schema.properties).toHaveProperty("limit");
    });

    test("get_aac_usage has groupBy enum", () => {
      const executor = new ToolExecutor();
      registerReadTools(executor);
      
      const tools = executor.getAnthropicTools();
      const getAacUsageTool = tools.find(t => t.name === "get_aac_usage");
      
      expect(getAacUsageTool).toBeDefined();
      
      const groupByProp = getAacUsageTool?.input_schema.properties?.["groupBy"] as { 
        type?: string;
        enum?: string[];
      } | undefined;
      
      expect(groupByProp).toBeDefined();
      expect(groupByProp?.enum).toContain("day");
      expect(groupByProp?.enum).toContain("week");
      expect(groupByProp?.enum).toContain("symbol");
      expect(groupByProp?.enum).toContain("category");
    });

    test("get_progress_summary requires period", () => {
      const executor = new ToolExecutor();
      registerReadTools(executor);
      
      const tools = executor.getAnthropicTools();
      const progressTool = tools.find(t => t.name === "get_progress_summary");
      
      expect(progressTool).toBeDefined();
      expect(progressTool?.input_schema.required).toContain("childId");
      expect(progressTool?.input_schema.required).toContain("period");
    });
  });
});
