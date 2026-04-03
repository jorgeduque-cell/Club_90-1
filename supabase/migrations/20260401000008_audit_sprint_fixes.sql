-- ============================================
-- CLUB 90+1 — HOTFIX 008: Audit Sprint Fixes
-- ============================================
-- ⚠️ submit_ticket IN THIS FILE IS SUPERSEDED BY: 20260402000000_audit_remediation.sql
-- ✅ settle_match_v2 IN THIS FILE IS AUTHORITATIVE (WINNINGS_PAID fix)
-- S1: settle_match_v2 → WINNINGS_PAID (was REWARD_REDEMPTION)
-- S2: submit_ticket  → BET_PLACED (was REWARD_REDEMPTION) — SUPERSEDED
-- B6: Unify MAX_STAKE → 2000 (frontend & backend agree) — SUPERSEDED
-- ============================================

-- ═══ 1. Fix settle_match_v2 transaction type ═══

CREATE OR REPLACE FUNCTION settle_match_v2(
    p_match_id TEXT,
    p_result   TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_market         RECORD;
    v_item           RECORD;
    v_ticket         RECORD;
    v_ticket_id      TEXT;
    v_total_items    INT;
    v_resolved_items INT;
    v_correct_items  INT;
    v_winners        INT := 0;
    v_losers         INT := 0;
    v_total_paid     FLOAT := 0;
    v_processed_tickets TEXT[] := '{}';
BEGIN
    IF p_result NOT IN ('HOME_WIN', 'DRAW', 'AWAY_WIN') THEN
        RAISE EXCEPTION 'Resultado inválido: %. Usa HOME_WIN, DRAW o AWAY_WIN', p_result;
    END IF;

    SELECT * INTO v_market FROM match_markets WHERE id = p_match_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Partido no encontrado'; END IF;
    IF v_market.status = 'FINISHED' THEN RAISE EXCEPTION 'Este partido ya fue liquidado'; END IF;

    UPDATE match_markets SET result = p_result::"MatchResult", status = 'FINISHED' WHERE id = p_match_id;

    FOR v_item IN
        SELECT ti.*, pt."userId" AS ticket_user_id, pt.status AS ticket_status
        FROM ticket_items ti
        JOIN prediction_tickets pt ON pt.id = ti."predictionTicketId"
        WHERE ti."matchMarketId" = p_match_id AND pt.status = 'PENDING'
        FOR UPDATE OF ti
    LOOP
        v_ticket_id := v_item."predictionTicketId";
        IF v_ticket_id = ANY(v_processed_tickets) THEN CONTINUE; END IF;
        v_processed_tickets := array_append(v_processed_tickets, v_ticket_id);

        SELECT COUNT(*) INTO v_total_items FROM ticket_items WHERE "predictionTicketId" = v_ticket_id;
        SELECT COUNT(*) INTO v_resolved_items
        FROM ticket_items ti2 JOIN match_markets mm ON mm.id = ti2."matchMarketId"
        WHERE ti2."predictionTicketId" = v_ticket_id AND mm.status = 'FINISHED';

        IF v_resolved_items < v_total_items THEN CONTINUE; END IF;

        SELECT COUNT(*) INTO v_correct_items
        FROM ticket_items ti3 JOIN match_markets mm2 ON mm2.id = ti3."matchMarketId"
        WHERE ti3."predictionTicketId" = v_ticket_id AND ti3."selectedOutcome"::text = mm2.result::text;

        SELECT * INTO v_ticket FROM prediction_tickets WHERE id = v_ticket_id FOR UPDATE;

        IF v_correct_items = v_total_items THEN
            v_winners := v_winners + 1;
            UPDATE prediction_tickets SET status = 'HIT' WHERE id = v_ticket_id;
            UPDATE users SET "clCoins" = "clCoins" + v_ticket."potentialReturn" WHERE id = v_ticket."userId";

            -- ✅ FIX S1: Was REWARD_REDEMPTION → now WINNINGS_PAID
            INSERT INTO transactions ("id", "userId", "amountCOP", "coinsAdded", "type", "status", "createdAt")
            VALUES (gen_random_uuid()::text, v_ticket."userId", 0, v_ticket."potentialReturn",
                    'WINNINGS_PAID', 'APPROVED', now());

            v_total_paid := v_total_paid + v_ticket."potentialReturn";
            UPDATE users SET "currentStreak" = "currentStreak" + 1 WHERE id = v_ticket."userId";
        ELSE
            v_losers := v_losers + 1;
            UPDATE prediction_tickets SET status = 'MISSED' WHERE id = v_ticket_id;
            UPDATE users SET "currentStreak" = 0 WHERE id = v_ticket."userId";
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'matchId', p_match_id, 'result', p_result,
        'winners', v_winners, 'losers', v_losers,
        'totalPaid', ROUND(v_total_paid::NUMERIC, 2),
        'ticketsProcessed', v_winners + v_losers,
        'message', '✅ Partido liquidado: ' || v_winners || ' ganadores, ' || v_losers || ' perdedores'
    );
END;
$$;


-- ═══ 2. Fix submit_ticket transaction type + MAX_STAKE ═══

DROP FUNCTION IF EXISTS submit_ticket(JSONB, FLOAT);

