/**
 * API request/response types
 */

import type {
  Child,
  Goal,
  TherapySession,
  Insight,
  Conversation,
  ConversationMessage,
  Family,
  Caregiver,
  Therapist,
  TherapistClient,
  UsageLog,
  DailyMetric,
  WeeklyMetric,
  TherapyType,
  GoalStatus,
} from "./database";

// Generic API response wrappers
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiListResponse<T> {
  data: T[];
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
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

export type GoalResponse = ApiResponse<Goal>;
export type GoalListResponse = ApiListResponse<Goal>;

export type SessionResponse = ApiResponse<TherapySession>;
export type SessionListResponse = ApiListResponse<TherapySession>;

// Extended types with additional data
export interface ChildWithProgress extends Child {
  progressPercent?: number;
  currentGoals?: number;
  achievedGoals?: number;
}

export interface TherapistClientWithChild extends TherapistClient {
  child: Child;
}

export interface ConversationWithMessages extends Conversation {
  messages: ConversationMessage[];
  messageCount: number;
}

// Input types for creating/updating resources
export interface CreateChildInput {
  familyId: string;
  name: string;
  birthDate?: string;
}

export interface UpdateChildInput {
  name?: string;
  birthDate?: string;
}

export interface CreateGoalInput {
  childId: string;
  therapyType: TherapyType;
  title: string;
  description?: string;
  category?: string;
  targetDate?: string;
}

export interface UpdateGoalInput {
  title?: string;
  description?: string;
  category?: string;
  targetDate?: string;
  status?: GoalStatus;
  progressPercent?: number;
}

export interface CreateSessionInput {
  childId: string;
  therapistId?: string;
  therapyType: TherapyType;
  date: string;
  durationMinutes: number;
  notes?: string;
}

export interface UpdateSessionInput {
  date?: string;
  durationMinutes?: number;
  notes?: string;
}

// Query parameter types
export interface ChildStatsQuery {
  childId: string;
  startDate?: string;
  endDate?: string;
}

export interface InsightsListQuery {
  childId: string;
  type?: string;
  severity?: string;
  unreadOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface GoalsListQuery {
  childId: string;
  status?: GoalStatus;
  therapyType?: TherapyType;
}

export interface SessionsListQuery {
  childId: string;
  therapyType?: TherapyType;
  startDate?: string;
  endDate?: string;
}

export interface ConversationsListQuery {
  caregiverId: string;
  childId?: string;
  limit?: number;
  offset?: number;
}

// Usage statistics types
export interface UsageStats {
  totalTaps: number;
  uniqueSymbols: number;
  sessionCount: number;
  avgSessionLength: number;
  topCategories: Array<{ category: string; count: number }>;
  topSymbols: Array<{ symbolId: string; label: string; count: number }>;
  dailyAverage: number;
  weeklyTrend: "increasing" | "stable" | "decreasing";
}

export interface ChildStats {
  child: Child;
  usage: UsageStats;
  goals: {
    active: number;
    achieved: number;
    total: number;
  };
  insights: {
    unread: number;
    criticalAlerts: number;
  };
}

// Insights response with expanded content
export interface InsightWithContent extends Insight {
  childName?: string;
}

// Authentication types
export interface AuthUser {
  id: string;
  email: string;
  role: string;
  familyId?: string;
}

// Chat API types
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface StreamChunk {
  type: "content" | "tool_use" | "tool_result" | "done" | "error";
  content?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: unknown;
  error?: string;
}

// Helper to safely parse JSON with type assertion
export function parseJsonResponse<T>(data: unknown): T {
  return data as T;
}
