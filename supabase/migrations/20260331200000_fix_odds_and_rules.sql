-- ============================================
-- CLUB 90 — Fix: Odds Model + Business Rules
-- ============================================
-- Run in: Supabase Dashboard > SQL Editor
-- ============================================
-- Changes:
--   1. MAX_ODD_CAP in calculate_live_odds()
--   2. Lock odd at bet time in place_bet()
--   3. MAX_STAKE, SINGLE_PREDICTION in place_bet()
--   4. Use locked odd in settle_match()
--   5. Recharge limits in handle_topup()
--   6. UNIQUE on transactions.reference
--   7. Weekly recharge fields on users
-- ============================================

-- ╔══════════════════════════════════════════╗
-- ║  1. ADD RECHARGE COLUMNS TO USERS        ║
-- ╚══════════════════════════════════════════╝

ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_recharges INT NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_recharge_week INT NOT NULL DEFAULT 0;

-- ╔══════════════════════════════════════════╗
-- ║  2. UNIQUE CONSTRAINT ON REFERENCE       ║
-- ╚══════════════════════════════════════════╝

-- Only enforce uniqueness on non-null references
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_reference_unique
  ON transactions (reference)
  WHERE reference IS NOT NULL;

-- ╔══════════════════════════════════════════╗
-- ║  3. FIX calculate_live_odds (MAX_ODD_CAP)║
-- ╚══════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION calculate_live_odds(
  p_home_pool FLOAT,
  p_draw_pool FLOAT,
  p_away_pool FLOAT
)
RETURNS JSONB AS $$
DECLARE
  v_house_margin   CONSTANT FLOAT := 0.20;
  v_seed_liquidity CONSTANT FLOAT := 10000;
  v_max_odd_cap    CONSTANT FLOAT := 5.00;   -- §6 MAX_ODD_CAP
  v_min_odd        CONSTANT FLOAT := 1.05;
  v_seeded_home    FLOAT;
  v_seeded_draw    FLOAT;
  v_seeded_away    FLOAT;
  v_gross_pool     FLOAT;
  v_net_pool       FLOAT;
  v_home_odd       FLOAT;
  v_draw_odd       FLOAT;
  v_away_odd       FLOAT;