CREATE OR REPLACE FUNCTION submit_ticket(
    p_selections JSONB,
    p_amount     FLOAT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_uid           TEXT := auth.uid()::text;
    v_user          RECORD;
    v_ticket_id     TEXT;
    v_sel           JSONB;
    v_market        RECORD;
    v_outcome       TEXT;
    v_locked_mult   FLOAT;
    v_total_mult    FLOAT := 1.0;
    v_potential      FLOAT;
    v_max_stake     CONSTANT FLOAT := 2000;  -- ✅ FIX B6: Was 5000, unified with frontend
    v_min_stake     CONSTANT FLOAT := 100;
    v_i             INT := 0;
    v_items         JSONB := '[]'::JSONB;
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
    IF p_amount < v_min_stake THEN RAISE EXCEPTION 'Apuesta mínima: % CL COINS', v_min_stake; END IF;
    IF p_amount > v_max_stake THEN RAISE EXCEPTION 'Apuesta máxima: % CL COINS', v_max_stake; END IF;
    IF p_selections IS NULL OR jsonb_array_length(p_selections) = 0 THEN RAISE EXCEPTION 'Debes seleccionar al menos 1 partido'; END IF;
    IF jsonb_array_length(p_selections) > 10 THEN RAISE EXCEPTION 'Máximo 10 partidos por ticket'; END IF;

    SELECT * INTO v_user FROM users WHERE id = v_uid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Usuario no encontrado'; END IF;
    IF v_user."accountTier" != 'PREMIUM' THEN RAISE EXCEPTION 'Necesitas PASE PREMIUM para hacer pronósticos'; END IF;
    IF v_user."clCoins" < p_amount THEN RAISE EXCEPTION 'Saldo insuficiente. Tienes % CL pero intentas apostar %', v_user."clCoins", p_amount; END IF;

    v_ticket_id := gen_random_uuid()::text;

    FOR v_sel IN SELECT * FROM jsonb_array_elements(p_selections)
    LOOP
        v_i := v_i + 1;
        v_outcome := v_sel->>'outcome';
        IF v_outcome NOT IN ('HOME_WIN', 'DRAW', 'AWAY_WIN') THEN RAISE EXCEPTION 'Resultado inválido en selección %: %', v_i, v_outcome; END IF;

        SELECT * INTO v_market FROM match_markets WHERE id = (v_sel->>'matchMarketId') FOR UPDATE;
        IF NOT FOUND THEN RAISE EXCEPTION 'Partido % no encontrado', v_sel->>'matchMarketId'; END IF;
        IF v_market.status != 'OPEN' THEN RAISE EXCEPTION 'El partido % ya está cerrado', v_i; END IF;
        IF v_market."startTime" - INTERVAL '5 minutes' < NOW() THEN RAISE EXCEPTION 'El partido % ya va a comenzar', v_i; END IF;

        v_locked_mult := CASE v_outcome
            WHEN 'HOME_WIN' THEN v_market."multiplierHome"
            WHEN 'DRAW'     THEN v_market."multiplierDraw"
            WHEN 'AWAY_WIN' THEN v_market."multiplierAway"
        END;
        v_total_mult := v_total_mult * v_locked_mult;

        v_items := v_items || jsonb_build_array(jsonb_build_object('marketId', v_market.id, 'outcome', v_outcome, 'mult', v_locked_mult));
    END LOOP;

    v_potential := ROUND((p_amount * v_total_mult)::NUMERIC, 2);

    -- PHASE 2: Parent ticket FIRST
    INSERT INTO prediction_tickets ("id", "userId", "totalAmount", "potentialReturn", "status", "createdAt")
    VALUES (v_ticket_id, v_uid, p_amount, v_potential, 'PENDING', now());

    -- PHASE 3: Child items AFTER
    FOR v_sel IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
        INSERT INTO ticket_items ("id", "predictionTicketId", "matchMarketId", "selectedOutcome", "lockedMultiplier")
        VALUES (gen_random_uuid()::text, v_ticket_id, (v_sel->>'marketId'), (v_sel->>'outcome')::"PredictionOutcome", (v_sel->>'mult')::FLOAT);
    END LOOP;

    UPDATE users SET "clCoins" = "clCoins" - p_amount WHERE id = v_uid;

    -- ✅ FIX S2: Was REWARD_REDEMPTION → now BET_PLACED
    INSERT INTO transactions ("id", "userId", "amountCOP", "coinsAdded", "type", "status", "createdAt")
    VALUES (gen_random_uuid()::text, v_uid, 0, -p_amount, 'BET_PLACED', 'APPROVED', now());

    RETURN jsonb_build_object(
        'ticketId', v_ticket_id, 'totalAmount', p_amount,
        'totalMultiplier', ROUND(v_total_mult::NUMERIC, 2), 'potentialReturn', v_potential,
        'selections', jsonb_array_length(p_selections), 'message', '✅ Pronóstico registrado!'
    );
END;
$$;

-- ═══ 3. Grants ═══
GRANT EXECUTE ON FUNCTION settle_match_v2(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION submit_ticket(JSONB, FLOAT) TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_store_item(TEXT) TO authenticated;

SELECT '✅ Audit Sprint Fixes applied!' AS status;
