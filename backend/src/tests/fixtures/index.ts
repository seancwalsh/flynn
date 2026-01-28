/**
 * Test fixtures for Flynn AAC Backend
 * 
 * Provides consistent test data that can be used across tests.
 * Use these fixtures to avoid magic strings and ensure consistency.
 */

import { getTestDb } from "../setup";
import { families, children, caregivers, therapists, usageLogs, insights, goals, therapySessions, notes } from "../../db/schema";

/**
 * Create a test family and return its data
 */
export async function createTestFamily(overrides: { name?: string } = {}) {
  const db = getTestDb();
  const [family] = await db.insert(families).values({
    name: overrides.name ?? "Test Family",
  }).returning();
  return family;
}

/**
 * Create a test child (requires a family)
 */
export async function createTestChild(
  familyId: string,
  overrides: { name?: string; birthDate?: string } = {}
) {
  const db = getTestDb();
  const [child] = await db.insert(children).values({
    familyId,
    name: overrides.name ?? "Test Child",
    birthDate: overrides.birthDate ?? "2020-01-15",
  }).returning();
  return child;
}

/**
 * Create a test caregiver (requires a family)
 */
export async function createTestCaregiver(
  familyId: string,
  overrides: { name?: string; email?: string; role?: string } = {}
) {
  const db = getTestDb();
  const uniqueEmail = `caregiver-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
  const [caregiver] = await db.insert(caregivers).values({
    familyId,
    name: overrides.name ?? "Test Caregiver",
    email: overrides.email ?? uniqueEmail,
    role: overrides.role ?? "parent",
  }).returning();
  return caregiver;
}

/**
 * Create a test therapist
 */
export async function createTestTherapist(
  overrides: { name?: string; email?: string } = {}
) {
  const db = getTestDb();
  const uniqueEmail = `therapist-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
  const [therapist] = await db.insert(therapists).values({
    name: overrides.name ?? "Dr. Test Therapist",
    email: overrides.email ?? uniqueEmail,
  }).returning();
  return therapist;
}

/**
 * Create test usage logs for a child
 */
export async function createTestUsageLogs(
  childId: string,
  count: number = 5,
  options: { symbolPrefix?: string; sessionId?: string } = {}
) {
  const db = getTestDb();
  const logs = [];
  
  for (let i = 0; i < count; i++) {
    const [log] = await db.insert(usageLogs).values({
      childId,
      symbolId: `${options.symbolPrefix ?? "symbol"}-${i + 1}`,
      sessionId: options.sessionId ?? null,
      timestamp: new Date(Date.now() - i * 60000), // Each log 1 minute apart
    }).returning();
    logs.push(log);
  }
  
  return logs;
}

/**
 * Create a test insight for a child
 */
export async function createTestInsight(
  childId: string,
  overrides: { type?: string; content?: Record<string, unknown> } = {}
) {
  const db = getTestDb();
  const [insight] = await db.insert(insights).values({
    childId,
    type: overrides.type ?? "daily_digest",
    content: overrides.content ?? {
      summary: "Test summary",
      highlights: ["Used 10 new words", "Showed interest in animals"],
    },
  }).returning();
  return insight;
}

/**
 * Create a test goal for a child
 */
export async function createTestGoal(
  childId: string,
  overrides: {
    title?: string;
    description?: string;
    therapyType?: string;
    status?: string;
    progressPercent?: number;
    targetDate?: string;
  } = {}
) {
  const db = getTestDb();
  const [goal] = await db.insert(goals).values({
    childId,
    title: overrides.title ?? "Test Goal",
    description: overrides.description ?? "Test goal description",
    therapyType: overrides.therapyType ?? "aba",
    status: overrides.status ?? "active",
    progressPercent: overrides.progressPercent ?? 0,
    targetDate: overrides.targetDate ?? null,
  }).returning();
  return goal;
}

/**
 * Create a test therapy session for a child
 */
export async function createTestSession(
  childId: string,
  overrides: {
    therapyType?: string;
    sessionDate?: string;
    durationMinutes?: number;
    notes?: string;
    therapistId?: string;
    goalsWorkedOn?: Array<{ goalId: string; progress?: number; notes?: string }>;
  } = {}
) {
  const db = getTestDb();
  const today = new Date().toISOString().split("T")[0] as string;
  const [session] = await db.insert(therapySessions).values({
    childId,
    therapyType: overrides.therapyType ?? "aba",
    sessionDate: overrides.sessionDate ?? today,
    durationMinutes: overrides.durationMinutes ?? 45,
    notes: overrides.notes ?? null,
    therapistId: overrides.therapistId ?? null,
    goalsWorkedOn: overrides.goalsWorkedOn ?? null,
  }).returning();
  return session;
}

/**
 * Create a test note for a child
 */
export async function createTestNote(
  childId: string,
  overrides: {
    content?: string;
    type?: string;
    authorId?: string;
  } = {}
) {
  const db = getTestDb();
  const [note] = await db.insert(notes).values({
    childId,
    content: overrides.content ?? "Test note content",
    type: overrides.type ?? "general",
    authorId: overrides.authorId ?? null,
  }).returning();
  return note;
}

/**
 * Create a complete test family with child, caregiver, and some usage data
 */
export async function createCompleteTestFamily() {
  const family = await createTestFamily({ name: "Complete Test Family" });
  if (!family) throw new Error("Failed to create test family");
  
  const child = await createTestChild(family.id, { name: "Test Child", birthDate: "2021-06-15" });
  if (!child) throw new Error("Failed to create test child");
  
  const caregiver = await createTestCaregiver(family.id, { role: "parent" });
  const logs = await createTestUsageLogs(child.id, 10);
  const insight = await createTestInsight(child.id);
  
  return {
    family,
    child,
    caregiver,
    logs,
    insight,
  };
}
