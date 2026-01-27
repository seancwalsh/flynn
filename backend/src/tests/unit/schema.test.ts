/**
 * Schema validation tests
 * 
 * These tests verify our Zod schemas validate input correctly
 * without needing a database connection.
 */

import { describe, test, expect } from "bun:test";
import { z } from "zod/v4";

// Recreate the schemas here to test them in isolation
const createFamilySchema = z.object({
  name: z.string().min(1).max(255),
});

const createChildSchema = z.object({
  familyId: z.string().uuid(),
  name: z.string().min(1).max(255),
  birthDate: z.string().date().optional(),
});

const caregiverRoleSchema = z.enum(["parent", "guardian", "grandparent", "nanny", "other"]);

const createCaregiverSchema = z.object({
  familyId: z.string().uuid(),
  name: z.string().min(1).max(255),
  email: z.string().email(),
  role: caregiverRoleSchema,
});

const createTherapistSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
});

const insightTypeSchema = z.enum([
  "daily_digest",
  "weekly_report",
  "regression_alert",
  "milestone",
  "suggestion",
]);

const createInsightSchema = z.object({
  childId: z.string().uuid(),
  type: insightTypeSchema,
  content: z.record(z.string(), z.unknown()),
});

describe("Family Schema", () => {
  test("accepts valid family data", () => {
    const result = createFamilySchema.safeParse({ name: "Smith Family" });
    expect(result.success).toBe(true);
  });

  test("rejects empty name", () => {
    const result = createFamilySchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  test("rejects missing name", () => {
    const result = createFamilySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  test("rejects name over 255 characters", () => {
    const result = createFamilySchema.safeParse({ name: "a".repeat(256) });
    expect(result.success).toBe(false);
  });

  test("accepts name at max length (255)", () => {
    const result = createFamilySchema.safeParse({ name: "a".repeat(255) });
    expect(result.success).toBe(true);
  });
});

describe("Child Schema", () => {
  const validChild = {
    familyId: "123e4567-e89b-12d3-a456-426614174000",
    name: "Test Child",
  };

  test("accepts valid child data without birthDate", () => {
    const result = createChildSchema.safeParse(validChild);
    expect(result.success).toBe(true);
  });

  test("accepts valid child data with birthDate", () => {
    const result = createChildSchema.safeParse({
      ...validChild,
      birthDate: "2020-01-15",
    });
    expect(result.success).toBe(true);
  });

  test("rejects invalid UUID for familyId", () => {
    const result = createChildSchema.safeParse({
      ...validChild,
      familyId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid date format", () => {
    const result = createChildSchema.safeParse({
      ...validChild,
      birthDate: "01/15/2020",
    });
    expect(result.success).toBe(false);
  });

  test("rejects empty name", () => {
    const result = createChildSchema.safeParse({
      ...validChild,
      name: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("Caregiver Schema", () => {
  const validCaregiver = {
    familyId: "123e4567-e89b-12d3-a456-426614174000",
    name: "Jane Doe",
    email: "jane@example.com",
    role: "parent",
  };

  test("accepts valid caregiver data", () => {
    const result = createCaregiverSchema.safeParse(validCaregiver);
    expect(result.success).toBe(true);
  });

  test("accepts all valid roles", () => {
    const roles = ["parent", "guardian", "grandparent", "nanny", "other"];
    for (const role of roles) {
      const result = createCaregiverSchema.safeParse({
        ...validCaregiver,
        role,
      });
      expect(result.success).toBe(true);
    }
  });

  test("rejects invalid role", () => {
    const result = createCaregiverSchema.safeParse({
      ...validCaregiver,
      role: "teacher",
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid email", () => {
    const result = createCaregiverSchema.safeParse({
      ...validCaregiver,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });
});

describe("Therapist Schema", () => {
  test("accepts valid therapist data", () => {
    const result = createTherapistSchema.safeParse({
      name: "Dr. Smith",
      email: "dr.smith@therapy.com",
    });
    expect(result.success).toBe(true);
  });

  test("rejects missing email", () => {
    const result = createTherapistSchema.safeParse({
      name: "Dr. Smith",
    });
    expect(result.success).toBe(false);
  });
});

describe("Insight Schema", () => {
  const validInsight = {
    childId: "123e4567-e89b-12d3-a456-426614174000",
    type: "daily_digest",
    content: { summary: "Today was great!" },
  };

  test("accepts valid insight data", () => {
    const result = createInsightSchema.safeParse(validInsight);
    expect(result.success).toBe(true);
  });

  test("accepts all valid insight types", () => {
    const types = ["daily_digest", "weekly_report", "regression_alert", "milestone", "suggestion"];
    for (const type of types) {
      const result = createInsightSchema.safeParse({
        ...validInsight,
        type,
      });
      expect(result.success).toBe(true);
    }
  });

  test("rejects invalid insight type", () => {
    const result = createInsightSchema.safeParse({
      ...validInsight,
      type: "invalid_type",
    });
    expect(result.success).toBe(false);
  });

  test("accepts complex content objects", () => {
    const result = createInsightSchema.safeParse({
      ...validInsight,
      content: {
        summary: "Great progress!",
        highlights: ["Used 10 new words", "Started combining symbols"],
        metrics: { totalSymbols: 50, uniqueSymbols: 25 },
        nested: { deeply: { nested: true } },
      },
    });
    expect(result.success).toBe(true);
  });
});
