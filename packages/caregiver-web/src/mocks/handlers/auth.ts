/**
 * MSW handlers for auth endpoints
 */

import { http, HttpResponse, delay } from "msw";

const API_BASE = "http://localhost:3000/api/v1";

// Mock user for successful auth
export const mockUser = {
  id: "user-123",
  email: "test@example.com",
  role: "caregiver" as const,
};

// Default success handler
export const authMeHandler = http.get(`${API_BASE}/auth/me`, async () => {
  await delay(50);
  return HttpResponse.json({ user: mockUser });
});

// Error scenario handlers
export const authErrorHandlers = {
  unauthorized: http.get(`${API_BASE}/auth/me`, async () => {
    await delay(50);
    return HttpResponse.json(
      { message: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }),

  forbidden: http.get(`${API_BASE}/auth/me`, async () => {
    await delay(50);
    return HttpResponse.json(
      { message: "Forbidden", code: "FORBIDDEN" },
      { status: 403 }
    );
  }),

  serverError: http.get(`${API_BASE}/auth/me`, async () => {
    await delay(50);
    return HttpResponse.json(
      { message: "Internal server error", code: "SERVER_ERROR" },
      { status: 500 }
    );
  }),

  networkError: http.get(`${API_BASE}/auth/me`, () => {
    return HttpResponse.error();
  }),
};

// Default handlers array
export const authHandlers = [authMeHandler];