BEGIN
  v_seeded_home := p_home_pool + v_seed_liquidity;
  v_seeded_draw := p_draw_pool + v_seed_liquidity;
  v_seeded_away := p_away_pool + v_seed_liquidity;

  v_gross_pool := v_seeded_home + v_seeded_draw + v_seeded_away;
  v_net_pool   := v_gross_pool * (1 - v_house_margin);

  -- Clamp between min and MAX_ODD_CAP (§6)
  v_home_odd := GREATEST(v_min_odd, LEAST(v_max_odd_cap, ROUND((v_net_pool / v_seeded_home)::NUMERIC, 2)));
  v_draw_odd := GREATEST(v_min_odd, LEAST(v_max_odd_cap, ROUND((v_net_pool / v_seeded_draw)::NUMERIC, 2)));
  v_away_odd := GREATEST(v_min_odd, LEAST(v_max_odd_cap, ROUND((v_net_pool / v_seeded_away)::NUMERIC, 2)));

  RETURN jsonb_build_object(
    'home', v_home_odd,
    'draw', v_draw_odd,
    'away', v_away_odd
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ╔══════════════════════════════════════════╗
-- ║  4. FIX place_bet (All §6 Rules + Lock)  ║
-- ╚══════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION place_bet(
  p_user_id    UUID,
  p_match_id   UUID,
  p_prediction prediction_type,
  p_amount     FLOAT
)
RETURNS JSONB AS $$
DECLARE
  v_max_stake  CONSTANT FLOAT := 2000;  -- §6 MAX_STAKE
  v_user       RECORD;
  v_match      RECORD;
  v_bet_id     UUID;
  v_pool       RECORD;
  v_odds       JSONB;
  v_odd_key    TEXT;
  v_locked_odd FLOAT;
  v_estimated_return FLOAT;
BEGIN
  -- ── §6 MAX_STAKE ──
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto de la apuesta debe ser mayor a 0';
  END IF;
  IF p_amount > v_max_stake THEN
    RAISE EXCEPTION 'Máximo por apuesta: 2,000 🪙. Intentaste apostar %.', p_amount;
  END IF;

  -- ── Lock and validate user ──
  SELECT * INTO v_user FROM users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;
  IF v_user.cl_coins < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente. Tienes % 🪙 pero intentas apostar %.', v_user.cl_coins, p_amount;
  END IF;

  -- ── Lock and validate match ──
  SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partido no encontrado';
  END IF;
  IF v_match.status != 'OPEN' THEN
    RAISE EXCEPTION 'Mercado cerrado. El partido ya no acepta apuestas.';
  END IF;
  IF v_match.start_time - INTERVAL '15 minutes' < NOW() THEN
    RAISE EXCEPTION 'Mercado cerrado. 15 min antes del inicio.';
  END IF;

  -- ── §6 SINGLE_PREDICTION ──
  IF EXISTS (
    SELECT 1 FROM bets
    WHERE user_id = p_user_id
      AND match_id = p_match_id
      AND status = 'PENDING'
  ) THEN
    RAISE EXCEPTION 'Solo puedes tener 1 apuesta activa por partido.';
  END IF;

  -- ── Calculate current odds BEFORE updating pool ──
  SELECT * INTO v_pool FROM match_pools WHERE match_id = p_match_id;
  v_odds := calculate_live_odds(
    COALESCE(v_pool.home_pool, 0),
    COALESCE(v_pool.draw_pool, 0),
    COALESCE(v_pool.away_pool, 0)
  );

  v_odd_key := CASE p_prediction::TEXT
    WHEN 'HOME_WIN' THEN 'home'
    WHEN 'DRAW'     THEN 'draw'
    WHEN 'AWAY_WIN' THEN 'away'
  END;

  -- ── §5 LOCK ODD AT BET TIME (Fixed Odds Effect) ──
  v_locked_odd := (v_odds->>v_odd_key)::FLOAT;
  v_estimated_return := ROUND((p_amount * v_locked_odd)::NUMERIC, 2);

  -- ── 1. Deduct CL COINS ──
  UPDATE users SET cl_coins = cl_coins - p_amount WHERE id = p_user_id;

  -- ── 2. Update pool ──
  UPDATE match_pools SET
    home_pool = home_pool + CASE WHEN p_prediction = 'HOME_WIN' THEN p_amount ELSE 0 END,
    draw_pool = draw_pool + CASE WHEN p_prediction = 'DRAW'     THEN p_amount ELSE 0 END,
    away_pool = away_pool + CASE WHEN p_prediction = 'AWAY_WIN' THEN p_amount ELSE 0 END
  WHERE match_id = p_match_id;

  -- ── 3. Create bet WITH LOCKED ODD ──
  INSERT INTO bets (user_id, match_id, amount, prediction, status, closing_odd)
  VALUES (p_user_id, p_match_id, p_amount, p_prediction, 'PENDING', v_locked_odd)
  RETURNING id INTO v_bet_id;

  -- ── 4. Log transaction ──
  INSERT INTO transactions (user_id, amount, type, reference, status)
  VALUES (p_user_id, p_amount, 'BET_PLACED', 'BET:' || v_bet_id, 'APPROVED');

  RETURN jsonb_build_object(
    'betId',          v_bet_id,
    'matchId',        p_match_id,
    'amount',         p_amount,
    'prediction',     p_prediction,
    'status',         'PENDING',
    'lockedOdd',      v_locked_odd,
    'currentOdds',    v_odds,
    'estimatedReturn', v_estimated_return
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ╔══════════════════════════════════════════╗
-- ║  5. FIX settle_match (Use Locked Odd)    ║
-- ╚══════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION settle_match(
  p_match_id UUID,
  p_result   match_result
)
RETURNS JSONB AS $$
DECLARE
  v_match        RECORD;
  v_pool         RECORD;
  v_total_pool   FLOAT;
  v_commission   FLOAT;
  v_bet          RECORD;
  v_prize        FLOAT;
  v_total_prizes FLOAT := 0;
  v_winners      INT := 0;
  v_losers       INT := 0;
  v_winning_pred prediction_type;
BEGIN
  IF p_result = 'PENDING' THEN
    RAISE EXCEPTION 'El resultado no puede ser PENDING';
  END IF;

  SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partido no encontrado';
  END IF;
  IF v_match.status = 'FINISHED' THEN
    RAISE EXCEPTION 'Este partido ya fue liquidado';
  END IF;

  UPDATE matches SET status = 'FINISHED', result = p_result WHERE id = p_match_id;

  SELECT * INTO v_pool FROM match_pools WHERE match_id = p_match_id;
  IF v_pool IS NULL THEN
    RETURN jsonb_build_object('settled', 0, 'totalPrizes', 0, 'commission', 0);
  END IF;

  v_total_pool := v_pool.home_pool + v_pool.draw_pool + v_pool.away_pool;
  v_commission := ROUND((v_total_pool * 0.20)::NUMERIC, 2);
  UPDATE match_pools SET admin_commission = v_commission WHERE match_id = p_match_id;

  v_winning_pred := p_result::TEXT::prediction_type;

  -- ── Use LOCKED ODD per bet (§5 Fixed Odds) ──
  FOR v_bet IN
    SELECT * FROM bets WHERE match_id = p_match_id AND status = 'PENDING'
    FOR UPDATE
  LOOP
    IF v_bet.prediction = v_winning_pred THEN
      -- Prize = amount × LOCKED odd (frozen at bet time)
      v_prize := ROUND((v_bet.amount * v_bet.closing_odd)::NUMERIC, 2);
      v_total_prizes := v_total_prizes + v_prize;
      v_winners := v_winners + 1;

      UPDATE bets SET status = 'WON' WHERE id = v_bet.id;
      UPDATE users SET cl_coins = cl_coins + v_prize WHERE id = v_bet.user_id;

      INSERT INTO transactions (user_id, amount, type, reference, status)
      VALUES (v_bet.user_id, v_prize, 'WINNINGS_PAID', 'WIN:' || v_bet.id, 'APPROVED');
    ELSE
      v_losers := v_losers + 1;
      UPDATE bets SET status = 'LOST' WHERE id = v_bet.id;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'matchId',     p_match_id,
    'result',      p_result,
    'totalBets',   v_winners + v_losers,
    'winners',     v_winners,
    'losers',      v_losers,
    'totalPrizes', ROUND(v_total_prizes::NUMERIC, 2),
    'commission',  v_commission
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ╔══════════════════════════════════════════╗
-- ║  6. FIX handle_topup (Recharge Limits)   ║
-- ╚══════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION handle_topup(
  p_user_id UUID,
  p_amount  FLOAT
)
RETURNS JSONB AS $$
DECLARE
  v_fixed_amount   CONSTANT FLOAT := 5000;   -- §6 Fixed Package: always 5000 CL
  v_min_balance    CONSTANT FLOAT := 2000;    -- §6 Bankruptcy Rule
  v_weekly_cap     CONSTANT INT := 2;         -- §6 Weekly Cap
  v_user           RECORD;
  v_current_week   INT;
BEGIN
  -- ── §6 Fixed Package — only accept exactly 5000 CL ──
  IF p_amount != v_fixed_amount THEN
    RAISE EXCEPTION 'Solo se permite recargar exactamente 5,000 🪙 ($20,000 COP).';
  END IF;

  SELECT * INTO v_user FROM users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  -- ── §6 Bankruptcy Rule ──
  IF v_user.cl_coins >= v_min_balance THEN
    RAISE EXCEPTION 'Solo puedes recargar si tu saldo es menor a 2,000 🪙. Tienes: %.', v_user.cl_coins;
  END IF;

  -- ── §6 Weekly Cap ──
  v_current_week := EXTRACT(WEEK FROM NOW())::INT;

  IF v_user.last_recharge_week = v_current_week AND v_user.weekly_recharges >= v_weekly_cap THEN
    RAISE EXCEPTION 'Máximo 2 recargas por semana. Ya usaste %/2 esta semana.', v_user.weekly_recharges;
  END IF;

  -- ── Credit CL COINS + update weekly counter ──
  IF v_user.last_recharge_week != v_current_week THEN
    -- New week, reset counter
    UPDATE users SET
      cl_coins = cl_coins + v_fixed_amount,
      weekly_recharges = 1,
      last_recharge_week = v_current_week
    WHERE id = p_user_id
    RETURNING * INTO v_user;
  ELSE
    UPDATE users SET
      cl_coins = cl_coins + v_fixed_amount,
      weekly_recharges = weekly_recharges + 1
    WHERE id = p_user_id
    RETURNING * INTO v_user;
  END IF;

  -- ── Log transaction ──
  INSERT INTO transactions (user_id, amount, type, reference, status)
  VALUES (p_user_id, v_fixed_amount, 'DEPOSIT',
    'RECHARGE:' || EXTRACT(EPOCH FROM NOW())::TEXT, 'APPROVED');

  RETURN jsonb_build_object(
    'userId',     v_user.id,
    'name',       v_user.name,
    'newBalance', v_user.cl_coins,
    'credited',   v_fixed_amount,
    'weeklyUsed', v_user.weekly_recharges,
    'message',    '✅ Recarga exitosa! +5,000 🪙'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ╔══════════════════════════════════════════╗
-- ║  7. ADMIN: Activate Season Pass          ║
-- ╚══════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION activate_season_pass(
  p_phone TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_initial_coins CONSTANT FLOAT := 10000;  -- §3 Season Pass: 10K CL
  v_user RECORD;
BEGIN
  SELECT * INTO v_user FROM users WHERE phone = p_phone FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario con teléfono % no encontrado', p_phone;
  END IF;

  IF v_user.cl_coins > 0 THEN
    RAISE EXCEPTION 'Este usuario ya tiene saldo (% 🪙). Season Pass ya activo.', v_user.cl_coins;
  END IF;

  UPDATE users SET cl_coins = v_initial_coins WHERE id = v_user.id;

  INSERT INTO transactions (user_id, amount, type, reference, status)
  VALUES (v_user.id, v_initial_coins, 'DEPOSIT', 'SEASON_PASS:' || p_phone, 'APPROVED');

  RETURN jsonb_build_object(
    'userId', v_user.id,
    'name',   v_user.name,
    'phone',  v_user.phone,
    'coins',  v_initial_coins,
    'message', '✅ Season Pass activado! ' || v_user.name || ' tiene 10,000 🪙'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ╔══════════════════════════════════════════╗
-- ║  8. VERIFY                               ║
-- ╚══════════════════════════════════════════╝

SELECT '✅ FASE 1 COMPLETE — Backend blindado!' AS status;
