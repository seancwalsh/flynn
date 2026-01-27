import { pgTable, uuid, varchar, timestamp, date, jsonb, primaryKey } from "drizzle-orm/pg-core";

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
  content: jsonb("content").notNull(), // Flexible JSON content
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

// ===== AUTHENTICATION TABLES =====

// Users - authentication accounts (linked to Clerk)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: varchar("clerk_id", { length: 255 }).unique(), // Clerk user ID
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }), // Nullable - Clerk handles auth
  role: varchar("role", { length: 50 }).notNull(), // caregiver, therapist, admin
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Devices - registered devices for push notifications / device-specific auth
export const devices = pgTable("devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  deviceToken: varchar("device_token", { length: 512 }).notNull(),
  platform: varchar("platform", { length: 20 }).notNull(), // ios, android, web
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Refresh tokens - for token rotation
export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  tokenHash: varchar("token_hash", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
});

// Type exports for use in application code
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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
