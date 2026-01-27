/**
 * API response types for type-safe JSON parsing
 */

import type { Family, Child, Caregiver, Therapist, UsageLog, Insight } from "../db/schema";

// Generic API response wrapper
export interface ApiResponse<T> {
  data: T;
}

export interface ApiListResponse<T> {
  data: T[];
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
  message?: string;
  details?: unknown;
}

export interface ApiMessageResponse {
  message: string;
}

// Health check types
export interface HealthStatus {
  status: "healthy" | "degraded";
  timestamp: string;
  version: string;
  services: {
    database: { connected: boolean; message: string };
    redis: { connected: boolean; message: string };
  };
}

export interface LiveStatus {
  status: "alive";
}

export interface ReadyStatus {
  status: "ready" | "not ready";
  reason?: string;
}

// Resource-specific response types
export type FamilyResponse = ApiResponse<Family>;
export type FamilyListResponse = ApiListResponse<Family>;

export type ChildResponse = ApiResponse<Child>;
export type ChildListResponse = ApiListResponse<Child>;

export type CaregiverResponse = ApiResponse<Caregiver>;
export type CaregiverListResponse = ApiListResponse<Caregiver>;

export type TherapistResponse = ApiResponse<Therapist>;
export type TherapistListResponse = ApiListResponse<Therapist>;

export type UsageLogResponse = ApiResponse<UsageLog>;
export type UsageLogListResponse = ApiListResponse<UsageLog>;

export type InsightResponse = ApiResponse<Insight>;
export type InsightListResponse = ApiListResponse<Insight>;

// Helper to safely parse JSON with type assertion
export function parseJsonResponse<T>(data: unknown): T {
  return data as T;
}
