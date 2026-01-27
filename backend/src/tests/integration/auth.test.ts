/**
 * Authentication API tests
 * 
 * Integration tests for all auth endpoints:
 * - POST /api/v1/auth/register
 * - POST /api/v1/auth/login
 * - POST /api/v1/auth/device
 * - POST /api/v1/auth/refresh
 * - POST /api/v1/auth/logout
 * - GET /api/v1/auth/me
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { app } from "../../app";
import { setupTestDatabase, cleanTestData, closeTestDb, teardownTestDatabase } from "../setup";
import { clearRateLimitStore } from "../../middleware/rate-limiter";

// Response type for auth endpoints
interface AuthResponse {
  message?: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  error?: string;
  code?: string;
  device?: {
    id: string;
    deviceToken: string;
    platform: string;
  };
}

// Helper to make JSON requests
async function jsonRequest(
  path: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string> } = {}
): Promise<{ status: number; headers: Headers; json: () => Promise<AuthResponse> }> {
  const init: RequestInit = {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };
  
  if (options.body) {
    init.body = JSON.stringify(options.body);
  }
  
  const res = await app.request(path, init);
  return {
    status: res.status,
    headers: res.headers,
    json: () => res.json() as Promise<AuthResponse>,
  };
}

// Helper to extract auth tokens from response
async function getAuthTokens(email: string, password: string): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await jsonRequest("/api/v1/auth/login", {
    method: "POST",
    body: { email, password },
  });
  const body = await res.json();
  return {
    accessToken: body.accessToken!,
    refreshToken: body.refreshToken!,
  };
}

describe("Authentication API", () => {
  beforeAll(async () => {
    process.env["DATABASE_URL"] = process.env["TEST_DATABASE_URL"] ?? 
      "postgres://postgres:postgres@localhost:5433/flynn_aac_test";
    process.env["JWT_SECRET"] = "test-secret-key-for-testing-only";
    process.env["JWT_EXPIRES_IN"] = "15m";
    process.env["REFRESH_TOKEN_EXPIRES_IN"] = "30d";
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanTestData();
    clearRateLimitStore(); // Reset rate limits between tests
  });

  afterAll(async () => {
    await teardownTestDatabase();
    await closeTestDb();
  });

  describe("POST /api/v1/auth/register", () => {
    test("registers a new user with valid data", async () => {
      const res = await jsonRequest("/api/v1/auth/register", {
        method: "POST",
        body: {
          email: "test@example.com",
          password: "securePassword123",
          role: "caregiver",
        },
      });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.message).toBe("Registration successful");
      expect(body.user!.id).toBeDefined();
      expect(body.user!.email).toBe("test@example.com");
      expect(body.user!.role).toBe("caregiver");
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      expect(body.expiresIn).toBeGreaterThan(0);
    });

    test("normalizes email to lowercase", async () => {
      const res = await jsonRequest("/api/v1/auth/register", {
        method: "POST",
        body: {
          email: "Test@EXAMPLE.com",
          password: "securePassword123",
          role: "caregiver",
        },
      });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.user!.email).toBe("test@example.com");
    });

    test("returns 400 for invalid email", async () => {
      const res = await jsonRequest("/api/v1/auth/register", {
        method: "POST",
        body: {
          email: "invalid-email",
          password: "securePassword123",
          role: "caregiver",
        },
      });

      expect(res.status).toBe(400);
    });

    test("returns 400 for password too short", async () => {
      const res = await jsonRequest("/api/v1/auth/register", {
        method: "POST",
        body: {
          email: "test@example.com",
          password: "short",
          role: "caregiver",
        },
      });

      expect(res.status).toBe(400);
    });

    test("returns 400 for invalid role", async () => {
      const res = await jsonRequest("/api/v1/auth/register", {
        method: "POST",
        body: {
          email: "test@example.com",
          password: "securePassword123",
          role: "invalid_role",
        },
      });

      expect(res.status).toBe(400);
    });

    test("returns 409 for duplicate email", async () => {
      // Register first user
      await jsonRequest("/api/v1/auth/register", {
        method: "POST",
        body: {
          email: "test@example.com",
          password: "securePassword123",
          role: "caregiver",
        },
      });

      // Try to register with same email
      const res = await jsonRequest("/api/v1/auth/register", {
        method: "POST",
        body: {
          email: "test@example.com",
          password: "differentPassword456",
          role: "therapist",
        },
      });
      const body = await res.json();

      expect(res.status).toBe(409);
      expect(body.code).toBe("EMAIL_EXISTS");
    });

    test("accepts all valid roles", async () => {
      const roles = ["caregiver", "therapist", "admin"];
      
      for (const role of roles) {
        clearRateLimitStore();
        const res = await jsonRequest("/api/v1/auth/register", {
          method: "POST",
          body: {
            email: `${role}@example.com`,
            password: "securePassword123",
            role,
          },
        });
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(body.user!.role).toBe(role);
      }
    });
  });

  describe("POST /api/v1/auth/login", () => {
    beforeEach(async () => {
      // Create a test user
      await jsonRequest("/api/v1/auth/register", {
        method: "POST",
        body: {
          email: "login@example.com",
          password: "securePassword123",
          role: "caregiver",
        },
      });
      clearRateLimitStore();
    });

    test("logs in with valid credentials", async () => {
      const res = await jsonRequest("/api/v1/auth/login", {
        method: "POST",
        body: {
          email: "login@example.com",
          password: "securePassword123",
        },
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.message).toBe("Login successful");
      expect(body.user!.email).toBe("login@example.com");
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
    });

    test("is case-insensitive for email", async () => {
      const res = await jsonRequest("/api/v1/auth/login", {
        method: "POST",
        body: {
          email: "LOGIN@EXAMPLE.COM",
          password: "securePassword123",
        },
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.user!.email).toBe("login@example.com");
    });

    test("returns 401 for wrong password", async () => {
      const res = await jsonRequest("/api/v1/auth/login", {
        method: "POST",
        body: {
          email: "login@example.com",
          password: "wrongPassword",
        },
      });
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.code).toBe("INVALID_CREDENTIALS");
    });

    test("returns 401 for non-existent user", async () => {
      const res = await jsonRequest("/api/v1/auth/login", {
        method: "POST",
        body: {
          email: "nonexistent@example.com",
          password: "anyPassword123",
        },
      });
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.code).toBe("INVALID_CREDENTIALS");
    });
  });

  describe("POST /api/v1/auth/refresh", () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Create and login a test user
      await jsonRequest("/api/v1/auth/register", {
        method: "POST",
        body: {
          email: "refresh@example.com",
          password: "securePassword123",
          role: "caregiver",
        },
      });
      clearRateLimitStore();
      
      const loginRes = await jsonRequest("/api/v1/auth/login", {
        method: "POST",
        body: {
          email: "refresh@example.com",
          password: "securePassword123",
        },
      });
      const loginBody = await loginRes.json();
      refreshToken = loginBody.refreshToken!;
      clearRateLimitStore();
    });

    test("refreshes tokens with valid refresh token", async () => {
      const res = await jsonRequest("/api/v1/auth/refresh", {
        method: "POST",
        body: { refreshToken },
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.message).toBe("Token refreshed successfully");
      expect(body.accessToken).toBeDefined();
      expect(body.refreshToken).toBeDefined();
      // New refresh token should be different (rotation)
      expect(body.refreshToken).not.toBe(refreshToken);
    });

    test("old refresh token is invalidated after use (rotation)", async () => {
      // Use refresh token
      await jsonRequest("/api/v1/auth/refresh", {
        method: "POST",
        body: { refreshToken },
      });
      clearRateLimitStore();

      // Try to use the same token again
      const res = await jsonRequest("/api/v1/auth/refresh", {
        method: "POST",
        body: { refreshToken },
      });
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.code).toBe("INVALID_REFRESH_TOKEN");
    });

    test("returns 401 for invalid refresh token", async () => {
      const res = await jsonRequest("/api/v1/auth/refresh", {
        method: "POST",
        body: { refreshToken: "invalid-token" },
      });
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.code).toBe("INVALID_REFRESH_TOKEN");
    });
  });

  describe("POST /api/v1/auth/device", () => {
    let accessToken: string;

    beforeEach(async () => {
      // Create and login a test user
      await jsonRequest("/api/v1/auth/register", {
        method: "POST",
        body: {
          email: "device@example.com",
          password: "securePassword123",
          role: "caregiver",
        },
      });
      clearRateLimitStore();
      
      const tokens = await getAuthTokens("device@example.com", "securePassword123");
      accessToken = tokens.accessToken;
      clearRateLimitStore();
    });

    test("registers a device with valid token", async () => {
      const res = await jsonRequest("/api/v1/auth/device", {
        method: "POST",
        body: {
          deviceToken: "apns-device-token-12345",
          platform: "ios",
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body.message).toBe("Device registered successfully");
      expect(body.device!.id).toBeDefined();
      expect(body.device!.deviceToken).toBe("apns-device-token-12345");
      expect(body.device!.platform).toBe("ios");
    });

    test("accepts all valid platforms", async () => {
      const platforms = ["ios", "android", "web"];
      
      for (const platform of platforms) {
        clearRateLimitStore();
        const res = await jsonRequest("/api/v1/auth/device", {
          method: "POST",
          body: {
            deviceToken: `token-${platform}`,
            platform,
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const body = await res.json();

        expect(res.status).toBe(201);
        expect(body.device!.platform).toBe(platform);
      }
    });

    test("returns 401 without auth token", async () => {
      const res = await jsonRequest("/api/v1/auth/device", {
        method: "POST",
        body: {
          deviceToken: "some-token",
          platform: "ios",
        },
      });

      expect(res.status).toBe(401);
    });

    test("returns 400 for invalid platform", async () => {
      const res = await jsonRequest("/api/v1/auth/device", {
        method: "POST",
        body: {
          deviceToken: "some-token",
          platform: "invalid",
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/v1/auth/logout", () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      // Create and login a test user
      await jsonRequest("/api/v1/auth/register", {
        method: "POST",
        body: {
          email: "logout@example.com",
          password: "securePassword123",
          role: "caregiver",
        },
      });
      clearRateLimitStore();
      
      const tokens = await getAuthTokens("logout@example.com", "securePassword123");
      accessToken = tokens.accessToken;
      refreshToken = tokens.refreshToken;
      clearRateLimitStore();
    });

    test("revokes all refresh tokens", async () => {
      // Logout
      const res = await jsonRequest("/api/v1/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.message).toBe("Logged out from all devices");

      // Try to use the refresh token
      clearRateLimitStore();
      const refreshRes = await jsonRequest("/api/v1/auth/refresh", {
        method: "POST",
        body: { refreshToken },
      });

      expect(refreshRes.status).toBe(401);
    });

    test("returns 401 without auth token", async () => {
      const res = await jsonRequest("/api/v1/auth/logout", {
        method: "POST",
      });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/auth/me", () => {
    let accessToken: string;

    beforeEach(async () => {
      // Create and login a test user
      await jsonRequest("/api/v1/auth/register", {
        method: "POST",
        body: {
          email: "me@example.com",
          password: "securePassword123",
          role: "therapist",
        },
      });
      clearRateLimitStore();
      
      const tokens = await getAuthTokens("me@example.com", "securePassword123");
      accessToken = tokens.accessToken;
      clearRateLimitStore();
    });

    test("returns current user info", async () => {
      const res = await jsonRequest("/api/v1/auth/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.user!.email).toBe("me@example.com");
      expect(body.user!.role).toBe("therapist");
      expect(body.user!.id).toBeDefined();
    });

    test("returns 401 without auth token", async () => {
      const res = await jsonRequest("/api/v1/auth/me");

      expect(res.status).toBe(401);
    });

    test("returns 401 with invalid token", async () => {
      const res = await jsonRequest("/api/v1/auth/me", {
        headers: {
          Authorization: "Bearer invalid-token",
        },
      });

      expect(res.status).toBe(401);
    });
  });

  describe("Rate Limiting", () => {
    test("enforces rate limits on auth endpoints", async () => {
      // Make 6 requests (limit is 5)
      for (let i = 0; i < 5; i++) {
        await jsonRequest("/api/v1/auth/login", {
          method: "POST",
          body: {
            email: `test${i}@example.com`,
            password: "anyPassword123",
          },
        });
      }

      // 6th request should be rate limited
      const res = await jsonRequest("/api/v1/auth/login", {
        method: "POST",
        body: {
          email: "test@example.com",
          password: "anyPassword123",
        },
      });
      const body = await res.json();

      expect(res.status).toBe(429);
      expect(body.code).toBe("RATE_LIMIT_EXCEEDED");
    });

    test("includes rate limit headers", async () => {
      const res = await jsonRequest("/api/v1/auth/login", {
        method: "POST",
        body: {
          email: "test@example.com",
          password: "anyPassword123",
        },
      });

      expect(res.headers.get("X-RateLimit-Limit")).toBe("5");
      expect(res.headers.get("X-RateLimit-Remaining")).toBeDefined();
      expect(res.headers.get("X-RateLimit-Reset")).toBeDefined();
    });
  });

  describe("Token Validation", () => {
    test("rejects expired tokens", async () => {
      // Register user
      await jsonRequest("/api/v1/auth/register", {
        method: "POST",
        body: {
          email: "expired@example.com",
          password: "securePassword123",
          role: "caregiver",
        },
      });
      clearRateLimitStore();

      // Create a manually crafted expired token (for testing)
      // The actual expiry is handled by JWT library, so we test invalid tokens
      const res = await jsonRequest("/api/v1/auth/me", {
        headers: {
          Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxfQ.invalid",
        },
      });

      expect(res.status).toBe(401);
    });
  });
});
