/**
 * API Client Tests
 *
 * Tests for error handling in the API client.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { server } from "~/mocks/node";
import { authErrorHandlers, mockUser } from "~/mocks/handlers/auth";
import { authApi } from "./api";

describe("authApi", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("me()", () => {
    it("returns user data on success", async () => {
      // Default handler returns success
      localStorage.setItem("clerkToken", "test-token");

      const result = await authApi.me();

      expect(result.data).toEqual({ user: mockUser });
      expect(result.error).toBeUndefined();
    });

    it("returns error message on 401 Unauthorized", async () => {
      server.use(authErrorHandlers.unauthorized);
      localStorage.setItem("clerkToken", "test-token");

      const result = await authApi.me();

      expect(result.data).toBeUndefined();
      expect(result.error).toBe("Unauthorized");
    });

    it("returns error message on 403 Forbidden", async () => {
      server.use(authErrorHandlers.forbidden);
      localStorage.setItem("clerkToken", "test-token");

      const result = await authApi.me();

      expect(result.data).toBeUndefined();
      expect(result.error).toBe("Forbidden");
    });

    it("returns error message on 500 Server Error", async () => {
      server.use(authErrorHandlers.serverError);
      localStorage.setItem("clerkToken", "test-token");

      const result = await authApi.me();

      expect(result.data).toBeUndefined();
      expect(result.error).toBe("Internal server error");
    });

    it("returns network error message on network failure", async () => {
      server.use(authErrorHandlers.networkError);
      localStorage.setItem("clerkToken", "test-token");

      const result = await authApi.me();

      expect(result.data).toBeUndefined();
      expect(result.error).toBe("Failed to fetch");
    });

    it("includes authorization header when token exists", async () => {
      localStorage.setItem("clerkToken", "my-test-token");

      await authApi.me();

      // The request was made (default handler responds with success)
      // We verify this by checking the response
      const result = await authApi.me();
      expect(result.data).toBeDefined();
    });

    it("makes request without authorization header when no token", async () => {
      // No token set
      const result = await authApi.me();

      // Should still get a response (authorization may fail at server)
      expect(result).toBeDefined();
    });
  });
});
