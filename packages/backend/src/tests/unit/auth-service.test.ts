/**
 * Auth Service Unit Tests (Clerk)
 * 
 * Tests for auth utility functions that don't require database access.
 * Note: JWT/password handling is now managed by Clerk.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { setupTestDatabase, cleanTestData, closeTestDb, teardownTestDatabase } from "../setup";

describe("Auth Service - User Management", () => {
  beforeAll(async () => {
    process.env["DATABASE_URL"] = process.env["TEST_DATABASE_URL"] ?? 
      "postgres://postgres:postgres@localhost:5433/flynn_aac_test";
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanTestData();
  });

  afterAll(async () => {
    await teardownTestDatabase();
    await closeTestDb();
  });

  test("createUserFromClerk creates a user with Clerk ID", async () => {
    const { createUserFromClerk } = await import("../../services/auth");
    
    const user = await createUserFromClerk(
      "clerk_test_123",
      "test@example.com",
      "caregiver"
    );
    
    expect(user.id).toBeDefined();
    expect(user.clerkId).toBe("clerk_test_123");
    expect(user.email).toBe("test@example.com");
    expect(user.role).toBe("caregiver");
  });

  test("createUserFromClerk normalizes email to lowercase", async () => {
    const { createUserFromClerk } = await import("../../services/auth");
    
    const user = await createUserFromClerk(
      "clerk_test_456",
      "TEST@EXAMPLE.COM",
      "therapist"
    );
    
    expect(user.email).toBe("test@example.com");
  });

  test("findUserByClerkId returns user with matching Clerk ID", async () => {
    const { createUserFromClerk, findUserByClerkId } = await import("../../services/auth");
    
    const created = await createUserFromClerk(
      "clerk_find_123",
      "find@example.com",
      "caregiver"
    );
    
    const found = await findUserByClerkId("clerk_find_123");
    
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
    expect(found!.email).toBe("find@example.com");
  });

  test("findUserByClerkId returns null for non-existent Clerk ID", async () => {
    const { findUserByClerkId } = await import("../../services/auth");
    
    const found = await findUserByClerkId("clerk_nonexistent");
    
    expect(found).toBeNull();
  });

  test("findUserByEmail returns user with matching email", async () => {
    const { createUserFromClerk, findUserByEmail } = await import("../../services/auth");
    
    await createUserFromClerk(
      "clerk_email_123",
      "email@example.com",
      "caregiver"
    );
    
    const found = await findUserByEmail("email@example.com");
    
    expect(found).not.toBeNull();
    expect(found!.email).toBe("email@example.com");
  });

  test("findUserByEmail is case-insensitive", async () => {
    const { createUserFromClerk, findUserByEmail } = await import("../../services/auth");
    
    await createUserFromClerk(
      "clerk_case_123",
      "case@example.com",
      "caregiver"
    );
    
    const found = await findUserByEmail("CASE@EXAMPLE.COM");
    
    expect(found).not.toBeNull();
    expect(found!.email).toBe("case@example.com");
  });

  test("linkUserToClerk updates user's Clerk ID", async () => {
    const { createUserFromClerk, linkUserToClerk, findUserByClerkId } = await import("../../services/auth");
    
    // Create user without Clerk ID linkage
    const user = await createUserFromClerk(
      "clerk_old_123",
      "link@example.com",
      "caregiver"
    );
    
    // Link to a new Clerk ID
    await linkUserToClerk(user.id, "clerk_new_456");
    
    // Old ID should not find user
    const oldLookup = await findUserByClerkId("clerk_old_123");
    expect(oldLookup).toBeNull();
    
    // New ID should find user
    const newLookup = await findUserByClerkId("clerk_new_456");
    expect(newLookup).not.toBeNull();
    expect(newLookup!.id).toBe(user.id);
  });

  test("updateUserEmail updates email for Clerk user", async () => {
    const { createUserFromClerk, updateUserEmail, findUserByEmail } = await import("../../services/auth");
    
    await createUserFromClerk(
      "clerk_update_123",
      "old@example.com",
      "caregiver"
    );
    
    await updateUserEmail("clerk_update_123", "new@example.com");
    
    const oldLookup = await findUserByEmail("old@example.com");
    expect(oldLookup).toBeNull();
    
    const newLookup = await findUserByEmail("new@example.com");
    expect(newLookup).not.toBeNull();
    expect(newLookup!.clerkId).toBe("clerk_update_123");
  });

  test("deleteUserByClerkId removes user", async () => {
    const { createUserFromClerk, deleteUserByClerkId, findUserByClerkId } = await import("../../services/auth");
    
    await createUserFromClerk(
      "clerk_delete_123",
      "delete@example.com",
      "caregiver"
    );
    
    await deleteUserByClerkId("clerk_delete_123");
    
    const found = await findUserByClerkId("clerk_delete_123");
    expect(found).toBeNull();
  });
});

describe("Auth Service - Device Registration", () => {
  beforeAll(async () => {
    process.env["DATABASE_URL"] = process.env["TEST_DATABASE_URL"] ?? 
      "postgres://postgres:postgres@localhost:5433/flynn_aac_test";
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanTestData();
  });

  afterAll(async () => {
    await teardownTestDatabase();
    await closeTestDb();
  });

  test("registerDevice creates a new device", async () => {
    const { createUserFromClerk, registerDevice } = await import("../../services/auth");
    
    const user = await createUserFromClerk(
      "clerk_device_123",
      "device@example.com",
      "caregiver"
    );
    
    const device = await registerDevice(user.id, "apns-token-123", "ios");
    
    expect(device.id).toBeDefined();
    expect(device.deviceToken).toBe("apns-token-123");
    expect(device.platform).toBe("ios");
  });

  test("registerDevice returns existing device for duplicate", async () => {
    const { createUserFromClerk, registerDevice } = await import("../../services/auth");
    
    const user = await createUserFromClerk(
      "clerk_dup_123",
      "dup@example.com",
      "caregiver"
    );
    
    const device1 = await registerDevice(user.id, "apns-token-dup", "ios");
    const device2 = await registerDevice(user.id, "apns-token-dup", "ios");
    
    expect(device1.id).toBe(device2.id);
  });

  test("unregisterDevice removes device", async () => {
    const { createUserFromClerk, registerDevice, unregisterDevice } = await import("../../services/auth");
    
    const user = await createUserFromClerk(
      "clerk_unreg_123",
      "unreg@example.com",
      "caregiver"
    );
    
    await registerDevice(user.id, "apns-token-unreg", "ios");
    const result = await unregisterDevice(user.id, "apns-token-unreg");
    
    expect(result).toBe(true);
  });
});
