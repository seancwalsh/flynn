/**
 * Shared constants across Flynn AAC platform
 */

import type { TherapyType, GoalStatus, InsightType, InsightSeverity } from "@flynn-aac/shared-types";

// Therapy types
export const THERAPY_TYPES: TherapyType[] = ["aac", "aba", "ot", "slp", "pt", "other"];

export const THERAPY_TYPE_LABELS: Record<TherapyType, string> = {
  aac: "AAC",
  aba: "ABA Therapy",
  ot: "Occupational Therapy",
  slp: "Speech-Language Pathology",
  pt: "Physical Therapy",
  other: "Other",
};

// Goal statuses
export const GOAL_STATUSES: GoalStatus[] = ["active", "achieved", "paused", "discontinued"];

export const GOAL_STATUS_LABELS: Record<GoalStatus, string> = {
  active: "Active",
  achieved: "Achieved",
  paused: "Paused",
  discontinued: "Discontinued",
};

// Insight types
export const INSIGHT_TYPES: InsightType[] = [
  "daily_digest",
  "weekly_report",
  "regression_alert",
  "milestone",
  "suggestion",
  "usage_trend",
  "vocabulary_growth",
  "session_reminder",
];

export const INSIGHT_TYPE_LABELS: Record<InsightType, string> = {
  daily_digest: "Daily Digest",
  weekly_report: "Weekly Report",
  regression_alert: "Regression Alert",
  milestone: "Milestone",
  suggestion: "Suggestion",
  usage_trend: "Usage Trend",
  vocabulary_growth: "Vocabulary Growth",
  session_reminder: "Session Reminder",
};

// Insight severities
export const INSIGHT_SEVERITIES: InsightSeverity[] = ["info", "warning", "critical"];

export const INSIGHT_SEVERITY_LABELS: Record<InsightSeverity, string> = {
  info: "Info",
  warning: "Warning",
  critical: "Critical",
};

// API configuration
export const API_BASE_URL =
  typeof window !== "undefined"
    ? (import.meta.env?.VITE_API_URL as string) || "http://localhost:3000/api/v1"
    : process.env.API_URL || "http://localhost:3000/api/v1";

// Pagination defaults
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Date formats
export const DATE_FORMAT_SHORT = "MMM d, yyyy";
export const DATE_FORMAT_LONG = "MMMM d, yyyy";
export const DATE_FORMAT_INPUT = "yyyy-MM-dd";
export const DATETIME_FORMAT = "MMM d, yyyy h:mm a";
