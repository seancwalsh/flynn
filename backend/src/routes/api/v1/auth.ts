/**
 * Authentication Routes (Clerk)
 * 
 * POST /webhook     - Clerk webhook for user events
 * POST /device      - Register device (for iOS app push notifications)
 * DELETE /device    - Unregister device
 * GET /me           - Get current user info
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";
import { Webhook } from "svix";
import { AppError } from "../../../middleware/error-handler";
import { authRateLimiter } from "../../../middleware/rate-limiter";
import { requireAuth } from "../../../middleware/auth";
import {
  createUserFromClerk,
  findUserByClerkId,
  findUserByEmail,
  linkUserToClerk,
  updateUserEmail,
  deleteUserByClerkId,
  registerDevice,
  unregisterDevice,
} from "../../../services/auth";
import { env } from "../../../config/env";

export const authRoutes = new Hono();

// Validation schemas
const deviceSchema = z.object({
  deviceToken: z.string().min(1, "Device token is required"),
  platform: z.enum(["ios", "android", "web"]),
});

// Clerk webhook event types
interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{ id: string; email_address: string }>;
    primary_email_address_id?: string;
    public_metadata?: { role?: string };
    unsafe_metadata?: { role?: string };
  };
}

/**
 * POST /webhook - Clerk webhook for user lifecycle events
 * 
 * Handles: user.created, user.updated, user.deleted
 */
authRoutes.post("/webhook", async (c) => {
  const svixId = c.req.header("svix-id");
  const svixTimestamp = c.req.header("svix-timestamp");
  const svixSignature = c.req.header("svix-signature");
  
  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new AppError("Missing Svix headers", 400, "INVALID_WEBHOOK");
  }
  
  const body = await c.req.text();
  
  // Verify webhook signature (skip in test mode)
  let event: ClerkWebhookEvent;
  
  if (env.CLERK_WEBHOOK_SECRET && env.NODE_ENV !== "test") {
    try {
      const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);
      event = wh.verify(body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as ClerkWebhookEvent;
    } catch (err) {
      console.error("Webhook verification failed:", err);
      throw new AppError("Invalid webhook signature", 400, "INVALID_SIGNATURE");
    }
  } else {
    // In development/test without webhook secret, parse directly
    event = JSON.parse(body) as ClerkWebhookEvent;
  }
  
  const { type, data } = event;
  
  switch (type) {
    case "user.created": {
      const clerkId = data.id;
      const emailObj = data.email_addresses?.find(e => e.id === data.primary_email_address_id);
      const email = emailObj?.email_address;
      
      if (!email) {
        console.error("User created without email:", clerkId);
        return c.json({ received: true });
      }
      
      // Check if user already exists by email (migration scenario)
      const existingUser = await findUserByEmail(email);
      if (existingUser) {
        // Link existing user to Clerk
        await linkUserToClerk(existingUser.id, clerkId);
        console.log(`Linked existing user ${existingUser.id} to Clerk ${clerkId}`);
      } else {
        // Create new user
        // Get role from metadata (set during signup) or default to caregiver
        const role = (data.public_metadata?.role || data.unsafe_metadata?.role || "caregiver") as "caregiver" | "therapist" | "admin";
        await createUserFromClerk(clerkId, email, role);
        console.log(`Created new user for Clerk ${clerkId}`);
      }
      break;
    }
    
    case "user.updated": {
      const clerkId = data.id;
      const emailObj = data.email_addresses?.find(e => e.id === data.primary_email_address_id);
      const email = emailObj?.email_address;
      
      if (email) {
        await updateUserEmail(clerkId, email);
        console.log(`Updated email for Clerk user ${clerkId}`);
      }
      break;
    }
    
    case "user.deleted": {
      const clerkId = data.id;
      await deleteUserByClerkId(clerkId);
      console.log(`Deleted user for Clerk ${clerkId}`);
      break;
    }
    
    default:
      console.log(`Unhandled webhook event: ${type}`);
  }
  
  return c.json({ received: true });
});

/**
 * POST /device - Register a device for push notifications
 * Requires authentication
 */
authRoutes.post("/device", requireAuth(), authRateLimiter, zValidator("json", deviceSchema), async (c) => {
  const { deviceToken, platform } = c.req.valid("json");
  const user = c.get("user");
  
  const device = await registerDevice(user.id, deviceToken, platform);
  
  return c.json({
    message: "Device registered successfully",
    device,
  }, 201);
});

/**
 * DELETE /device - Unregister a device
 * Requires authentication
 */
authRoutes.delete("/device", requireAuth(), authRateLimiter, zValidator("json", deviceSchema.pick({ deviceToken: true })), async (c) => {
  const { deviceToken } = c.req.valid("json");
  const user = c.get("user");
  
  await unregisterDevice(user.id, deviceToken);
  
  return c.json({
    message: "Device unregistered successfully",
  });
});

/**
 * GET /me - Get current user info
 * Requires authentication
 */
authRoutes.get("/me", requireAuth(), async (c) => {
  const user = c.get("user");
  
  return c.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
  });
});
