import { pgTable, uuid, varchar, timestamp, date, jsonb, primaryKey, integer, text, numeric, unique, index, boolean } from "drizzle-orm/pg-core";

// Users - authenticated users (via Clerk)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: varchar("clerk_id", { length: 255 }).unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: varchar("role", { length: 50 }).notNull().default("caregiver"), // caregiver, therapist, admin
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Devices - push notification tokens
export const devices = pgTable("devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  deviceToken: varchar("device_token", { length: 255 }).notNull(),
  platform: varchar("platform", { length: 20 }).notNull(), // ios, android, web
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Families - the primary organizational unit
export const families = pgTable("families", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Children - the primary users of the AAC app
export const children = pgTable("children", {
  id: uuid("id").primaryKey().defaultRandom(),
  familyId: uuid("family_id")
    .references(() => families.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  birthDate: date("birth_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Caregivers - parents, guardians, etc.
export const caregivers = pgTable("caregivers", {
  id: uuid("id").primaryKey().defaultRandom(),
  familyId: uuid("family_id")
    .references(() => families.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  role: varchar("role", { length: 50 }).notNull(), // parent, guardian, grandparent, nanny, other
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Therapists - speech-language pathologists and other professionals
export const therapists = pgTable("therapists", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Junction table: which therapists work with which children
export const therapistClients = pgTable(
  "therapist_clients",
  {
    therapistId: uuid("therapist_id")
      .references(() => therapists.id, { onDelete: "cascade" })
      .notNull(),
    childId: uuid("child_id")
      .references(() => children.id, { onDelete: "cascade" })
      .notNull(),
    grantedAt: timestamp("granted_at").defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.therapistId, table.childId] }),
  ]
);

// Usage logs - replicated from CloudKit, tracks symbol selections
export const usageLogs = pgTable("usage_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  childId: uuid("child_id")
    .references(() => children.id, { onDelete: "cascade" })
    .notNull(),
  symbolId: varchar("symbol_id", { length: 255 }).notNull(), // Reference to symbol in CloudKit
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  sessionId: uuid("session_id"), // Groups logs from a single AAC session
});

// AI-generated insights (daily digests, weekly reports, alerts)
export const insights = pgTable("insights", {
  id: uuid("id").primaryKey().defaultRandom(),
  childId: uuid("child_id")
    .references(() => children.id, { onDelete: "cascade" })
    .notNull(),
  type: varchar("type", { length: 50 }).notNull(), // daily_digest, weekly_report, regression_alert, milestone, suggestion
  severity: varchar("severity", { length: 20 }), // info, warning, critical (null for non-alerts)
  title: varchar("title", { length: 255 }),
  body: text("body"), // Human-readable summary
  content: jsonb("content").notNull(), // Flexible JSON content (data for rendering)
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  readAt: timestamp("read_at"), // When user first viewed it
  dismissedAt: timestamp("dismissed_at"), // When user dismissed it
}, (table) => [
  index("insights_child_unread_idx").on(table.childId, table.readAt),
  index("insights_generated_idx").on(table.generatedAt),
]);

// AI Conversations with Claude
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  caregiverId: uuid("caregiver_id")
    .references(() => caregivers.id, { onDelete: "cascade" })
    .notNull(),
  childId: uuid("child_id")
    .references(() => children.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Messages within a conversation
export const conversationMessages = pgTable("conversation_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .references(() => conversations.id, { onDelete: "cascade" })
    .notNull(),
  role: varchar("role", { length: 20 }).notNull(), // user, assistant, tool_call, tool_result
  content: text("content").notNull(), // Text content or JSON for tool calls/results
  toolName: varchar("tool_name", { length: 100 }), // For tool_call/tool_result roles
  toolCallId: varchar("tool_call_id", { length: 100 }), // Links tool_result to tool_call
  inputTokens: integer("input_tokens"),
  outputTokens: integer("output_tokens"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Type exports for use in application code
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;

export type Family = typeof families.$inferSelect;
export type NewFamily = typeof families.$inferInsert;

export type Child = typeof children.$inferSelect;
export type NewChild = typeof children.$inferInsert;

export type Caregiver = typeof caregivers.$inferSelect;
export type NewCaregiver = typeof caregivers.$inferInsert;

export type Therapist = typeof therapists.$inferSelect;
export type NewTherapist = typeof therapists.$inferInsert;

export type TherapistClient = typeof therapistClients.$inferSelect;
export type NewTherapistClient = typeof therapistClients.$inferInsert;

export type UsageLog = typeof usageLogs.$inferSelect;
export type NewUsageLog = typeof usageLogs.$inferInsert;

export type Insight = typeof insights.$inferSelect;
export type NewInsight = typeof insights.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type NewConversationMessage = typeof conversationMessages.$inferInsert;

// ============================================================================
// METRICS AGGREGATION TABLES (Phase 2 - Proactive Insights)
// ============================================================================

// Pre-computed daily metrics for fast querying and anomaly detection
export const dailyMetrics = pgTable("daily_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  childId: uuid("child_id")
    .references(() => children.id, { onDelete: "cascade" })
    .notNull(),
  date: date("date").notNull(),
  
  // Usage metrics
  totalTaps: integer("total_taps").notNull().default(0),
  uniqueSymbols: integer("unique_symbols").notNull().default(0),
  uniqueCategories: integer("unique_categories").notNull().default(0),
  sessionCount: integer("session_count").notNull().default(0),
  avgSessionLengthSeconds: integer("avg_session_length_seconds"),
  totalSessionSeconds: integer("total_session_seconds").default(0),
  
  // Phrase metrics
  phrasesBuilt: integer("phrases_built").notNull().default(0),
  avgPhraseLength: numeric("avg_phrase_length", { precision: 4, scale: 2 }),
  maxPhraseLength: integer("max_phrase_length"),
  
  // Language metrics (bilingual support)
  bulgarianTaps: integer("bulgarian_taps").notNull().default(0),
  englishTaps: integer("english_taps").notNull().default(0),
  
  // Category breakdown (stored as JSON: {category: count})
  categoryBreakdown: jsonb("category_breakdown"),
  
  // Time distribution (24 hourly buckets)
  hourlyDistribution: jsonb("hourly_distribution"), // [count0, count1, ..., count23]
  
  // Top vocabulary for the day
  topSymbols: jsonb("top_symbols"), // [{symbolId, label, count}]
  newSymbolsUsed: jsonb("new_symbols_used"), // First-time symbol uses
  
  // Metadata
  computedAt: timestamp("computed_at").defaultNow().notNull(),
}, (table) => [
  unique("daily_metrics_child_date_unique").on(table.childId, table.date),
  index("daily_metrics_child_date_idx").on(table.childId, table.date),
  index("daily_metrics_date_idx").on(table.date),
]);

// Weekly rollups for trend analysis
export const weeklyMetrics = pgTable("weekly_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  childId: uuid("child_id")
    .references(() => children.id, { onDelete: "cascade" })
    .notNull(),
  weekStart: date("week_start").notNull(), // Monday of the week
  
  // Aggregated from daily
  totalTaps: integer("total_taps").notNull().default(0),
  avgDailyTaps: numeric("avg_daily_taps", { precision: 6, scale: 2 }),
  activeDays: integer("active_days").notNull().default(0),
  
  // Vocabulary growth
  totalUniqueSymbols: integer("total_unique_symbols").notNull().default(0),
  newSymbolsThisWeek: integer("new_symbols_this_week").notNull().default(0),
  vocabularyGrowthRate: numeric("vocabulary_growth_rate", { precision: 5, scale: 4 }),
  
  // Session patterns
  avgSessionsPerDay: numeric("avg_sessions_per_day", { precision: 4, scale: 2 }),
  totalSessions: integer("total_sessions").notNull().default(0),
  peakUsageHour: integer("peak_usage_hour"), // 0-23
  weekendVsWeekdayRatio: numeric("weekend_weekday_ratio", { precision: 4, scale: 3 }),
  
  // Week-over-week comparison
  tapChangePercent: numeric("tap_change_percent", { precision: 5, scale: 2 }),
  vocabularyChangePercent: numeric("vocabulary_change_percent", { precision: 5, scale: 2 }),
  
  // Trend analysis (based on 4-week rolling comparison)
  tapsTrend: varchar("taps_trend", { length: 20 }), // improving, stable, declining
  vocabularyTrend: varchar("vocabulary_trend", { length: 20 }),
  overallTrend: varchar("overall_trend", { length: 20 }),
  
  // Metadata
  computedAt: timestamp("computed_at").defaultNow().notNull(),
}, (table) => [
  unique("weekly_metrics_child_week_unique").on(table.childId, table.weekStart),
  index("weekly_metrics_child_week_idx").on(table.childId, table.weekStart),
]);

// Rolling baselines for anomaly detection
export const metricBaselines = pgTable("metric_baselines", {
  id: uuid("id").primaryKey().defaultRandom(),
  childId: uuid("child_id")
    .references(() => children.id, { onDelete: "cascade" })
    .notNull(),
  metricName: varchar("metric_name", { length: 50 }).notNull(), // total_taps, unique_symbols, session_count, etc.
  
  // Statistical measures (calculated from rolling 28-day window)
  mean: numeric("mean", { precision: 10, scale: 4 }).notNull(),
  median: numeric("median", { precision: 10, scale: 4 }).notNull(),
  stdDev: numeric("std_dev", { precision: 10, scale: 4 }).notNull(),
  min: numeric("min_value", { precision: 10, scale: 4 }),
  max: numeric("max_value", { precision: 10, scale: 4 }),
  
  // Day-of-week adjustments (JSON: {mon: multiplier, tue: multiplier, ...})
  dayOfWeekFactors: jsonb("day_of_week_factors"),
  
  // Sample size and date range
  sampleDays: integer("sample_days").notNull(),
  periodStart: date("period_start").notNull(),
  periodEnd: date("period_end").notNull(),
  
  // Metadata
  computedAt: timestamp("computed_at").defaultNow().notNull(),
}, (table) => [
  unique("metric_baselines_child_metric_unique").on(table.childId, table.metricName),
  index("metric_baselines_child_idx").on(table.childId),
]);

// Detected anomalies for review and alerting
export const anomalies = pgTable("anomalies", {
  id: uuid("id").primaryKey().defaultRandom(),
  childId: uuid("child_id")
    .references(() => children.id, { onDelete: "cascade" })
    .notNull(),
  
  // Anomaly details
  type: varchar("type", { length: 50 }).notNull(), // usage_drop, vocabulary_regression, session_drop, etc.
  severity: varchar("severity", { length: 20 }).notNull(), // info, warning, critical
  metricName: varchar("metric_name", { length: 50 }).notNull(),
  
  // Values
  expectedValue: numeric("expected_value", { precision: 10, scale: 4 }).notNull(),
  actualValue: numeric("actual_value", { precision: 10, scale: 4 }).notNull(),
  deviationScore: numeric("deviation_score", { precision: 6, scale: 4 }).notNull(), // Z-score or similar
  
  // Context
  context: jsonb("context"), // Additional context data
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
  detectedForDate: date("detected_for_date").notNull(),
  
  // Resolution tracking
  acknowledged: boolean("acknowledged").default(false),
  acknowledgedAt: timestamp("acknowledged_at"),
  acknowledgedBy: uuid("acknowledged_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  resolution: varchar("resolution", { length: 255 }),
}, (table) => [
  index("anomalies_child_date_idx").on(table.childId, table.detectedForDate),
  index("anomalies_severity_idx").on(table.severity),
  index("anomalies_unacknowledged_idx").on(table.childId, table.acknowledged),
]);

// Type exports for metrics tables
export type DailyMetric = typeof dailyMetrics.$inferSelect;
export type NewDailyMetric = typeof dailyMetrics.$inferInsert;

export type WeeklyMetric = typeof weeklyMetrics.$inferSelect;
export type NewWeeklyMetric = typeof weeklyMetrics.$inferInsert;

export type MetricBaseline = typeof metricBaselines.$inferSelect;
export type NewMetricBaseline = typeof metricBaselines.$inferInsert;

export type Anomaly = typeof anomalies.$inferSelect;
export type NewAnomaly = typeof anomalies.$inferInsert;

// Notification preferences per user
export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull()
    .unique(),
  
  // Master switch
  enabled: boolean("enabled").notNull().default(true),
  
  // Per-type settings (JSON: {daily_digest: true, anomaly_warning: true, ...})
  typeSettings: jsonb("type_settings"),
  
  // Quiet hours
  quietHoursEnabled: boolean("quiet_hours_enabled").default(true),
  quietHoursStart: varchar("quiet_hours_start", { length: 5 }).default("22:00"), // HH:MM
  quietHoursEnd: varchar("quiet_hours_end", { length: 5 }).default("07:00"),
  timezone: varchar("timezone", { length: 50 }).default("UTC"),
  
  // Frequency limits
  maxPerHour: integer("max_per_hour").default(5),
  maxPerDay: integer("max_per_day").default(20),
  
  // Metadata
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Notification log for history/debugging
export const notificationLogs = pgTable("notification_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  
  // Delivery status
  success: boolean("success").notNull(),
  error: text("error"),
  messageId: varchar("message_id", { length: 255 }),
  
  // Related entities
  insightId: uuid("insight_id").references(() => insights.id, { onDelete: "set null" }),
  childId: uuid("child_id").references(() => children.id, { onDelete: "set null" }),
  
  sentAt: timestamp("sent_at").defaultNow().notNull(),
}, (table) => [
  index("notification_logs_user_idx").on(table.userId),
  index("notification_logs_sent_idx").on(table.sentAt),
]);

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreference = typeof notificationPreferences.$inferInsert;

export type NotificationLog = typeof notificationLogs.$inferSelect;
export type NewNotificationLog = typeof notificationLogs.$inferInsert;
