/**
 * Authentication API tests (Clerk)
 * 
 * Integration tests for auth endpoints:
 * - POST /api/v1/auth/webhook (Clerk webhooks)
 * - POST /api/v1/auth/device
 * - DELETE /api/v1/auth/device
 * - GET /api/v1/auth/me
 * 
 * Note: Login/register are handled by Clerk directly.
 * These tests mock Clerk JWT verification.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, mock } from "bun:test";
import { setupTestDatabase, cleanTestData, closeTestDb, teardownTestDatabase } from "../setup";
import { clearRateLimitStore } from "../../middleware/rate-limiter";

// Mock Clerk verification
const mockClerkUserId = "clerk_test_user_123";
const mockClerkEmail = "test@example.com";

// Mock the Clerk client
mock.module("@clerk/backend", () => ({
  createClerkClient: () => ({
    verifyToken: async (token: string) => {
      if (token === "valid_clerk_token") {
        return { sub: mockClerkUserId };
      }
      throw new Error("Invalid token");
    },
    users: {
      getUser: async (userId: string) => {
        if (userId === mockClerkUserId) {
          return {
            id: mockClerkUserId,
            emailAddresses: [{ id: "email_1", email_address: mockClerkEmail }],
            primaryEmailAddressId: "email_1",
          };
        }
        throw new Error("User not found");
      },
    },
  }),
}));

// Response type for auth endpoints
interface AuthResponse {
  message?: string;
  user?: {
    id: string;
    email: string;
    role: string;
  };
  error?: string;
  code?: string;
  device?: {
    id: string;
    deviceToken: string;
    platform: string;
  };
  received?: boolean;
}

// Import app after mocking
let app: any;

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

// Helper to create a test user via webhook simulation
async function createTestUser(clerkId: string, email: string, role: string = "caregiver") {
  await jsonRequest("/api/v1/auth/webhook", {
    method: "POST",
    body: {
      type: "user.created",
      data: {
        id: clerkId,
        email_addresses: [{ id: "email_1", email_address: email }],
        primary_email_address_id: "email_1",
        public_metadata: { role },
      },
    },
    headers: {
      "svix-id": "test-id",
      "svix-timestamp": String(Date.now()),
      "svix-signature": "test-signature",
    },
  });
}

describe("Authentication API (Clerk)", () => {
  beforeAll(async () => {
    process.env["DATABASE_URL"] = process.env["TEST_DATABASE_URL"] ?? 
      "postgres://postgres:postgres@localhost:5433/flynn_aac_test";
    process.env["NODE_ENV"] = "test";
    process.env["CLERK_SECRET_KEY"] = "test_secret";
    process.env["CLERK_WEBHOOK_SECRET"] = ""; // Skip verification in tests
    await setupTestDatabase();
    
    // Import app after env setup
    const appModule = await import("../../app");
    app = appModule.app;
  });

  beforeEach(async () => {
    await cleanTestData();
    clearRateLimitStore();
  });

  afterAll(async () => {
    await teardownTestDatabase();
    await closeTestDb();
  });

  describe("POST /api/v1/auth/webhook", () => {
    test("creates user on user.created event", async () => {
      const res = await jsonRequest("/api/v1/auth/webhook", {
        method: "POST",
        body: {
          type: "user.created",
          data: {
            id: "clerk_webhook_123",
            email_addresses: [{ id: "email_1", email_address: "webhook@example.com" }],
            primary_email_address_id: "email_1",
            public_metadata: { role: "caregiver" },
          },
        },
        headers: {
          "svix-id": "test-id",
          "svix-timestamp": String(Date.now()),
          "svix-signature": "test-signature",
        },
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.received).toBe(true);
    });

    test("handles user.updated event", async () => {
      // First create the user
      await createTestUser("clerk_update_123", "old@example.com");

      // Then update
      const res = await jsonRequest("/api/v1/auth/webhook", {
        method: "POST",
        body: {
          type: "user.updated",
          data: {
            id: "clerk_update_123",
            email_addresses: [{ id: "email_1", email_address: "new@example.com" }],
            primary_email_address_id: "email_1",
          },
        },
        headers: {
          "svix-id": "test-id",
          "svix-timestamp": String(Date.now()),
          "svix-signature": "test-signature",
        },
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.received).toBe(true);
    });

    test("handles user.deleted event", async () => {
      // First create the user
      await createTestUser("clerk_delete_123", "delete@example.com");

      // Then delete
      const res = await jsonRequest("/api/v1/auth/webhook", {
        method: "POST",
        body: {
          type: "user.deleted",
          data: {
            id: "clerk_delete_123",
          },
        },
        headers: {
          "svix-id": "test-id",
          "svix-timestamp": String(Date.now()),
          "svix-signature": "test-signature",
        },
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.received).toBe(true);
    });

    test("returns 400 for missing Svix headers", async () => {
      const res = await jsonRequest("/api/v1/auth/webhook", {
        method: "POST",
        body: {
          type: "user.created",
          data: { id: "test" },
        },
      });
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.code).toBe("INVALID_WEBHOOK");
    });

    test("accepts all valid roles from metadata", async () => {
      const roles = ["caregiver", "therapist", "admin"];
      
      for (const role of roles) {
        clearRateLimitStore();
        const res = await jsonRequest("/api/v1/auth/webhook", {
          method: "POST",
          body: {
            type: "user.created",
            data: {
              id: `clerk_role_${role}`,
              email_addresses: [{ id: "email_1", email_address: `${role}@example.com` }],
              primary_email_address_id: "email_1",
              public_metadata: { role },
            },
          },
          headers: {
            "svix-id": "test-id",
            "svix-timestamp": String(Date.now()),
            "svix-signature": "test-signature",
          },
        });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body.received).toBe(true);
      }
    });
  });

  describe("POST /api/v1/auth/device", () => {
    beforeEach(async () => {
      // Create test user via webhook
      await createTestUser(mockClerkUserId, mockClerkEmail);
    });

    test("registers a device with valid Clerk token", async () => {
      const res = await jsonRequest("/api/v1/auth/device", {
        method: "POST",
        body: {
          deviceToken: "apns-device-token-12345",
          platform: "ios",
        },
        headers: {
          Authorization: "Bearer valid_clerk_token",
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
            Authorization: "Bearer valid_clerk_token",
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

    test("returns 401 with invalid token", async () => {
      const res = await jsonRequest("/api/v1/auth/device", {
        method: "POST",
        body: {
          deviceToken: "some-token",
          platform: "ios",
        },
        headers: {
          Authorization: "Bearer invalid_token",
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
          Authorization: "Bearer valid_clerk_token",
        },
      });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/v1/auth/me", () => {
    beforeEach(async () => {
      // Create test user via webhook
      await createTestUser(mockClerkUserId, mockClerkEmail, "therapist");
    });

    test("returns current user info", async () => {
      const res = await jsonRequest("/api/v1/auth/me", {
        headers: {
          Authorization: "Bearer valid_clerk_token",
        },
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.user!.email).toBe(mockClerkEmail);
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
          Authorization: "Bearer invalid_token",
        },
      });

      expect(res.status).toBe(401);
    });
  });

  describe("Rate Limiting", () => {
    beforeEach(async () => {
      await createTestUser(mockClerkUserId, mockClerkEmail);
    });

    test("enforces rate limits on device endpoint", async () => {
      // Make 6 requests (auth rate limit is 5)
      for (let i = 0; i < 5; i++) {
        await jsonRequest("/api/v1/auth/device", {
          method: "POST",
          body: {
            deviceToken: `token-${i}`,
            platform: "ios",
          },
          headers: {
            Authorization: "Bearer valid_clerk_token",
          },
        });
      }

      // 6th request should be rate limited
      const res = await jsonRequest("/api/v1/auth/device", {
        method: "POST",
        body: {
          deviceToken: "token-rate-limit",
          platform: "ios",
        },
        headers: {
          Authorization: "Bearer valid_clerk_token",
        },
      });
      const body = await res.json();

      expect(res.status).toBe(429);
      expect(body.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });
});
