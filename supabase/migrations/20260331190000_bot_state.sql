-- ============================================
-- CLUB 90 — Bot State Table (for conversational flows)
-- ============================================
-- Edge Functions are stateless. This table persists
-- the bot's conversation context between messages.
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS bot_state (
  chat_id   BIGINT PRIMARY KEY,
  action    TEXT NOT NULL,
  data      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-cleanup old states (> 1 hour)
CREATE INDEX IF NOT EXISTS idx_bot_state_updated ON bot_state(updated_at);

-- No RLS needed — only accessed by admin Edge Function with service role
ALTER TABLE bot_state ENABLE ROW LEVEL SECURITY;

-- Also add score columns to matches for the marcador
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS home_score INT,
  ADD COLUMN IF NOT EXISTS away_score INT;

SELECT '✅ Bot state table + score columns created!' AS status;
