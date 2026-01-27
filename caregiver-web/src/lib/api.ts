/**
 * API Client for Flynn Backend (Clerk Auth)
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  // Get Clerk token
  const token = localStorage.getItem("clerkToken");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.message || data.error || "Request failed" };
    }

    return { data };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Network error" };
  }
}

// Auth types
export interface AuthUser {
  id: string;
  email: string;
  role: "caregiver" | "therapist" | "admin";
}

// Auth API - only /me endpoint needed, Clerk handles login/register
export const authApi = {
  async me(): Promise<ApiResponse<{ user: AuthUser }>> {
    return fetchApi<{ user: AuthUser }>("/auth/me");
  },
};

// Children types
export interface Child {
  id: string;
  name: string;
  birthDate: string;
  familyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChildWithProgress extends Child {
  totalSymbols?: number;
  symbolsLearned?: number;
  recentActivity?: string;
}

// Children API
export const childrenApi = {
  async list(): Promise<ApiResponse<{ children: Child[] }>> {
    return fetchApi<{ children: Child[] }>("/children");
  },

  async get(id: string): Promise<ApiResponse<{ child: ChildWithProgress }>> {
    return fetchApi<{ child: ChildWithProgress }>(`/children/${id}`);
  },
};

// Families API
export const familiesApi = {
  async list(): Promise<ApiResponse<{ families: unknown[] }>> {
    return fetchApi<{ families: unknown[] }>("/families");
  },
};
