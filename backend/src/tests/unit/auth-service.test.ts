/**
 * Auth Service Unit Tests
 * 
 * Tests for auth utility functions that don't require database access.
 */

import { describe, test, expect } from "bun:test";
import {
  hashPassword,
  verifyPassword,
  generateRandomToken,
  hashToken,
} from "../../services/auth";

describe("Auth Service - Password Hashing", () => {
  test("hashPassword returns a hash different from the input", async () => {
    const password = "mySecurePassword123";
    const hash = await hashPassword(password);
    
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are ~60 chars
  });

  test("verifyPassword returns true for correct password", async () => {
    const password = "mySecurePassword123";
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  test("verifyPassword returns false for incorrect password", async () => {
    const password = "mySecurePassword123";
    const wrongPassword = "wrongPassword456";
    const hash = await hashPassword(password);
    
    const isValid = await verifyPassword(wrongPassword, hash);
    expect(isValid).toBe(false);
  });

  test("same password produces different hashes (due to salt)", async () => {
    const password = "mySecurePassword123";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    
    expect(hash1).not.toBe(hash2);
    
    // But both should verify correctly
    expect(await verifyPassword(password, hash1)).toBe(true);
    expect(await verifyPassword(password, hash2)).toBe(true);
  });
});

describe("Auth Service - Token Generation", () => {
  test("generateRandomToken returns a 64-char hex string", () => {
    const token = generateRandomToken();
    
    expect(token.length).toBe(64); // 32 bytes = 64 hex chars
    expect(/^[a-f0-9]+$/i.test(token)).toBe(true);
  });

  test("generateRandomToken returns unique tokens", () => {
    const tokens = new Set<string>();
    
    for (let i = 0; i < 100; i++) {
      tokens.add(generateRandomToken());
    }
    
    expect(tokens.size).toBe(100);
  });

  test("hashToken returns consistent hash for same input", () => {
    const token = "test-token-12345";
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    
    expect(hash1).toBe(hash2);
  });

  test("hashToken returns different hashes for different inputs", () => {
    const hash1 = hashToken("token1");
    const hash2 = hashToken("token2");
    
    expect(hash1).not.toBe(hash2);
  });

  test("hashToken returns a 64-char SHA-256 hash", () => {
    const token = "any-token";
    const hash = hashToken(token);
    
    expect(hash.length).toBe(64); // SHA-256 = 32 bytes = 64 hex chars
    expect(/^[a-f0-9]+$/i.test(hash)).toBe(true);
  });
});
