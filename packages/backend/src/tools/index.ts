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

// Write tools
import { createSessionTool } from "./write/create_session";
import { updateSessionTool } from "./write/update_session";
import { createGoalTool } from "./write/create_goal";
import { updateGoalTool } from "./write/update_goal";
import { addNoteTool } from "./write/add_note";
import { createCustomSymbolTool } from "./write/create_custom_symbol";

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
 * All write tools
 * These tools modify data - the AI should confirm with the user before calling
 */
export const writeTools = [
  createSessionTool,
  updateSessionTool,
  createGoalTool,
  updateGoalTool,
  addNoteTool,
  createCustomSymbolTool,
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
export function registerWriteTools(executor: ToolExecutor): void {
  for (const tool of writeTools) {
    if (!executor.hasTool(tool.name)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      executor.registerTool(tool as any);
    }
  }
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

// Export individual read tools for direct access
export { getChildTool } from "./read/get_child";
export { listChildrenTool } from "./read/list_children";
export { listSessionsTool } from "./read/list_sessions";
export { getSessionTool } from "./read/get_session";
export { getAACUsageTool } from "./read/get_aac_usage";
export { getProgressSummaryTool } from "./read/get_progress_summary";
export { listGoalsTool } from "./read/list_goals";
export { searchVocabularyTool } from "./read/search_vocabulary";

// Export individual write tools for direct access
export { createSessionTool } from "./write/create_session";
export { updateSessionTool } from "./write/update_session";
export { createGoalTool } from "./write/create_goal";
export { updateGoalTool } from "./write/update_goal";
export { addNoteTool } from "./write/add_note";
export { createCustomSymbolTool } from "./write/create_custom_symbol";

// Export error types
export * from "./errors";

// Export authorization helpers
export * from "./authorization";
