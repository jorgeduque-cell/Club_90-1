-- ============================================
-- CLUB 90+1 — HOTFIX 009: Audit Remediation Sprint
-- ============================================
-- S3: TIME LOCK 5 min → 15 min (Blueprint §6: "15 minutos exactos")
-- S5: Transaction types WINNINGS_PAID + BET_PLACED (ensure exist)
-- ============================================

-- ═══ 1. Fix submit_ticket TIME LOCK: 15 minutes ═══

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
    v_max_stake     CONSTANT FLOAT := 2000;   -- §6: MAX AMOUNT
    v_min_stake     CONSTANT FLOAT := 100;
    v_i             INT := 0;
    v_items         JSONB := '[]'::JSONB;
BEGIN
    IF v_uid IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
    IF p_amount < v_min_stake THEN RAISE EXCEPTION 'Monto mínimo: % CL COINS', v_min_stake; END IF;
    IF p_amount > v_max_stake THEN RAISE EXCEPTION 'Monto máximo: % CL COINS', v_max_stake; END IF;
    IF p_selections IS NULL OR jsonb_array_length(p_selections) = 0 THEN RAISE EXCEPTION 'Debes seleccionar al menos 1 partido'; END IF;
    IF jsonb_array_length(p_selections) > 4 THEN RAISE EXCEPTION 'Máximo 4 partidos por ticket (Combinada)'; END IF;

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

        -- ✅ FIX S3: TIME LOCK = 15 minutes (Blueprint §6)
        IF v_market."startTime" - INTERVAL '15 minutes' < NOW() THEN
          RAISE EXCEPTION 'TIME LOCK: El mercado cierra 15 minutos antes del partido (§6).';
        END IF;

        -- §6 SINGLE PREDICTION: check no existing pending ticket for this match by this user
        IF EXISTS (
            SELECT 1 FROM ticket_items ti2
            JOIN prediction_tickets pt2 ON pt2.id = ti2."predictionTicketId"
            WHERE ti2."matchMarketId" = v_market.id
            AND pt2."userId" = v_uid
            AND pt2.status = 'PENDING'
        ) THEN
            RAISE EXCEPTION 'Ya tienes un pronóstico activo en el partido %', v_i;
        END IF;

        v_locked_mult := CASE v_outcome
            WHEN 'HOME_WIN' THEN LEAST(v_market."multiplierHome", 5.00)
            WHEN 'DRAW'     THEN LEAST(v_market."multiplierDraw", 5.00)
            WHEN 'AWAY_WIN' THEN LEAST(v_market."multiplierAway", 5.00)
        END;
        v_total_mult := v_total_mult * v_locked_mult;

        v_items := v_items || jsonb_build_array(jsonb_build_object('marketId', v_market.id, 'outcome', v_outcome, 'mult', v_locked_mult));
    END LOOP;

    v_potential := ROUND((p_amount * v_total_mult)::NUMERIC, 2);

    -- Parent ticket FIRST
    INSERT INTO prediction_tickets ("id", "userId", "totalAmount", "potentialReturn", "status", "createdAt")
    VALUES (v_ticket_id, v_uid, p_amount, v_potential, 'PENDING', now());

    -- Child items AFTER
    FOR v_sel IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
        INSERT INTO ticket_items ("id", "predictionTicketId", "matchMarketId", "selectedOutcome", "lockedMultiplier")
        VALUES (gen_random_uuid()::text, v_ticket_id, (v_sel->>'marketId'), (v_sel->>'outcome')::"PredictionOutcome", (v_sel->>'mult')::FLOAT);
    END LOOP;

    UPDATE users SET "clCoins" = "clCoins" - p_amount WHERE id = v_uid;

    INSERT INTO transactions ("id", "userId", "amountCOP", "coinsAdded", "type", "status", "createdAt")
    VALUES (gen_random_uuid()::text, v_uid, 0, -p_amount, 'BET_PLACED', 'APPROVED', now());

    RETURN jsonb_build_object(
        'ticketId', v_ticket_id, 'totalAmount', p_amount,
        'totalMultiplier', ROUND(v_total_mult::NUMERIC, 2), 'potentialReturn', v_potential,
        'selections', jsonb_array_length(p_selections), 'message', '✅ Pronóstico registrado!'
    );
END;
$$;


-- ═══ 2. Ensure enum values exist ═══

DO $$
BEGIN
    BEGIN ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'BET_PLACED'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'WINNINGS_PAID'; EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'STORE_REDEMPTION'; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;


-- ═══ 3. Grants ═══

GRANT EXECUTE ON FUNCTION submit_ticket(JSONB, FLOAT) TO authenticated;
GRANT EXECUTE ON FUNCTION settle_match_v2(TEXT, TEXT) TO service_role;

SELECT '✅ Audit Remediation Sprint applied — TIME LOCK=15min, SINGLE PREDICTION enforced, MAX_MULT capped' AS status;
