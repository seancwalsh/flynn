/**
 * Authentication Middleware (Clerk)
 * 
 * Protects routes by requiring valid Clerk JWTs.
 */

import type { Context, Next, MiddlewareHandler } from "hono";
import { createClerkClient } from "@clerk/backend";
import { AppError } from "./error-handler";
import { findUserByClerkId, findUserByEmail } from "../services/auth";
import { env } from "../config/env";

// Initialize Clerk client
const clerk = createClerkClient({
  secretKey: env.CLERK_SECRET_KEY,
  publishableKey: env.CLERK_PUBLISHABLE_KEY,
});

// Extend Hono's context to include user info
declare module "hono" {
  interface ContextVariableMap {
    user: {
      id: string;
      clerkId: string;
      email: string;
      role: string;
    };
    clerkUserId: string;
  }
}

/**
 * Verify Clerk JWT and extract user info
 */
async function verifyClerkToken(token: string): Promise<{ userId: string; email: string } | null> {
  try {
    if (!env.CLERK_SECRET_KEY) {
      console.error("CLERK_SECRET_KEY is not configured");
      return null;
    }

    // Verify the session token with Clerk using the client method
    const { sub } = await clerk.verifyToken(token, {
      authorizedParties: ["http://localhost:3001", "http://localhost:3000"],
      clockSkewInMs: 10000, // Allow 10 seconds of clock skew
    });

    if (!sub) {
      return null;
    }

    // Get user details from Clerk
    const clerkUser = await clerk.users.getUser(sub);
    const email = clerkUser.emailAddresses.find(e => e.id === clerkUser.primaryEmailAddressId)?.emailAddress;

    if (!email) {
      return null;
    }

    return { userId: sub, email };
  } catch (error) {
    console.error("Clerk token verification failed:");
    if (error instanceof Error) {
      console.error("  Message:", error.message);
      console.error("  Name:", error.name);
      if ('errors' in error) {
        console.error("  Errors:", JSON.stringify((error as any).errors, null, 2));
      }
    } else {
      console.error("  Error:", error);
    }
    return null;
  }
}

/**
 * Alternative: Get user email from Clerk API using userId
 * (authenticateRequest is deprecated in Clerk SDK v2)
 */
async function getUserEmailFromClerk(userId: string): Promise<string | null> {
  try {
    const clerkUser = await clerk.users.getUser(userId);
    const email = clerkUser.emailAddresses.find(
      e => e.id === clerkUser.primaryEmailAddressId
    )?.emailAddress;
    return email || null;
  } catch (error) {
    console.error("Failed to get user email from Clerk:");
    if (error instanceof Error) {
      console.error("  Message:", error.message);
    }
    return null;
  }
}

/**
 * Require authentication for a route
 */
export function requireAuth(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    // Get token from Authorization header
    const authHeader = c.req.header("authorization");

    if (!authHeader) {
      throw new AppError("Authorization header required", 401, "UNAUTHORIZED");
    }

    const parts = authHeader.split(" ");
    const scheme = parts[0];
    const token = parts[1];

    if (parts.length !== 2 || !scheme || scheme.toLowerCase() !== "bearer" || !token) {
      throw new AppError("Invalid authorization format. Use: Bearer <token>", 401, "INVALID_AUTH_FORMAT");
    }

    const payload = await verifyClerkToken(token);

    if (!payload) {
      throw new AppError("Invalid or expired token", 401, "INVALID_TOKEN");
    }
    
    // Find or create user in our database
    let user = await findUserByClerkId(payload.userId);
    
    if (!user) {
      // User might exist by email (migration scenario)
      user = await findUserByEmail(payload.email);
    }
    
    if (!user) {
      // User doesn't exist in our DB yet - they need to go through the webhook
      throw new AppError("User not found. Please complete signup.", 401, "USER_NOT_FOUND");
    }
    
    // Set user in context
    c.set("user", {
      id: user.id,
      clerkId: payload.userId,
      email: payload.email,
      role: user.role,
    });
    c.set("clerkUserId", payload.userId);
    
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
      const scheme = parts[0];
      const token = parts[1];
      
      if (parts.length === 2 && scheme && scheme.toLowerCase() === "bearer" && token) {
        const payload = await verifyClerkToken(token);
        
        if (payload) {
          const user = await findUserByClerkId(payload.userId);
          
          if (user) {
            c.set("user", {
              id: user.id,
              clerkId: payload.userId,
              email: payload.email,
              role: user.role,
            });
            c.set("clerkUserId", payload.userId);
          }
        }
      }
    }
    
    await next();
  };
}
