/**
 * Database integration tests
 * 
 * These tests verify database connectivity, schema correctness,
 * and basic CRUD operations work correctly.
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { getTestDb, setupTestDatabase, cleanTestData, closeTestDb, teardownTestDatabase } from "../setup";
import { families, children } from "../../db/schema";
import { eq, sql } from "drizzle-orm";

describe("Database Connection", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
    await closeTestDb();
  });

  test("can connect to test database", async () => {
    const db = getTestDb();
    
    // Simple query to verify connection
    const result = await db.execute(sql`SELECT 1 as one`);
    expect(result[0]?.one).toBe(1);
  });

  test("can execute raw SQL", async () => {
    const db = getTestDb();
    
    const result = await db.execute(sql`SELECT version()`);
    expect(result[0]?.version).toContain("PostgreSQL");
  });
});

describe("Schema Operations", () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  beforeEach(async () => {
    await cleanTestData();
  });

  afterAll(async () => {
    await teardownTestDatabase();
    await closeTestDb();
  });

  describe("Families", () => {
    test("can insert a family", async () => {
      const db = getTestDb();
      
      const [family] = await db.insert(families).values({
        name: "Smith Family",
      }).returning();

      expect(family).toBeDefined();
      expect(family!.id).toBeDefined();
      expect(family!.name).toBe("Smith Family");
      expect(family!.createdAt).toBeInstanceOf(Date);
    });

    test("can query families", async () => {
      const db = getTestDb();
      
      await db.insert(families).values([
        { name: "Family A" },
        { name: "Family B" },
        { name: "Family C" },
      ]);

      const allFamilies = await db.select().from(families);
      expect(allFamilies).toHaveLength(3);
    });

    test("can update a family", async () => {
      const db = getTestDb();
      
      const [family] = await db.insert(families).values({
        name: "Original Name",
      }).returning();
      expect(family).toBeDefined();

      const [updated] = await db
        .update(families)
        .set({ name: "Updated Name" })
        .where(eq(families.id, family!.id))
        .returning();

      expect(updated).toBeDefined();
      expect(updated!.name).toBe("Updated Name");
    });

    test("can delete a family", async () => {
      const db = getTestDb();
      
      const [family] = await db.insert(families).values({
        name: "To Delete",
      }).returning();
      expect(family).toBeDefined();

      await db.delete(families).where(eq(families.id, family!.id));

      const remaining = await db
        .select()
        .from(families)
        .where(eq(families.id, family!.id));

      expect(remaining).toHaveLength(0);
    });
  });

  describe("Children with Foreign Keys", () => {
    test("can create a child linked to a family", async () => {
      const db = getTestDb();
      
      const [family] = await db.insert(families).values({
        name: "Test Family",
      }).returning();
      expect(family).toBeDefined();

      const [child] = await db.insert(children).values({
        familyId: family!.id,
        name: "Test Child",
        birthDate: "2020-05-15",
      }).returning();

      expect(child).toBeDefined();
      expect(child!.id).toBeDefined();
      expect(child!.familyId).toBe(family!.id);
      expect(child!.name).toBe("Test Child");
      expect(child!.birthDate).toBe("2020-05-15");
    });

    test("cascades delete from family to children", async () => {
      const db = getTestDb();
      
      const [family] = await db.insert(families).values({
        name: "Family to Delete",
      }).returning();
      expect(family).toBeDefined();

      await db.insert(children).values({
        familyId: family!.id,
        name: "Child 1",
      });

      await db.insert(children).values({
        familyId: family!.id,
        name: "Child 2",
      });

      // Delete the family
      await db.delete(families).where(eq(families.id, family!.id));

      // Children should be gone too
      const remainingChildren = await db
        .select()
        .from(children)
        .where(eq(children.familyId, family!.id));

      expect(remainingChildren).toHaveLength(0);
    });
  });
});
