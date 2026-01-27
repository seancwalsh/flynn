/**
 * Test setup utilities for Flynn AAC Backend
 * 
 * This module provides helpers for:
 * - Database setup/teardown
 * - Test fixtures
 * - Common test utilities
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import * as schema from "../db/schema";

// Test database URL (uses docker-compose postgres-test service)
export const TEST_DATABASE_URL = 
  process.env["TEST_DATABASE_URL"] ?? 
  "postgres://postgres:postgres@localhost:5433/flynn_aac_test";

// Singleton test database connection
let testDb: ReturnType<typeof drizzle<typeof schema>> | null = null;
let testClient: ReturnType<typeof postgres> | null = null;

/**
 * Get or create the test database connection
 */
export function getTestDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (testDb === null) {
    testClient = postgres(TEST_DATABASE_URL, { max: 10 });
    testDb = drizzle(testClient, { schema });
  }
  return testDb;
}

/**
 * Close the test database connection
 */
export async function closeTestDb(): Promise<void> {
  if (testClient !== null) {
    await testClient.end();
    testClient = null;
    testDb = null;
  }
}

/**
 * Setup the test database schema (run once before all tests)
 */
export async function setupTestDatabase(): Promise<void> {
  const db = getTestDb();
  
  // Create tables using raw SQL (in production, use migrations)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      clerk_id VARCHAR(255) UNIQUE,
      email VARCHAR(255) NOT NULL UNIQUE,
      role VARCHAR(50) NOT NULL DEFAULT 'caregiver',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS devices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      device_token VARCHAR(255) NOT NULL,
      platform VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS families (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS children (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      birth_date DATE,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS caregivers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      role VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS therapists (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS therapist_clients (
      therapist_id UUID NOT NULL REFERENCES therapists(id) ON DELETE CASCADE,
      child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      granted_at TIMESTAMP DEFAULT NOW() NOT NULL,
      PRIMARY KEY (therapist_id, child_id)
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      symbol_id VARCHAR(255) NOT NULL,
      timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
      session_id UUID
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS insights (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      content JSONB NOT NULL,
      generated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
}

/**
 * Clean all test data (run before each test or test suite)
 */
export async function cleanTestData(): Promise<void> {
  const db = getTestDb();
  
  // Delete in reverse order of dependencies
  // Safely handle tables that may not exist
  await db.execute(sql`TRUNCATE conversation_messages CASCADE`).catch(() => {});
  await db.execute(sql`TRUNCATE conversations CASCADE`).catch(() => {});
  await db.execute(sql`TRUNCATE insights CASCADE`);
  await db.execute(sql`TRUNCATE usage_logs CASCADE`);
  await db.execute(sql`TRUNCATE therapist_clients CASCADE`);
  await db.execute(sql`TRUNCATE therapists CASCADE`);
  await db.execute(sql`TRUNCATE caregivers CASCADE`);
  await db.execute(sql`TRUNCATE children CASCADE`);
  await db.execute(sql`TRUNCATE families CASCADE`);
  await db.execute(sql`TRUNCATE devices CASCADE`).catch(() => {});
  await db.execute(sql`TRUNCATE users CASCADE`).catch(() => {});
}

/**
 * Drop all test tables (run after all tests)
 */
export async function teardownTestDatabase(): Promise<void> {
  const db = getTestDb();
  
  await db.execute(sql`DROP TABLE IF EXISTS conversation_messages CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS conversations CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS insights CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS usage_logs CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS therapist_clients CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS therapists CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS caregivers CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS children CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS families CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS devices CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS users CASCADE`);
}
