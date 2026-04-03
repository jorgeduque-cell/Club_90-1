-- ============================================
-- CLUB 90 — Supabase SQL Migration
-- Pari-Mutuel Sports Betting Platform
-- ============================================
-- Run this in the Supabase SQL Editor or via CLI:
-- supabase db push
-- ============================================

-- ╔══════════════════════════════════════════╗
-- ║          1. CUSTOM ENUM TYPES            ║
-- ╚══════════════════════════════════════════╝

CREATE TYPE user_role AS ENUM ('PLAYER', 'ADMIN');
CREATE TYPE match_status AS ENUM ('OPEN', 'CLOSED', 'FINISHED');
CREATE TYPE match_result AS ENUM ('HOME_WIN', 'DRAW', 'AWAY_WIN', 'PENDING');
CREATE TYPE prediction_type AS ENUM ('HOME_WIN', 'DRAW', 'AWAY_WIN');
CREATE TYPE bet_status AS ENUM ('PENDING', 'WON', 'LOST');
CREATE TYPE transaction_type AS ENUM ('DEPOSIT', 'BET_PLACED', 'WINNINGS_PAID');
CREATE TYPE transaction_status AS ENUM ('PENDING', 'APPROVED');


-- ╔══════════════════════════════════════════╗
-- ║             2. TABLES                    ║
-- ╚══════════════════════════════════════════╝

-- Users (linked to Supabase Auth)
CREATE TABLE users (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone      TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  cl_coins   FLOAT NOT NULL DEFAULT 0,
  role       user_role NOT NULL DEFAULT 'PLAYER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Matches
CREATE TABLE matches (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_team  TEXT NOT NULL,
  away_team  TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  status     match_status NOT NULL DEFAULT 'OPEN',
  result     match_result NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Match Pools (1:1 with matches)
CREATE TABLE match_pools (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id         UUID UNIQUE NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  home_pool        FLOAT NOT NULL DEFAULT 0,
  draw_pool        FLOAT NOT NULL DEFAULT 0,
  away_pool        FLOAT NOT NULL DEFAULT 0,
  admin_commission FLOAT NOT NULL DEFAULT 0
);

-- Bets
CREATE TABLE bets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  match_id    UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  amount      FLOAT NOT NULL,
  prediction  prediction_type NOT NULL,
  status      bet_status NOT NULL DEFAULT 'PENDING',
  closing_odd FLOAT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transactions
CREATE TABLE transactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount     FLOAT NOT NULL,
  type       transaction_type NOT NULL,
  reference  TEXT,
  status     transaction_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ╔══════════════════════════════════════════╗
-- ║          3. PERFORMANCE INDEXES          ║
-- ╚══════════════════════════════════════════╝

CREATE INDEX idx_bets_user_id ON bets(user_id);
CREATE INDEX idx_bets_match_id ON bets(match_id);
CREATE INDEX idx_bets_match_status ON bets(match_id, status);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_user_type ON transactions(user_id, type);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_start_time ON matches(start_time);
CREATE INDEX idx_users_cl_coins ON users(cl_coins DESC);


-- ╔══════════════════════════════════════════╗
-- ║     4. AUTO-UPDATE TIMESTAMP TRIGGER     ║
-- ╚══════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ╔══════════════════════════════════════════╗
-- ║  5. AUTO-CREATE PROFILE ON AUTH SIGNUP   ║
-- ╚══════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, phone, name, cl_coins, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.phone, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      'Jugador ' || RIGHT(COALESCE(NEW.phone, '0000'), 4)
    ),
    0,
    'PLAYER'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ╔══════════════════════════════════════════╗
-- ║     6. ROW LEVEL SECURITY (RLS)          ║
-- ╚══════════════════════════════════════════╝

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- ── Users Policies ──────────────────────────
-- Anyone can read user profiles (for leaderboard)
CREATE POLICY "Users: public read" ON users
  FOR SELECT USING (true);

-- Users can update only their own profile
CREATE POLICY "Users: self update" ON users
  FOR UPDATE USING (auth.uid() = id);

-- ── Matches Policies ────────────────────────
-- Anyone can read matches
CREATE POLICY "Matches: public read" ON matches
  FOR SELECT USING (true);

-- Only admins can create matches
CREATE POLICY "Matches: admin insert" ON matches
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- Only admins can update matches
CREATE POLICY "Matches: admin update" ON matches
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ── Match Pools Policies ────────────────────
-- Anyone can read pools (for odds display)
CREATE POLICY "Pools: public read" ON match_pools
  FOR SELECT USING (true);

-- Only admins can insert pools (when creating match)
CREATE POLICY "Pools: admin insert" ON match_pools
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ── Bets Policies ───────────────────────────
-- Users can read only their own bets
CREATE POLICY "Bets: own read" ON bets
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can read all bets
CREATE POLICY "Bets: admin read" ON bets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN')
  );

