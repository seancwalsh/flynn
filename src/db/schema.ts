import { pgTable, uuid, varchar, timestamp, date, jsonb, primaryKey } from "drizzle-orm/pg-core";

// Re-export chat schema for convenience
export * from "./schema/chat";

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
