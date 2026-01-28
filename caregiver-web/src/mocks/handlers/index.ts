/**
 * MSW handlers index
 *
 * Re-exports all handlers for use in the MSW server.
 */

export * from "./auth";
export * from "./chat";
export * from "./insights";
export * from "./dashboard";

import { authHandlers } from "./auth";
import { chatHandlers } from "./chat";
import { dashboardHandlers } from "./dashboard";

// Combined default handlers for all endpoints
export const handlers = [...authHandlers, ...chatHandlers, ...dashboardHandlers];
