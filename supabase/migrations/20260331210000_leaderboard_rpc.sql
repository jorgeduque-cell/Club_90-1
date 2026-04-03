-- ============================================
-- CLUB 90 — RPC: get_leaderboard (Win Rate)
-- ============================================

-- This function replaces the direct select from 'users'
-- to calculate and provide the correct Win Rate for the leaderboard,
-- bypassing RLS on bets table securely.

CREATE OR REPLACE FUNCTION get_leaderboard(p_limit INT DEFAULT 50)
RETURNS TABLE (
  id UUID,
  name TEXT,
  cl_coins FLOAT,
  total_bets BIGINT,
  won_bets BIGINT,
  win_rate INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.name,
    u.cl_coins,
    COUNT(b.id) FILTER (WHERE b.status IN ('WON', 'LOST')) AS total_bets,
    COUNT(b.id) FILTER (WHERE b.status = 'WON') AS won_bets,
    CASE
      WHEN COUNT(b.id) FILTER (WHERE b.status IN ('WON', 'LOST')) > 0 THEN
        ROUND((COUNT(b.id) FILTER (WHERE b.status = 'WON')::NUMERIC / COUNT(b.id) FILTER (WHERE b.status IN ('WON', 'LOST'))::NUMERIC) * 100)::INT
      ELSE 0
    END AS win_rate
  FROM users u
  LEFT JOIN bets b ON u.id = b.user_id
  WHERE u.role = 'PLAYER'
  GROUP BY u.id, u.name, u.cl_coins
  ORDER BY u.cl_coins DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