-- ── Transactions Policies ───────────────────
-- Users can read only their own transactions
CREATE POLICY "Transactions: own read" ON transactions
  FOR SELECT USING (auth.uid() = user_id);


-- ╔══════════════════════════════════════════╗
-- ║  7. BUSINESS LOGIC — PL/pgSQL FUNCTIONS  ║
-- ╚══════════════════════════════════════════╝

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 7A. PARI-MUTUEL ODDS ENGINE
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Calculates live decimal odds using the Pari-Mutuel
-- (Tote/Pool) model with 20% house margin and 10K seed liquidity.
--
-- Formula per option:
--   seeded_pool = real_pool + SEED_LIQUIDITY
--   gross_pool  = sum(all seeded pools)
--   net_pool    = gross_pool × (1 - HOUSE_MARGIN)
--   odd         = net_pool / seeded_pool
--   final_odd   = MAX(1.05, ROUND(odd, 2))

CREATE OR REPLACE FUNCTION calculate_live_odds(
  p_home_pool FLOAT,
  p_draw_pool FLOAT,
  p_away_pool FLOAT
)
RETURNS JSONB AS $$
DECLARE
  v_house_margin  CONSTANT FLOAT := 0.20;
  v_seed_liquidity CONSTANT FLOAT := 10000;
  v_seeded_home   FLOAT;
  v_seeded_draw   FLOAT;
  v_seeded_away   FLOAT;
  v_gross_pool    FLOAT;
  v_net_pool      FLOAT;
  v_home_odd      FLOAT;
  v_draw_odd      FLOAT;
  v_away_odd      FLOAT;
