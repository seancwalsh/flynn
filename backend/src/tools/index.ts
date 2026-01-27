/**
 * Tool Registry
 * 
 * Central registration point for all tools available to the AI assistant.
 * Tools are organized by category (read, write) for clarity.
 */

import { ToolExecutor, getToolExecutor } from "@/services/tool-executor";

// Read-only tools
import { getChildTool } from "./read/get_child";
import { listChildrenTool } from "./read/list_children";
import { listSessionsTool } from "./read/list_sessions";
import { getSessionTool } from "./read/get_session";
import { getAACUsageTool } from "./read/get_aac_usage";
import { getProgressSummaryTool } from "./read/get_progress_summary";
import { listGoalsTool } from "./read/list_goals";
import { searchVocabularyTool } from "./read/search_vocabulary";

// ============================================================================
// Tool Lists
// ============================================================================

/**
 * All read-only tools
 * These tools only retrieve data and do not modify anything
 */
export const readTools = [
  getChildTool,
  listChildrenTool,
  listSessionsTool,
  getSessionTool,
  getAACUsageTool,
  getProgressSummaryTool,
  listGoalsTool,
  searchVocabularyTool,
] as const;

/**
 * All write tools (future)
 * These tools modify data
 */
export const writeTools = [
  // TODO: Add write tools when implemented
  // - add_session_note
  // - create_goal
  // - update_goal_progress
  // - add_milestone
] as const;

/**
 * All available tools
 */
export const allTools = [
  ...readTools,
  ...writeTools,
] as const;

// ============================================================================
// Registration Functions
// ============================================================================

/**
 * Register all read-only tools with a ToolExecutor instance
 */
export function registerReadTools(executor: ToolExecutor): void {
  for (const tool of readTools) {
    if (!executor.hasTool(tool.name)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      executor.registerTool(tool as any);
    }
  }
}

/**
 * Register all write tools with a ToolExecutor instance
 */
export function registerWriteTools(_executor: ToolExecutor): void {
  // No write tools implemented yet
  // for (const tool of writeTools) {
  //   if (!executor.hasTool(tool.name)) {
  //     executor.registerTool(tool);
  //   }
  // }
}

/**
 * Register all tools with a ToolExecutor instance
 */
export function registerAllTools(executor: ToolExecutor): void {
  registerReadTools(executor);
  registerWriteTools(executor);
}

/**
 * Initialize the default tool executor with all tools
 * Call this once at application startup
 */
export function initializeTools(): ToolExecutor {
  const executor = getToolExecutor();
  registerAllTools(executor);
  return executor;
}

// ============================================================================
// Re-exports
// ============================================================================

// Export individual tools for direct access
export { getChildTool } from "./read/get_child";
export { listChildrenTool } from "./read/list_children";
export { listSessionsTool } from "./read/list_sessions";
export { getSessionTool } from "./read/get_session";
export { getAACUsageTool } from "./read/get_aac_usage";
export { getProgressSummaryTool } from "./read/get_progress_summary";
export { listGoalsTool } from "./read/list_goals";
export { searchVocabularyTool } from "./read/search_vocabulary";

// Export error types
export * from "./errors";

// Export authorization helpers
export * from "./authorization";
