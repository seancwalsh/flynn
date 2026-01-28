/**
 * Authorization Middleware
 * 
 * Apply after requireAuth() to enforce resource-level access control.
 */

import type { Context, Next, MiddlewareHandler } from "hono";
import { AppError } from "./error-handler";
import {
  canAccessChild,
  canAccessFamily,
  canAccessConversation,
  getAccessibleChildIds,
  getUserFamilyId,
  type AuthContext,
} from "../services/authorization";

/**
 * Require access to a specific child
 * Extracts childId from route params (e.g., /children/:childId)
 */
export function requireChildAccess(paramName: string = "id"): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as AuthContext;
    if (!user) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }
    
    const childId = c.req.param(paramName);
    if (!childId) {
      throw new AppError(`Missing ${paramName} parameter`, 400, "BAD_REQUEST");
    }
    
    const hasAccess = await canAccessChild(user, childId);
    if (!hasAccess) {
      throw new AppError("You don't have access to this child", 403, "FORBIDDEN");
    }
    
    await next();
  };
}

/**
 * Require access to a specific family
 * Extracts familyId from route params (e.g., /families/:familyId)
 */
export function requireFamilyAccess(paramName: string = "id"): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as AuthContext;
    if (!user) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }
    
    const familyId = c.req.param(paramName);
    if (!familyId) {
      throw new AppError(`Missing ${paramName} parameter`, 400, "BAD_REQUEST");
    }
    
    const hasAccess = await canAccessFamily(user, familyId);
    if (!hasAccess) {
      throw new AppError("You don't have access to this family", 403, "FORBIDDEN");
    }
    
    await next();
  };
}

/**
 * Require access to a specific conversation
 */
export function requireConversationAccess(paramName: string = "conversationId"): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as AuthContext;
    if (!user) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }
    
    const conversationId = c.req.param(paramName);
    if (!conversationId) {
      throw new AppError(`Missing ${paramName} parameter`, 400, "BAD_REQUEST");
    }
    
    const hasAccess = await canAccessConversation(user, conversationId);
    if (!hasAccess) {
      throw new AppError("You don't have access to this conversation", 403, "FORBIDDEN");
    }
    
    await next();
  };
}

/**
 * Filter query to only include accessible children
 * Sets c.accessibleChildIds for use in handlers
 */
export function filterAccessibleChildren(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as AuthContext;
    if (!user) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }
    
    const childIds = await getAccessibleChildIds(user);
    c.set("accessibleChildIds", childIds);
    
    await next();
  };
}

/**
 * Set user's family ID in context (for caregivers)
 */
export function setUserFamilyContext(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as AuthContext;
    if (!user) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }
    
    const familyId = await getUserFamilyId(user);
    c.set("userFamilyId", familyId);
    
    await next();
  };
}

/**
 * Require admin role
 */
export function requireAdmin(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as AuthContext;
    if (!user) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }
    
    if (user.role !== "admin") {
      throw new AppError("Admin access required", 403, "FORBIDDEN");
    }
    
    await next();
  };
}

// Extend Hono's context types
declare module "hono" {
  interface ContextVariableMap {
    accessibleChildIds: string[];
    userFamilyId: string | null;
  }
}
