-- ============================================
-- CLUB 90+1 — v5.1 Gamification & Freemium Functions
-- ============================================

-- Function 1: activate_premium_pass
-- Convierte a un usuario en PREMIUM y le inyecta 10,000 CL COINS
CREATE OR REPLACE FUNCTION activate_premium_pass(p_user_id TEXT)
RETURNS jsonb AS $$
DECLARE
  v_user record;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  IF v_user."accountTier" = 'PREMIUM' THEN
    RAISE EXCEPTION 'El usuario ya es PREMIUM';
  END IF;

  UPDATE users 
  SET "accountTier" = 'PREMIUM', "clCoins" = "clCoins" + 10000
  WHERE id = p_user_id;

  INSERT INTO transactions ("id", "userId", "amountCOP", "coinsAdded", "type", "status", "createdAt")
  VALUES (gen_random_uuid()::text, p_user_id, 50000, 10000, 'PREMIUM_PASS', 'APPROVED', now());

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Pase Premium activado. +10,000 CL COINS inyectadas.',
    'newBalance', v_user."clCoins" + 10000
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function 2: handle_lifesaver_topup
-- Recarga un Salvavidas (Solo si el banco es < 2000, cap de 2 a la semana)
CREATE OR REPLACE FUNCTION handle_lifesaver_topup(p_user_id TEXT)
RETURNS jsonb AS $$
DECLARE
  v_user record;
  v_weekly_count int;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  -- Bankruptcy Rule:
  IF v_user."clCoins" >= 2000 THEN
    RAISE EXCEPTION 'Bankruptcy Rule: Tu saldo debe ser menor a 2000 CL COINS para usar un Salvavidas.';
  END IF;

  -- Weekly Cap:
  SELECT count(*) INTO v_weekly_count
  FROM transactions
  WHERE "userId" = p_user_id 
    AND type = 'LIFESAVER_TOPUP' 
    AND "createdAt" >= date_trunc('week', now());

  IF v_weekly_count >= 2 THEN
    RAISE EXCEPTION 'Weekly Cap: Solo puedes usar 2 Salvavidas por semana.';
  END IF;

  -- Execute topup
  UPDATE users 
  SET "clCoins" = "clCoins" + 5000, "isBankrupt" = false
  WHERE id = p_user_id;

  INSERT INTO transactions ("id", "userId", "amountCOP", "coinsAdded", "type", "status", "createdAt")
  VALUES (gen_random_uuid()::text, p_user_id, 20000, 5000, 'LIFESAVER_TOPUP', 'APPROVED', now());

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Vida Extra inyectada con éxito.',
    'newBalance', v_user."clCoins" + 5000
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function 3: submit_ticket
-- Procesa tickets predictivos respetando MAX AMOUNT y SINGLE PREDICTION
CREATE OR REPLACE FUNCTION submit_ticket(
  p_user_id TEXT, 
  p_selections jsonb, 
  p_amount FLOAT
)
RETURNS jsonb AS $$
DECLARE
  v_user record;
  v_market record;
  v_item record;
  v_ticket_id text := gen_random_uuid()::text;
  v_total_multiplier float := 1.0;
  v_locked_multiplier float;
BEGIN
  -- Max Amount
  IF p_amount > 2000 THEN
    RAISE EXCEPTION 'MAX AMOUNT: No puedes arriesgar más de 2000 CL COINS por ticket.';
  END IF;

  SELECT * INTO v_user FROM users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;
  
  IF v_user."accountTier" != 'PREMIUM' THEN
    RAISE EXCEPTION 'Upsell: Debes ser PREMIUM para pronosticar.';
  END IF;

  IF v_user."clCoins" < p_amount THEN
    RAISE EXCEPTION 'No tienes suficientes CL COINS.';
  END IF;

  -- Evaluate selections
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_selections) AS x("matchMarketId" text, "outcome" text)
  LOOP
    SELECT * INTO v_market FROM match_markets WHERE id = v_item."matchMarketId";
    IF v_market.status != 'OPEN' THEN
      RAISE EXCEPTION 'El mercado % no está abierto', v_item."matchMarketId";
    END IF;
    
    -- TIME LOCK: 15 mins
    IF v_market."startTime" <= now() + interval '15 minutes' THEN
      RAISE EXCEPTION 'TIME LOCK: El mercado cierra 15 minutos antes del partido.';
    END IF;

    -- Get multiplier
    IF v_item.outcome = 'HOME_WIN' THEN
      v_locked_multiplier := v_market."multiplierHome";
    ELSIF v_item.outcome = 'DRAW' THEN
      v_locked_multiplier := v_market."multiplierDraw";
    ELSIF v_item.outcome = 'AWAY_WIN' THEN
      v_locked_multiplier := v_market."multiplierAway";
    ELSE
      RAISE EXCEPTION 'Outcome inválido';
    END IF;
    
    -- Cap individual (Just in case, usually backend saves capped values)
    IF v_locked_multiplier > 5.00 THEN v_locked_multiplier := 5.00; END IF;
    
    v_total_multiplier := v_total_multiplier * v_locked_multiplier;
    
    -- Insert Item
    INSERT INTO ticket_items ("id", "predictionTicketId", "matchMarketId", "selectedOutcome", "lockedMultiplier")
    VALUES (gen_random_uuid()::text, v_ticket_id, v_item."matchMarketId", v_item.outcome::"PredictionOutcome", v_locked_multiplier);
  END LOOP;

  -- Max Total Multiplier Cap for Combo
  IF v_total_multiplier > 5.00 THEN
    v_total_multiplier := 5.00;
  END IF;

  -- Create Ticket
  INSERT INTO prediction_tickets ("id", "userId", "totalAmount", "potentialReturn", "status", "createdAt")
  VALUES (v_ticket_id, p_user_id, p_amount, p_amount * v_total_multiplier, 'PENDING', now());

  -- Discount Balance
  UPDATE users SET "clCoins" = "clCoins" - p_amount WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'ticketId', v_ticket_id,
    'potentialReturn', p_amount * v_total_multiplier
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function 4: get_leaderboard
CREATE OR REPLACE FUNCTION get_leaderboard(p_limit int)
RETURNS TABLE (
  "id" text,
  "name" text,
  "clCoins" float,
  "isBankrupt" boolean,
  currentStreak int
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u."id", 
    u."name", 
    u."clCoins", 
    u."isBankrupt",
    u."currentStreak"
  FROM users u
  WHERE u."accountTier" = 'PREMIUM'
  ORDER BY u."clCoins" DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
