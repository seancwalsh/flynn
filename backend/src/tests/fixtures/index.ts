/**
 * Test fixtures for Flynn AAC Backend
 * 
 * Provides consistent test data that can be used across tests.
 * Use these fixtures to avoid magic strings and ensure consistency.
 */

import { getTestDb } from "../setup";
import { families, children, caregivers, therapists, usageLogs, insights } from "../../db/schema";

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
