-- Migration: Add Clerk authentication support
-- This migration adds clerkId to users table and makes passwordHash nullable

-- Add clerk_id column to users table
ALTER TABLE "users" ADD COLUMN "clerk_id" varchar(255) UNIQUE;

-- Make password_hash nullable (Clerk handles authentication)
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

-- Create index on clerk_id for faster lookups
CREATE INDEX IF NOT EXISTS "users_clerk_id_idx" ON "users" ("clerk_id");
