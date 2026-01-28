/**
 * Auth Context Tests
 *
 * Tests for auth context behavior with various error scenarios.
 * Note: These tests use a simplified mock approach since the real
 * AuthProvider depends on Clerk hooks.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { server } from "~/mocks/node";
import { authErrorHandlers, mockUser } from "~/mocks/handlers/auth";
import { authApi } from "./api";

// Mock Clerk hooks
vi.mock("@clerk/clerk-react", () => ({
  useAuth: vi.fn(() => ({
    isLoaded: true,
    isSignedIn: true,
    signOut: vi.fn(),
    getToken: vi.fn().mockResolvedValue("test-token"),
  })),
  useUser: vi.fn(() => ({
    user: { id: "clerk-user-123" },
  })),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe("Auth API integration", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("authApi.me() error handling", () => {
    it("handles 401 Unauthorized response", async () => {
      server.use(authErrorHandlers.unauthorized);
      localStorage.setItem("clerkToken", "test-token");

      const result = await authApi.me();

      expect(result.error).toBe("Unauthorized");
      expect(result.data).toBeUndefined();
    });

    it("handles 403 Forbidden response", async () => {
      server.use(authErrorHandlers.forbidden);
      localStorage.setItem("clerkToken", "test-token");

      const result = await authApi.me();

      expect(result.error).toBe("Forbidden");
      expect(result.data).toBeUndefined();
    });

    it("handles 500 Server Error response", async () => {
      server.use(authErrorHandlers.serverError);
      localStorage.setItem("clerkToken", "test-token");

      const result = await authApi.me();

      expect(result.error).toBe("Internal server error");
      expect(result.data).toBeUndefined();
    });

    it("handles network failure", async () => {
      server.use(authErrorHandlers.networkError);
      localStorage.setItem("clerkToken", "test-token");

      const result = await authApi.me();

      expect(result.error).toBe("Failed to fetch");
      expect(result.data).toBeUndefined();
    });

    it("returns user data on success", async () => {
      // Default handlers are used (success)
      localStorage.setItem("clerkToken", "test-token");

      const result = await authApi.me();

      expect(result.error).toBeUndefined();
      expect(result.data?.user).toEqual(mockUser);
    });
  });
});

describe("Auth state behavior", () => {
  it("should track loading state during authentication", async () => {
    // Simulate the auth flow
    let isLoading = true;
    let user = null;
    let error = null;

    // Simulate loading
    expect(isLoading).toBe(true);
    expect(user).toBeNull();

    // Simulate successful auth
    const result = await authApi.me();
    isLoading = false;

    if (result.error) {
      error = result.error;
    } else {
      user = result.data?.user ?? null;
    }

    expect(isLoading).toBe(false);
    expect(user).toEqual(mockUser);
    expect(error).toBeNull();
  });

  it("should set error state on authentication failure", async () => {
    server.use(authErrorHandlers.serverError);
    localStorage.setItem("clerkToken", "test-token");

    let isLoading = true;
    let user = null;
    let error: string | null = null;

    const result = await authApi.me();
    isLoading = false;

    if (result.error) {
      error = result.error;
    } else {
      user = result.data?.user ?? null;
    }

    expect(isLoading).toBe(false);
    expect(user).toBeNull();
    expect(error).toBe("Internal server error");
  });

  it("should handle 401 without crashing", async () => {
    server.use(authErrorHandlers.unauthorized);
    localStorage.setItem("clerkToken", "test-token");

    const result = await authApi.me();

    // The app should gracefully handle 401 errors
    expect(result.error).toBe("Unauthorized");
    // In a real scenario, this might trigger a sign-out
  });

  it("should handle network errors gracefully", async () => {
    server.use(authErrorHandlers.networkError);
    localStorage.setItem("clerkToken", "test-token");

    const result = await authApi.me();

    // Network errors should be caught and converted to error messages
    expect(result.error).toBe("Failed to fetch");
  });
});
