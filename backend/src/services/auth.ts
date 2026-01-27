/**
 * Authentication Service
 * 
 * Handles JWT generation, password hashing, and token management.
 */

import bcrypt from "bcrypt";
import { sign, verify, type JWTPayload } from "hono/jwt";
import { env } from "../config/env";
import { db } from "../db";
import { users, refreshTokens, devices, type User, type NewUser } from "../db/schema";
import { eq, and, isNull, gt } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";

// Constants
const BCRYPT_ROUNDS = 12;

// Parse duration string to milliseconds
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(s|m|h|d)$/);
  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case "s": return value * 1000;
    case "m": return value * 60 * 1000;
    case "h": return value * 60 * 60 * 1000;
    case "d": return value * 24 * 60 * 60 * 1000;
    default: throw new Error(`Unknown duration unit: ${unit}`);
  }
}

// JWT payload type
export interface TokenPayload extends JWTPayload {
  sub: string;      // user id
  email: string;
  role: string;
  type: "access" | "refresh";
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a secure random token
 */
export function generateRandomToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Hash a token for storage
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Generate JWT access token
 */
export async function generateAccessToken(user: User): Promise<string> {
  const expiresInMs = parseDuration(env.JWT_EXPIRES_IN);
  const exp = Math.floor((Date.now() + expiresInMs) / 1000);
  
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    type: "access",
    exp,
    iat: Math.floor(Date.now() / 1000),
  };
  
  return sign(payload, env.JWT_SECRET);
}

/**
 * Generate refresh token and store in database
 */
export async function generateRefreshToken(user: User): Promise<string> {
  const token = generateRandomToken();
  const tokenHash = hashToken(token);
  const expiresInMs = parseDuration(env.REFRESH_TOKEN_EXPIRES_IN);
  const expiresAt = new Date(Date.now() + expiresInMs);
  
  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash,
    expiresAt,
  });
  
  return token;
}

/**
 * Generate both access and refresh tokens
 */
export async function generateAuthTokens(user: User): Promise<AuthTokens> {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(user),
    generateRefreshToken(user),
  ]);
  
  const expiresInMs = parseDuration(env.JWT_EXPIRES_IN);
  
  return {
    accessToken,
    refreshToken,
    expiresIn: Math.floor(expiresInMs / 1000),
  };
}

/**
 * Verify access token
 */
export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  try {
    const payload = await verify(token, env.JWT_SECRET) as TokenPayload;
    
    if (payload.type !== "access") {
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}

/**
 * Refresh tokens using a valid refresh token (with rotation)
 */
export async function refreshAuthTokens(token: string): Promise<AuthTokens | null> {
  const tokenHash = hashToken(token);
  
  // Find valid refresh token
  const [storedToken] = await db
    .select()
    .from(refreshTokens)
    .where(
      and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date())
      )
    );
  
  if (!storedToken) {
    return null;
  }
  
  // Revoke the old token (rotation)
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.id, storedToken.id));
  
  // Get user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, storedToken.userId));
  
  if (!user) {
    return null;
  }
  
  // Generate new tokens
  return generateAuthTokens(user);
}

/**
 * Revoke all refresh tokens for a user (logout from all devices)
 */
export async function revokeAllUserTokens(userId: string): Promise<void> {
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(refreshTokens.userId, userId),
        isNull(refreshTokens.revokedAt)
      )
    );
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()));
  
  return user ?? null;
}

/**
 * Find user by ID
 */
export async function findUserById(id: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id));
  
  return user ?? null;
}

/**
 * Create a new user
 */
export async function createUser(
  email: string,
  password: string,
  role: "caregiver" | "therapist" | "admin"
): Promise<User> {
  const passwordHash = await hashPassword(password);
  
  const [user] = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      passwordHash,
      role,
    })
    .returning();
  
  return user;
}

/**
 * Register a device for a user
 */
export async function registerDevice(
  userId: string,
  deviceToken: string,
  platform: "ios" | "android" | "web"
): Promise<{ id: string; deviceToken: string; platform: string }> {
  // Upsert: update if exists, insert if not
  const existing = await db
    .select()
    .from(devices)
    .where(
      and(
        eq(devices.userId, userId),
        eq(devices.deviceToken, deviceToken)
      )
    );
  
  if (existing.length > 0) {
    return {
      id: existing[0].id,
      deviceToken: existing[0].deviceToken,
      platform: existing[0].platform,
    };
  }
  
  const [device] = await db
    .insert(devices)
    .values({
      userId,
      deviceToken,
      platform,
    })
    .returning();
  
  return {
    id: device.id,
    deviceToken: device.deviceToken,
    platform: device.platform,
  };
}
