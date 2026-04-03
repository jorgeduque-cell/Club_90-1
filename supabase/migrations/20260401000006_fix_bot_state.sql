-- ============================================
-- CLUB 90+1 — Fix: Create bot_state table + RPC permissions
-- ============================================

-- 1. Create bot_state table (never existed in production)
CREATE TABLE IF NOT EXISTS bot_state (
  chat_id    BIGINT PRIMARY KEY,
  action     TEXT NOT NULL,
  data       JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- No RLS — only service_role accesses this table
ALTER TABLE bot_state DISABLE ROW LEVEL SECURITY;

-- 2. Grant execute on RPCs
GRANT EXECUTE ON FUNCTION settle_match_v2(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION submit_ticket(JSONB, FLOAT) TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_store_item(TEXT) TO authenticated;

SELECT '✅ bot_state created + RPC permissions granted' AS status;
