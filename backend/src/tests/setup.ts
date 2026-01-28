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
  
  // ============================================================================
  // Core Tables
  // ============================================================================
  
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
      severity VARCHAR(20),
      title VARCHAR(255),
      body TEXT,
      content JSONB NOT NULL,
      generated_at TIMESTAMP DEFAULT NOW() NOT NULL,
      read_at TIMESTAMP,
      dismissed_at TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      caregiver_id UUID NOT NULL REFERENCES caregivers(id) ON DELETE CASCADE,
      child_id UUID REFERENCES children(id) ON DELETE SET NULL,
      title VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS conversation_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL,
      content TEXT NOT NULL,
      tool_name VARCHAR(100),
      tool_call_id VARCHAR(100),
      input_tokens INTEGER,
      output_tokens INTEGER,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  // ============================================================================
  // Metrics Aggregation Tables (Phase 2)
  // ============================================================================

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS daily_metrics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      total_taps INTEGER NOT NULL DEFAULT 0,
      unique_symbols INTEGER NOT NULL DEFAULT 0,
      unique_categories INTEGER NOT NULL DEFAULT 0,
      session_count INTEGER NOT NULL DEFAULT 0,
      avg_session_length_seconds INTEGER,
      total_session_seconds INTEGER DEFAULT 0,
      phrases_built INTEGER NOT NULL DEFAULT 0,
      avg_phrase_length NUMERIC(4,2),
      max_phrase_length INTEGER,
      bulgarian_taps INTEGER NOT NULL DEFAULT 0,
      english_taps INTEGER NOT NULL DEFAULT 0,
      category_breakdown JSONB,
      hourly_distribution JSONB,
      top_symbols JSONB,
      new_symbols_used JSONB,
      computed_at TIMESTAMP DEFAULT NOW() NOT NULL,
      UNIQUE(child_id, date)
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS weekly_metrics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      week_start DATE NOT NULL,
      total_taps INTEGER NOT NULL DEFAULT 0,
      avg_daily_taps NUMERIC(6,2),
      active_days INTEGER NOT NULL DEFAULT 0,
      total_unique_symbols INTEGER NOT NULL DEFAULT 0,
      new_symbols_this_week INTEGER NOT NULL DEFAULT 0,
      vocabulary_growth_rate NUMERIC(5,4),
      avg_sessions_per_day NUMERIC(4,2),
      total_sessions INTEGER NOT NULL DEFAULT 0,
      peak_usage_hour INTEGER,
      weekend_weekday_ratio NUMERIC(4,3),
      tap_change_percent NUMERIC(5,2),
      vocabulary_change_percent NUMERIC(5,2),
      taps_trend VARCHAR(20),
      vocabulary_trend VARCHAR(20),
      overall_trend VARCHAR(20),
      computed_at TIMESTAMP DEFAULT NOW() NOT NULL,
      UNIQUE(child_id, week_start)
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS metric_baselines (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      metric_name VARCHAR(50) NOT NULL,
      mean NUMERIC(10,4) NOT NULL,
      median NUMERIC(10,4) NOT NULL,
      std_dev NUMERIC(10,4) NOT NULL,
      min_value NUMERIC(10,4),
      max_value NUMERIC(10,4),
      day_of_week_factors JSONB,
      sample_days INTEGER NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      computed_at TIMESTAMP DEFAULT NOW() NOT NULL,
      UNIQUE(child_id, metric_name)
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS anomalies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      severity VARCHAR(20) NOT NULL,
      metric_name VARCHAR(50) NOT NULL,
      expected_value NUMERIC(10,4) NOT NULL,
      actual_value NUMERIC(10,4) NOT NULL,
      deviation_score NUMERIC(6,4) NOT NULL,
      context JSONB,
      detected_at TIMESTAMP DEFAULT NOW() NOT NULL,
      detected_for_date DATE NOT NULL,
      acknowledged BOOLEAN DEFAULT false,
      acknowledged_at TIMESTAMP,
      acknowledged_by UUID REFERENCES users(id),
      resolved_at TIMESTAMP,
      resolution VARCHAR(255)
    )
  `);

  // ============================================================================
  // Notification Tables
  // ============================================================================

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS notification_preferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      enabled BOOLEAN NOT NULL DEFAULT true,
      type_settings JSONB,
      quiet_hours_enabled BOOLEAN DEFAULT true,
      quiet_hours_start VARCHAR(5) DEFAULT '22:00',
      quiet_hours_end VARCHAR(5) DEFAULT '07:00',
      timezone VARCHAR(50) DEFAULT 'UTC',
      max_per_hour INTEGER DEFAULT 5,
      max_per_day INTEGER DEFAULT 20,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS notification_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      body TEXT,
      success BOOLEAN NOT NULL,
      error TEXT,
      message_id VARCHAR(255),
      insight_id UUID REFERENCES insights(id) ON DELETE SET NULL,
      child_id UUID REFERENCES children(id) ON DELETE SET NULL,
      sent_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  // ============================================================================
  // Goals & Therapy Tables (Phase 2c)
  // ============================================================================

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS goals (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      therapy_type VARCHAR(20) NOT NULL,
      category VARCHAR(50),
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      target_date DATE,
      progress_percent INTEGER DEFAULT 0,
      created_by UUID REFERENCES users(id),
      therapist_id UUID REFERENCES therapists(id),
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS goal_links (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      linked_goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      relationship_type VARCHAR(30) NOT NULL,
      notes TEXT,
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS therapy_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      therapist_id UUID REFERENCES therapists(id) ON DELETE SET NULL,
      therapy_type VARCHAR(20) NOT NULL,
      session_date DATE NOT NULL,
      duration_minutes INTEGER,
      notes TEXT,
      goals_worked_on JSONB,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS goal_progress (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      progress_percent INTEGER NOT NULL,
      notes TEXT,
      session_id UUID REFERENCES therapy_sessions(id) ON DELETE SET NULL,
      logged_by UUID REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  // ============================================================================
  // Notes Table
  // ============================================================================

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
      author_id UUID REFERENCES users(id) ON DELETE SET NULL,
      type VARCHAR(20) NOT NULL DEFAULT 'general',
      content TEXT NOT NULL,
      attachment_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
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
  await db.execute(sql`TRUNCATE notes CASCADE`).catch(() => {});
  await db.execute(sql`TRUNCATE goal_progress CASCADE`).catch(() => {});
  await db.execute(sql`TRUNCATE therapy_sessions CASCADE`).catch(() => {});
  await db.execute(sql`TRUNCATE goal_links CASCADE`).catch(() => {});
  await db.execute(sql`TRUNCATE goals CASCADE`).catch(() => {});
  await db.execute(sql`TRUNCATE notification_logs CASCADE`).catch(() => {});
  await db.execute(sql`TRUNCATE notification_preferences CASCADE`).catch(() => {});
  await db.execute(sql`TRUNCATE anomalies CASCADE`).catch(() => {});
  await db.execute(sql`TRUNCATE metric_baselines CASCADE`).catch(() => {});
  await db.execute(sql`TRUNCATE weekly_metrics CASCADE`).catch(() => {});
  await db.execute(sql`TRUNCATE daily_metrics CASCADE`).catch(() => {});
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
  
  await db.execute(sql`DROP TABLE IF EXISTS notes CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS goal_progress CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS therapy_sessions CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS goal_links CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS goals CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS notification_logs CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS notification_preferences CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS anomalies CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS metric_baselines CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS weekly_metrics CASCADE`);
  await db.execute(sql`DROP TABLE IF EXISTS daily_metrics CASCADE`);
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