BEGIN
  -- Step 1: Add seed liquidity to prevent division by zero
  v_seeded_home := p_home_pool + v_seed_liquidity;
  v_seeded_draw := p_draw_pool + v_seed_liquidity;
  v_seeded_away := p_away_pool + v_seed_liquidity;

  -- Step 2: Total pool
  v_gross_pool := v_seeded_home + v_seeded_draw + v_seeded_away;

  -- Step 3: Deduct house margin
  v_net_pool := v_gross_pool * (1 - v_house_margin);

  -- Step 4: Calculate odds with floor of 1.05
  v_home_odd := GREATEST(1.05, ROUND((v_net_pool / v_seeded_home)::NUMERIC, 2));
  v_draw_odd := GREATEST(1.05, ROUND((v_net_pool / v_seeded_draw)::NUMERIC, 2));
  v_away_odd := GREATEST(1.05, ROUND((v_net_pool / v_seeded_away)::NUMERIC, 2));

  RETURN jsonb_build_object(
    'home', v_home_odd,
    'draw', v_draw_odd,
    'away', v_away_odd
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 7B. PLACE BET (Atomic Transaction)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Validates user balance, match status, 15-min buffer,
-- then atomically: deducts coins → updates pool → creates
-- bet → logs transaction. Returns bet + current odds.

CREATE OR REPLACE FUNCTION place_bet(
  p_user_id    UUID,
  p_match_id   UUID,
  p_prediction prediction_type,
  p_amount     FLOAT
)
RETURNS JSONB AS $$
DECLARE
  v_user    RECORD;
  v_match   RECORD;
  v_bet_id  UUID;
  v_pool    RECORD;
  v_odds    JSONB;
  v_odd_key TEXT;
  v_estimated_return FLOAT;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto de la apuesta debe ser mayor a 0';
  END IF;

  -- Lock and validate user
  SELECT * INTO v_user FROM users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;
  IF v_user.cl_coins < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente. Tienes % CL COINS pero intentas apostar % CL COINS.',
      v_user.cl_coins, p_amount;
  END IF;

  -- Lock and validate match
  SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partido no encontrado';
  END IF;
  IF v_match.status != 'OPEN' THEN
    RAISE EXCEPTION 'Mercado Cerrado. El partido ya no acepta apuestas.';
  END IF;
  IF v_match.start_time - INTERVAL '15 minutes' < NOW() THEN
    RAISE EXCEPTION 'Mercado Cerrado. Las apuestas se cierran 15 minutos antes del inicio del partido.';
  END IF;

  -- 1. Deduct CL COINS from user
  UPDATE users SET cl_coins = cl_coins - p_amount WHERE id = p_user_id;

  -- 2. Update the correct pool column
  UPDATE match_pools SET
    home_pool = home_pool + CASE WHEN p_prediction = 'HOME_WIN' THEN p_amount ELSE 0 END,
    draw_pool = draw_pool + CASE WHEN p_prediction = 'DRAW'     THEN p_amount ELSE 0 END,
    away_pool = away_pool + CASE WHEN p_prediction = 'AWAY_WIN' THEN p_amount ELSE 0 END
  WHERE match_id = p_match_id;

  -- 3. Create bet
  INSERT INTO bets (user_id, match_id, amount, prediction, status)
  VALUES (p_user_id, p_match_id, p_amount, p_prediction, 'PENDING')
  RETURNING id INTO v_bet_id;

  -- 4. Log transaction
  INSERT INTO transactions (user_id, amount, type, reference, status)
  VALUES (p_user_id, p_amount, 'BET_PLACED', 'BET:' || v_bet_id, 'APPROVED');

  -- 5. Calculate current odds for response
  SELECT * INTO v_pool FROM match_pools WHERE match_id = p_match_id;
  v_odds := calculate_live_odds(v_pool.home_pool, v_pool.draw_pool, v_pool.away_pool);

  v_odd_key := CASE p_prediction::TEXT
    WHEN 'HOME_WIN' THEN 'home'
    WHEN 'DRAW'     THEN 'draw'
    WHEN 'AWAY_WIN' THEN 'away'
  END;
  v_estimated_return := ROUND((p_amount * (v_odds->>v_odd_key)::FLOAT)::NUMERIC, 2);

  RETURN jsonb_build_object(
    'betId',          v_bet_id,
    'matchId',        p_match_id,
    'amount',         p_amount,
    'prediction',     p_prediction,
    'status',         'PENDING',
    'currentOdds',    v_odds,
    'estimatedReturn', v_estimated_return
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 7C. SETTLE MATCH (Admin — Prize Distribution)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Sets match to FINISHED, calculates final odds,
-- extracts 20% commission, distributes prizes to
-- winners, marks all bets as WON/LOST.

CREATE OR REPLACE FUNCTION settle_match(
  p_match_id UUID,
  p_result   match_result
)
RETURNS JSONB AS $$
DECLARE
  v_match        RECORD;
  v_pool         RECORD;
  v_odds         JSONB;
  v_winning_odd  FLOAT;
  v_total_pool   FLOAT;
  v_commission   FLOAT;
  v_bet          RECORD;
  v_prize        FLOAT;
  v_total_prizes FLOAT := 0;
  v_winners      INT := 0;
  v_losers       INT := 0;
  v_odd_key      TEXT;
  v_winning_pred prediction_type;
BEGIN
  -- Validate result
  IF p_result = 'PENDING' THEN
    RAISE EXCEPTION 'El resultado final no puede ser PENDING';
  END IF;

  -- Lock match
  SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partido no encontrado';
  END IF;
  IF v_match.status = 'FINISHED' THEN
    RAISE EXCEPTION 'Este partido ya fue liquidado';
  END IF;

  -- Update match status
  UPDATE matches SET status = 'FINISHED', result = p_result WHERE id = p_match_id;

  -- Get pool
  SELECT * INTO v_pool FROM match_pools WHERE match_id = p_match_id;
  IF v_pool IS NULL THEN
    RETURN jsonb_build_object('settled', 0, 'totalPrizes', 0, 'commission', 0);
  END IF;

  -- Calculate final odds
  v_odds := calculate_live_odds(v_pool.home_pool, v_pool.draw_pool, v_pool.away_pool);

  -- Extract commission
  v_total_pool := v_pool.home_pool + v_pool.draw_pool + v_pool.away_pool;
  v_commission := ROUND((v_total_pool * 0.20)::NUMERIC, 2);
  UPDATE match_pools SET admin_commission = v_commission WHERE match_id = p_match_id;

  -- Map result to prediction type and odd key
  v_winning_pred := p_result::TEXT::prediction_type;
  v_odd_key := CASE p_result::TEXT
    WHEN 'HOME_WIN' THEN 'home'
    WHEN 'DRAW'     THEN 'draw'
    WHEN 'AWAY_WIN' THEN 'away'
  END;
  v_winning_odd := (v_odds->>v_odd_key)::FLOAT;

  -- Process all pending bets
  FOR v_bet IN
    SELECT * FROM bets WHERE match_id = p_match_id AND status = 'PENDING'
    FOR UPDATE
  LOOP
    IF v_bet.prediction = v_winning_pred THEN
      -- WINNER: prize = amount × closing odd
      v_prize := ROUND((v_bet.amount * v_winning_odd)::NUMERIC, 2);
      v_total_prizes := v_total_prizes + v_prize;
      v_winners := v_winners + 1;

      UPDATE bets SET status = 'WON', closing_odd = v_winning_odd WHERE id = v_bet.id;
      UPDATE users SET cl_coins = cl_coins + v_prize WHERE id = v_bet.user_id;

      INSERT INTO transactions (user_id, amount, type, reference, status)
      VALUES (v_bet.user_id, v_prize, 'WINNINGS_PAID', 'WIN:' || v_bet.id, 'APPROVED');
    ELSE
      -- LOSER
      v_losers := v_losers + 1;
      UPDATE bets SET status = 'LOST', closing_odd = 0 WHERE id = v_bet.id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'matchId',     p_match_id,
    'result',      p_result,
    'totalBets',   v_winners + v_losers,
    'winners',     v_winners,
    'losers',      v_losers,
    'totalPrizes', ROUND(v_total_prizes::NUMERIC, 2),
    'commission',  v_commission,
    'finalOdds',   v_odds
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 7D. HANDLE TOP-UP (WhatsApp Bot)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Credits CL COINS to a user by phone number.
-- Called from WhatsApp webhook Edge Function.

CREATE OR REPLACE FUNCTION handle_topup(
  p_user_id UUID,
  p_amount  FLOAT
)
RETURNS JSONB AS $$
DECLARE
  v_user RECORD;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto de recarga debe ser mayor a 0';
  END IF;

  -- Credit CL COINS
  UPDATE users SET cl_coins = cl_coins + p_amount
  WHERE id = p_user_id
  RETURNING * INTO v_user;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  -- Log deposit transaction
  INSERT INTO transactions (user_id, amount, type, reference, status)
  VALUES (p_user_id, p_amount, 'DEPOSIT', 'WHATSAPP_TOPUP:' || EXTRACT(EPOCH FROM NOW())::TEXT, 'APPROVED');

  RETURN jsonb_build_object(
    'userId',     v_user.id,
    'name',       v_user.name,
    'newBalance', v_user.cl_coins,
    'credited',   p_amount,
    'message',    '✅ ¡Recarga exitosa! Se han añadido ' || p_amount || ' CL COINS a tu cuenta en Club 90. ¡Ve por el primer puesto en el ranking!'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ╔══════════════════════════════════════════╗
-- ║   8. ENABLE REALTIME ON KEY TABLES       ║
-- ╚══════════════════════════════════════════╝

-- Live odds: frontend subscribes to pool changes
ALTER PUBLICATION supabase_realtime ADD TABLE match_pools;

-- Live match status updates  
ALTER PUBLICATION supabase_realtime ADD TABLE matches;

-- Live balance updates for current user
ALTER PUBLICATION supabase_realtime ADD TABLE users;
