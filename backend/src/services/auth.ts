/**
 * Authentication Service (Clerk)
 * 
 * User lookup functions and device registration.
 * JWT/password logic handled by Clerk.
 */

import { db } from "../db";
import { users, devices, type User } from "../db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Find user by Clerk ID
 */
export async function findUserByClerkId(clerkId: string): Promise<User | null> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.clerkId, clerkId));
  
  return user ?? null;
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
 * Create a new user from Clerk webhook
 */
export async function createUserFromClerk(
  clerkId: string,
  email: string,
  role: "caregiver" | "therapist" | "admin" = "caregiver"
): Promise<User> {
  const [user] = await db
    .insert(users)
    .values({
      clerkId,
      email: email.toLowerCase(),
      role,
    })
    .returning();
  
  if (!user) {
    throw new Error("Failed to create user");
  }
  
  return user;
}

/**
 * Update user's Clerk ID (for migrating existing users)
 */
export async function linkUserToClerk(userId: string, clerkId: string): Promise<User | null> {
  const [user] = await db
    .update(users)
    .set({ clerkId })
    .where(eq(users.id, userId))
    .returning();
  
  return user ?? null;
}

/**
 * Update user email (from Clerk webhook)
 */
export async function updateUserEmail(clerkId: string, email: string): Promise<User | null> {
  const [user] = await db
    .update(users)
    .set({ email: email.toLowerCase() })
    .where(eq(users.clerkId, clerkId))
    .returning();
  
  return user ?? null;
}

/**
 * Delete user (from Clerk webhook)
 */
export async function deleteUserByClerkId(clerkId: string): Promise<boolean> {
  const result = await db
    .delete(users)
    .where(eq(users.clerkId, clerkId));
  
  return true;
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
  
  const existingDevice = existing[0];
  if (existingDevice) {
    return {
      id: existingDevice.id,
      deviceToken: existingDevice.deviceToken,
      platform: existingDevice.platform,
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
  
  if (!device) {
    throw new Error("Failed to register device");
  }
  
  return {
    id: device.id,
    deviceToken: device.deviceToken,
    platform: device.platform,
  };
}

/**
 * Remove a device registration
 */
export async function unregisterDevice(userId: string, deviceToken: string): Promise<boolean> {
  await db
    .delete(devices)
    .where(
      and(
        eq(devices.userId, userId),
        eq(devices.deviceToken, deviceToken)
      )
    );
  
  return true;
}
