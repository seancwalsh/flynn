-- Migration: Add indexes to usage_logs table
-- These are critical for query performance as the table grows

-- Composite index for child + timestamp queries (most common)
CREATE INDEX IF NOT EXISTS usage_logs_child_timestamp_idx ON usage_logs(child_id, timestamp);

-- Index for timestamp-only queries (daily aggregation)
CREATE INDEX IF NOT EXISTS usage_logs_timestamp_idx ON usage_logs(timestamp);

-- Partial index for session queries (only where session_id is not null)
CREATE INDEX IF NOT EXISTS usage_logs_session_idx ON usage_logs(session_id) WHERE session_id IS NOT NULL;

-- Index on conversation_messages for conversation queries
CREATE INDEX IF NOT EXISTS conversation_messages_conversation_idx ON conversation_messages(conversation_id);
