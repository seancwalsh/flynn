/**
 * Authentication Middleware
 * 
 * Protects routes by requiring valid JWT tokens.
 */

import type { Context, Next, MiddlewareHandler } from "hono";
import { AppError } from "./error-handler";
import { verifyAccessToken, findUserById, type TokenPayload } from "../services/auth";

// Extend Hono's context to include user info
declare module "hono" {
  interface ContextVariableMap {
    user: {
      id: string;
      email: string;
      role: string;
    };
  }
}

/**
 * Require authentication for a route
 */
export function requireAuth(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header("authorization");
    
    if (!authHeader) {
      throw new AppError("Authorization header required", 401, "UNAUTHORIZED");
    }
    
    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
      throw new AppError("Invalid authorization format. Use: Bearer <token>", 401, "INVALID_AUTH_FORMAT");
    }
    
    const token = parts[1];
    const payload = await verifyAccessToken(token);
    
    if (!payload) {
      throw new AppError("Invalid or expired token", 401, "INVALID_TOKEN");
    }
    
    // Verify user still exists (in case of deletion)
    const user = await findUserById(payload.sub);
    if (!user) {
      throw new AppError("User not found", 401, "USER_NOT_FOUND");
    }
    
    // Set user in context
    c.set("user", {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    });
    
    await next();
  };
}

/**
 * Require specific role(s) for a route
 * Must be used after requireAuth()
 */
export function requireRole(...allowedRoles: string[]): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const user = c.get("user");
    
    if (!user) {
      throw new AppError("Authentication required", 401, "UNAUTHORIZED");
    }
    
    if (!allowedRoles.includes(user.role)) {
      throw new AppError(
        `Access denied. Required role(s): ${allowedRoles.join(", ")}`,
        403,
        "FORBIDDEN"
      );
    }
    
    await next();
  };
}

/**
 * Optional authentication - sets user if token is valid, but doesn't require it
 */
export function optionalAuth(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header("authorization");
    
    if (authHeader) {
      const parts = authHeader.split(" ");
      if (parts.length === 2 && parts[0].toLowerCase() === "bearer") {
        const token = parts[1];
        const payload = await verifyAccessToken(token);
        
        if (payload) {
          c.set("user", {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
          });
        }
      }
    }
    
    await next();
  };
}
