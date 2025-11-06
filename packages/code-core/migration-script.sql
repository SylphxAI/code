-- Migration script for step-based schema
-- This script manually handles the complex migration from message_parts to steps

-- 1. Drop old tables (messageTodoSnapshots was removed)
DROP TABLE IF EXISTS message_todo_snapshots;

-- 2. Remove metadata column from messages table (moved to steps)
ALTER TABLE messages DROP COLUMN metadata;

-- 3. Create new step-based tables
CREATE TABLE IF NOT EXISTS message_steps (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  provider TEXT,
  model TEXT,
  duration INTEGER,
  finish_reason TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  metadata TEXT,
  start_time INTEGER,
  end_time INTEGER
);

CREATE INDEX idx_message_steps_message ON message_steps(message_id);
CREATE INDEX idx_message_steps_step_index ON message_steps(message_id, step_index);
CREATE INDEX idx_message_steps_status ON message_steps(status);

CREATE TABLE IF NOT EXISTS step_usage (
  step_id TEXT PRIMARY KEY REFERENCES message_steps(id) ON DELETE CASCADE,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS step_todo_snapshots (
  id TEXT PRIMARY KEY,
  step_id TEXT NOT NULL REFERENCES message_steps(id) ON DELETE CASCADE,
  todo_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  active_form TEXT NOT NULL,
  status TEXT NOT NULL,
  ordering INTEGER NOT NULL
);

CREATE INDEX idx_step_todo_snapshots_step ON step_todo_snapshots(step_id);

CREATE TABLE IF NOT EXISTS step_parts (
  id TEXT PRIMARY KEY,
  step_id TEXT NOT NULL REFERENCES message_steps(id) ON DELETE CASCADE,
  ordering INTEGER NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL
);

CREATE INDEX idx_step_parts_step ON step_parts(step_id);
CREATE INDEX idx_step_parts_ordering ON step_parts(step_id, ordering);
CREATE INDEX idx_step_parts_type ON step_parts(type);

-- 4. Migrate existing data from message_parts to step-based structure
-- For each message, create one step with all its parts
INSERT INTO message_steps (id, message_id, step_index, status, metadata)
SELECT
  'step-0-' || m.id,  -- Generate step ID
  m.id,                -- message_id
  0,                   -- step_index (always 0 for migrated messages)
  m.status,            -- Inherit message status
  NULL                 -- No metadata for old messages
FROM messages m;

-- 5. Migrate message_parts to step_parts
INSERT INTO step_parts (id, step_id, ordering, type, content)
SELECT
  mp.id,
  'step-0-' || mp.message_id,  -- Reference the step we just created
  mp.ordering,
  mp.type,
  mp.content
FROM message_parts mp;

-- 6. Drop old message_parts table
DROP TABLE message_parts;

-- 7. Migration complete
