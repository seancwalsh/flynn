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

// Symbols types
export interface SymbolCategory {
  id: string;
  name: string;
  nameBulgarian: string | null;
  colorName: string;
  colorHex: string;
  icon: string | null;
  displayOrder: number;
  isSystem: boolean;
  createdAt: string;
}

export interface CustomSymbol {
  id: string;
  childId: string;
  name: string;
  nameBulgarian: string | null;
  categoryId: string;
  imageSource: "upload" | "url" | "generate";
  imageUrl: string | null;
  imagePrompt: string | null;
  imageKey: string | null;
  status: "pending" | "approved" | "rejected";
  gridPosition: number | null;
  createdBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomSymbolWithCategory extends CustomSymbol {
  category: {
    id: string;
    name: string;
    colorName: string;
    colorHex: string;
  } | null;
}

export interface ReviewSymbolInput {
  action: "approve" | "reject" | "request_changes";
  comment?: string;
}

// Symbols API (therapist functions only)
export const symbolsApi = {
  // Get pending symbols for approval (therapists only)
  async getPendingSymbols(): Promise<ApiResponse<{ data: CustomSymbolWithCategory[] }>> {
    return fetchApi<{ data: CustomSymbolWithCategory[] }>("/symbols/pending/all");
  },

  // Review symbol (approve/reject)
  async reviewSymbol(
    id: string,
    input: ReviewSymbolInput
  ): Promise<ApiResponse<{ data: CustomSymbol }>> {
    return fetchApi<{ data: CustomSymbol }>(`/symbols/custom/${id}/review`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  // Get approval history
  async getApprovalHistory(id: string): Promise<ApiResponse<{ data: any[] }>> {
    return fetchApi<{ data: any[] }>(`/symbols/custom/${id}/approvals`);
  },
};

// Re-export types for backward compatibility
export type { Child, Goal, TherapySession, TherapistClient, ApiResponse, TherapyType, GoalStatus };
