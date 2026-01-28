-- Notes table for quick observations, milestones, and concerns
-- Migration: 0007_notes.sql

CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Note details
  type VARCHAR(20) NOT NULL DEFAULT 'general', -- observation, milestone, concern, general
  content TEXT NOT NULL,
  
  -- Optional attachment (future feature)
  attachment_url VARCHAR(500),
  
  -- Metadata
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS notes_child_idx ON notes(child_id);
CREATE INDEX IF NOT EXISTS notes_type_idx ON notes(type);
CREATE INDEX IF NOT EXISTS notes_created_idx ON notes(created_at);

-- Comment on table
COMMENT ON TABLE notes IS 'Quick notes/observations about children without full session logging';
