/**
 * API Client for Flynn AAC Therapist Dashboard
 */

import type {
  Child,
  Goal,
  TherapySession,
  TherapistClient,
  ApiResponse,
  TherapyType,
  GoalStatus,
} from "@flynn-aac/shared-types";
import { API_BASE_URL } from "@flynn-aac/shared-utils";

// Helper for making authenticated requests
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem("clerk_token");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  // Dev auth bypass for local development
  if (import.meta.env.DEV) {
    headers["x-dev-auth-bypass"] = "dev-user";
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      return { error: error.error || error.message || "Request failed" };
    }

    return await response.json();
  } catch (error) {
    console.error("API request failed:", error);
    return { error: error instanceof Error ? error.message : "Network error" };
  }
}

// Therapist API
export const therapistApi = {
  // Get therapist's assigned clients
  async listClients(therapistId: string): Promise<ApiResponse<TherapistClient[]>> {
    return fetchApi<TherapistClient[]>(`/therapists/${therapistId}/clients`);
  },

  // Remove a client assignment
  async removeClient(therapistId: string, childId: string): Promise<ApiResponse<{ message: string }>> {
    return fetchApi<{ message: string }>(`/therapists/${therapistId}/clients/${childId}`, {
      method: "DELETE",
    });
  },
};

// Children API
export const childrenApi = {
  // Get child details
  async get(childId: string): Promise<ApiResponse<Child>> {
    return fetchApi<Child>(`/children/${childId}`);
  },
};

// Goals API
export const goalsApi = {
  // List goals for a child
  async listForChild(childId: string, status?: GoalStatus): Promise<ApiResponse<Goal[]>> {
    const query = status ? `?status=${status}` : "";
    return fetchApi<Goal[]>(`/children/${childId}/goals${query}`);
  },

  // Update goal
  async update(goalId: string, data: Partial<Goal>): Promise<ApiResponse<Goal>> {
    return fetchApi<Goal>(`/goals/${goalId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  // Create goal
  async create(childId: string, data: Omit<Goal, "id" | "createdAt" | "updatedAt" | "childId" | "status">): Promise<ApiResponse<Goal>> {
    return fetchApi<Goal>(`/children/${childId}/goals`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};

// Sessions API
export const sessionsApi = {
  // List sessions for a child
  async listForChild(childId: string): Promise<ApiResponse<TherapySession[]>> {
    return fetchApi<TherapySession[]>(`/children/${childId}/sessions`);
  },

  // Create session
  async create(childId: string, data: Omit<TherapySession, "id" | "createdAt" | "childId" | "therapistId">): Promise<ApiResponse<TherapySession>> {
    return fetchApi<TherapySession>(`/children/${childId}/sessions`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Update session
  async update(sessionId: string, data: Partial<TherapySession>): Promise<ApiResponse<TherapySession>> {
    return fetchApi<TherapySession>(`/sessions/${sessionId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  // Delete session
  async delete(sessionId: string): Promise<ApiResponse<{ message: string }>> {
    return fetchApi<{ message: string }>(`/sessions/${sessionId}`, {
      method: "DELETE",
    });
  },
};

// Re-export types for backward compatibility
export type { Child, Goal, TherapySession, TherapistClient, ApiResponse, TherapyType, GoalStatus };
