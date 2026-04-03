-- ============================================
-- CLUB 90+1 — HOTFIX: submit_ticket FK order
-- ============================================
-- ⚠️ SUPERSEDED BY: 20260402000000_audit_remediation.sql
-- This version fixed FK order but still had: 5-min TIME LOCK,
-- REWARD_REDEMPTION type, and MAX_STAKE=5000.
-- All issues corrected in the audit_remediation migration.

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
    v_max_stake     CONSTANT FLOAT := 5000;
    v_min_stake     CONSTANT FLOAT := 100;
    v_i             INT := 0;
    -- Accumulator for items (insert AFTER parent ticket)
    v_items         JSONB := '[]'::JSONB;
BEGIN
    -- ── Validate auth ──
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'No autenticado';
    END IF;

    -- ── Validate amount ──
    IF p_amount < v_min_stake THEN
        RAISE EXCEPTION 'Apuesta mínima: % CL COINS', v_min_stake;
    END IF;
    IF p_amount > v_max_stake THEN
        RAISE EXCEPTION 'Apuesta máxima: % CL COINS', v_max_stake;
    END IF;

    -- ── Validate selections ──
    IF p_selections IS NULL OR jsonb_array_length(p_selections) = 0 THEN
        RAISE EXCEPTION 'Debes seleccionar al menos 1 partido';
    END IF;
    IF jsonb_array_length(p_selections) > 10 THEN
        RAISE EXCEPTION 'Máximo 10 partidos por ticket';
    END IF;

    -- ── Lock user row ──
    SELECT * INTO v_user FROM users WHERE id = v_uid FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Usuario no encontrado';
    END IF;
    IF v_user."accountTier" != 'PREMIUM' THEN
        RAISE EXCEPTION 'Necesitas PASE PREMIUM para hacer pronósticos';
    END IF;
    IF v_user."clCoins" < p_amount THEN
        RAISE EXCEPTION 'Saldo insuficiente. Tienes % CL pero intentas apostar %', v_user."clCoins", p_amount;
    END IF;

    -- ── Generate ticket ID ──
    v_ticket_id := gen_random_uuid()::text;

    -- ══════════════════════════════════════════
    -- PHASE 1: Validate selections + calculate multipliers
    -- (do NOT insert items yet — parent doesn't exist)
    -- ══════════════════════════════════════════
    FOR v_sel IN SELECT * FROM jsonb_array_elements(p_selections)
    LOOP
        v_i := v_i + 1;
        v_outcome := v_sel->>'outcome';

        IF v_outcome NOT IN ('HOME_WIN', 'DRAW', 'AWAY_WIN') THEN
            RAISE EXCEPTION 'Resultado inválido en selección %: %', v_i, v_outcome;
        END IF;

        SELECT * INTO v_market
        FROM match_markets
        WHERE id = (v_sel->>'matchMarketId')
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Partido % no encontrado', v_sel->>'matchMarketId';
        END IF;
        IF v_market.status != 'OPEN' THEN
            RAISE EXCEPTION 'El partido % ya está cerrado', v_i;
        END IF;
        IF v_market."startTime" - INTERVAL '5 minutes' < NOW() THEN
            RAISE EXCEPTION 'El partido % ya va a comenzar. Cierre: 5 min antes', v_i;
        END IF;

        v_locked_mult := CASE v_outcome
            WHEN 'HOME_WIN' THEN v_market."multiplierHome"
            WHEN 'DRAW'     THEN v_market."multiplierDraw"
            WHEN 'AWAY_WIN' THEN v_market."multiplierAway"
        END;

        v_total_mult := v_total_mult * v_locked_mult;

        -- Accumulate item data (will insert after parent)
        v_items := v_items || jsonb_build_array(jsonb_build_object(
            'marketId', v_market.id,
            'outcome', v_outcome,
            'mult', v_locked_mult
        ));
    END LOOP;

    -- ══════════════════════════════════════════
    -- PHASE 2: Create PARENT ticket first
    -- ══════════════════════════════════════════
    v_potential := ROUND((p_amount * v_total_mult)::NUMERIC, 2);

    INSERT INTO prediction_tickets (
        "id", "userId", "totalAmount", "potentialReturn", "status", "createdAt"
    ) VALUES (
        v_ticket_id, v_uid, p_amount, v_potential, 'PENDING', now()
    );

    -- ══════════════════════════════════════════
    -- PHASE 3: Now insert CHILD items (parent exists)
    -- ══════════════════════════════════════════
    FOR v_sel IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
        INSERT INTO ticket_items (
            "id", "predictionTicketId", "matchMarketId", "selectedOutcome", "lockedMultiplier"
        ) VALUES (
            gen_random_uuid()::text,
            v_ticket_id,
            (v_sel->>'marketId'),
            (v_sel->>'outcome')::"PredictionOutcome",
            (v_sel->>'mult')::FLOAT
        );
    END LOOP;

    -- ── Deduct coins ──
    UPDATE users SET "clCoins" = "clCoins" - p_amount WHERE id = v_uid;

    -- ── Log transaction ──
    INSERT INTO transactions (
        "id", "userId", "amountCOP", "coinsAdded", "type", "status", "createdAt"
    ) VALUES (
        gen_random_uuid()::text, v_uid, 0, -p_amount,
        'REWARD_REDEMPTION', 'APPROVED', now()
    );

    RETURN jsonb_build_object(
        'ticketId',       v_ticket_id,
        'totalAmount',    p_amount,
        'totalMultiplier', ROUND(v_total_mult::NUMERIC, 2),
        'potentialReturn', v_potential,
        'selections',     jsonb_array_length(p_selections),
        'message',        '✅ Pronóstico registrado!'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION submit_ticket(JSONB, FLOAT) TO authenticated;

SELECT '✅ submit_ticket FK order fixed!' AS status;
