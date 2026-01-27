/**
 * Authentication Routes
 * 
 * POST /register - Register new user
 * POST /login    - Login and get tokens
 * POST /device   - Register device (for iOS app)
 * POST /refresh  - Refresh access token
 */

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod/v4";
import { AppError } from "../../../middleware/error-handler";
import { authRateLimiter } from "../../../middleware/rate-limiter";
import { requireAuth } from "../../../middleware/auth";
import {
  createUser,
  findUserByEmail,
  verifyPassword,
  generateAuthTokens,
  refreshAuthTokens,
  registerDevice,
  revokeAllUserTokens,
} from "../../../services/auth";

export const authRoutes = new Hono();

// Apply rate limiting to all auth routes
authRoutes.use("*", authRateLimiter);

// Validation schemas
const registerSchema = z.object({
  email: z.email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["caregiver", "therapist", "admin"]),
});

const loginSchema = z.object({
  email: z.email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

const deviceSchema = z.object({
  deviceToken: z.string().min(1, "Device token is required"),
  platform: z.enum(["ios", "android", "web"]),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

/**
 * POST /register - Register a new user
 */
authRoutes.post("/register", zValidator("json", registerSchema), async (c) => {
  const { email, password, role } = c.req.valid("json");
  
  // Check if user already exists
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    throw new AppError("Email already registered", 409, "EMAIL_EXISTS");
  }
  
  // Create user
  const user = await createUser(email, password, role);
  
  // Generate tokens
  const tokens = await generateAuthTokens(user);
  
  return c.json({
    message: "Registration successful",
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    ...tokens,
  }, 201);
});

/**
 * POST /login - Login and get tokens
 */
authRoutes.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");
  
  // Find user
  const user = await findUserByEmail(email);
  if (!user) {
    // Use generic message to prevent email enumeration
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }
  
  // Verify password
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
  }
  
  // Generate tokens
  const tokens = await generateAuthTokens(user);
  
  return c.json({
    message: "Login successful",
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    ...tokens,
  });
});

/**
 * POST /device - Register a device for push notifications
 * Requires authentication
 */
authRoutes.post("/device", requireAuth(), zValidator("json", deviceSchema), async (c) => {
  const { deviceToken, platform } = c.req.valid("json");
  const user = c.get("user");
  
  const device = await registerDevice(user.id, deviceToken, platform);
  
  return c.json({
    message: "Device registered successfully",
    device,
  }, 201);
});

/**
 * POST /refresh - Refresh access token
 */
authRoutes.post("/refresh", zValidator("json", refreshSchema), async (c) => {
  const { refreshToken } = c.req.valid("json");
  
  const tokens = await refreshAuthTokens(refreshToken);
  
  if (!tokens) {
    throw new AppError("Invalid or expired refresh token", 401, "INVALID_REFRESH_TOKEN");
  }
  
  return c.json({
    message: "Token refreshed successfully",
    ...tokens,
  });
});

/**
 * POST /logout - Revoke all refresh tokens (logout from all devices)
 * Requires authentication
 */
authRoutes.post("/logout", requireAuth(), async (c) => {
  const user = c.get("user");
  
  await revokeAllUserTokens(user.id);
  
  return c.json({
    message: "Logged out from all devices",
  });
});

/**
 * GET /me - Get current user info
 * Requires authentication
 */
authRoutes.get("/me", requireAuth(), async (c) => {
  const user = c.get("user");
  
  return c.json({
    user,
  });
});
