-- ============================================
-- CLUB 90 — Migration: Teams & Players
-- ============================================
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================

-- ╔══════════════════════════════════════════╗
-- ║     1. TEAMS TABLE                       ║
-- ╚══════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  short_name  TEXT NOT NULL,
  logo_url    TEXT,
  league      TEXT NOT NULL DEFAULT 'Torneo Local',
  color       TEXT DEFAULT '#1475e1',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ╔══════════════════════════════════════════╗
-- ║     2. PLAYERS TABLE                     ║
-- ╚══════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS players (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  age         INT,
  photo_url   TEXT,
  is_captain  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ╔══════════════════════════════════════════╗
-- ║     3. LINK MATCHES TO TEAMS             ║
-- ╚══════════════════════════════════════════╝

-- Add team references to matches (optional FK, keeps backward compat)
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS home_team_id UUID REFERENCES teams(id),
  ADD COLUMN IF NOT EXISTS away_team_id UUID REFERENCES teams(id);

-- ╔══════════════════════════════════════════╗
-- ║     4. INDEXES                           ║
-- ╚══════════════════════════════════════════╝

CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_league ON teams(league);
CREATE INDEX IF NOT EXISTS idx_matches_home_team ON matches(home_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_away_team ON matches(away_team_id);

-- ╔══════════════════════════════════════════╗
-- ║     5. AUTO-UPDATE TRIGGER               ║
-- ╚══════════════════════════════════════════╝

CREATE TRIGGER trg_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ╔══════════════════════════════════════════╗
-- ║     6. ROW LEVEL SECURITY                ║
-- ╚══════════════════════════════════════════╝

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Teams: everyone can read
CREATE POLICY "Teams: public read" ON teams
  FOR SELECT USING (true);

-- Teams: only admins can insert
CREATE POLICY "Teams: admin insert" ON teams
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Teams: only admins can update
CREATE POLICY "Teams: admin update" ON teams
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Teams: only admins can delete
CREATE POLICY "Teams: admin delete" ON teams
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Players: everyone can read
CREATE POLICY "Players: public read" ON players
  FOR SELECT USING (true);

-- Players: only admins can insert
CREATE POLICY "Players: admin insert" ON players
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Players: only admins can update
CREATE POLICY "Players: admin update" ON players
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Players: only admins can delete
CREATE POLICY "Players: admin delete" ON players
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ╔══════════════════════════════════════════╗
-- ║     7. REALTIME                          ║
-- ╚══════════════════════════════════════════╝

ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER PUBLICATION supabase_realtime ADD TABLE players;

-- ╔══════════════════════════════════════════╗
-- ║     8. VERIFY                            ║
-- ╚══════════════════════════════════════════╝

SELECT '✅ Teams & Players migration complete!' AS status,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'teams') AS teams_table,
       (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'players') AS players_table;
