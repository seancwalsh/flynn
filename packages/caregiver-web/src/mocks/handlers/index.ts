/**
 * MSW handlers index
 *
 * Re-exports all handlers for use in the MSW server.
 */

export * from "./auth";
export * from "./chat";
export * from "./insights";

import { authHandlers } from "./auth";
import { chatHandlers } from "./chat";

// Combined default handlers for all endpoints
// Note: insights handlers are exported but not included by default
// because InsightsFeed tests use direct fetch mocking
export const handlers = [...authHandlers, ...chatHandlers];
