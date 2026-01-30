/**
 * Database entity types
 * These match the Drizzle ORM schema definitions
 */

// Core entities
export interface User {
  id: string;
  clerkId: string | null;
  email: string;
  role: "caregiver" | "therapist" | "admin";
  createdAt: Date;
}

export interface Family {
  id: string;
  name: string;
  createdAt: Date;
}

export interface Child {
  id: string;
  familyId: string;
  name: string;
  birthDate: string | null;
  createdAt: Date;
}

export interface Caregiver {
  id: string;
  familyId: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

export interface Therapist {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface TherapistClient {
  therapistId: string;
  childId: string;
  grantedAt: Date;
}

export interface UsageLog {
  id: string;
  childId: string;
  symbolId: string;
  timestamp: Date;
  sessionId: string | null;
}

export interface Insight {
  id: string;
  childId: string;
  type: InsightType;
  severity: InsightSeverity | null;
  title: string | null;
  body: string | null;
  content: Record<string, unknown>;
  generatedAt: Date;
  readAt: Date | null;
  dismissedAt: Date | null;
}

export interface Conversation {
  id: string;
  caregiverId: string;
  childId: string | null;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "tool_call" | "tool_result";
  content: string;
  toolName: string | null;
  toolCallId: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  createdAt: Date;
}

// Metrics entities
export interface DailyMetric {
  id: string;
  childId: string;
  date: string;
  totalTaps: number;
  uniqueSymbols: number;
  uniqueCategories: number;
  sessionCount: number;
  avgSessionLengthSeconds: number | null;
  totalSessionSeconds: number | null;
  phrasesBuilt: number;
  avgPhraseLength: string | null;
  maxPhraseLength: number | null;
  bulgarianTaps: number;
  englishTaps: number;
  categoryBreakdown: Record<string, number> | null;
  hourlyDistribution: number[] | null;
  topSymbols: Array<{ symbolId: string; label: string; count: number }> | null;
  newSymbolsUsed: string[] | null;
  computedAt: Date;
}

export interface WeeklyMetric {
  id: string;
  childId: string;
  weekStart: string;
  totalTaps: number;
  avgDailyTaps: string | null;
  activeDays: number;
  totalUniqueSymbols: number;
  newSymbolsThisWeek: number;
  vocabularyGrowthRate: string | null;
  avgSessionsPerDay: string | null;
  totalSessions: number;
  peakUsageHour: number | null;
  weekendVsWeekdayRatio: string | null;
  tapChangePercent: string | null;
  vocabularyChangePercent: string | null;
  tapsTrend: string | null;
  vocabularyTrend: string | null;
  overallTrend: string | null;
  computedAt: Date;
}

// Therapy-related entities
export interface Goal {
  id: string;
  childId: string;
  therapyType: TherapyType;
  title: string;
  description: string | null;
  category: string | null;
  targetDate: string | null;
  status: GoalStatus;
  progressPercent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TherapySession {
  id: string;
  childId: string;
  therapistId: string | null;
  therapyType: TherapyType;
  date: string;
  durationMinutes: number;
  notes: string | null;
  createdAt: Date;
}

export interface Note {
  id: string;
  childId: string;
  authorId: string;
  content: string;
  createdAt: Date;
}

// Notification entities
export interface Device {
  id: string;
  userId: string;
  deviceToken: string;
  platform: "ios" | "android" | "web";
  createdAt: Date;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  dailyDigests: boolean;
  weeklyReports: boolean;
  regressionAlerts: boolean;
  milestones: boolean;
  suggestions: boolean;
  pushEnabled: boolean;
  emailEnabled: boolean;
  digestTime: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationLog {
  id: string;
  userId: string;
  insightId: string | null;
  type: string;
  channel: "push" | "email";
  status: "pending" | "sent" | "failed";
  sentAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
}

// Enums and types
export type TherapyType = "aac" | "aba" | "ot" | "slp" | "pt" | "other";

export type GoalStatus = "active" | "achieved" | "paused" | "discontinued";

export type InsightType =
  | "daily_digest"
  | "weekly_report"
  | "regression_alert"
  | "milestone"
  | "suggestion"
  | "usage_trend"
  | "vocabulary_growth"
  | "session_reminder";

export type InsightSeverity = "info" | "warning" | "critical";

export type UserRole = "caregiver" | "therapist" | "admin";

// Insert types (for creating new records)
export type NewUser = Omit<User, "id" | "createdAt">;
export type NewFamily = Omit<Family, "id" | "createdAt">;
export type NewChild = Omit<Child, "id" | "createdAt">;
export type NewCaregiver = Omit<Caregiver, "id" | "createdAt">;
export type NewTherapist = Omit<Therapist, "id" | "createdAt">;
export type NewTherapistClient = Omit<TherapistClient, "grantedAt">;
export type NewUsageLog = Omit<UsageLog, "id" | "timestamp">;
export type NewInsight = Omit<Insight, "id" | "generatedAt" | "readAt" | "dismissedAt">;
export type NewConversation = Omit<Conversation, "id" | "createdAt" | "updatedAt">;
export type NewConversationMessage = Omit<ConversationMessage, "id" | "createdAt">;
export type NewGoal = Omit<Goal, "id" | "createdAt" | "updatedAt">;
export type NewTherapySession = Omit<TherapySession, "id" | "createdAt">;
export type NewNote = Omit<Note, "id" | "createdAt">;
export type NewDevice = Omit<Device, "id" | "createdAt">;
export type NewNotificationPreference = Omit<NotificationPreference, "id" | "createdAt" | "updatedAt">;
export type NewNotificationLog = Omit<NotificationLog, "id" | "createdAt">;
