import { pgTable, uuid, varchar, timestamp, date, jsonb, primaryKey, integer, text } from "drizzle-orm/pg-core";

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
  content: jsonb("content").notNull(), // Flexible JSON content
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

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
